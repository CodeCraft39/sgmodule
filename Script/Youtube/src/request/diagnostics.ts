import type {NativeRequest} from './types';

export function sessionSuffix(request?: NativeRequest): string {
  const id = request?.sessionIndex ?? request?.id;
  return typeof id === 'number' || (typeof id === 'string' && /^[\w-]{1,80}$/.test(id))
    ? ` session=${id}` : '';
}
