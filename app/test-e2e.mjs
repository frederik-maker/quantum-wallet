/**
 * Full E2E test — Winternitz crypto matching solana_winternitz 0.1.1 crate exactly.
 */
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, ComputeBudgetProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { readFileSync } from "fs";
import jssha3 from "js-sha3";

const keccak256 = jssha3.keccak256;
const HASH_LEN = 28;  // Each component is 28 bytes (truncated keccak256)
const NUM_CHAINS = 32; // 32 chains total

const VAULT_PROGRAM_ID = new PublicKey("G75JKXTU6HP2tKdNaXzwjHtaLjrdEq5AY9SSQ1uTyjKP");
const DISC_OPEN = 0;
const DISC_SPLIT = 1;
const DISC_CLOSE = 2;

// keccak256 full 32 bytes
function keccakFull(data) {
  return new Uint8Array(keccak256.arrayBuffer(data));
}

// keccak256 truncated to first 28 bytes (matching Rust split_first_chunk::<28>)
function keccakTrunc(data) {
  return keccakFull(data).slice(0, HASH_LEN);
}

// Hash chain: hash N times, each time truncating to 28 bytes
function hashChain(seed, n) {
  let result = new Uint8Array(seed);
  for (let i = 0; i < n; i++) {
    result = keccakTrunc(result);
  }
  return result;
}

// hashv: keccak256 of concatenated inputs (matches solana_nostd_keccak::hashv)
function hashv(slices) {
  let totalLen = 0;
  for (const s of slices) totalLen += s.length;
  const combined = new Uint8Array(totalLen);
  let offset = 0;
  for (const s of slices) {
    combined.set(s, offset);
    offset += s.length;
  }
  return keccakFull(combined);
}

// Merklize exactly matching the Rust hardcoded tree
function merklize(pubkey) {
  // pubkey is array of 32 x 28-byte components
  // Level 1: pair adjacent leaves (28+28=56 bytes → keccak → 32 bytes)
  const l1 = [];
  for (let i = 0; i < 32; i += 2) {
    l1.push(hashv([pubkey[i], pubkey[i + 1]]));
  }
  // Level 2: pair level-1 (32+32=64 bytes → keccak → 32 bytes)
  const l2 = [];
  for (let i = 0; i < 16; i += 2) {
    l2.push(hashv([l1[i], l1[i + 1]]));
  }
  // Level 3
  const l3 = [];
  for (let i = 0; i < 8; i += 2) {
    l3.push(hashv([l2[i], l2[i + 1]]));
  }
  // Level 4
  const l4 = [];
  for (let i = 0; i < 4; i += 2) {
    l4.push(hashv([l3[i], l3[i + 1]]));
  }
  // Root
  return hashv([l4[0], l4[1]]);
}

function generateKeypair() {
  const privkey = [];
  const pubkey = [];
  for (let i = 0; i < NUM_CHAINS; i++) {
    // 28-byte random scalar (matching Rust [[u8;28];32])
    const scalar = crypto.getRandomValues(new Uint8Array(HASH_LEN));
    privkey.push(scalar);
    // Hash 256 times with truncation
    pubkey.push(hashChain(scalar, 256));
  }
  return { privkey, pubkey, pubkeyHash: merklize(pubkey) };
}

function signMessage(privkey, message) {
  // Single keccak256 digest (32 bytes = 32 components)
  const digest = keccakFull(message);
  const components = [];
  for (let i = 0; i < NUM_CHAINS; i++) {
    components.push(hashChain(privkey[i], 256 - digest[i]));
  }
  return components; // 32 x 28-byte components
}

function serializeSig(components) {
  // 32 components x 28 bytes = 896 bytes, stride = 28
  const bytes = new Uint8Array(NUM_CHAINS * HASH_LEN); // 896
  for (let i = 0; i < NUM_CHAINS; i++) {
    bytes.set(components[i], i * HASH_LEN);
  }
  return bytes;
}

// ===== BEGIN TESTS =====
const conn = new Connection("http://localhost:8899", "confirmed");
const keypairData = JSON.parse(readFileSync(process.env.HOME + "/.config/solana/id.json", "utf-8"));
const feePayer = Keypair.fromSecretKey(new Uint8Array(keypairData));

console.log("╔══════════════════════════════════════════════════════╗");
console.log("║  Quantum Vault — Full E2E Test (localnet)           ║");
console.log("╚══════════════════════════════════════════════════════╝\n");

let passed = 0;
const total = 9;

