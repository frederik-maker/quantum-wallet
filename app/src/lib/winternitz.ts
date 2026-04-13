/**
 * Winternitz One-Time Signature (W-OTS) implementation in TypeScript.
 * Matches the solana-winternitz v0.1.1 Rust crate exactly.
 *
 * Parameters:
 *   - Hash: Keccak256
 *   - HASH_LENGTH = 28 (each component is 28 bytes, truncated Keccak256)
 *   - NUM_CHAINS = 32 (32 hash chains)
 *   - Chain length: 256 iterations
 *   - Signature: 32 x 28 bytes = 896 bytes
 *   - Pubkey: 32 x 28 bytes = 896 bytes
 *   - Pubkey hash: 32 bytes (Keccak256 merkle root)
 */

import jssha3 from "js-sha3";
const keccak256Fn = jssha3.keccak256;

export const HASH_LENGTH = 28;
export const NUM_CHAINS = 32;
export const SIG_SIZE = HASH_LENGTH * NUM_CHAINS; // 896 bytes

type Bytes = Uint8Array<ArrayBuffer>;

function toBytes(data: Uint8Array): Bytes {
  if (data.buffer instanceof ArrayBuffer) return data as Bytes;
  return new Uint8Array(data) as Bytes;
}

/** Keccak256 full 32-byte output */
function keccakFull(data: Uint8Array): Bytes {
  return new Uint8Array(keccak256Fn.arrayBuffer(data)) as Bytes;
}

/** Keccak256 truncated to first 28 bytes (matches Rust split_first_chunk::<28>) */
function keccakTrunc(data: Uint8Array): Bytes {
  return toBytes(keccakFull(data).slice(0, HASH_LENGTH));
}

/** Hash chain: hash N times, each time truncating to 28 bytes */
function hashChain(seed: Uint8Array, n: number): Bytes {
  let result: Bytes = toBytes(seed);
  for (let i = 0; i < n; i++) {
    result = keccakTrunc(result);
  }
  return result;
}

/** hashv: Keccak256 of concatenated inputs (matches solana_nostd_keccak::hashv) */
function hashv(slices: Uint8Array[]): Bytes {
  let totalLen = 0;
  for (const s of slices) totalLen += s.length;
  const combined = new Uint8Array(totalLen) as Bytes;
  let offset = 0;
  for (const s of slices) {
    combined.set(s, offset);
    offset += s.length;
  }
  return keccakFull(combined);
}

/**
 * Compute merkle root from 32 leaf nodes.
 * Exactly matches the hardcoded binary tree in WinternitzPubkey::merklize().
 */
function merklize(leaves: Uint8Array[]): Bytes {
  if (leaves.length !== NUM_CHAINS) throw new Error("Expected 32 leaves");

  // Level 1: pair adjacent leaves (28+28=56 bytes -> keccak -> 32 bytes)
  const l1: Bytes[] = [];
  for (let i = 0; i < 32; i += 2) {
    l1.push(hashv([leaves[i], leaves[i + 1]]));
  }
  // Level 2: 32+32=64 bytes -> 32 bytes
  const l2: Bytes[] = [];
  for (let i = 0; i < 16; i += 2) {
    l2.push(hashv([l1[i], l1[i + 1]]));
  }
  // Level 3
  const l3: Bytes[] = [];
  for (let i = 0; i < 8; i += 2) {
    l3.push(hashv([l2[i], l2[i + 1]]));
  }
  // Level 4
  const l4: Bytes[] = [];
  for (let i = 0; i < 4; i += 2) {
    l4.push(hashv([l3[i], l3[i + 1]]));
  }
  // Root
  return hashv([l4[0], l4[1]]);
}

export interface WinternitzKeypair {
  privkey: Bytes[];
  pubkey: Bytes[];
  pubkeyHash: Bytes;
}

export interface WinternitzSignature {
  components: Bytes[];
}

/** Generate a new Winternitz keypair (32 x 28-byte scalars) */
export function generateKeypair(): WinternitzKeypair {
  const privkey: Bytes[] = [];
  const pubkey: Bytes[] = [];

  for (let i = 0; i < NUM_CHAINS; i++) {
    // 28-byte random scalar (matches Rust [[u8;HASH_LENGTH];32])
    const scalar = crypto.getRandomValues(
      new Uint8Array(HASH_LENGTH)
    ) as Bytes;
    privkey.push(scalar);
    // Hash 256 times with truncation
    pubkey.push(hashChain(scalar, 256));
  }

  const pubkeyHash = merklize(pubkey);
  return { privkey, pubkey, pubkeyHash };
}

/** Sign a message with a Winternitz private key (ONE-TIME USE ONLY) */
export function sign(
  privkey: Uint8Array[],
  message: Uint8Array
): WinternitzSignature {
  // Single Keccak256 digest (32 bytes = one byte per chain)
  const digest = keccakFull(message);
  const components: Bytes[] = [];

  for (let i = 0; i < NUM_CHAINS; i++) {
    components.push(hashChain(privkey[i], 256 - digest[i]));
  }

  return { components };
}

/** Recover the public key from a signature (for verification) */
export function recoverPubkey(
  signature: WinternitzSignature,
  message: Uint8Array
): Bytes[] {
  const digest = keccakFull(message);
  const pubkey: Bytes[] = [];

  for (let i = 0; i < NUM_CHAINS; i++) {
    pubkey.push(hashChain(signature.components[i], digest[i]));
  }

  return pubkey;
}

/** Serialize a signature to bytes (32 x 28 = 896 bytes, stride 28) */
export function serializeSignature(sig: WinternitzSignature): Bytes {
  const bytes = new Uint8Array(SIG_SIZE) as Bytes;
  for (let i = 0; i < NUM_CHAINS; i++) {
    bytes.set(sig.components[i], i * HASH_LENGTH);
  }
  return bytes;
}

/** Deserialize a signature from bytes */
export function deserializeSignature(bytes: Uint8Array): WinternitzSignature {
  const components: Bytes[] = [];
  for (let i = 0; i < NUM_CHAINS; i++) {
    components.push(
      toBytes(bytes.slice(i * HASH_LENGTH, (i + 1) * HASH_LENGTH))
    );
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
  const pubkey: Bytes[] = privkey.map((s) => hashChain(s, 256));
  const pubkeyHash = merklize(pubkey);
  return { privkey, pubkey, pubkeyHash };
}

/** Get the pubkey hash from just the private key scalars */
export function pubkeyHashFromPrivkey(privkey: Uint8Array[]): Bytes {
  const pubkey = privkey.map((s) => hashChain(s, 256));
  return merklize(pubkey);
}
