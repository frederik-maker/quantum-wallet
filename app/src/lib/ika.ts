/**
 * Ika dWallet integration for cross-chain signing.
 *
 * Flow: WOTS authorizes on Solana → Ika dWallet signs on target chain (Bitcoin, etc.)
 * This gives quantum-safe authorization + cross-chain reach.
 *
 * Uses Ika's pre-alpha Solana devnet program (87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY).
 */

import {
  Connection,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import {
  VAULT_PROGRAM_ID,
  IKA_PROGRAM_ID,
  CPI_AUTHORITY_SEED,
  VaultInstruction,
  DWalletSignatureScheme,
} from "./constants";

// Re-export for convenience
export { DWalletSignatureScheme };

/** Derive the CPI authority PDA for our program */
export function deriveCpiAuthority(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(CPI_AUTHORITY_SEED)],
    VAULT_PROGRAM_ID
  );
}

/** Ika DWalletCoordinator PDA — singleton per Ika program */
export function deriveCoordinatorPDA(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("coordinator")],
    IKA_PROGRAM_ID
  );
  return pda;
}

/**
 * Derive the MessageApproval PDA for a given dWallet + message.
 * Seeds: ["dwallet", ...chunks(curve_u16_le || pubkey), "message_approval", &scheme_u16_le, &message_digest]
 */
export function deriveMessageApprovalPDA(
  dwalletPubkey: PublicKey,
  signatureScheme: number,
  messageDigest: Uint8Array,
): [PublicKey, number] {
  const schemeBytes = Buffer.alloc(2);
  schemeBytes.writeUInt16LE(signatureScheme);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("message_approval"),
      dwalletPubkey.toBytes(),
      schemeBytes,
      messageDigest,
    ],
    IKA_PROGRAM_ID
  );
}

/**
 * Build the ApproveCrossChainMessage instruction (discriminator: 3).
 *
 * This CPIs into Ika's dWallet program to request a signature on another chain.
 * Call this AFTER a successful SplitVault (which proves WOTS authorization).
 */
export function buildApproveCrossChainInstruction(
  payer: PublicKey,
  dwalletAddress: PublicKey,
  messageDigest: Uint8Array,
  userPubkey: Uint8Array,
  signatureScheme: DWalletSignatureScheme = DWalletSignatureScheme.EcdsaDoubleSha256,
  messageMetadataDigest: Uint8Array = new Uint8Array(32), // zeros = no metadata
): TransactionInstruction {
  const [cpiAuthority, cpiAuthorityBump] = deriveCpiAuthority();
  const coordinator = deriveCoordinatorPDA();
  const [messageApproval, approvalBump] = deriveMessageApprovalPDA(
    dwalletAddress,
    signatureScheme,
    messageDigest,
  );

  // Instruction data: [disc(1), cpi_bump(1), approval_bump(1), msg_digest(32), meta_digest(32), user_pk(32), scheme(2)] = 101 bytes
  const data = Buffer.alloc(101);
  data[0] = VaultInstruction.ApproveCrossChain;
  data[1] = cpiAuthorityBump;
  data[2] = approvalBump;
  Buffer.from(messageDigest).copy(data, 3);
  Buffer.from(messageMetadataDigest).copy(data, 35);
  Buffer.from(userPubkey).copy(data, 67);
  data.writeUInt16LE(signatureScheme, 99);

  return new TransactionInstruction({
    keys: [
      { pubkey: coordinator, isSigner: false, isWritable: false },
      { pubkey: messageApproval, isSigner: false, isWritable: true },
      { pubkey: dwalletAddress, isSigner: false, isWritable: false },
      { pubkey: VAULT_PROGRAM_ID, isSigner: false, isWritable: false }, // caller_program
      { pubkey: cpiAuthority, isSigner: false, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: IKA_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: VAULT_PROGRAM_ID,
    data,
  });
}

/**
 * Read a MessageApproval account to check if Ika has signed.
 * Returns the signature bytes if signed, null if still pending.
 */
export async function readMessageApproval(
  connection: Connection,
  dwalletAddress: PublicKey,
  signatureScheme: number,
  messageDigest: Uint8Array,
): Promise<{ signed: boolean; signature: Uint8Array | null }> {
  const [approvalPDA] = deriveMessageApprovalPDA(
    dwalletAddress,
    signatureScheme,
    messageDigest,
  );

  const info = await connection.getAccountInfo(approvalPDA);
  if (!info || !info.data) {
    return { signed: false, signature: null };
  }

  // MessageApproval layout: status at offset 172, signature at offset 175
  const status = info.data[172];
  if (status === 1) {
    const sigLen = info.data[173] | (info.data[174] << 8);
    const signature = info.data.slice(175, 175 + sigLen);
    return { signed: true, signature: new Uint8Array(signature) };
  }

  return { signed: false, signature: null };
}

/**
 * Poll for Ika signature completion.
 * Returns the signature once the MessageApproval status flips to Signed.
 */
export async function waitForSignature(
  connection: Connection,
  dwalletAddress: PublicKey,
  signatureScheme: number,
  messageDigest: Uint8Array,
  timeoutMs: number = 30_000,
  pollIntervalMs: number = 2_000,
): Promise<Uint8Array | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await readMessageApproval(
      connection,
      dwalletAddress,
      signatureScheme,
      messageDigest,
    );
    if (result.signed && result.signature) {
      return result.signature;
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  return null;
}

/**
 * Compute keccak256 hash of a message (for message_digest parameter).
 * Uses the same keccak256 as the WOTS implementation.
 */
export async function keccak256(message: Uint8Array): Promise<Uint8Array> {
  const { keccak_256 } = await import("js-sha3");
  return new Uint8Array(keccak_256.arrayBuffer(message));
}
