import type { Program } from "@coral-xyz/anchor";
import anchor from "@coral-xyz/anchor";
const { web3, BN } = anchor;
import { PublicKey, Keypair } from "@solana/web3.js";
import { rooms } from "./registry.js";
import type { BettingContract } from "betting-contract-idl";
import { randomBytes } from "crypto";

export async function createRoom(
  program: Program<BettingContract>,
  roomFee: number,
  hostKeypair: Keypair
) {
  const matchId = randomBytes(15).toString("hex");
  const [matchPublicKey] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("match"), Buffer.from(matchId)],
    program.programId
  );
  const roomFeeInLamports = new BN(roomFee * web3.LAMPORTS_PER_SOL);
  const rakeInLamports = new BN(0.1 * roomFee * web3.LAMPORTS_PER_SOL);

  try {
    const result = await program.methods
      .createMatch(matchId, roomFeeInLamports, rakeInLamports, 4)
      .accounts({
        host: hostKeypair.publicKey,
      })
      .signers([hostKeypair])
      .rpc();
    console.log(
      "Room created with public key:",
      matchPublicKey.toBase58(),
      "Transaction:",
      result
    );
  } catch (err) {
    console.log("ERROR creating room", err);
    throw err;
  }

  return matchPublicKey.toBase58();
}

export async function getMatchAccount(
  program: Program<BettingContract>,
  matchId: string
) {
  try {
    const matchPda = new.PublicKey(matchId);
    const matchAccount = await program.account.matchAccount.fetch(matchPda);
    return matchAccount;
  } catch (error) {
    console.error(`Failed to fetch match account ${matchId}:`, error);
    return null;
  }
}

export async function getRooms(program: Program<BetCtorontract>) {
  const matches = await program.account.matchAccount.all();
  return matches.map((match) => ({
    roomCode: match.publicKey.toBase58(),
    matchId: match.account.id,
    roomFee: match.account.roomFee.toNumber() / web3.LAMPORTS_PER_SOL,
    playerCount: match.account.players.length,
  }));
}
