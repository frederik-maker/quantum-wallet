# Quantum Vault

**When quantum computers break Ed25519, every wallet on every chain dies simultaneously. This wallet doesn't.**

A quantum-safe Solana wallet that controls assets on any chain, using Ika for cross-chain signing and W-OTS for post-quantum authorization.

> **[Live Demo](https://app-kohl-eta-21.vercel.app)** | Built for the [Colosseum Frontier Hackathon](https://www.colosseum.org/) (April-May 2026)
> Tracks: [Encrypt & Ika](https://earn.superteam.fun/) | [MagicBlock Privacy](https://earn.superteam.fun/) | [Umbra SDK](https://earn.superteam.fun/)

---

## The Problem

Every Solana wallet today uses Ed25519 signatures, which are vulnerable to quantum computers. When quantum machines break Ed25519, every wallet with a revealed public key is at risk. Users need protection **now**, not when a protocol upgrade eventually ships.

On top of that, Solana wallets are single-chain. Assets on Bitcoin, Ethereum, and other chains require separate wallets, separate keys, and separate security models. And every transaction is fully public.

Solana's base layer is still Ed25519; this protects the **authorization layer** and the **cross-chain reach**, which is where institutional assets actually live.

**Target users:** Anyone holding value across chains who wants quantum-safe authorization and privacy. Power users, DAOs, treasuries, and institutions.

## The Solution

Quantum Vault combines four primitives into one wallet:

1. **Winternitz One-Time Signatures (W-OTS)** for quantum resistance -- keys rotate after every transaction
2. **Ika dWallet** for cross-chain signing -- control Bitcoin, Ethereum, and any chain from Solana
3. **Umbra SDK** for confidential transfers -- sender and amount hidden on-chain
4. **MagicBlock Ephemeral Rollups** for fast, private key rotation -- 10-50ms vs ~400ms

The result: a wallet where keys expire before they can be cracked, transactions stay private, and you can sign on any chain.

## How It Works

1. **Create** -- Generates a W-OTS keypair (32 random scalars, each hashed 256x via Keccak256). The merkle root becomes a PDA on Solana.
2. **Send** -- The vault splits: funds go to recipient + a new vault with fresh keys. Old vault is atomically closed. Optionally route through Umbra for confidential transfer.
3. **Cross-chain sign** -- After WOTS authorization, the program CPIs to Ika dWallet. Ika's 2PC-MPC network produces an ECDSA signature for Bitcoin/Ethereum. No bridge needed.
4. **Receive** -- Send SOL to your vault address. After any spend, the address rotates (like Bitcoin UTXOs).
5. **Import** -- Migrate funds from a legacy Ed25519 wallet (Phantom, Solflare, etc.) into a quantum-safe vault.

## Architecture

```
Wallet UI (Next.js + Framer Motion)
     |
TypeScript SDK
├── winternitz.ts    W-OTS keygen, sign, verify (Keccak256)
├── vault.ts         Transaction builders (open/split/close/cross-chain)
├── ika.ts           Ika dWallet CPI + cross-chain signing
├── umbra.ts         Umbra SDK integration (confidential transfers)
├── magicblock.ts    Ephemeral rollup routing (fast key rotation)
└── wallet-store.ts  Zustand state (vault pool, auto-rotation, persistence)
     |
On-Chain Program (Rust / Pinocchio)
├── OpenVault              Create vault PDA from W-OTS pubkey hash
├── SplitVault             Atomic send + rotate to fresh keypair
├── CloseVault             Withdraw remaining funds, close vault
└── ApproveCrossChain      CPI to Ika dWallet for cross-chain signatures
     |                          |
Solana (Devnet)           Ika Network (2PC-MPC)
                               |
                          Bitcoin / Ethereum / Any Chain
```

## Ika dWallet Integration

Uses Ika's programmable signing infrastructure for **bridgeless cross-chain operations**:

1. User authorizes via W-OTS (quantum-safe) on Solana
2. On-chain program CPIs to Ika's `approve_message` with the message digest
3. Ika's 2PC-MPC network produces a target-chain signature (e.g. ECDSA for Bitcoin)
4. Signature is written to a MessageApproval account on Solana
5. Transaction is broadcast to the target chain

**Core integration:** Without Ika, there's no cross-chain signing. The CPI is load-bearing -- the on-chain program's `ApproveCrossChain` instruction directly invokes Ika's dWallet program.

- Program: `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY` (Ika devnet)
- CPI: `approve_message` with PDA signer (`__ika_cpi_authority`)
- Supported: Bitcoin (BIP143/Taproot), Ethereum (Secp256k1), any ECDSA chain
- Status: Cross-chain tab in wallet UI

### Cross-Chain Demo

```bash
npx tsx scripts/demo-cross-chain.ts --btc-recipient tb1q...
```

Flow: Generate WOTS key → sign message → submit to program → Ika produces Bitcoin ECDSA signature → broadcast to testnet.

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
| Cross-chain CPI | 101 bytes instruction data, 8 accounts |

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
- **Cross-chain** -- Ika dWallet signs on any chain; Solana enforces authorization
- **One-time use enforced** -- Vault closes after every sign; no key reuse possible
- **Client-side only** -- Keys never leave the browser (localStorage)
- **No servers** -- Direct Solana RPC, fully decentralized
- **No bridges** -- Ika produces native signatures, not wrapped assets
- **Replay-proof** -- Vault closure + committed recipient keys prevent replay
- **Private** (optional) -- Umbra integration shields transfer details
- **Compliant** -- Umbra viewing keys enable selective disclosure for audits

## Judging Criteria Alignment

### Core Integration of Ika (load-bearing)
- `ApproveCrossChain` instruction CPIs directly to Ika dWallet program
- Without Ika, there's no cross-chain signing -- it's the whole point
- CPI authority PDA ensures only our program can authorize signatures
- Supports Bitcoin (BIP143, Taproot), Ethereum, and any ECDSA chain

### Innovation
- Nobody else is combining post-quantum signatures with cross-chain signing
- WOTS protects the authorization layer; Ika extends reach to any chain
- Novel primitive: quantum-safe custody with bridgeless multi-chain control

### Technical Execution
- On-chain program compiles and deploys (Pinocchio, zero-overhead)
- Full TypeScript SDK with instruction builders, PDA derivation, signature polling
- Clean architecture: program → SDK → state → UI layers
- Transaction size optimized to fit Solana's 1,232-byte MTU

### Product & Commercial Potential
- Institutional custody: quantum-safe authorization + multi-chain control
- Replaces Fireblocks-style custodians with decentralized enforcement
- Real user demand: post-quantum migration is inevitable

### Usability & Experience
- Cross-chain tab: create dWallet, sign Bitcoin transactions in 2 clicks
- Key rotation invisible to user
- Clean, minimal dark UI with animated transitions

### Completeness
- Working wallet with send, receive, migrate, privacy, cross-chain
- On-chain program with 4 instructions (open, split, close, cross-chain CPI)
- Demo script for E2E cross-chain flow
- Full README with architecture, security model, and deployment instructions

## Credits

Based on the [Winternitz Vault](https://github.com/deanmlittle/solana-winternitz-vault) on-chain program by Dean Little.

Cross-chain signing powered by [Ika Network](https://ika.xyz/) dWallet infrastructure.

## Disclaimer

This is an unaudited hackathon project. It is not intended for production use. Do not send real funds to this wallet -- assume any funds sent will be lost.

## License

MIT
