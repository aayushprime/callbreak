#![allow(deprecated)]

use anchor_lang::{prelude::*, solana_program::system_instruction};

declare_id!("12LxGYLQyP5m8HMzaQaC3dhcMLm9uvbzDgtwZ4Mjk5vX");

pub const MAX_ID_LENGTH: usize = 32;
pub const MAX_PLAYERS: usize = 4;

#[program]
pub mod betting_contract {
    use super::*;

    pub fn create_match(
        ctx: Context<CreateMatch>,
        id: String,
        room_fee_amount: u64,
        rake: u64,
        num_players: u8,
    ) -> Result<()> {
        require!(id.len() <= MAX_ID_LENGTH, ErrorCode::IdTooLong);
        require!(room_fee_amount > 0, ErrorCode::InvalidAmount);
        require!(
            num_players >= 2 && num_players <= MAX_PLAYERS as u8,
            ErrorCode::InvalidPlayers
        );
        ctx.accounts.match_account.host = ctx.accounts.host.key();
        ctx.accounts.match_account.id = id;
        ctx.accounts.match_account.room_fee = room_fee_amount;
        ctx.accounts.match_account.rake = rake;
        ctx.accounts.match_account.max_players = num_players;
        ctx.accounts.match_account.players = Vec::new();
        ctx.accounts.match_account.deposits = Vec::new();
        ctx.accounts.match_account.status = MatchStatus::Open as u8;
        msg!("Match created with ID: {}", ctx.accounts.match_account.id);
        Ok(())
    }