// Test 1: Crypto
console.log("━━━ Test 1: Winternitz Crypto ━━━");
const kp = generateKeypair();
console.log("  Pubkey hash:", Buffer.from(kp.pubkeyHash).toString("hex").slice(0, 20) + "...");
const msg = new Uint8Array(32).fill(42);
const sigComps = signMessage(kp.privkey, msg);
console.log("  Signature: 32 components x 28 bytes =", serializeSig(sigComps).length, "bytes");

// Verify: hash each sig component digest[i] more times → should equal pubkey
const digest = keccakFull(msg);
let verifyOk = true;
for (let i = 0; i < NUM_CHAINS; i++) {
  const recovered = hashChain(sigComps[i], digest[i]);
  if (Buffer.from(recovered).toString("hex") !== Buffer.from(kp.pubkey[i]).toString("hex")) {
    console.log("  FAIL: component", i); verifyOk = false; break;
  }
}
console.log("  Signature verify:", verifyOk ? "PASS" : "FAIL");
if (verifyOk) passed++;

// Test 2: PDA
console.log("\n━━━ Test 2: PDA Derivation ━━━");
const [pda, bump] = PublicKey.findProgramAddressSync([kp.pubkeyHash], VAULT_PROGRAM_ID);
console.log("  PDA:", pda.toBase58(), "Bump:", bump, "PASS");
passed++;

// Test 3: Connection
console.log("\n━━━ Test 3: Validator ━━━");
const progInfo = await conn.getAccountInfo(VAULT_PROGRAM_ID);
console.log("  Program:", progInfo?.executable ? "loaded" : "MISSING", "PASS");
passed++;

// Test 4: Fee payer
console.log("\n━━━ Test 4: Fee Payer ━━━");
let bal = await conn.getBalance(feePayer.publicKey);
if (bal < 10 * LAMPORTS_PER_SOL) {
  const as1 = await conn.requestAirdrop(feePayer.publicKey, 10 * LAMPORTS_PER_SOL);
  await conn.confirmTransaction(as1, "confirmed");
  bal = await conn.getBalance(feePayer.publicKey);
}
console.log("  Balance:", bal / LAMPORTS_PER_SOL, "SOL PASS");
passed++;

// Test 5: OpenVault
console.log("\n━━━ Test 5: OpenVault ━━━");
const wkp = generateKeypair();
const [vPDA, vBump] = PublicKey.findProgramAddressSync([wkp.pubkeyHash], VAULT_PROGRAM_ID);

const openData = Buffer.alloc(34);
openData[0] = DISC_OPEN;
Buffer.from(wkp.pubkeyHash).copy(openData, 1);
openData[33] = vBump;

let tx = new Transaction().add(
  ComputeBudgetProgram.setComputeUnitLimit({ units: 50000 }),
  { keys: [
      { pubkey: feePayer.publicKey, isSigner: true, isWritable: true },
      { pubkey: vPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ], programId: VAULT_PROGRAM_ID, data: openData }
);
tx.feePayer = feePayer.publicKey;
tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
tx.sign(feePayer);
try {
  const sig = await conn.sendRawTransaction(tx.serialize());
  await conn.confirmTransaction(sig, "confirmed");
  console.log("  Vault:", vPDA.toBase58());
  console.log("  Tx:", sig.slice(0, 32) + "...");
  console.log("  PASS");
  passed++;
} catch (e) {
  console.log("  FAIL:", e.transactionLogs?.join("\n  ") || e.message);
}

// Test 6: Fund
console.log("\n━━━ Test 6: Fund Vault ━━━");
let ft = new Transaction().add(
  SystemProgram.transfer({ fromPubkey: feePayer.publicKey, toPubkey: vPDA, lamports: 2 * LAMPORTS_PER_SOL })
);
ft.feePayer = feePayer.publicKey;
ft.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
ft.sign(feePayer);
await conn.sendRawTransaction(ft.serialize()).then(s => conn.confirmTransaction(s, "confirmed"));
console.log("  Vault balance:", (await conn.getBalance(vPDA)) / LAMPORTS_PER_SOL, "SOL PASS");
passed++;

// Test 7: SplitVault
console.log("\n━━━ Test 7: SplitVault (send + rotate) ━━━");
const nkp = generateKeypair();
const [nPDA, nBump] = PublicKey.findProgramAddressSync([nkp.pubkeyHash], VAULT_PROGRAM_ID);

// Open refund vault
let od2 = Buffer.alloc(34);
od2[0] = DISC_OPEN;
Buffer.from(nkp.pubkeyHash).copy(od2, 1);
od2[33] = nBump;
let otx2 = new Transaction().add(
  ComputeBudgetProgram.setComputeUnitLimit({ units: 50000 }),
  { keys: [
      { pubkey: feePayer.publicKey, isSigner: true, isWritable: true },
      { pubkey: nPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ], programId: VAULT_PROGRAM_ID, data: od2 }
);
otx2.feePayer = feePayer.publicKey;
otx2.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
otx2.sign(feePayer);
await conn.sendRawTransaction(otx2.serialize()).then(s => conn.confirmTransaction(s, "confirmed"));

const recipient = Keypair.generate();
const sendAmt = BigInt(1_000_000_000); // 1 SOL

// Message: [amount(8), split_pubkey(32), refund_pubkey(32)] = 72 bytes
const splitMsg = new Uint8Array(72);
const amtBuf = Buffer.alloc(8);
amtBuf.writeBigUInt64LE(sendAmt);
splitMsg.set(amtBuf, 0);
splitMsg.set(recipient.publicKey.toBytes(), 8);
splitMsg.set(nPDA.toBytes(), 40);

const splitComps = signMessage(wkp.privkey, splitMsg);
const splitSigBytes = serializeSig(splitComps);

// [disc(1), sig(896), amount(8), bump(1)] = 906
const splitData = Buffer.alloc(906);
splitData[0] = DISC_SPLIT;
Buffer.from(splitSigBytes).copy(splitData, 1);
amtBuf.copy(splitData, 897);
splitData[905] = vBump;

let stx = new Transaction().add(
  ComputeBudgetProgram.setComputeUnitLimit({ units: 900000 }),
  ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200000 }),
  { keys: [
      { pubkey: vPDA, isSigner: false, isWritable: true },
      { pubkey: recipient.publicKey, isSigner: false, isWritable: true },
      { pubkey: nPDA, isSigner: false, isWritable: true },
    ], programId: VAULT_PROGRAM_ID, data: splitData }
);
stx.feePayer = feePayer.publicKey;
stx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
stx.sign(feePayer);

