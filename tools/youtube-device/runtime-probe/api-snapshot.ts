import type {capabilities} from '../capture';

type CaptureHost = Parameters<typeof capabilities>[0];
export interface RuntimeHost extends CaptureHost {
  isSecureContext?: boolean;
  $utils?: unknown;
  $crypto?: unknown;
  CryptoJS?: unknown;
}
export interface ReadFailure {path: string; errorName: string}
export function errorName(error: unknown): string {
  try {
    const name = (error as {name?: unknown})?.name;
    return typeof name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,47}$/.test(name) ? name : 'Error';
  } catch { return 'Error'; }
}
export function apiSnapshot(host: RuntimeHost) {
  const readFailures: ReadFailure[] = [];
  const callFailures: ReadFailure[] = [];
  function read(value: unknown, name: string, path: string): unknown {
    if (value === undefined || value === null) return undefined;
    try { return (Object(value) as Record<string,unknown>)[name]; }
    catch (error) { readFailures.push({path,errorName:errorName(error)});return undefined; }
  }
  // Cache each read. Host globals and native utility properties may be accessors
  // that throw in one engine; that must not discard unrelated capability data.
  const crypto = read(host,'crypto','crypto');
  const subtle = read(crypto,'subtle','crypto.subtle');
  const names = ['importKey','verify','sign','decrypt','encrypt'] as const;
  const methods: Record<string,unknown> = {};
  for (const name of names) methods[name]=read(subtle,name,'crypto.subtle.'+name);
  const random = read(crypto,'getRandomValues','crypto.getRandomValues');
  const set = read(host,'setTimeout','setTimeout'),clear = read(host,'clearTimeout','clearTimeout');
  const compress = read(host,'CompressionStream','CompressionStream');
  const decompress = read(host,'DecompressionStream','DecompressionStream');
  const secure = read(host,'isSecureContext','isSecureContext');
  const wasm = read(host,'WebAssembly','WebAssembly');
  const module = read(wasm,'Module','WebAssembly.Module'),instance = read(wasm,'Instance','WebAssembly.Instance');
  const utilities: Record<string,unknown> = {};
  for (const name of ['$utils','$crypto','CryptoJS']) utilities[name]=read(host,name,name);
  const reflect = read(host,'Reflect','Reflect'),object = read(host,'Object','Object');
  const nativeUtilityMemberNames: Record<string,string[]> = {};
  for (const [name,value] of Object.entries(utilities)) {
    if (!value || !['object','function'].includes(typeof value)) continue;
    try {
      // Names only, never values or invocation of utility/storage methods.
      nativeUtilityMemberNames[name] = Object.getOwnPropertyNames(value)
        .filter(key=>/^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/.test(key)).sort().slice(0,80);
    } catch (error) { readFailures.push({path:name+'.memberNames',errorName:errorName(error)}); }
  }
  const subtleMethods: Record<string,boolean> = {};
  for (const name of names) subtleMethods[name]=typeof methods[name]==='function';
  const nativeUtilities: Record<string,string> = {};
  for (const name of ['$utils','$crypto','CryptoJS']) nativeUtilities[name]=typeof utilities[name];
  const availability = {
    cryptoPresent:!!crypto,subtlePresent:!!subtle,subtleMethods,
    randomValues:typeof random==='function',setTimeout:typeof set==='function',clearTimeout:typeof clear==='function',
    compressionStream:typeof compress==='function',decompressionStream:typeof decompress==='function',
    secureContext:typeof secure==='boolean'?secure:null,
    nativeUtilities,
    intrinsics:{reflectGet:typeof read(reflect,'get','Reflect.get')==='function',objectValues:typeof read(object,'values','Object.values')==='function'},
    nativeUtilityMemberNames,
    productionApiPreconditions:typeof set==='function'&&typeof clear==='function'&&typeof random==='function'&&names.every(name=>subtleMethods[name]),
    readFailures,callFailures,
  };
  function bound(value: unknown, receiver: unknown, path: string, asynchronous=false): ((...args: unknown[])=>unknown)|undefined {
    if (typeof value !== 'function') return undefined;
    const failed = (error: unknown): never => { callFailures.push({path,errorName:errorName(error)});throw error; };
    return (...args)=>{
      try {
        const result = Function.prototype.apply.call(value,receiver,args);
        return asynchronous ? Promise.resolve(result).catch(failed) : result;
      } catch (error) { return failed(error); }
    };
  }
  const boundMethods: Record<string,unknown> = {};
  for (const name of names) boundMethods[name]=bound(methods[name],subtle,'crypto.subtle.'+name,true);
  const safeHost = {
    $done() {},console:{log() {}},
    crypto:crypto ? {subtle:subtle ? boundMethods : undefined,
      getRandomValues:bound(random,crypto,'crypto.getRandomValues')} : undefined,
    setTimeout:bound(set,host,'setTimeout'),clearTimeout:bound(clear,host,'clearTimeout'),
    CompressionStream:compress,DecompressionStream:decompress,
    TextEncoder:read(host,'TextEncoder','TextEncoder'),TextDecoder:read(host,'TextDecoder','TextDecoder'),
    WebAssembly:wasm ? {Module:module,Instance:instance} : undefined,
  } as unknown as CaptureHost;
  return {availability,host:safeHost};
}
