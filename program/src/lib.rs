pub mod instructions;
use instructions::*;

#[cfg(test)]
pub mod tests;

use pinocchio::{
    account_info::AccountInfo, entrypoint, program_error::ProgramError, pubkey::Pubkey,
    ProgramResult,
};

// G75JKXTU6HP2tKdNaXzwjHtaLjrdEq5AY9SSQ1uTyjKP
pub const ID: Pubkey = [
    0xe0, 0x6d, 0xa6, 0x32, 0x3a, 0x5a, 0x99, 0xf7, 0x04, 0x6c, 0x4e, 0x61, 0xf5, 0x7f, 0xcb, 0x9f,
    0x3e, 0xed, 0xe6, 0xc3, 0x92, 0x52, 0xaa, 0xf7, 0x9f, 0x3a, 0x5e, 0x98, 0xbc, 0x7d, 0xd9, 0x72,
];

entrypoint!(process_instruction);

fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let (discriminator, data) = instruction_data
        .split_first()
        .ok_or(ProgramError::InvalidInstructionData)?;
    match VaultInstructions::try_from(discriminator)? {
        VaultInstructions::SplitVault => SplitVault::deserialize(data)?.process(accounts),
        VaultInstructions::OpenVault => OpenVault::deserialize(data)?.process(accounts),
        VaultInstructions::CloseVault => CloseVault::deserialize(data)?.process(accounts),
    }
}