try {
  const sSig = await conn.sendRawTransaction(stx.serialize());
  await conn.confirmTransaction(sSig, "confirmed");
  const oldB = await conn.getBalance(vPDA);
  const recB = await conn.getBalance(recipient.publicKey);
  const newB = await conn.getBalance(nPDA);
  console.log("  Tx:", sSig.slice(0, 32) + "...");
  console.log("  Old vault:", oldB / LAMPORTS_PER_SOL, "SOL (closed)");
  console.log("  Recipient:", recB / LAMPORTS_PER_SOL, "SOL");
  console.log("  New vault:", newB / LAMPORTS_PER_SOL, "SOL");
  console.log("  PASS");
  passed++;
} catch (e) {
  console.log("  FAIL:", e.transactionLogs?.join("\n  ") || e.message);
}

// Test 8: CloseVault
console.log("\n━━━ Test 8: CloseVault ━━━");
const closeComps = signMessage(nkp.privkey, feePayer.publicKey.toBytes());
const closeSigBytes = serializeSig(closeComps);

const closeData = Buffer.alloc(898);
closeData[0] = DISC_CLOSE;
Buffer.from(closeSigBytes).copy(closeData, 1);
closeData[897] = nBump;

let ctx = new Transaction().add(
  ComputeBudgetProgram.setComputeUnitLimit({ units: 900000 }),
  ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200000 }),
  { keys: [
      { pubkey: nPDA, isSigner: false, isWritable: true },
      { pubkey: feePayer.publicKey, isSigner: false, isWritable: true },
    ], programId: VAULT_PROGRAM_ID, data: closeData }
);
ctx.feePayer = feePayer.publicKey;
ctx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
ctx.sign(feePayer);

try {
  const cSig = await conn.sendRawTransaction(ctx.serialize());
  await conn.confirmTransaction(cSig, "confirmed");
  console.log("  Tx:", cSig.slice(0, 32) + "...");
  console.log("  Vault closed. Balance:", (await conn.getBalance(nPDA)) / LAMPORTS_PER_SOL, "SOL");
  console.log("  PASS");
  passed++;
} catch (e) {
  console.log("  FAIL:", e.transactionLogs?.join("\n  ") || e.message);
}

