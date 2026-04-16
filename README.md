# Quantum Vault

**The first quantum-resistant Solana wallet with built-in privacy.**

One-time signatures. Automatic key rotation. Confidential transfers. Works today on Solana without waiting for a protocol upgrade.

> Built for the [Colosseum Frontier Hackathon](https://www.colosseum.org/) (April-May 2026)
> Tracks: [MagicBlock Privacy](https://earn.superteam.fun/) | [Umbra SDK](https://earn.superteam.fun/)

---

## The Problem

Every Solana wallet today uses Ed25519 signatures, which are vulnerable to quantum computers. When quantum machines break Ed25519, every wallet with a revealed public key is at risk. Users need protection **now**, not when a protocol upgrade eventually ships.

On top of that, every transaction on Solana is fully public. Sender, recipient, and amount are visible to anyone. Financial privacy should be the default, not an afterthought.

**Target users:** Anyone holding value on Solana who wants protection against both quantum threats and surveillance. Power users, DAOs, treasuries, and privacy-conscious individuals.

## The Solution

Quantum Vault combines three primitives into one wallet:

1. **Winternitz One-Time Signatures (W-OTS)** for quantum resistance -- keys rotate after every transaction
2. **Umbra SDK** for confidential transfers -- sender and amount hidden on-chain
3. **MagicBlock Ephemeral Rollups** for fast, private key rotation -- 10-50ms vs ~400ms

The result: a wallet where keys expire before they can be cracked, and transactions stay private by default.

## How It Works

1. **Create** -- Generates a W-OTS keypair (32 random scalars, each hashed 256x via Keccak256). The merkle root becomes a PDA on Solana.
2. **Send** -- The vault splits: funds go to recipient + a new vault with fresh keys. Old vault is atomically closed. Optionally route through Umbra for confidential transfer.
3. **Receive** -- Send SOL to your vault address. After any spend, the address rotates (like Bitcoin UTXOs).
4. **Import** -- Migrate funds from a legacy Ed25519 wallet (Phantom, Solflare, etc.) into a quantum-safe vault.

## Architecture

```
Wallet UI (Next.js + Framer Motion)
     |
TypeScript SDK
├── winternitz.ts    W-OTS keygen, sign, verify (Keccak256)
├── vault.ts         Transaction builders (open/split/close)
├── umbra.ts         Umbra SDK integration (confidential transfers)
├── magicblock.ts    Ephemeral rollup routing (fast key rotation)
└── wallet-store.ts  Zustand state (vault pool, auto-rotation, persistence)
     |
On-Chain Program (Rust / Pinocchio)
├── OpenVault     Create vault PDA from W-OTS pubkey hash
├── SplitVault    Atomic send + rotate to fresh keypair
└── CloseVault    Withdraw remaining funds, close vault
     |
Solana (Devnet / Mainnet)
```

## Umbra SDK Integration

Adds **confidential transfers** on top of quantum safety:

1. User registers with Umbra (one-time setup)
2. On send, toggle "Private send" to route through Umbra's encrypted UTXO system
3. Vault signs with W-OTS (quantum-safe authorization), funds route through Umbra
4. Recipient scans and claims -- sender and amount hidden on-chain

This gives both **quantum resistance** and **transaction privacy** -- a combination no other wallet offers.

- SDK: `@umbra-privacy/sdk`
- Toggle: "Private send" in the Send modal
- Status: Visible in Privacy tab with activation state

## MagicBlock Integration

Uses MagicBlock's ephemeral execution environment for vault operations:

- **10-50ms** latency for vault rotation (vs ~400ms on base Solana)
- Private execution environment for key rotation
- Automatic routing when MagicBlock is available

- Router: `https://router.magicblock.app`
- Status: Check availability in Privacy tab

## Quick Start

```bash
git clone https://github.com/frederik-maker/quantum-wallet.git
cd quantum-wallet/app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build the On-Chain Program

```bash
cd program
cargo build-sbf
```

### Deploy to Devnet

```bash
solana config set --url devnet
solana airdrop 2
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

The one-time signature constraint is invisible to the user -- it just looks like a normal wallet.

## Security Model

- **Quantum-resistant** -- W-OTS relies on Keccak256, not discrete log
- **One-time use enforced** -- Vault closes after every sign; no key reuse possible
- **Client-side only** -- Keys never leave the browser (localStorage)
- **No servers** -- Direct Solana RPC, fully decentralized
- **Replay-proof** -- Vault closure + committed recipient keys prevent replay
- **Private** (optional) -- Umbra integration shields transfer details
- **Compliant** -- Umbra viewing keys enable selective disclosure for audits

## Judging Criteria Alignment

### Technology (40%)
- Full integration of Umbra SDK (confidential transfers, registration, viewing keys)
- MagicBlock ephemeral rollups for private, fast key rotation
- Working W-OTS implementation verified against on-chain program
- Clean architecture: SDK layer, state management, UI components

### Impact (30%)
- Solves a real, growing threat (quantum computing vs Ed25519)
- Adds privacy that Solana natively lacks
- Works today without protocol changes

### Creativity & UX (30%)
- Novel primitive: quantum safety + privacy in one wallet
- Key rotation is invisible to the user
- One-click migration from legacy wallets
- Clean, minimal dark UI

## Credits

Based on the [Winternitz Vault](https://github.com/deanmlittle/solana-winternitz-vault) on-chain program by Dean Little.

## Disclaimer

This is an unaudited hackathon project. It is not intended for production use. Do not send real funds to this wallet — assume any funds sent will be lost.

## License

MIT