    pub fn join_match(ctx: Context<JoinMatch>, _match_id: String) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.system_program.key(),
            anchor_lang::system_program::ID
        );
        let player = &ctx.accounts.player;
        let rent = Rent::get()?;
        let minimum_balance = rent.minimum_balance(player.to_account_info().data_len());

        require!(
            ctx.accounts.match_account.status == MatchStatus::Open as u8,
            ErrorCode::MatchNotOpen
        );
        require!(
            ctx.accounts.match_account.players.len()
                <= ctx.accounts.match_account.max_players as usize,
            ErrorCode::InvalidPlayers
        );
        require!(
            !ctx.accounts
                .match_account
                .players
                .contains(&ctx.accounts.player.key()),
            ErrorCode::AlreadyFunded
        );
        require!(
            player.lamports() >= ctx.accounts.match_account.room_fee + minimum_balance,
            ErrorCode::InsufficientFunds
        );

        anchor_lang::solana_program::program::invoke(
            &system_instruction::transfer(
                &ctx.accounts.player.key(),
                &ctx.accounts.match_account.key(),
                ctx.accounts.match_account.room_fee,
            ),
            &[
                ctx.accounts.player.to_account_info(),
                ctx.accounts.match_account.to_account_info(),
            ],
        )?;

        ctx.accounts
            .match_account
            .players
            .push(ctx.accounts.player.key());
        let room_fee = ctx.accounts.match_account.room_fee;
        ctx.accounts.match_account.deposits.push(room_fee);

        msg!(
            "Match {} funded by player {}",
            ctx.accounts.match_account.id,
            ctx.accounts.player.key()
        );
        Ok(())
    }

    pub fn leave_match(ctx: Context<LeaveMatch>, _match_id: String) -> Result<()> {
        let match_account = &mut ctx.accounts.match_account;
        let player_key = ctx.accounts.player.key();

        // Ensure match is open
        require!(
            match_account.status == MatchStatus::Open as u8,
            ErrorCode::MatchNotOpen
        );

        // Ensure player is part of the match
        let player_index = match_account
            .players
            .iter()
            .position(|&p| p == player_key)
            .ok_or(ErrorCode::NotAPlayer)?;

        // Refund the player's deposit
        let deposit_amount = match_account.deposits[player_index];

        if deposit_amount > 0 {
            **match_account.to_account_info().try_borrow_mut_lamports()? -= deposit_amount;
            **ctx
                .accounts
                .player
                .to_account_info()
                .try_borrow_mut_lamports()? += deposit_amount;
        }

        // Remove player and their deposit from the vectors
        match_account.players.remove(player_index);
        match_account.deposits.remove(player_index);

        msg!("Player {} left match {}", player_key, match_account.id);

        Ok(())
    }

    pub fn start_match(ctx: Context<StartMatch>, _match_id: String) -> Result<()> {
        let match_account = &mut ctx.accounts.match_account;
        require!(
            match_account.status == MatchStatus::Open as u8,
            ErrorCode::MatchNotOpen
        );
        require!(
            match_account.players.len() == match_account.max_players as usize,
            ErrorCode::NotAllFunded
        );
        match_account.status = MatchStatus::Active as u8;
        Result::Ok(())
    }

    pub fn settle_match(
        ctx: Context<SettleMatch>,
        _match_id: String,
        winner_index: i8,
    ) -> Result<()> {
        let match_account = &mut ctx.accounts.match_account;

        if winner_index >= 0 {
            require!(
                winner_index < match_account.players.len() as i8,
                ErrorCode::InvalidWinner
            );
            require!(
                match_account.status == MatchStatus::Active as u8,
                ErrorCode::MatchNotActive
            );

            let total_pot: u64 = match_account.deposits.iter().sum();
            let winner_info = &ctx.remaining_accounts[winner_index as usize];
            let host_info = &ctx.accounts.host;

            require_keys_eq!(
                winner_info.key(),
                match_account.players[winner_index as usize],
                ErrorCode::WinnerMismatch
            );

            let payout = total_pot
                .checked_sub(match_account.rake)
                .ok_or(ErrorCode::NothingToPayout)?;

            // Pay rake to host
            if match_account.rake > 0 {
                **match_account.to_account_info().try_borrow_mut_lamports()? -= match_account.rake;
                **host_info.to_account_info().try_borrow_mut_lamports()? += match_account.rake;
            }

            // Pay rest to winner
            **match_account.to_account_info().try_borrow_mut_lamports()? -= payout;
            **winner_info.to_account_info().try_borrow_mut_lamports()? += payout;
            match_account.status = MatchStatus::Settled as u8;
            msg!(
                "Match {} settled. Winner: {}",
                match_account.id,
                winner_info.key()
            );
            return Ok(());
        } else {
            // initiate refund process
            require!(
                match_account.status != MatchStatus::Settled as u8
                    && match_account.status != MatchStatus::Refunded as u8,
                ErrorCode::CannotRefund
            );

            for (i, player_info) in ctx.remaining_accounts.iter().enumerate() {
                let expected_player_pubkey = match_account.players[i];
                require_keys_eq!(
                    player_info.key(),
                    expected_player_pubkey,
                    ErrorCode::PlayerMismatchForRefund
                );

                let deposit_amount = match_account.deposits[i];
                if deposit_amount > 0 {
                    **match_account.to_account_info().try_borrow_mut_lamports()? -= deposit_amount;
                    **player_info.to_account_info().try_borrow_mut_lamports()? += deposit_amount;
                    msg!(
                        "Refunded {} lamports to player {}",
                        deposit_amount,
                        expected_player_pubkey
                    );
                }
            }
            match_account.status = MatchStatus::Refunded as u8;
            msg!("Match {} refunded", match_account.id);

            Result::Ok(())
        }
    }

    pub fn close_match(ctx: Context<CloseMatch>, _match_id: String) -> Result<()> {
        let match_account = &ctx.accounts.match_account;
        require!(
            match_account.status == MatchStatus::Settled as u8
                || match_account.status == MatchStatus::Refunded as u8,
            ErrorCode::MatchNotSettledOrRefunded
        );
        Ok(())
    }
}

