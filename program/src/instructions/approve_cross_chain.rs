use pinocchio::{
    account_info::AccountInfo,
    instruction::{AccountMeta, Instruction, Seed, Signer},
    program_error::ProgramError,
    ProgramResult,
};

/// CPI authority PDA seed — matches Ika's convention.
const CPI_AUTHORITY_SEED: &[u8] = b"__ika_cpi_authority";

/// Ika approve_message discriminator.
const IKA_APPROVE_MESSAGE_DISC: u8 = 8;

/// Approve a cross-chain message via Ika dWallet CPI.
///
/// After WOTS verification proves quantum-safe authorization (in SplitVault),
/// this instruction asks Ika's dWallet to produce a signature for another chain
/// (e.g. Bitcoin). The Ika network performs MPC signing and writes the result
/// back to a MessageApproval PDA.
///
/// Instruction data layout (101 bytes):
///   [0]      cpi_authority_bump   (u8)
///   [1]      message_approval_bump (u8)
///   [2..34]  message_digest       ([u8; 32] — keccak256 of the message)
///   [34..66] message_metadata_digest ([u8; 32] — keccak256 of metadata, or zeros)
///   [66..98] user_pubkey          ([u8; 32])
///   [98..100] signature_scheme    (u16 LE — 2=EcdsaDoubleSha256 for Bitcoin)
///
/// Accounts:
///   0. coordinator        (readonly)  — DWalletCoordinator PDA
///   1. message_approval   (writable)  — MessageApproval PDA (created by CPI)
///   2. dwallet            (readonly)  — the dWallet account
///   3. caller_program     (readonly)  — this program's executable account
///   4. cpi_authority      (readonly)  — PDA["__ika_cpi_authority"] of this program
///   5. payer              (writable, signer) — rent payer
///   6. system_program     (readonly)
///   7. ika_program        (readonly)  — Ika dWallet program
pub struct ApproveCrossChain<'a> {
    cpi_authority_bump: u8,
    approval_bump: u8,
    message_digest: &'a [u8; 32],
    message_metadata_digest: &'a [u8; 32],
    user_pubkey: &'a [u8; 32],
    signature_scheme: u16,
}

impl<'a> ApproveCrossChain<'a> {
    pub fn deserialize(data: &'a [u8]) -> Result<Self, ProgramError> {
        if data.len() < 100 {
            return Err(ProgramError::InvalidInstructionData);
        }
        Ok(Self {
            cpi_authority_bump: data[0],
            approval_bump: data[1],
            message_digest: arrayref::array_ref!(data, 2, 32),
            message_metadata_digest: arrayref::array_ref!(data, 34, 32),
            user_pubkey: arrayref::array_ref!(data, 66, 32),
            signature_scheme: u16::from_le_bytes([data[98], data[99]]),
        })
    }

    pub fn process(&self, accounts: &[AccountInfo]) -> ProgramResult {
        let [coordinator, message_approval, dwallet, caller_program, cpi_authority, payer, system_program, ika_program] =
            accounts
        else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };

        // Build Ika approve_message instruction data (100 bytes)
        let mut ix_data = [0u8; 100];
        ix_data[0] = IKA_APPROVE_MESSAGE_DISC;
        ix_data[1] = self.approval_bump;
        ix_data[2..34].copy_from_slice(self.message_digest);
        ix_data[34..66].copy_from_slice(self.message_metadata_digest);
        ix_data[66..98].copy_from_slice(self.user_pubkey);
        ix_data[98..100].copy_from_slice(&self.signature_scheme.to_le_bytes());

        // CPI to Ika dWallet program
        let ix = Instruction {
            program_id: ika_program.key(),
            accounts: &[
                AccountMeta::readonly(coordinator.key()),
                AccountMeta::writable(message_approval.key()),
                AccountMeta::readonly(dwallet.key()),
                AccountMeta::readonly(caller_program.key()),
                AccountMeta::readonly_signer(cpi_authority.key()),
                AccountMeta::writable_signer(payer.key()),
                AccountMeta::readonly(system_program.key()),
            ],
            data: &ix_data,
        };

        let bump_slice = [self.cpi_authority_bump];
        let signer_seeds = [Seed::from(CPI_AUTHORITY_SEED), Seed::from(&bump_slice)];
        let signer = [Signer::from(&signer_seeds)];

        pinocchio::cpi::invoke_signed(
            &ix,
            &[
                coordinator,
                message_approval,
                dwallet,
                caller_program,
                cpi_authority,
                payer,
                system_program,
            ],
            &signer,
        )
    }
}
