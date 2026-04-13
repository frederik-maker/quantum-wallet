/**
 * Winternitz One-Time Signature (W-OTS) implementation in TypeScript.
 * Matches the solana-winternitz v0.1.1 crate used by the vault program.
 *
 * Parameters:
 *   - Hash: Keccak256
 *   - Message digest: truncated to 28 bytes (224 bits)
 *   - 32 hash chain components of 32 bytes each (pubkey)
 *   - 28 signature components of 32 bytes each (signature)
 *   - Chain length: 256 iterations
 */

import jssha3 from "js-sha3";
const keccak256Fn = jssha3.keccak256;

const HASH_LENGTH = 28;
const CHAIN_COUNT = 32;

type Bytes = Uint8Array<ArrayBuffer>;

function toBytes(data: Uint8Array): Bytes {
  if (data.buffer instanceof ArrayBuffer) return data as Bytes;
  return new Uint8Array(data) as Bytes;
}

/** Keccak256 hash */
function keccak(data: Uint8Array): Bytes {
  return new Uint8Array(keccak256Fn.arrayBuffer(data)) as Bytes;
}

/** Double Keccak256 (hashd) — used for message digest */
function hashd(data: Uint8Array): Bytes {
  return keccak(keccak(data));
}

/** Hash a value n times: H^n(x) */
function hashN(x: Uint8Array, n: number): Bytes {
  let result: Bytes = toBytes(x);
  for (let i = 0; i < n; i++) {
    result = keccak(result);
  }
  return result;
}

/** Hash pair for merkle tree: Keccak256(a || b) */
function hashPair(a: Uint8Array, b: Uint8Array): Bytes {
  const combined = new Uint8Array(64) as Bytes;
  combined.set(a, 0);
  combined.set(b, 32);
  return keccak(combined);
}

/** Compute merkle root from 32 leaf nodes */
function merklize(leaves: Uint8Array[]): Bytes {
  if (leaves.length !== CHAIN_COUNT) throw new Error("Expected 32 leaves");

  let layer = leaves.map(toBytes);
  while (layer.length > 1) {
    const next: Bytes[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      next.push(hashPair(layer[i], layer[i + 1]));
    }
    layer = next;
  }
  return layer[0];
}

export interface WinternitzKeypair {
  privkey: Bytes[];
  pubkey: Bytes[];
  pubkeyHash: Bytes;
}

export interface WinternitzSignature {
  components: Bytes[];
}

/** Generate a new Winternitz keypair */
export function generateKeypair(): WinternitzKeypair {
  const privkey: Bytes[] = [];
  const pubkey: Bytes[] = [];

  for (let i = 0; i < CHAIN_COUNT; i++) {
    const scalar = crypto.getRandomValues(new Uint8Array(32)) as Bytes;
    privkey.push(scalar);
    pubkey.push(hashN(scalar, 256));
  }

  const pubkeyHash = merklize(pubkey);
  return { privkey, pubkey, pubkeyHash };
}

/** Sign a message with a Winternitz private key (ONE-TIME USE ONLY) */
export function sign(
  privkey: Uint8Array[],
  message: Uint8Array
): WinternitzSignature {
  const digest = hashd(message);
  const components: Bytes[] = [];

  for (let i = 0; i < HASH_LENGTH; i++) {
    const v = digest[i];
    const n = 256 - v;
    components.push(hashN(privkey[i], n));
  }

  return { components };
}

/** Recover the public key from a signature (for verification) */
export function recoverPubkey(
  signature: WinternitzSignature,
  message: Uint8Array
): Bytes[] {
  const digest = hashd(message);
  const pubkey: Bytes[] = [];

  for (let i = 0; i < HASH_LENGTH; i++) {
    const v = digest[i];
    pubkey.push(hashN(signature.components[i], v));
  }

  return pubkey;
}

/** Serialize a signature to bytes (28 * 32 = 896 bytes) */
export function serializeSignature(sig: WinternitzSignature): Bytes {
  const bytes = new Uint8Array(HASH_LENGTH * 32) as Bytes;
  for (let i = 0; i < HASH_LENGTH; i++) {
    bytes.set(sig.components[i], i * 32);
  }
  return bytes;
}

/** Deserialize a signature from bytes */
export function deserializeSignature(bytes: Uint8Array): WinternitzSignature {
  const components: Bytes[] = [];
  for (let i = 0; i < HASH_LENGTH; i++) {
    components.push(toBytes(bytes.slice(i * 32, (i + 1) * 32)));
  }
  return { components };
}

/** Serialize a keypair for storage */
export function serializeKeypair(kp: WinternitzKeypair): string {
  return JSON.stringify({
    privkey: kp.privkey.map((s) => Array.from(s)),
    pubkeyHash: Array.from(kp.pubkeyHash),
  });
}

/** Deserialize a keypair from storage (regenerates pubkey from privkey) */
export function deserializeKeypair(json: string): WinternitzKeypair {
  const data = JSON.parse(json);
  const privkey: Bytes[] = data.privkey.map(
    (s: number[]) => new Uint8Array(s) as Bytes
  );
  const pubkey: Bytes[] = privkey.map((s) => hashN(s, 256));
  const pubkeyHash = merklize(pubkey);
  return { privkey, pubkey, pubkeyHash };
}

/** Get the pubkey hash from just the private key scalars */
export function pubkeyHashFromPrivkey(privkey: Uint8Array[]): Bytes {
  const pubkey = privkey.map((s) => hashN(s, 256));
  return merklize(pubkey);
}
