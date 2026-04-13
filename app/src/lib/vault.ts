/**
 * Solana Winternitz Vault operations.
 * Builds transactions for open, split, and close vault instructions.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  VAULT_PROGRAM_ID,
  VaultInstruction,
  SIGNATURE_SIZE,
} from "./constants";
import {
  WinternitzKeypair,
  WinternitzSignature,
  serializeSignature,
  sign,
} from "./winternitz";

/** Derive the vault PDA from a Winternitz pubkey hash */
export function deriveVaultPDA(pubkeyHash: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [pubkeyHash],
    VAULT_PROGRAM_ID
  );
}

/** Build an OpenVault instruction */
export function buildOpenVaultInstruction(
  payer: PublicKey,
  pubkeyHash: Uint8Array,
  bump: number
): TransactionInstruction {
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [pubkeyHash],
    VAULT_PROGRAM_ID
  );

  // Instruction data: [discriminator(1), hash(32), bump(1)] = 34 bytes
  const data = Buffer.alloc(34);
  data[0] = VaultInstruction.OpenVault;
  Buffer.from(pubkeyHash).copy(data, 1);
  data[33] = bump;

  return new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: VAULT_PROGRAM_ID,
    data,
  });
}

/** Build a SplitVault instruction (send funds + rotate to new vault) */
export function buildSplitVaultInstruction(
  keypair: WinternitzKeypair,
  vaultBump: number,
  splitTo: PublicKey,
  refundTo: PublicKey,
  amount: bigint
): TransactionInstruction {
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [keypair.pubkeyHash],
    VAULT_PROGRAM_ID
  );

  // Assemble the signed message: [amount(8), split_pubkey(32), refund_pubkey(32)] = 72 bytes
  const message = new Uint8Array(72);
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(amount);
  message.set(amountBuf, 0);
  message.set(splitTo.toBytes(), 8);
  message.set(refundTo.toBytes(), 40);

  // Sign the message
  const signature = sign(keypair.privkey, message);
  const sigBytes = serializeSignature(signature);

  // Instruction data: [discriminator(1), signature(896), amount(8), bump(1)] = 906 bytes
  const data = Buffer.alloc(906);
  data[0] = VaultInstruction.SplitVault;
  Buffer.from(sigBytes).copy(data, 1);
  amountBuf.copy(data, 897);
  data[905] = vaultBump;

  return new TransactionInstruction({
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: splitTo, isSigner: false, isWritable: true },
      { pubkey: refundTo, isSigner: false, isWritable: true },
    ],
    programId: VAULT_PROGRAM_ID,
    data,
  });
}

/** Build a CloseVault instruction (withdraw all funds) */
export function buildCloseVaultInstruction(
  keypair: WinternitzKeypair,
  vaultBump: number,
  refundTo: PublicKey
): TransactionInstruction {
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [keypair.pubkeyHash],
    VAULT_PROGRAM_ID
  );

  // Sign the refund pubkey as the message
  const signature = sign(keypair.privkey, refundTo.toBytes());
  const sigBytes = serializeSignature(signature);

  // Instruction data: [discriminator(1), signature(896), bump(1)] = 898 bytes
  const data = Buffer.alloc(898);
  data[0] = VaultInstruction.CloseVault;
  Buffer.from(sigBytes).copy(data, 1);
  data[897] = vaultBump;

  return new TransactionInstruction({
    keys: [
      { pubkey: vaultPDA, isSigner: false, isWritable: true },
      { pubkey: refundTo, isSigner: false, isWritable: true },
    ],
    programId: VAULT_PROGRAM_ID,
    data,
  });
}

/** Create a transaction with compute budget for vault operations */
export function createVaultTransaction(
  instruction: TransactionInstruction,
  feePayer: PublicKey,
  computeUnits: number = 900_000,
  priorityFee: number = 200_000
): Transaction {
  const tx = new Transaction();
  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
    instruction
  );
  tx.feePayer = feePayer;
  return tx;
}

/** Get balance of a vault (or any account) */
export async function getVaultBalance(
  connection: Connection,
  vaultAddress: PublicKey
): Promise<number> {
  const balance = await connection.getBalance(vaultAddress);
  return balance;
}

/** Check if a vault account exists on-chain */
export async function vaultExists(
  connection: Connection,
  vaultAddress: PublicKey
): Promise<boolean> {
  const info = await connection.getAccountInfo(vaultAddress);
  return info !== null;
}
