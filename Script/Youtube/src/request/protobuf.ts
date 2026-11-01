import type {youtube_request_init_EncryptedInnertubeRequest as InitEncryptedRequest, youtube_request_init_OnesieRequest as InitOnesieRequest} from './messages';
import {readFields} from '../protobuf/wire';
import type {WireField} from '../protobuf/wire';
import {requestFields} from './schema';
export {readFields} from '../protobuf/wire';
// Reconstructed from the embedded protobuf-ts descriptors in the pinned
// 2026-07-12 request bundle. This reader never rewrites the request payload.
export interface EncryptedInnertubeRequest extends InitEncryptedRequest {
  unknownFields: WireField[];
}
export interface OnesieRequest extends Omit<InitOnesieRequest, 'encryptedInnertubeRequest'> {
  encryptedInnertubeRequest?: EncryptedInnertubeRequest;
  unknownFields: WireField[];
}

export function decodeOnesieRequest(bytes: Uint8Array): OnesieRequest {
  const result: OnesieRequest = {unknownFields: []};
  for (const outer of readFields(bytes)) {
    if (outer.no !== requestFields.OnesieRequest.encryptedInnertubeRequest) { result.unknownFields.push(outer); continue; }
    if (outer.wire !== 2) throw Error('protobuf-wrong-onesie-wire');
    // Singular submessages merge if field 3 occurs more than once, just as in
    // the original decoder. Bytes fields use the last occurrence, even empty.
    const nested = result.encryptedInnertubeRequest ?? {
      encryptedOnesieInnertubeRequest: new Uint8Array(0), encryptedClientKey: new Uint8Array(0),
      iv: new Uint8Array(0), hmac: new Uint8Array(0), unknownFields: [],
    };
    for (const f of readFields(outer.data)) {
      const name = (Object.keys(requestFields.EncryptedInnertubeRequest) as Array<keyof typeof requestFields.EncryptedInnertubeRequest>)
        .find(key => requestFields.EncryptedInnertubeRequest[key] === f.no);
      if (name) {
        if (f.wire !== 2) throw Error('protobuf-wrong-bytes-wire');
        nested[name] = f.data;
      } else nested.unknownFields.push(f);
    }
    result.encryptedInnertubeRequest = nested;
  }
  return result;
}
