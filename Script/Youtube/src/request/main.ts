import {BUILD, CONFIG_KEY} from './constants';
import {endpoint, platformKey, processRequest} from './core';
import {options} from './options';
import {bytes, completion, isQX} from './platform';
import {sessionSuffix} from './diagnostics';
import {normalizeConfig} from './config';
import {runQxEcho} from './qx-echo';
import type {Decision, Host, YouTubeConfig} from './types';

function loadConfig(raw: string | null | undefined): YouTubeConfig {
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null) return {};
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('config-is-not-an-object');
  for (const name of ['youtube', 'youtubeMusic'] as const) {
    const entry = (parsed as YouTubeConfig)[name];
    if (entry !== undefined && (!entry || typeof entry !== 'object' || Array.isArray(entry))) throw Error('config-entry-is-not-an-object');
    if (entry && ((entry.clientKey !== undefined && typeof entry.clientKey !== 'string') ||
      (entry.encryptKey !== undefined && typeof entry.encryptKey !== 'string'))) throw Error('config-key-is-not-a-string');
  }
  return parsed as YouTubeConfig;
}

export function run(host: Host): void {
  const qx = isQX(host), client = qx ? 'QX' : host.$rocket !== undefined ? 'Shadowrocket' : 'Surge-compatible';
  const request = host.$request;
  let done = false;
  const finish = (result: Record<string, unknown>) => {
    if (done) return;
    done = true;
    host.$done(result);
  };
  // No URLs, query strings, key values, bodies or raw error messages in logs.
  const log = (message: string) => host.console.log(`[YT-REQUEST ${BUILD}] client=${client} ${message}`);
  const route = endpoint(request?.url ?? '');
  const sessionText = sessionSuffix(request);
  let stage = 'arguments';
  let local = false;
  let echoMode = false;
  try {
    if (!request || route === 'other') { finish({}); return; }
    const opts = options(host);
    local = opts.localPlayback;
    echoMode = qx && local && opts.qxEcho && route === 'initplayback';
    stage = 'config';
    const raw = qx ? host.$prefs?.valueForKey(CONFIG_KEY) : host.$persistentStore?.read(CONFIG_KEY);
    let config: YouTubeConfig;
    if (local) {
      try { config = normalizeConfig(raw ? JSON.parse(raw) : {}); }
      catch { config = {}; log(`endpoint=${route} event=invalid-config-json${sessionText}`); }
    } else config = loadConfig(raw);
    // log_event only edits headers; it must not depend on binary body exposure.
    stage = 'body';
    const body = route === 'initplayback' ? bytes(qx ? request.bodyBytes ?? request.body : request.body ?? request.bodyBytes) : undefined;
    if (echoMode) { void runQxEcho(host,opts,config,body); return; }
    stage = 'decision';
    const decision = processRequest({url: request.url, headers: request.headers ?? {}, bodyBytes: body,
      config, params: opts.worker, preserveBodyEncoding: qx || local, localPlayback: local});
    let persisted = 'not-needed';
    if (decision.changed) {
      const serialized = JSON.stringify(decision.config);
      try {
        const ok = qx ? host.$prefs?.setValueForKey(serialized, CONFIG_KEY) : host.$persistentStore?.write(serialized, CONFIG_KEY);
        persisted = ok === false || (qx && ok === undefined) ? 'failed' : 'saved';
      } catch { persisted = 'failed'; }
    }
    if (persisted === 'failed') log(`endpoint=${route} event=storage-write-failed${sessionText}`);
    if (opts.debug) {
      log(`endpoint=${route} action=${decision.action} reason=${decision.reason} bodyBytes=${body?.length ?? 'unavailable'} cache=${persisted}${local?' mode=local':''}${sessionText}`);
      log(`output=${qx && decision.action === 'redirect' ? 'http-307' : decision.action} binary=${body !== undefined}${sessionText}`);
    }
    finish(completion(decision, qx));
  } catch {
    // In QX analyze-echo mode there is no upstream pass-through contract. Use
    // the same empty-response fallback as the original missing-key path and
    // leave stored keys unchanged. Surge-compatible errors pass through.
    const echo = qx && route === 'initplayback' && (!local || echoMode);
    log(`endpoint=${route} action=${echo ? 'empty' : 'pass'} reason=processing-error stage=${stage}${sessionText}`);
    const fallback: Decision = {action: 'empty', reason: 'processing-error',
      platformKey: platformKey(request?.headers ?? {}), config: {}, changed: false};
    finish(echo ? completion(fallback, true) : {});
  }
}