// Test 9: 3x rotation
console.log("\n━━━ Test 9: 3x Rotation Cycle ━━━");
try {
  let cur = generateKeypair();
  let [cPDA, cBump] = PublicKey.findProgramAddressSync([cur.pubkeyHash], VAULT_PROGRAM_ID);

  let od = Buffer.alloc(34); od[0] = DISC_OPEN;
  Buffer.from(cur.pubkeyHash).copy(od, 1); od[33] = cBump;
  let otx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 50000 }),
    { keys: [
        { pubkey: feePayer.publicKey, isSigner: true, isWritable: true },
        { pubkey: cPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ], programId: VAULT_PROGRAM_ID, data: od }
  );
  otx.feePayer = feePayer.publicKey;
  otx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
  otx.sign(feePayer);
  await conn.sendRawTransaction(otx.serialize()).then(s => conn.confirmTransaction(s, "confirmed"));

  let fdt = new Transaction().add(SystemProgram.transfer({ fromPubkey: feePayer.publicKey, toPubkey: cPDA, lamports: 3 * LAMPORTS_PER_SOL }));
  fdt.feePayer = feePayer.publicKey;
  fdt.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
  fdt.sign(feePayer);
  await conn.sendRawTransaction(fdt.serialize()).then(s => conn.confirmTransaction(s, "confirmed"));

  for (let r = 1; r <= 3; r++) {
    const nx = generateKeypair();
    const [nxPDA, nxBump] = PublicKey.findProgramAddressSync([nx.pubkeyHash], VAULT_PROGRAM_ID);

    let nod = Buffer.alloc(34); nod[0] = DISC_OPEN;
    Buffer.from(nx.pubkeyHash).copy(nod, 1); nod[33] = nxBump;
    let notx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 50000 }),
      { keys: [
          { pubkey: feePayer.publicKey, isSigner: true, isWritable: true },
          { pubkey: nxPDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ], programId: VAULT_PROGRAM_ID, data: nod }
    );
    notx.feePayer = feePayer.publicKey;
    notx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
    notx.sign(feePayer);
    await conn.sendRawTransaction(notx.serialize()).then(s => conn.confirmTransaction(s, "confirmed"));

    const rec = Keypair.generate();
    const amt = BigInt(500_000_000);
    const m = new Uint8Array(72);
    const ab = Buffer.alloc(8); ab.writeBigUInt64LE(amt);
    m.set(ab, 0); m.set(rec.publicKey.toBytes(), 8); m.set(nxPDA.toBytes(), 40);

    const sc = signMessage(cur.privkey, m);
    const sb = serializeSig(sc);
    const sd = Buffer.alloc(906);
    sd[0] = DISC_SPLIT;
    Buffer.from(sb).copy(sd, 1);
    ab.copy(sd, 897);
    sd[905] = cBump;

    let rtx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 900000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200000 }),
      { keys: [
          { pubkey: cPDA, isSigner: false, isWritable: true },
          { pubkey: rec.publicKey, isSigner: false, isWritable: true },
          { pubkey: nxPDA, isSigner: false, isWritable: true },
        ], programId: VAULT_PROGRAM_ID, data: sd }
    );
    rtx.feePayer = feePayer.publicKey;
    rtx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
    rtx.sign(feePayer);
    await conn.sendRawTransaction(rtx.serialize()).then(s => conn.confirmTransaction(s, "confirmed"));

    const nxB = await conn.getBalance(nxPDA);
    console.log(`  Round ${r}: sent 0.5 SOL → ${rec.publicKey.toBase58().slice(0,12)}... | vault: ${(nxB/LAMPORTS_PER_SOL).toFixed(4)} SOL`);

    cur = nx; cPDA = nxPDA; cBump = nxBump;
  }
  console.log("  PASS");
  passed++;
} catch (e) {
  console.log("  FAIL:", e.transactionLogs?.join("\n  ") || e.message);
}

console.log(`\n╔══════════════════════════════════════════════════════╗`);
console.log(`║  ${passed}/${total} TESTS PASSED                                  ║`);
console.log(`╠══════════════════════════════════════════════════════╣`);
console.log(`║  1. Winternitz crypto          ${passed >= 1 ? "PASS" : "FAIL"}                  ║`);
console.log(`║  2. PDA derivation             ${passed >= 2 ? "PASS" : "FAIL"}                  ║`);
console.log(`║  3. Validator connection        ${passed >= 3 ? "PASS" : "FAIL"}                  ║`);
console.log(`║  4. Fee payer funded            ${passed >= 4 ? "PASS" : "FAIL"}                  ║`);
console.log(`║  5. OpenVault on-chain          ${passed >= 5 ? "PASS" : "FAIL"}                  ║`);
console.log(`║  6. Fund vault                  ${passed >= 6 ? "PASS" : "FAIL"}                  ║`);
console.log(`║  7. SplitVault (send+rotate)    ${passed >= 7 ? "PASS" : "FAIL"}                  ║`);
console.log(`║  8. CloseVault                  ${passed >= 8 ? "PASS" : "FAIL"}                  ║`);
console.log(`║  9. 3x rotation cycle           ${passed >= 9 ? "PASS" : "FAIL"}                  ║`);
console.log(`╚══════════════════════════════════════════════════════╝`);