// data format for someone calling the create_match method
#[derive(Accounts)]
#[instruction(id: String)]
pub struct CreateMatch<'info> {
    #[account(mut)]
    pub host: Signer<'info>, // address of the server creating the match

    #[account(
        init,
        payer= host,
        space = MatchAccount::space(),
        seeds = [b"match", id.as_bytes()],
        bump,
    )]
    pub match_account: Account<'info, MatchAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct JoinMatch<'info> {
    #[account(mut)]
    pub player: Signer<'info>, // the player who is playing

    #[account(
        mut,
        seeds = [b"match", match_id.as_bytes()],
        bump,
    )]
    pub match_account: Account<'info, MatchAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct LeaveMatch<'info> {
    #[account(mut)]
    pub player: Signer<'info>, // the player who is leaving

    #[account(
        mut,
        seeds = [b"match", match_id.as_bytes()],
        bump,
    )]
    pub match_account: Account<'info, MatchAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct StartMatch<'info> {
    #[account(mut)]
    pub host: Signer<'info>, // the host starting the match
    #[account(
        mut,
        seeds = [b"match", match_id.as_bytes()],
        bump,
        has_one = host,
    )]
    pub match_account: Account<'info, MatchAccount>,
}

#[derive(Accounts)]
#[instruction(_match_id: String, winner_index: i8)]
// winner_index >= 0 -> player Index
// winner_index == -1 -> Error (refund all players)
pub struct SettleMatch<'info> {
    #[account(mut)]
    pub host: Signer<'info>, // the host starting the match

    #[account(
        mut,
        seeds = [b"match", _match_id.as_bytes()],
        bump,
        has_one = host,
    )]
    pub match_account: Account<'info, MatchAccount>,
    pub system_program: Program<'info, System>,
    //remaining accounts are the players (winner or all players for refund)
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct CloseMatch<'info> {
    #[account(mut)]
    pub host: Signer<'info>, // the host starting the match

    #[account(
        mut,
        seeds = [b"match", match_id.as_bytes()],
        bump,
        has_one = host,
        close = host,
    )]
    pub match_account: Account<'info, MatchAccount>,
}

// data actually stored on chain
#[account]
pub struct MatchAccount {
    pub host: Pubkey,
    pub id: String,
    pub room_fee: u64,
    pub rake: u64,
    pub players: Vec<Pubkey>,
    pub deposits: Vec<u64>,
    pub status: u8,
    pub max_players: u8,
}

impl MatchAccount {
    pub fn space() -> usize {
        8 + // discriminator
        32 + // host
        4 + MAX_ID_LENGTH + // id string
        8 + // room fee
        8 + // rake
        4 + (32 * MAX_PLAYERS) + // players vec
        4 + (8 * MAX_PLAYERS) + // deposits vec
        1 + // status
        1 // max_players
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid number of players")]
    InvalidPlayers,
    #[msg("Match ID too long")]
    IdTooLong,
    #[msg("Match is not open")]
    MatchNotOpen,
    #[msg("Player is not part of this match")]
    NotAPlayer,
    #[msg("Player already funded")]
    AlreadyFunded,
    #[msg("Amount must equal room fee")]
    InvalidAmount,
    #[msg("Not all players have funded yet")]
    NotAllFunded,
    #[msg("Match not active")]
    MatchNotActive,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Cannot withdraw to match account")]
    AccountsOverlap,
    #[msg("Invalid winner index")]
    InvalidWinner,
    #[msg("Winner account mismatch")]
    WinnerMismatch,
    #[msg("Nothing to payout")]
    NothingToPayout,
    #[msg("Cannot refund in current state")]
    CannotRefund,
    #[msg("Player account mismatch during refund")]
    PlayerMismatchForRefund,
    #[msg("Insufficient funds to join match")]
    InsufficientFunds,
    #[msg("Match must be settled or refunded to be closed")]
    MatchNotSettledOrRefunded,
}

#[repr(u8)]
pub enum MatchStatus {
    Open = 0,
    Active = 1,
    Settled = 2,
    Refunded = 3,
    Cancelled = 4,
}
