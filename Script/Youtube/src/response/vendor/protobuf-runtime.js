var fi = Object.create;
var Me = Object.defineProperty;
var di = Object.getOwnPropertyDescriptor;
var pi = Object.getOwnPropertyNames;
var yi = Object.getPrototypeOf, hi = Object.prototype.hasOwnProperty;
var mi = (l, e, t) => e in l ? Me(l, e, { enumerable: true, configurable: true, writable: true, value: t }) : l[e] = t;
var gi = (l, e) => () => (e || l((e = { exports: {} }).exports, e), e.exports);
var bi = (l, e, t, n) => {
  if (e && typeof e == "object" || typeof e == "function") for (let i of pi(e)) !hi.call(l, i) && i !== t && Me(l, i, { get: () => e[i], enumerable: !(n = di(e, i)) || n.enumerable });
  return l;
};
var g = (l, e, t) => (t = l != null ? fi(yi(l)) : {}, bi(e || !l || !l.__esModule ? Me(t, "default", { value: l, enumerable: true }) : t, l));
var pe = (l, e, t) => (mi(l, typeof e != "symbol" ? e + "" : e, t), t);
var h = gi((Nr) => {
  "use strict";
  (function(l) {
    function e() {
    }
    function t() {
    }
    var n = String.fromCharCode, i = {}.toString, r = i.call(l.SharedArrayBuffer), c = i(), o = l.Uint8Array, s = o || Array, a = o ? ArrayBuffer : s, u = a.isView || function(I) {
      return I && "length" in I;
    }, B = i.call(a.prototype);
    a = t.prototype;
    var w = l.TextEncoder, b = new (o ? Uint16Array : s)(32);
    e.prototype.decode = function(I) {
      if (!u(I)) {
        var $ = i.call(I);
        if ($ !== B && $ !== r && $ !== c) throw TypeError("Failed to execute 'decode' on 'TextDecoder': The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");
        I = o ? new s(I) : I || [];
      }
      for (var N = $ = "", k = 0, C = I.length | 0, de = C - 32 | 0, U, S, A = 0, J = 0, V, j = 0, M = -1; k < C; ) {
        for (U = k <= de ? 32 : C - k | 0; j < U; k = k + 1 | 0, j = j + 1 | 0) {
          switch (S = I[k] & 255, S >> 4) {
            case 15:
              if (V = I[k = k + 1 | 0] & 255, V >> 6 !== 2 || 247 < S) {
                k = k - 1 | 0;
                break;
              }
              A = (S & 7) << 6 | V & 63, J = 5, S = 256;
            case 14:
              V = I[k = k + 1 | 0] & 255, A <<= 6, A |= (S & 15) << 6 | V & 63, J = V >> 6 === 2 ? J + 4 | 0 : 24, S = S + 256 & 768;
            case 13:
            case 12:
              V = I[k = k + 1 | 0] & 255, A <<= 6, A |= (S & 31) << 6 | V & 63, J = J + 7 | 0, k < C && V >> 6 === 2 && A >> J && 1114112 > A ? (S = A, A = A - 65536 | 0, 0 <= A && (M = (A >> 10) + 55296 | 0, S = (A & 1023) + 56320 | 0, 31 > j ? (b[j] = M, j = j + 1 | 0, M = -1) : (V = M, M = S, S = V))) : (S >>= 8, k = k - S - 1 | 0, S = 65533), A = J = 0, U = k <= de ? 32 : C - k | 0;
            default:
              b[j] = S;
              continue;
            case 11:
            case 10:
            case 9:
            case 8:
          }
          b[j] = 65533;
        }
        if (N += n(b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], b[8], b[9], b[10], b[11], b[12], b[13], b[14], b[15], b[16], b[17], b[18], b[19], b[20], b[21], b[22], b[23], b[24], b[25], b[26], b[27], b[28], b[29], b[30], b[31]), 32 > j && (N = N.slice(0, j - 32 | 0)), k < C) {
          if (b[0] = M, j = ~M >>> 31, M = -1, N.length < $.length) continue;
        } else M !== -1 && (N += n(M));
        $ += N, N = "";
      }
      return $;
    }, a.encode = function(I) {
      I = I === void 0 ? "" : "" + I;
      var $ = I.length | 0, N = new s(($ << 1) + 8 | 0), k, C = 0, de = !o;
      for (k = 0; k < $; k = k + 1 | 0, C = C + 1 | 0) {
        var U = I.charCodeAt(k) | 0;
        if (127 >= U) N[C] = U;
        else {
          if (2047 >= U) N[C] = 192 | U >> 6;
          else {
            e: {
              if (55296 <= U) if (56319 >= U) {
                var S = I.charCodeAt(k = k + 1 | 0) | 0;
                if (56320 <= S && 57343 >= S) {
                  if (U = (U << 10) + S - 56613888 | 0, 65535 < U) {
                    N[C] = 240 | U >> 18, N[C = C + 1 | 0] = 128 | U >> 12 & 63, N[C = C + 1 | 0] = 128 | U >> 6 & 63, N[C = C + 1 | 0] = 128 | U & 63;
                    continue;
                  }
                  break e;
                }
                U = 65533;
              } else 57343 >= U && (U = 65533);
              !de && k << 1 < C && k << 1 < (C - 7 | 0) && (de = true, S = new s(3 * $), S.set(N), N = S);
            }
            N[C] = 224 | U >> 12, N[C = C + 1 | 0] = 128 | U >> 6 & 63;
          }
          N[C = C + 1 | 0] = 128 | U & 63;
        }
      }
      return o ? N.subarray(0, C) : N.slice(0, C);
    }, w || (l.TextDecoder = e, l.TextEncoder = t);
  })("undefined" == typeof global ? "undefined" == typeof globalThis ? Nr : globalThis : global);
});
var Wc = g(h(), 1);
var tc = g(h(), 1);
var jo = g(h());
var Xi = g(h());
function Be(l) {
  let e = typeof l;
  if (e == "object") {
    if (Array.isArray(l)) return "array";
    if (l === null) return "null";
  }
  return e;
}
function Sr(l) {
  return l !== null && typeof l == "object" && !Array.isArray(l);
}
var Yi = g(h()), v = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split(""), Ie = [];
for (let l = 0; l < v.length; l++) Ie[v[l].charCodeAt(0)] = l;
Ie["-".charCodeAt(0)] = v.indexOf("+");
Ie["_".charCodeAt(0)] = v.indexOf("/");
function Te(l) {
  let e = l.length * 3 / 4;
  l[l.length - 2] == "=" ? e -= 2 : l[l.length - 1] == "=" && (e -= 1);
  let t = new Uint8Array(e), n = 0, i = 0, r, c = 0;
  for (let o = 0; o < l.length; o++) {
    if (r = Ie[l.charCodeAt(o)], r === void 0) switch (l[o]) {
      case "=":
        i = 0;
      case `
`:
      case "\r":
      case "	":
      case " ":
        continue;
      default:
        throw Error("invalid base64 string.");
    }
    switch (i) {
      case 0:
        c = r, i = 1;
        break;
      case 1:
        t[n++] = c << 2 | (r & 48) >> 4, c = r, i = 2;
        break;
      case 2:
        t[n++] = (c & 15) << 4 | (r & 60) >> 2, c = r, i = 3;
        break;
      case 3:
        t[n++] = (c & 3) << 6 | r, i = 0;
        break;
    }
  }
  if (i == 1) throw Error("invalid base64 string.");
  return t.subarray(0, n);
}
function Q(l) {
  let e = "", t = 0, n, i = 0;
  for (let r = 0; r < l.length; r++) switch (n = l[r], t) {
    case 0:
      e += v[n >> 2], i = (n & 3) << 4, t = 1;
      break;
    case 1:
      e += v[i | n >> 4], i = (n & 15) << 2, t = 2;
      break;
    case 2:
      e += v[i | n >> 6], e += v[n & 63], t = 0;
      break;
  }
  return t && (e += v[i], e += "=", t == 1 && (e += "=")), e;
}
var Zi = g(h()), d;
(function(l) {
  l.symbol = Symbol.for("protobuf-ts/unknown"), l.onRead = (t, n, i, r, c) => {
    (e(n) ? n[l.symbol] : n[l.symbol] = []).push({ no: i, wireType: r, data: c });
  }, l.onWrite = (t, n, i) => {
    for (let { no: r, wireType: c, data: o } of l.list(n)) i.tag(r, c).raw(o);
  }, l.list = (t, n) => {
    if (e(t)) {
      let i = t[l.symbol];
      return n ? i.filter((r) => r.no == n) : i;
    }
    return [];
  }, l.last = (t, n) => l.list(t, n).slice(-1)[0];
  let e = (t) => t && Array.isArray(t[l.symbol]);
})(d || (d = {}));
var f;
(function(l) {
  l[l.Varint = 0] = "Varint", l[l.Bit64 = 1] = "Bit64", l[l.LengthDelimited = 2] = "LengthDelimited", l[l.StartGroup = 3] = "StartGroup", l[l.EndGroup = 4] = "EndGroup", l[l.Bit32 = 5] = "Bit32";
})(f || (f = {}));
var la = g(h());
var ra = g(h());
var ea = g(h());
function Or() {
  let l = 0, e = 0;
  for (let n = 0; n < 28; n += 7) {
    let i = this.buf[this.pos++];
    if (l |= (i & 127) << n, !(i & 128)) return this.assertBounds(), [l, e];
  }
  let t = this.buf[this.pos++];
  if (l |= (t & 15) << 28, e = (t & 112) >> 4, !(t & 128)) return this.assertBounds(), [l, e];
  for (let n = 3; n <= 31; n += 7) {
    let i = this.buf[this.pos++];
    if (e |= (i & 127) << n, !(i & 128)) return this.assertBounds(), [l, e];
  }
  throw new Error("invalid varint");
}
function xe(l, e, t) {
  for (let r = 0; r < 28; r = r + 7) {
    let c = l >>> r, o = !(!(c >>> 7) && e == 0), s = (o ? c | 128 : c) & 255;
    if (t.push(s), !o) return;
  }
  let n = l >>> 28 & 15 | (e & 7) << 4, i = !!(e >> 3);
  if (t.push((i ? n | 128 : n) & 255), !!i) {
    for (let r = 3; r < 31; r = r + 7) {
      let c = e >>> r, o = !!(c >>> 7), s = (o ? c | 128 : c) & 255;
      if (t.push(s), !o) return;
    }
    t.push(e >>> 31 & 1);
  }
}
var Ce = (1 << 16) * (1 << 16);
function ve(l) {
  let e = l[0] == "-";
  e && (l = l.slice(1));
  let t = 1e6, n = 0, i = 0;
  function r(c, o) {
    let s = Number(l.slice(c, o));
    i *= t, n = n * t + s, n >= Ce && (i = i + (n / Ce | 0), n = n % Ce);
  }
  return r(-24, -18), r(-18, -12), r(-12, -6), r(-6), [e, n, i];
}
function We(l, e) {
  if (e >>> 0 <= 2097151) return "" + (Ce * e + (l >>> 0));
  let t = l & 16777215, n = (l >>> 24 | e << 8) >>> 0 & 16777215, i = e >> 16 & 65535, r = t + n * 6777216 + i * 6710656, c = n + i * 8147497, o = i * 2, s = 1e7;
  r >= s && (c += Math.floor(r / s), r %= s), c >= s && (o += Math.floor(c / s), c %= s);
  function a(u, B) {
    let w = u ? String(u) : "";
    return B ? "0000000".slice(w.length) + w : w;
  }
  return a(o, 0) + a(c, o) + a(r, 1);
}
function Ge(l, e) {
  if (l >= 0) {
    for (; l > 127; ) e.push(l & 127 | 128), l = l >>> 7;
    e.push(l);
  } else {
    for (let t = 0; t < 9; t++) e.push(l & 127 | 128), l = l >> 7;
    e.push(1);
  }
}
function Pr() {
  let l = this.buf[this.pos++], e = l & 127;
  if (!(l & 128)) return this.assertBounds(), e;
  if (l = this.buf[this.pos++], e |= (l & 127) << 7, !(l & 128)) return this.assertBounds(), e;
  if (l = this.buf[this.pos++], e |= (l & 127) << 14, !(l & 128)) return this.assertBounds(), e;
  if (l = this.buf[this.pos++], e |= (l & 127) << 21, !(l & 128)) return this.assertBounds(), e;
  l = this.buf[this.pos++], e |= (l & 15) << 28;
  for (let t = 5; l & 128 && t < 10; t++) l = this.buf[this.pos++];
  if (l & 128) throw new Error("invalid varint");
  return this.assertBounds(), e >>> 0;
}
var x;
function ki() {
  let l = new DataView(new ArrayBuffer(8));
  x = globalThis.BigInt !== void 0 && typeof l.getBigInt64 == "function" && typeof l.getBigUint64 == "function" && typeof l.setBigInt64 == "function" && typeof l.setBigUint64 == "function" ? { MIN: BigInt("-9223372036854775808"), MAX: BigInt("9223372036854775807"), UMIN: BigInt("0"), UMAX: BigInt("18446744073709551615"), C: BigInt, V: l } : void 0;
}
ki();
function Ur(l) {
  if (!l) throw new Error("BigInt unavailable, see https://github.com/timostamm/protobuf-ts/blob/v1.0.8/MANUAL.md#bigint-support");
}
var Er = /^-?[0-9]+$/, Se = 4294967296, Ne = 2147483648, Oe = class {
  constructor(e, t) {
    this.lo = e | 0, this.hi = t | 0;
  }
  isZero() {
    return this.lo == 0 && this.hi == 0;
  }
  toNumber() {
    let e = this.hi * Se + (this.lo >>> 0);
    if (!Number.isSafeInteger(e)) throw new Error("cannot convert to safe number");
    return e;
  }
}, O = class extends Oe {
  static from(e) {
    if (x) switch (typeof e) {
      case "string":
        if (e == "0") return this.ZERO;
        if (e == "") throw new Error("string is no integer");
        e = x.C(e);
      case "number":
        if (e === 0) return this.ZERO;
        e = x.C(e);
      case "bigint":
        if (!e) return this.ZERO;
        if (e < x.UMIN) throw new Error("signed value for ulong");
        if (e > x.UMAX) throw new Error("ulong too large");
        return x.V.setBigUint64(0, e, true), new O(x.V.getInt32(0, true), x.V.getInt32(4, true));
    }
    else switch (typeof e) {
      case "string":
        if (e == "0") return this.ZERO;
        if (e = e.trim(), !Er.test(e)) throw new Error("string is no integer");
        let [t, n, i] = ve(e);
        if (t) throw new Error("signed value for ulong");
        return new O(n, i);
      case "number":
        if (e == 0) return this.ZERO;
        if (!Number.isSafeInteger(e)) throw new Error("number is no integer");
        if (e < 0) throw new Error("signed value for ulong");
        return new O(e, e / Se);
    }
    throw new Error("unknown value " + typeof e);
  }
  toString() {
    return x ? this.toBigInt().toString() : We(this.lo, this.hi);
  }
  toBigInt() {
    return Ur(x), x.V.setInt32(0, this.lo, true), x.V.setInt32(4, this.hi, true), x.V.getBigUint64(0, true);
  }
};
O.ZERO = new O(0, 0);
var T = class extends Oe {
  static from(e) {
    if (x) switch (typeof e) {
      case "string":
        if (e == "0") return this.ZERO;
        if (e == "") throw new Error("string is no integer");
        e = x.C(e);
      case "number":
        if (e === 0) return this.ZERO;
        e = x.C(e);
      case "bigint":
        if (!e) return this.ZERO;
        if (e < x.MIN) throw new Error("signed long too small");
        if (e > x.MAX) throw new Error("signed long too large");
        return x.V.setBigInt64(0, e, true), new T(x.V.getInt32(0, true), x.V.getInt32(4, true));
    }
    else switch (typeof e) {
      case "string":
        if (e == "0") return this.ZERO;
        if (e = e.trim(), !Er.test(e)) throw new Error("string is no integer");
        let [t, n, i] = ve(e);
        if (t) {
          if (i > Ne || i == Ne && n != 0) throw new Error("signed long too small");
        } else if (i >= Ne) throw new Error("signed long too large");
        let r = new T(n, i);
        return t ? r.negate() : r;
      case "number":
        if (e == 0) return this.ZERO;
        if (!Number.isSafeInteger(e)) throw new Error("number is no integer");
        return e > 0 ? new T(e, e / Se) : new T(-e, -e / Se).negate();
    }
    throw new Error("unknown value " + typeof e);
  }
  isNegative() {
    return (this.hi & Ne) !== 0;
  }
  negate() {
    let e = ~this.hi, t = this.lo;
    return t ? t = ~t + 1 : e += 1, new T(t, e);
  }
  toString() {
    if (x) return this.toBigInt().toString();
    if (this.isNegative()) {
      let e = this.negate();
      return "-" + We(e.lo, e.hi);
    }
    return We(this.lo, this.hi);
  }
  toBigInt() {
    return Ur(x), x.V.setInt32(0, this.lo, true), x.V.setInt32(4, this.hi, true), x.V.getBigInt64(0, true);
  }
};
T.ZERO = new T(0, 0);
var Fr = { readUnknownField: true, readerFactory: (l) => new Ke(l) };
function Lr(l) {
  return l ? Object.assign(Object.assign({}, Fr), l) : Fr;
}
var Ke = class {
  constructor(e, t) {
    this.varint64 = Or, this.uint32 = Pr, this.buf = e, this.len = e.length, this.pos = 0, this.view = new DataView(e.buffer, e.byteOffset, e.byteLength), this.textDecoder = t ?? new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  }
  tag() {
    let e = this.uint32(), t = e >>> 3, n = e & 7;
    if (t <= 0 || n < 0 || n > 5) throw new Error("illegal tag: field no " + t + " wire type " + n);
    return [t, n];
  }
  skip(e) {
    let t = this.pos;
    switch (e) {
      case f.Varint:
        for (; this.buf[this.pos++] & 128; ) ;
        break;
      case f.Bit64:
        this.pos += 4;
      case f.Bit32:
        this.pos += 4;
        break;
      case f.LengthDelimited:
        let n = this.uint32();
        this.pos += n;
        break;
      case f.StartGroup:
        let i;
        for (; (i = this.tag()[1]) !== f.EndGroup; ) this.skip(i);
        break;
      default:
        throw new Error("cant skip wire type " + e);
    }
    return this.assertBounds(), this.buf.subarray(t, this.pos);
  }
  assertBounds() {
    if (this.pos > this.len) throw new RangeError("premature EOF");
  }
  int32() {
    return this.uint32() | 0;
  }
  sint32() {
    let e = this.uint32();
    return e >>> 1 ^ -(e & 1);
  }
  int64() {
    return new T(...this.varint64());
  }
  uint64() {
    return new O(...this.varint64());
  }
  sint64() {
    let [e, t] = this.varint64(), n = -(e & 1);
    return e = (e >>> 1 | (t & 1) << 31) ^ n, t = t >>> 1 ^ n, new T(e, t);
  }
  bool() {
    let [e, t] = this.varint64();
    return e !== 0 || t !== 0;
  }
  fixed32() {
    return this.view.getUint32((this.pos += 4) - 4, true);
  }
  sfixed32() {
    return this.view.getInt32((this.pos += 4) - 4, true);
  }
  fixed64() {
    return new O(this.sfixed32(), this.sfixed32());
  }
  sfixed64() {
    return new T(this.sfixed32(), this.sfixed32());
  }
  float() {
    return this.view.getFloat32((this.pos += 4) - 4, true);
  }
  double() {
    return this.view.getFloat64((this.pos += 8) - 8, true);
  }
  bytes() {
    let e = this.uint32(), t = this.pos;
    return this.pos += e, this.assertBounds(), this.buf.subarray(t, t + e);
  }
  string() {
    return this.textDecoder.decode(this.bytes());
  }
};
var ha = g(h());
var ua = g(h());
function R(l, e) {
  if (!l) throw new Error(e);
}
var Ri = 34028234663852886e22, wi = -34028234663852886e22, Bi = 4294967295, Ii = 2147483647, Ti = -2147483648;
function H(l) {
  if (typeof l != "number") throw new Error("invalid int 32: " + typeof l);
  if (!Number.isInteger(l) || l > Ii || l < Ti) throw new Error("invalid int 32: " + l);
}
function X(l) {
  if (typeof l != "number") throw new Error("invalid uint 32: " + typeof l);
  if (!Number.isInteger(l) || l > Bi || l < 0) throw new Error("invalid uint 32: " + l);
}
function ee(l) {
  if (typeof l != "number") throw new Error("invalid float 32: " + typeof l);
  if (Number.isFinite(l) && (l > Ri || l < wi)) throw new Error("invalid float 32: " + l);
}
var Ar = { writeUnknownFields: true, writerFactory: () => new He() };
function Dr(l) {
  return l ? Object.assign(Object.assign({}, Ar), l) : Ar;
}
var He = class {
  constructor(e) {
    this.stack = [], this.textEncoder = e ?? new TextEncoder(), this.chunks = [], this.buf = [];
  }
  finish() {
    this.chunks.push(new Uint8Array(this.buf));
    let e = 0;
    for (let i = 0; i < this.chunks.length; i++) e += this.chunks[i].length;
    let t = new Uint8Array(e), n = 0;
    for (let i = 0; i < this.chunks.length; i++) t.set(this.chunks[i], n), n += this.chunks[i].length;
    return this.chunks = [], t;
  }
  fork() {
    return this.stack.push({ chunks: this.chunks, buf: this.buf }), this.chunks = [], this.buf = [], this;
  }
  join() {
    let e = this.finish(), t = this.stack.pop();
    if (!t) throw new Error("invalid state, fork stack empty");
    return this.chunks = t.chunks, this.buf = t.buf, this.uint32(e.byteLength), this.raw(e);
  }
  tag(e, t) {
    return this.uint32((e << 3 | t) >>> 0);
  }
  raw(e) {
    return this.buf.length && (this.chunks.push(new Uint8Array(this.buf)), this.buf = []), this.chunks.push(e), this;
  }
  uint32(e) {
    for (X(e); e > 127; ) this.buf.push(e & 127 | 128), e = e >>> 7;
    return this.buf.push(e), this;
  }
  int32(e) {
    return H(e), Ge(e, this.buf), this;
  }
  bool(e) {
    return this.buf.push(e ? 1 : 0), this;
  }
  bytes(e) {
    return this.uint32(e.byteLength), this.raw(e);
  }
  string(e) {
    let t = this.textEncoder.encode(e);
    return this.uint32(t.byteLength), this.raw(t);
  }
  float(e) {
    ee(e);
    let t = new Uint8Array(4);
    return new DataView(t.buffer).setFloat32(0, e, true), this.raw(t);
  }
  double(e) {
    let t = new Uint8Array(8);
    return new DataView(t.buffer).setFloat64(0, e, true), this.raw(t);
  }
  fixed32(e) {
    X(e);
    let t = new Uint8Array(4);
    return new DataView(t.buffer).setUint32(0, e, true), this.raw(t);
  }
  sfixed32(e) {
    H(e);
    let t = new Uint8Array(4);
    return new DataView(t.buffer).setInt32(0, e, true), this.raw(t);
  }
  sint32(e) {
    return H(e), e = (e << 1 ^ e >> 31) >>> 0, Ge(e, this.buf), this;
  }
  sfixed64(e) {
    let t = new Uint8Array(8), n = new DataView(t.buffer), i = T.from(e);
    return n.setInt32(0, i.lo, true), n.setInt32(4, i.hi, true), this.raw(t);
  }
  fixed64(e) {
    let t = new Uint8Array(8), n = new DataView(t.buffer), i = O.from(e);
    return n.setInt32(0, i.lo, true), n.setInt32(4, i.hi, true), this.raw(t);
  }
  int64(e) {
    let t = T.from(e);
    return xe(t.lo, t.hi, this.buf), this;
  }
  sint64(e) {
    let t = T.from(e), n = t.hi >> 31, i = t.lo << 1 ^ n, r = (t.hi << 1 | t.lo >>> 31) ^ n;
    return xe(i, r, this.buf), this;
  }
  uint64(e) {
    let t = O.from(e);
    return xe(t.lo, t.hi, this.buf), this;
  }
};
var ga = g(h()), $r = { emitDefaultValues: false, enumAsInteger: false, useProtoFieldName: false, prettySpaces: 0 }, jr = { ignoreUnknownFields: false };
function Vr(l) {
  return l ? Object.assign(Object.assign({}, jr), l) : jr;
}
function Mr(l) {
  return l ? Object.assign(Object.assign({}, $r), l) : $r;
}
var ka = g(h()), Pe = Symbol.for("protobuf-ts/message-type");
var Ao = g(h());
var Ta = g(h());
var wa = g(h());
function _e(l) {
  let e = false, t = [];
  for (let n = 0; n < l.length; n++) {
    let i = l.charAt(n);
    i == "_" ? e = true : /\d/.test(i) ? (t.push(i), e = true) : e ? (t.push(i.toUpperCase()), e = false) : n == 0 ? t.push(i.toLowerCase()) : t.push(i);
  }
  return t.join("");
}
var p;
(function(l) {
  l[l.DOUBLE = 1] = "DOUBLE", l[l.FLOAT = 2] = "FLOAT", l[l.INT64 = 3] = "INT64", l[l.UINT64 = 4] = "UINT64", l[l.INT32 = 5] = "INT32", l[l.FIXED64 = 6] = "FIXED64", l[l.FIXED32 = 7] = "FIXED32", l[l.BOOL = 8] = "BOOL", l[l.STRING = 9] = "STRING", l[l.BYTES = 12] = "BYTES", l[l.UINT32 = 13] = "UINT32", l[l.SFIXED32 = 15] = "SFIXED32", l[l.SFIXED64 = 16] = "SFIXED64", l[l.SINT32 = 17] = "SINT32", l[l.SINT64 = 18] = "SINT64";
})(p || (p = {}));
var L;
(function(l) {
  l[l.BIGINT = 0] = "BIGINT", l[l.STRING = 1] = "STRING", l[l.NUMBER = 2] = "NUMBER";
})(L || (L = {}));
var ye;
(function(l) {
  l[l.NO = 0] = "NO", l[l.PACKED = 1] = "PACKED", l[l.UNPACKED = 2] = "UNPACKED";
})(ye || (ye = {}));
function vr(l) {
  var e, t, n, i;
  return l.localName = (e = l.localName) !== null && e !== void 0 ? e : _e(l.name), l.jsonName = (t = l.jsonName) !== null && t !== void 0 ? t : _e(l.name), l.repeat = (n = l.repeat) !== null && n !== void 0 ? n : ye.NO, l.opt = (i = l.opt) !== null && i !== void 0 ? i : l.repeat || l.oneof ? false : l.kind == "message", l;
}
var Oa = g(h());
var xa = g(h());
function Gr(l) {
  if (typeof l != "object" || l === null || !l.hasOwnProperty("oneofKind")) return false;
  switch (typeof l.oneofKind) {
    case "string":
      return l[l.oneofKind] === void 0 ? false : Object.keys(l).length == 2;
    case "undefined":
      return Object.keys(l).length == 1;
    default:
      return false;
  }
}
var Ue = class {
  constructor(e) {
    var t;
    this.fields = (t = e.fields) !== null && t !== void 0 ? t : [];
  }
  prepare() {
    if (this.data) return;
    let e = [], t = [], n = [];
    for (let i of this.fields) if (i.oneof) n.includes(i.oneof) || (n.push(i.oneof), e.push(i.oneof), t.push(i.oneof));
    else switch (t.push(i.localName), i.kind) {
      case "scalar":
      case "enum":
        (!i.opt || i.repeat) && e.push(i.localName);
        break;
      case "message":
        i.repeat && e.push(i.localName);
        break;
      case "map":
        e.push(i.localName);
        break;
    }
    this.data = { req: e, known: t, oneofs: Object.values(n) };
  }
  is(e, t, n = false) {
    if (t < 0) return true;
    if (e == null || typeof e != "object") return false;
    this.prepare();
    let i = Object.keys(e), r = this.data;
    if (i.length < r.req.length || r.req.some((c) => !i.includes(c)) || !n && i.some((c) => !r.known.includes(c))) return false;
    if (t < 1) return true;
    for (let c of r.oneofs) {
      let o = e[c];
      if (!Gr(o)) return false;
      if (o.oneofKind === void 0) continue;
      let s = this.fields.find((a) => a.localName === o.oneofKind);
      if (!s || !this.field(o[o.oneofKind], s, n, t)) return false;
    }
    for (let c of this.fields) if (c.oneof === void 0 && !this.field(e[c.localName], c, n, t)) return false;
    return true;
  }
  field(e, t, n, i) {
    let r = t.repeat;
    switch (t.kind) {
      case "scalar":
        return e === void 0 ? t.opt : r ? this.scalars(e, t.T, i, t.L) : this.scalar(e, t.T, t.L);
      case "enum":
        return e === void 0 ? t.opt : r ? this.scalars(e, p.INT32, i) : this.scalar(e, p.INT32);
      case "message":
        return e === void 0 ? true : r ? this.messages(e, t.T(), n, i) : this.message(e, t.T(), n, i);
      case "map":
        if (typeof e != "object" || e === null) return false;
        if (i < 2) return true;
        if (!this.mapKeys(e, t.K, i)) return false;
        switch (t.V.kind) {
          case "scalar":
            return this.scalars(Object.values(e), t.V.T, i, t.V.L);
          case "enum":
            return this.scalars(Object.values(e), p.INT32, i);
          case "message":
            return this.messages(Object.values(e), t.V.T(), n, i);
        }
        break;
    }
    return true;
  }
  message(e, t, n, i) {
    return n ? t.isAssignable(e, i) : t.is(e, i);
  }
  messages(e, t, n, i) {
    if (!Array.isArray(e)) return false;
    if (i < 2) return true;
    if (n) {
      for (let r = 0; r < e.length && r < i; r++) if (!t.isAssignable(e[r], i - 1)) return false;
    } else for (let r = 0; r < e.length && r < i; r++) if (!t.is(e[r], i - 1)) return false;
    return true;
  }
  scalar(e, t, n) {
    let i = typeof e;
    switch (t) {
      case p.UINT64:
      case p.FIXED64:
      case p.INT64:
      case p.SFIXED64:
      case p.SINT64:
        switch (n) {
          case L.BIGINT:
            return i == "bigint";
          case L.NUMBER:
            return i == "number" && !isNaN(e);
          default:
            return i == "string";
        }
      case p.BOOL:
        return i == "boolean";
      case p.STRING:
        return i == "string";
      case p.BYTES:
        return e instanceof Uint8Array;
      case p.DOUBLE:
      case p.FLOAT:
        return i == "number" && !isNaN(e);
      default:
        return i == "number" && Number.isInteger(e);
    }
  }
  scalars(e, t, n, i) {
    if (!Array.isArray(e)) return false;
    if (n < 2) return true;
    if (Array.isArray(e)) {
      for (let r = 0; r < e.length && r < n; r++) if (!this.scalar(e[r], t, i)) return false;
    }
    return true;
  }
  mapKeys(e, t, n) {
    let i = Object.keys(e);
    switch (t) {
      case p.INT32:
      case p.FIXED32:
      case p.SFIXED32:
      case p.SINT32:
      case p.UINT32:
        return this.scalars(i.slice(0, n).map((r) => parseInt(r)), t, n);
      case p.BOOL:
        return this.scalars(i.slice(0, n).map((r) => r == "true" ? true : r == "false" ? false : r), t, n);
      default:
        return this.scalars(i, t, n, L.STRING);
    }
  }
};
var Ma = g(h());
var Ea = g(h());
function D(l, e) {
  switch (e) {
    case L.BIGINT:
      return l.toBigInt();
    case L.NUMBER:
      return l.toNumber();
    default:
      return l.toString();
  }
}
var Ee = class {
  constructor(e) {
    this.info = e;
  }
  prepare() {
    var e;
    if (this.fMap === void 0) {
      this.fMap = {};
      let t = (e = this.info.fields) !== null && e !== void 0 ? e : [];
      for (let n of t) this.fMap[n.name] = n, this.fMap[n.jsonName] = n, this.fMap[n.localName] = n;
    }
  }
  assert(e, t, n) {
    if (!e) {
      let i = Be(n);
      throw (i == "number" || i == "boolean") && (i = n.toString()), new Error(`Cannot parse JSON ${i} for ${this.info.typeName}#${t}`);
    }
  }
  read(e, t, n) {
    this.prepare();
    let i = [];
    for (let [r, c] of Object.entries(e)) {
      let o = this.fMap[r];
      if (!o) {
        if (!n.ignoreUnknownFields) throw new Error(`Found unknown field while reading ${this.info.typeName} from JSON format. JSON key: ${r}`);
        continue;
      }
      let s = o.localName, a;
      if (o.oneof) {
        if (c === null && (o.kind !== "enum" || o.T()[0] !== "google.protobuf.NullValue")) continue;
        if (i.includes(o.oneof)) throw new Error(`Multiple members of the oneof group "${o.oneof}" of ${this.info.typeName} are present in JSON.`);
        i.push(o.oneof), a = t[o.oneof] = { oneofKind: s };
      } else a = t;
      if (o.kind == "map") {
        if (c === null) continue;
        this.assert(Sr(c), o.name, c);
        let u = a[s];
        for (let [B, w] of Object.entries(c)) {
          this.assert(w !== null, o.name + " map value", null);
          let b;
          switch (o.V.kind) {
            case "message":
              b = o.V.T().internalJsonRead(w, n);
              break;
            case "enum":
              if (b = this.enum(o.V.T(), w, o.name, n.ignoreUnknownFields), b === false) continue;
              break;
            case "scalar":
              b = this.scalar(w, o.V.T, o.V.L, o.name);
              break;
          }
          this.assert(b !== void 0, o.name + " map value", w);
          let I = B;
          o.K == p.BOOL && (I = I == "true" ? true : I == "false" ? false : I), I = this.scalar(I, o.K, L.STRING, o.name).toString(), u[I] = b;
        }
      } else if (o.repeat) {
        if (c === null) continue;
        this.assert(Array.isArray(c), o.name, c);
        let u = a[s];
        for (let B of c) {
          this.assert(B !== null, o.name, null);
          let w;
          switch (o.kind) {
            case "message":
              w = o.T().internalJsonRead(B, n);
              break;
            case "enum":
              if (w = this.enum(o.T(), B, o.name, n.ignoreUnknownFields), w === false) continue;
              break;
            case "scalar":
              w = this.scalar(B, o.T, o.L, o.name);
              break;
          }
          this.assert(w !== void 0, o.name, c), u.push(w);
        }
      } else switch (o.kind) {
        case "message":
          if (c === null && o.T().typeName != "google.protobuf.Value") {
            this.assert(o.oneof === void 0, o.name + " (oneof member)", null);
            continue;
          }
          a[s] = o.T().internalJsonRead(c, n, a[s]);
          break;
        case "enum":
          let u = this.enum(o.T(), c, o.name, n.ignoreUnknownFields);
          if (u === false) continue;
          a[s] = u;
          break;
        case "scalar":
          a[s] = this.scalar(c, o.T, o.L, o.name);
          break;
      }
    }
  }
  enum(e, t, n, i) {
    if (e[0] == "google.protobuf.NullValue" && R(t === null || t === "NULL_VALUE", `Unable to parse field ${this.info.typeName}#${n}, enum ${e[0]} only accepts null.`), t === null) return 0;
    switch (typeof t) {
      case "number":
        return R(Number.isInteger(t), `Unable to parse field ${this.info.typeName}#${n}, enum can only be integral number, got ${t}.`), t;
      case "string":
        let r = t;
        e[2] && t.substring(0, e[2].length) === e[2] && (r = t.substring(e[2].length));
        let c = e[1][r];
        return typeof c > "u" && i ? false : (R(typeof c == "number", `Unable to parse field ${this.info.typeName}#${n}, enum ${e[0]} has no value for "${t}".`), c);
    }
    R(false, `Unable to parse field ${this.info.typeName}#${n}, cannot parse enum value from ${typeof t}".`);
  }
  scalar(e, t, n, i) {
    let r;
    try {
      switch (t) {
        case p.DOUBLE:
        case p.FLOAT:
          if (e === null) return 0;
          if (e === "NaN") return Number.NaN;
          if (e === "Infinity") return Number.POSITIVE_INFINITY;
          if (e === "-Infinity") return Number.NEGATIVE_INFINITY;
          if (e === "") {
            r = "empty string";
            break;
          }
          if (typeof e == "string" && e.trim().length !== e.length) {
            r = "extra whitespace";
            break;
          }
          if (typeof e != "string" && typeof e != "number") break;
          let c = Number(e);
          if (Number.isNaN(c)) {
            r = "not a number";
            break;
          }
          if (!Number.isFinite(c)) {
            r = "too large or small";
            break;
          }
          return t == p.FLOAT && ee(c), c;
        case p.INT32:
        case p.FIXED32:
        case p.SFIXED32:
        case p.SINT32:
        case p.UINT32:
          if (e === null) return 0;
          let o;
          if (typeof e == "number" ? o = e : e === "" ? r = "empty string" : typeof e == "string" && (e.trim().length !== e.length ? r = "extra whitespace" : o = Number(e)), o === void 0) break;
          return t == p.UINT32 ? X(o) : H(o), o;
        case p.INT64:
        case p.SFIXED64:
        case p.SINT64:
          if (e === null) return D(T.ZERO, n);
          if (typeof e != "number" && typeof e != "string") break;
          return D(T.from(e), n);
        case p.FIXED64:
        case p.UINT64:
          if (e === null) return D(O.ZERO, n);
          if (typeof e != "number" && typeof e != "string") break;
          return D(O.from(e), n);
        case p.BOOL:
          if (e === null) return false;
          if (typeof e != "boolean") break;
          return e;
        case p.STRING:
          if (e === null) return "";
          if (typeof e != "string") {
            r = "extra whitespace";
            break;
          }
          try {
            encodeURIComponent(e);
          } catch (s) {
            s = "invalid UTF8";
            break;
          }
          return e;
        case p.BYTES:
          if (e === null || e === "") return new Uint8Array(0);
          if (typeof e != "string") break;
          return Te(e);
      }
    } catch (c) {
      r = c.message;
    }
    this.assert(false, i + (r ? " - " + r : ""), e);
  }
};
var Ja = g(h());
var Fe = class {
  constructor(e) {
    var t;
    this.fields = (t = e.fields) !== null && t !== void 0 ? t : [];
  }
  write(e, t) {
    let n = {}, i = e;
    for (let r of this.fields) {
      if (!r.oneof) {
        let a = this.field(r, i[r.localName], t);
        a !== void 0 && (n[t.useProtoFieldName ? r.name : r.jsonName] = a);
        continue;
      }
      let c = i[r.oneof];
      if (c.oneofKind !== r.localName) continue;
      let o = r.kind == "scalar" || r.kind == "enum" ? Object.assign(Object.assign({}, t), { emitDefaultValues: true }) : t, s = this.field(r, c[r.localName], o);
      R(s !== void 0), n[t.useProtoFieldName ? r.name : r.jsonName] = s;
    }
    return n;
  }
  field(e, t, n) {
    let i;
    if (e.kind == "map") {
      R(typeof t == "object" && t !== null);
      let r = {};
      switch (e.V.kind) {
        case "scalar":
          for (let [s, a] of Object.entries(t)) {
            let u = this.scalar(e.V.T, a, e.name, false, true);
            R(u !== void 0), r[s.toString()] = u;
          }
          break;
        case "message":
          let c = e.V.T();
          for (let [s, a] of Object.entries(t)) {
            let u = this.message(c, a, e.name, n);
            R(u !== void 0), r[s.toString()] = u;
          }
          break;
        case "enum":
          let o = e.V.T();
          for (let [s, a] of Object.entries(t)) {
            R(a === void 0 || typeof a == "number");
            let u = this.enum(o, a, e.name, false, true, n.enumAsInteger);
            R(u !== void 0), r[s.toString()] = u;
          }
          break;
      }
      (n.emitDefaultValues || Object.keys(r).length > 0) && (i = r);
    } else if (e.repeat) {
      R(Array.isArray(t));
      let r = [];
      switch (e.kind) {
        case "scalar":
          for (let s = 0; s < t.length; s++) {
            let a = this.scalar(e.T, t[s], e.name, e.opt, true);
            R(a !== void 0), r.push(a);
          }
          break;
        case "enum":
          let c = e.T();
          for (let s = 0; s < t.length; s++) {
            R(t[s] === void 0 || typeof t[s] == "number");
            let a = this.enum(c, t[s], e.name, e.opt, true, n.enumAsInteger);
            R(a !== void 0), r.push(a);
          }
          break;
        case "message":
          let o = e.T();
          for (let s = 0; s < t.length; s++) {
            let a = this.message(o, t[s], e.name, n);
            R(a !== void 0), r.push(a);
          }
          break;
      }
      (n.emitDefaultValues || r.length > 0 || n.emitDefaultValues) && (i = r);
    } else switch (e.kind) {
      case "scalar":
        i = this.scalar(e.T, t, e.name, e.opt, n.emitDefaultValues);
        break;
      case "enum":
        i = this.enum(e.T(), t, e.name, e.opt, n.emitDefaultValues, n.enumAsInteger);
        break;
      case "message":
        i = this.message(e.T(), t, e.name, n);
        break;
    }
    return i;
  }
  enum(e, t, n, i, r, c) {
    if (e[0] == "google.protobuf.NullValue") return !r && !i ? void 0 : null;
    if (t === void 0) {
      R(i);
      return;
    }
    if (!(t === 0 && !r && !i)) return R(typeof t == "number"), R(Number.isInteger(t)), c || !e[1].hasOwnProperty(t) ? t : e[2] ? e[2] + e[1][t] : e[1][t];
  }
  message(e, t, n, i) {
    return t === void 0 ? i.emitDefaultValues ? null : void 0 : e.internalJsonWrite(t, i);
  }
  scalar(e, t, n, i, r) {
    if (t === void 0) {
      R(i);
      return;
    }
    let c = r || i;
    switch (e) {
      case p.INT32:
      case p.SFIXED32:
      case p.SINT32:
        return t === 0 ? c ? 0 : void 0 : (H(t), t);
      case p.FIXED32:
      case p.UINT32:
        return t === 0 ? c ? 0 : void 0 : (X(t), t);
      case p.FLOAT:
        ee(t);
      case p.DOUBLE:
        return t === 0 ? c ? 0 : void 0 : (R(typeof t == "number"), Number.isNaN(t) ? "NaN" : t === Number.POSITIVE_INFINITY ? "Infinity" : t === Number.NEGATIVE_INFINITY ? "-Infinity" : t);
      case p.STRING:
        return t === "" ? c ? "" : void 0 : (R(typeof t == "string"), t);
      case p.BOOL:
        return t === false ? c ? false : void 0 : (R(typeof t == "boolean"), t);
      case p.UINT64:
      case p.FIXED64:
        R(typeof t == "number" || typeof t == "string" || typeof t == "bigint");
        let o = O.from(t);
        return o.isZero() && !c ? void 0 : o.toString();
      case p.INT64:
      case p.SFIXED64:
      case p.SINT64:
        R(typeof t == "number" || typeof t == "string" || typeof t == "bigint");
        let s = T.from(t);
        return s.isZero() && !c ? void 0 : s.toString();
      case p.BYTES:
        return R(t instanceof Uint8Array), t.byteLength ? Q(t) : c ? "" : void 0;
    }
  }
};
var io = g(h());
var Za = g(h());
function he(l, e = L.STRING) {
  switch (l) {
    case p.BOOL:
      return false;
    case p.UINT64:
    case p.FIXED64:
      return D(O.ZERO, e);
    case p.INT64:
    case p.SFIXED64:
    case p.SINT64:
      return D(T.ZERO, e);
    case p.DOUBLE:
    case p.FLOAT:
      return 0;
    case p.BYTES:
      return new Uint8Array(0);
    case p.STRING:
      return "";
    default:
      return 0;
  }
}
var Le = class {
  constructor(e) {
    this.info = e;
  }
  prepare() {
    var e;
    if (!this.fieldNoToField) {
      let t = (e = this.info.fields) !== null && e !== void 0 ? e : [];
      this.fieldNoToField = new Map(t.map((n) => [n.no, n]));
    }
  }
  read(e, t, n, i) {
    this.prepare();
    let r = i === void 0 ? e.len : e.pos + i;
    for (; e.pos < r; ) {
      let [c, o] = e.tag(), s = this.fieldNoToField.get(c);
      if (!s) {
        let w = n.readUnknownField;
        if (w == "throw") throw new Error(`Unknown field ${c} (wire type ${o}) for ${this.info.typeName}`);
        let b = e.skip(o);
        w !== false && (w === true ? d.onRead : w)(this.info.typeName, t, c, o, b);
        continue;
      }
      let a = t, u = s.repeat, B = s.localName;
      switch (s.oneof && (a = a[s.oneof], a.oneofKind !== B && (a = t[s.oneof] = { oneofKind: B })), s.kind) {
        case "scalar":
        case "enum":
          let w = s.kind == "enum" ? p.INT32 : s.T, b = s.kind == "scalar" ? s.L : void 0;
          if (u) {
            let N = a[B];
            if (o == f.LengthDelimited && w != p.STRING && w != p.BYTES) {
              let k = e.uint32() + e.pos;
              for (; e.pos < k; ) N.push(this.scalar(e, w, b));
            } else N.push(this.scalar(e, w, b));
          } else a[B] = this.scalar(e, w, b);
          break;
        case "message":
          if (u) {
            let N = a[B], k = s.T().internalBinaryRead(e, e.uint32(), n);
            N.push(k);
          } else a[B] = s.T().internalBinaryRead(e, e.uint32(), n, a[B]);
          break;
        case "map":
          let [I, $] = this.mapEntry(s, e, n);
          a[B][I] = $;
          break;
      }
    }
  }
  mapEntry(e, t, n) {
    let i = t.uint32(), r = t.pos + i, c, o;
    for (; t.pos < r; ) {
      let [s, a] = t.tag();
      switch (s) {
        case 1:
          e.K == p.BOOL ? c = t.bool().toString() : c = this.scalar(t, e.K, L.STRING);
          break;
        case 2:
          switch (e.V.kind) {
            case "scalar":
              o = this.scalar(t, e.V.T, e.V.L);
              break;
            case "enum":
              o = t.int32();
              break;
            case "message":
              o = e.V.T().internalBinaryRead(t, t.uint32(), n);
              break;
          }
          break;
        default:
          throw new Error(`Unknown field ${s} (wire type ${a}) in map entry for ${this.info.typeName}#${e.name}`);
      }
    }
    if (c === void 0) {
      let s = he(e.K);
      c = e.K == p.BOOL ? s.toString() : s;
    }
    if (o === void 0) switch (e.V.kind) {
      case "scalar":
        o = he(e.V.T, e.V.L);
        break;
      case "enum":
        o = 0;
        break;
      case "message":
        o = e.V.T().create();
        break;
    }
    return [c, o];
  }
  scalar(e, t, n) {
    switch (t) {
      case p.INT32:
        return e.int32();
      case p.STRING:
        return e.string();
      case p.BOOL:
        return e.bool();
      case p.DOUBLE:
        return e.double();
      case p.FLOAT:
        return e.float();
      case p.INT64:
        return D(e.int64(), n);
      case p.UINT64:
        return D(e.uint64(), n);
      case p.FIXED64:
        return D(e.fixed64(), n);
      case p.FIXED32:
        return e.fixed32();
      case p.BYTES:
        return e.bytes();
      case p.UINT32:
        return e.uint32();
      case p.SFIXED32:
        return e.sfixed32();
      case p.SFIXED64:
        return D(e.sfixed64(), n);
      case p.SINT32:
        return e.sint32();
      case p.SINT64:
        return D(e.sint64(), n);
    }
  }
};
var uo = g(h());
var Ae = class {
  constructor(e) {
    this.info = e;
  }
  prepare() {
    if (!this.fields) {
      let e = this.info.fields ? this.info.fields.concat() : [];
      // Recovered generated writers use descriptor declaration order. Preserve
      // that order instead of sorting so rebuilt bytes match those writers.
      this.fields = e;
    }
  }
  write(e, t, n) {
    this.prepare();
    for (let r of this.fields) {
      let c, o, s = r.repeat, a = r.localName;
      if (r.oneof) {
        let u = e[r.oneof];
        if (u.oneofKind !== a) continue;
        c = u[a], o = true;
      } else c = e[a], o = false;
      switch (r.kind) {
        case "scalar":
        case "enum":
          let u = r.kind == "enum" ? p.INT32 : r.T;
          if (s) if (R(Array.isArray(c)), s == ye.PACKED) this.packed(t, u, r.no, c);
          else for (let B of c) this.scalar(t, u, r.no, B, true);
          else c === void 0 ? R(r.opt) : this.scalar(t, u, r.no, c, o || r.opt);
          break;
        case "message":
          if (s) {
            R(Array.isArray(c));
            for (let B of c) this.message(t, n, r.T(), r.no, B);
          } else this.message(t, n, r.T(), r.no, c);
          break;
        case "map":
          R(typeof c == "object" && c !== null);
          for (let [B, w] of Object.entries(c)) this.mapEntry(t, n, r, B, w);
          break;
      }
    }
    let i = n.writeUnknownFields;
    i !== false && (i === true ? d.onWrite : i)(this.info.typeName, e, t);
  }
  mapEntry(e, t, n, i, r) {
    e.tag(n.no, f.LengthDelimited), e.fork();
    let c = i;
    switch (n.K) {
      case p.INT32:
      case p.FIXED32:
      case p.UINT32:
      case p.SFIXED32:
      case p.SINT32:
        c = Number.parseInt(i);
        break;
      case p.BOOL:
        R(i == "true" || i == "false"), c = i == "true";
        break;
    }
    switch (this.scalar(e, n.K, 1, c, true), n.V.kind) {
      case "scalar":
        this.scalar(e, n.V.T, 2, r, true);
        break;
      case "enum":
        this.scalar(e, p.INT32, 2, r, true);
        break;
      case "message":
        this.message(e, t, n.V.T(), 2, r);
        break;
    }
    e.join();
  }
  message(e, t, n, i, r) {
    r !== void 0 && (n.internalBinaryWrite(r, e.tag(i, f.LengthDelimited).fork(), t), e.join());
  }
  scalar(e, t, n, i, r) {
    let [c, o, s] = this.scalarInfo(t, i);
    (!s || r) && (e.tag(n, c), e[o](i));
  }
  packed(e, t, n, i) {
    if (!i.length) return;
    R(t !== p.BYTES && t !== p.STRING), e.tag(n, f.LengthDelimited), e.fork();
    let [, r] = this.scalarInfo(t);
    for (let c = 0; c < i.length; c++) e[r](i[c]);
    e.join();
  }
  scalarInfo(e, t) {
    let n = f.Varint, i, r = t === void 0, c = t === 0;
    switch (e) {
      case p.INT32:
        i = "int32";
        break;
      case p.STRING:
        c = r || !t.length, n = f.LengthDelimited, i = "string";
        break;
      case p.BOOL:
        c = t === false, i = "bool";
        break;
      case p.UINT32:
        i = "uint32";
        break;
      case p.DOUBLE:
        n = f.Bit64, i = "double";
        break;
      case p.FLOAT:
        n = f.Bit32, i = "float";
        break;
      case p.INT64:
        c = r || T.from(t).isZero(), i = "int64";
        break;
      case p.UINT64:
        c = r || O.from(t).isZero(), i = "uint64";
        break;
      case p.FIXED64:
        c = r || O.from(t).isZero(), n = f.Bit64, i = "fixed64";
        break;
      case p.BYTES:
        c = r || !t.byteLength, n = f.LengthDelimited, i = "bytes";
        break;
      case p.FIXED32:
        n = f.Bit32, i = "fixed32";
        break;
      case p.SFIXED32:
        n = f.Bit32, i = "sfixed32";
        break;
      case p.SFIXED64:
        c = r || T.from(t).isZero(), n = f.Bit64, i = "sfixed64";
        break;
      case p.SINT32:
        i = "sint32";
        break;
      case p.SINT64:
        c = r || T.from(t).isZero(), i = "sint64";
        break;
    }
    return [n, i, r || c];
  }
};
var ho = g(h());
function Kr(l) {
  let e = l.messagePrototype ? Object.create(l.messagePrototype) : Object.defineProperty({}, Pe, { value: l });
  for (let t of l.fields) {
    let n = t.localName;
    if (!t.opt) if (t.oneof) e[t.oneof] = { oneofKind: void 0 };
    else if (t.repeat) e[n] = [];
    else switch (t.kind) {
      case "scalar":
        e[n] = he(t.T, t.L);
        break;
      case "enum":
        e[n] = 0;
        break;
      case "map":
        e[n] = {};
        break;
    }
  }
  return e;
}
var go = g(h());
function y(l, e, t) {
  let n, i = t, r;
  for (let c of l.fields) {
    let o = c.localName;
    if (c.oneof) {
      let s = i[c.oneof];
      if (s?.oneofKind == null) continue;
      if (n = s[o], r = e[c.oneof], r.oneofKind = s.oneofKind, n == null) {
        delete r[o];
        continue;
      }
    } else if (n = i[o], r = e, n == null) continue;
    switch (c.repeat && (r[o].length = n.length), c.kind) {
      case "scalar":
      case "enum":
        if (c.repeat) for (let a = 0; a < n.length; a++) r[o][a] = n[a];
        else r[o] = n;
        break;
      case "message":
        let s = c.T();
        if (c.repeat) for (let a = 0; a < n.length; a++) r[o][a] = s.create(n[a]);
        else r[o] === void 0 ? r[o] = s.create(n) : s.mergePartial(r[o], n);
        break;
      case "map":
        switch (c.V.kind) {
          case "scalar":
          case "enum":
            Object.assign(r[o], n);
            break;
          case "message":
            let a = c.V.T();
            for (let u of Object.keys(n)) r[o][u] = a.create(n[u]);
            break;
        }
        break;
    }
  }
}
var Ro = g(h());
function Jr(l, e, t) {
  if (e === t) return true;
  if (!e || !t) return false;
  for (let n of l.fields) {
    let i = n.localName, r = n.oneof ? e[n.oneof][i] : e[i], c = n.oneof ? t[n.oneof][i] : t[i];
    switch (n.kind) {
      case "enum":
      case "scalar":
        let o = n.kind == "enum" ? p.INT32 : n.T;
        if (!(n.repeat ? Hr(o, r, c) : Xr(o, r, c))) return false;
        break;
      case "map":
        if (!(n.V.kind == "message" ? _r(n.V.T(), De(r), De(c)) : Hr(n.V.kind == "enum" ? p.INT32 : n.V.T, De(r), De(c)))) return false;
        break;
      case "message":
        let s = n.T();
        if (!(n.repeat ? _r(s, r, c) : s.equals(r, c))) return false;
        break;
    }
  }
  return true;
}
var De = Object.values;
function Xr(l, e, t) {
  if (e === t) return true;
  if (l !== p.BYTES) return false;
  let n = e, i = t;
  if (n.length !== i.length) return false;
  for (let r = 0; r < n.length; r++) if (n[r] != i[r]) return false;
  return true;
}
function Hr(l, e, t) {
  if (e.length !== t.length) return false;
  for (let n = 0; n < e.length; n++) if (!Xr(l, e[n], t[n])) return false;
  return true;
}
function _r(l, e, t) {
  if (e.length !== t.length) return false;
  for (let n = 0; n < e.length; n++) if (!l.equals(e[n], t[n])) return false;
  return true;
}
var Ci = Object.getOwnPropertyDescriptors(Object.getPrototypeOf({})), m = class {
  constructor(e, t, n) {
    this.defaultCheckDepth = 16, this.typeName = e, this.fields = t.map(vr), this.options = n ?? {}, this.messagePrototype = Object.create(null, Object.assign(Object.assign({}, Ci), { [Pe]: { value: this } })), this.refTypeCheck = new Ue(this), this.refJsonReader = new Ee(this), this.refJsonWriter = new Fe(this), this.refBinReader = new Le(this), this.refBinWriter = new Ae(this);
  }
  create(e) {
    let t = Kr(this);
    return e !== void 0 && y(this, t, e), t;
  }
  clone(e) {
    let t = this.create();
    return y(this, t, e), t;
  }
  equals(e, t) {
    return Jr(this, e, t);
  }
  is(e, t = this.defaultCheckDepth) {
    return this.refTypeCheck.is(e, t, false);
  }
  isAssignable(e, t = this.defaultCheckDepth) {
    return this.refTypeCheck.is(e, t, true);
  }
  mergePartial(e, t) {
    y(this, e, t);
  }
  fromBinary(e, t) {
    let n = Lr(t);
    return this.internalBinaryRead(n.readerFactory(e), e.byteLength, n);
  }
  fromJson(e, t) {
    return this.internalJsonRead(e, Vr(t));
  }
  fromJsonString(e, t) {
    let n = JSON.parse(e);
    return this.fromJson(n, t);
  }
  toJson(e, t) {
    return this.internalJsonWrite(e, Mr(t));
  }
  toJsonString(e, t) {
    var n;
    let i = this.toJson(e, t);
    return JSON.stringify(i, null, (n = t?.prettySpaces) !== null && n !== void 0 ? n : 0);
  }
  toBinary(e, t) {
    let n = Dr(t);
    return this.internalBinaryWrite(e, n.writerFactory(), n).finish();
  }
  internalJsonRead(e, t, n) {
    if (e !== null && typeof e == "object" && !Array.isArray(e)) {
      let i = n ?? this.create();
      return this.refJsonReader.read(e, i, t), i;
    }
    throw new Error(`Unable to parse message ${this.typeName} from JSON ${Be(e)}.`);
  }
  internalJsonWrite(e, t) {
    return this.refJsonWriter.write(e, t);
  }
  internalBinaryWrite(e, t, n) {
    return this.refBinWriter.write(e, t, n), t;
  }
  internalBinaryRead(e, t, n, i) {
    let r = i ?? this.create();
    return this.refBinReader.read(e, r, n, t), r;
  }
};
var us = g(h(), 1);
var qo = g(h(), 1);
export {
  m as MessageType,
  d as UnknownFields,
  Q as encodeBase64
};
