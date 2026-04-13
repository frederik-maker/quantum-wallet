# Quantum Vault

**The first quantum-resistant Solana wallet.**

One-time signatures. Automatic key rotation. Zero exposure. Works today, on mainnet, without waiting for a protocol upgrade.

## The Problem

Every Solana wallet today uses Ed25519 signatures, which are vulnerable to quantum computers. The Solana Foundation tested quantum-safe transactions on testnet in April 2026 -- results showed 90% speed reduction and 40x larger signatures. There's no mainnet timeline.

Meanwhile, quantum computing advances continue. When quantum computers can break Ed25519, every wallet with a revealed public key is at risk. Users need protection now, not "eventually."

## The Solution

Quantum Vault wraps the [Winternitz Vault](https://github.com/deanmlittle/solana-winternitz-vault) primitive (by Dean Little) into a usable consumer wallet. Winternitz One-Time Signatures (W-OTS) are quantum-resistant by construction -- they rely only on hash function security (Keccak256), not on the hardness of discrete logarithms.

**Key innovation:** Every transaction automatically rotates to fresh keys. Your private key is never exposed long enough to attack -- even by a quantum computer.

### How It Works

1. **Vault Creation** -- A Winternitz keypair is generated (32 random scalars, each hashed 256x via Keccak256). The merkle root becomes a PDA seed on Solana.
2. **Sending** -- The vault is split: funds go to the recipient + a new pre-initialized vault with fresh keys. The old vault is atomically closed.
3. **Receiving** -- Send SOL to your current vault address. After any spend, the address changes (like Bitcoin UTXOs).
4. **Migration** -- Import a legacy Ed25519 wallet and transfer funds into a quantum-safe vault.

### Architecture

```
+------------------+     +---------------------+     +------------------+
|   Wallet UI      | --> |  TypeScript SDK     | --> | On-Chain Program |
|   (Next.js)      |     |  (Winternitz Crypto)|     | (Pinocchio/Rust) |
+------------------+     +---------------------+     +------------------+
                                                            |
                                                     Solana Devnet/Mainnet
```

**On-Chain Program** (Rust/Pinocchio)
- 3 instructions: OpenVault, SplitVault, CloseVault
- Zero on-chain data storage -- PDA address IS the pubkey hash
- 896-byte Winternitz signatures verified on-chain
- Optimized for Solana's compute unit limits (~900K CU)

**TypeScript SDK** (`app/src/lib/`)
- `winternitz.ts` -- Full W-OTS implementation (keygen, sign, verify, serialize)
- `vault.ts` -- Transaction builders for all 3 vault instructions
- `wallet-store.ts` -- Zustand state management with vault pool, auto-rotation, balance aggregation

**Wallet Frontend** (Next.js + Tailwind)
- Create quantum-safe wallet
- Send/Receive SOL with automatic vault rotation
- Migrate from legacy Ed25519 wallet
- Vault pool management with quantum shield status
- Transaction history with Solana Explorer links
- Devnet airdrop + fund for testing

## Getting Started

### Prerequisites

- Node.js 18+
- Rust + Cargo (for program development)
- Solana CLI (for deployment)

### Run the Wallet

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create your quantum-safe wallet.

### Build the On-Chain Program

```bash
cd program
cargo build-sbf
```

The compiled program is at `program/target/deploy/quantum_vault.so`.

### Deploy to Devnet

```bash
solana config set --url devnet
solana airdrop 2
solana program deploy program/target/deploy/quantum_vault.so --program-id program/keypair.json
```

## Technical Details

### Winternitz Signature Parameters

| Parameter | Value |
|-----------|-------|
| Hash function | Keccak256 |
| Message digest | 224 bits (28 bytes, truncated) |
| Signature components | 28 x 32 bytes = 896 bytes |
| Public key components | 32 x 32 bytes = 1024 bytes |
| Chain length | 256 iterations |
| Security level | Post-quantum (hash-based) |

### Transaction Size

Winternitz signatures are large (896 bytes). Combined with instruction data and account metas, vault transactions barely fit within Solana's 1,232-byte MTU limit. This is why the program uses pinocchio (lightweight) instead of Anchor, and why vault rotation happens across separate transactions managed by the wallet.

### Vault Rotation Strategy

The wallet manages a pool of pre-initialized vaults:

1. Always maintain 2+ ready vaults
2. On send: SplitVault(old -> recipient + pre-opened vault)
3. Refund (remainder) goes to the next available vault
4. Background replenishment opens new vaults after spends

This makes the one-time signature constraint invisible to the user.

## Security Model

- **Quantum-resistant:** Winternitz signatures rely on Keccak256 hash security, not discrete log
- **One-time use enforced:** Vault is closed after every signing operation -- no key reuse possible
- **Client-side only:** Private keys never leave the browser (localStorage + Zustand persist)
- **No servers:** Fully decentralized, direct Solana RPC
- **Replay protection:** Vault closure prevents replay; signed messages commit to recipient keys

## Hackathon

Built for the **Colosseum Frontier Hackathon** (May 2026).

Based on the [Winternitz Vault](https://github.com/deanmlittle/solana-winternitz-vault) by Dean Little -- we built the wallet experience that makes quantum safety accessible.

## License

MIT
