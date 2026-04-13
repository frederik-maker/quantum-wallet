# Quantum Vault

**The first quantum-resistant Solana wallet.**

One-time signatures. Automatic key rotation. Zero exposure. Works today, on mainnet, without waiting for a protocol upgrade.

---

## The Problem

Every Solana wallet today uses Ed25519 signatures -- vulnerable to quantum computers. The Solana Foundation tested quantum-safe transactions on testnet in April 2026. Results: **90% speed reduction**, **40x larger signatures**, and **no mainnet timeline**.

Quantum computing advances don't wait. When quantum computers break Ed25519, every wallet with a revealed public key is at risk. Users need protection *now*.

## The Solution

Quantum Vault wraps the [Winternitz Vault](https://github.com/deanmlittle/solana-winternitz-vault) primitive (by Dean Little) into a consumer-grade wallet with privacy integrations. Winternitz One-Time Signatures (W-OTS) are quantum-resistant by construction -- they rely only on hash function security (Keccak256), not discrete logarithms.

**Every transaction automatically rotates to fresh keys.** Your private key is never exposed long enough to attack -- even by a quantum computer.

## How It Works

1. **Create** -- Generates a Winternitz keypair (32 random scalars, each hashed 256x via Keccak256). The merkle root becomes a PDA on Solana.
2. **Send** -- The vault splits: funds go to recipient + a new vault with fresh keys. Old vault is atomically closed.
3. **Receive** -- Send SOL to your vault address. After any spend, the address rotates (like Bitcoin UTXOs).
4. **Import** -- Migrate funds from a legacy Ed25519 wallet into a quantum-safe vault.

## Architecture

```
 Wallet UI (Next.js)
      |
 TypeScript SDK
 - winternitz.ts    Keygen, sign, verify (Keccak256 W-OTS)
 - vault.ts         Transaction builders (open/split/close)
 - umbra.ts         Privacy layer (confidential transfers)
 - magicblock.ts    Ephemeral rollups (fast vault rotation)
 - wallet-store.ts  State management (vault pool, auto-rotation)
      |
 On-Chain Program (Rust/Pinocchio)
 - 3 instructions: OpenVault, SplitVault, CloseVault
 - Zero on-chain data -- PDA address IS the pubkey hash
 - 896-byte Winternitz signatures verified on-chain
 - Optimized for ~900K compute units
      |
 Solana (Devnet / Mainnet)
```

## Integrations

### Umbra Privacy SDK

Adds **confidential transfers** on top of quantum safety. The flow:

1. Vault signs with W-OTS (quantum-safe authorization)
2. Funds route through Umbra's encrypted UTXO system
3. Recipient scans and claims -- sender and amount hidden on-chain

This gives both **quantum resistance** and **transaction privacy** -- a combination no other wallet offers.

- SDK: `@umbra-privacy/sdk`
- Program: `UMBRAD2ishebJTcgCLkTkNUx1v3GyoAgpTRPeWoLykh` (mainnet)
- Toggle: "Private send" in the Send modal

### MagicBlock Ephemeral Rollups

Uses MagicBlock's high-speed execution environment for vault operations:

- **10-50ms** latency for vault rotation (vs ~400ms on mainnet)
- Batch pre-initialize multiple vaults
- Private execution environment for key rotation

- Router: `https://router.magicblock.app`
- Integration: Vault transactions route through MagicBlock when available

## Quick Start

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build the On-Chain Program

```bash
cd program
cargo build-sbf
```

### Deploy

```bash
# Devnet
solana config set --url devnet
solana airdrop 2
solana program deploy program/target/deploy/quantum_vault.so --program-id program/keypair.json

# Mainnet
solana config set --url mainnet-beta
solana program deploy program/target/deploy/quantum_vault.so --program-id program/keypair.json
```

## Technical Details

| Parameter | Value |
|-----------|-------|
| Hash function | Keccak256 |
| Message digest | 224 bits (28 bytes, truncated) |
| Signature size | 28 x 32 bytes = **896 bytes** |
| Public key | 32 x 32 bytes = 1024 bytes |
| Chain length | 256 iterations |
| Transaction size | ~1,200 / 1,232 byte MTU limit |
| Compute units | ~900,000 CU per signature verify |
| Security | Post-quantum (hash-based) |

### Why Pinocchio, not Anchor?

Winternitz signatures are 896 bytes. Combined with instruction data and account metas, transactions barely fit Solana's 1,232-byte MTU. Pinocchio's zero-overhead approach saves the bytes and compute that Anchor's framework overhead would consume.

### Vault Rotation Strategy

The wallet manages a pool of pre-initialized vaults:
1. Maintain 2+ ready vaults at all times
2. On send: `SplitVault(old -> recipient + pre-opened vault)`
3. Background replenishment after every spend

The one-time signature constraint is invisible to the user.

## Security Model

- **Quantum-resistant** -- Winternitz signatures rely on Keccak256, not discrete log
- **One-time use enforced** -- Vault closes after every sign; no key reuse possible
- **Client-side only** -- Keys never leave the browser
- **No servers** -- Direct Solana RPC, fully decentralized
- **Replay-proof** -- Vault closure + committed recipient keys prevent replay
- **Private** (optional) -- Umbra integration shields transfer details

## Hackathon

Built for the **Colosseum Frontier Hackathon** (April-May 2026).

Side track submissions:
- **Umbra SDK** -- Confidential transfers with quantum-safe authorization
- **MagicBlock** -- Ephemeral rollups for high-speed vault rotation

Based on the [Winternitz Vault](https://github.com/deanmlittle/solana-winternitz-vault) by Dean Little.

## License

MIT
