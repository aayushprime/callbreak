import type { Program } from "@coral-xyz/anchor";
import anchor from "@coral-xyz/anchor";
const { web3, BN } = anchor;
import { PublicKey } from "@solana/web3.js";
import { rooms } from "./registry.js";
import type { BettingContract } from "betting-contract-idl";
import { randomBytes } from "crypto";

export async function createRoom(
  program: Program<BettingContract>,
  roomFee: number,
  host: string
) {
  const matchId = randomBytes(16).toString("hex");
  const [matchPublicKey] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("match"), Buffer.from(matchId)],
    program.programId
  );

  await program.methods
    .createMatch(matchId, new BN(roomFee), new BN(0.1 * roomFee), 4)
    .accounts({
      host: new PublicKey(host),
    })
    .rpc();

  return matchPublicKey.toBase58();
}

export async function getMatchAccount(
  program: Program<BettingContract>,
  matchId: string
) {
  try {
    const matchPda = new PublicKey(matchId);
    const matchAccount = await program.account.matchAccount.fetch(matchPda);
    return matchAccount;
  } catch (error) {
    console.error(`Failed to fetch match account ${matchId}:`, error);
    return null;
  }
}

export function getRooms() {
  return Array.from(rooms.values()).map((room) => ({
    roomCode: room.id,
    roomFee: room.roomFee,
    playerCount: room.players.size,
  }));
}
