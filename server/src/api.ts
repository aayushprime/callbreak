import type { Program } from "@coral-xyz/anchor";
import anchor from "@coral-xyz/anchor";
const { web3, BN } = anchor;
import { PublicKey, Keypair } from "@solana/web3.js";
import { rooms } from "./registry.js";
import type { BettingContract } from "betting-contract-idl";
import { randomBytes } from "crypto";
import keys from "./keys.json" with { type: "json" };

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

  return { roomId: matchPublicKey.toBase58(), matchId };
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

export async function getRooms(program: Program<BettingContract>) {
  const matches = await program.account.matchAccount.all();
  return matches.map((match) => ({
    roomCode: match.publicKey.toBase58(),
    matchId: match.account.id,
    roomFee: match.account.roomFee.toNumber() / web3.LAMPORTS_PER_SOL,
    playerCount: match.account.players.length,
  }));
}

export async function joinMatch(
    program: Program<BettingContract>,
    matchId: string,
    playerKeypair: Keypair
    ) {
    const [matchPublicKey] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("match"), Buffer.from(matchId)],
        program.programId
    );
    
    try {
        const result = await program.methods
        .joinMatch(matchId)
        .accounts({
            player: playerKeypair.publicKey,
            matchAccount: matchPublicKey,
            systemProgram: web3.SystemProgram.programId,
        })
        .signers([playerKeypair])
        .rpc();
        console.log(
        "Player joined match:",
        playerKeypair.publicKey.toBase58(),
        "Transaction:",
        result
        );
    } catch (err) {
        console.log("ERROR joining match", err);
        throw err;
    }
}

export async function createRoomAndAddBots(
    program: Program<BettingContract>,
    roomFee: number,
    hostKeypair: Keypair
    ) {
    const { roomId, matchId } = await createRoom(program, roomFee, hostKeypair);
    
    const botKeypairs = Object.values(keys.bots).map((bot) => Keypair.fromSecretKey(new Uint8Array(bot))).slice(0, 3);
    
    for (const botKeypair of botKeypairs) {
        await joinMatch(program, matchId, botKeypair);
    }
    
    return { roomId, matchId };
}

export async function startMatch(
    program: Program<BettingContract>,
    matchId: string,
    hostKeypair: Keypair
    ) {
    const [matchPublicKey] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("match"), Buffer.from(matchId)],
        program.programId
    );
    
    try {
        const result = await program.methods
        .startMatch(matchId)
        .accounts({
            host: hostKeypair.publicKey,
            matchAccount: matchPublicKey,
        })
        .signers([hostKeypair])
        .rpc();
        console.log("Match started:", result);
    } catch (err) {
        console.log("ERROR starting match", err);
        throw err;
    }
}

export async function settleMatch(
    program: Program<BettingContract>,
    matchId: string,
    winnerIndex: number,
    hostKeypair: Keypair
    ) {
    const [matchPublicKey] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("match"), Buffer.from(matchId)],
        program.programId
    );
    
    try {
        const result = await program.methods
        .settleMatch(matchId, winnerIndex)
        .accounts({
            host: hostKeypair.publicKey,
            matchAccount: matchPublicKey,
        })
        .signers([hostKeypair])
        .rpc();
        console.log("Match settled:", result);
    } catch (err) {
        console.log("ERROR settling match", err);
        throw err;
    }
}

export async function refundMatch(
    program: Program<BettingContract>,
    matchId: string,
    hostKeypair: Keypair
    ) {
    const [matchPublicKey] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("match"), Buffer.from(matchId)],
        program.programId
    );
    
    try {
        const result = await program.methods
        .refundMatch(matchId)
        .accounts({
            host: hostKeypair.publicKey,
            matchAccount: matchPublicKey,
        })
        .signers([hostKeypair])
        .rpc();
        console.log("Match refunded:", result);
    } catch (err) {
        console.log("ERROR refunding match", err);
        throw err;
    }
}

export async function closeMatch(
    program: Program<BettingContract>,
    matchId: string,
    hostKeypair: Keypair
    ) {
    const [matchPublicKey] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("match"), Buffer.from(matchId)],
        program.programId
    );
    
    try {
        const result = await program.methods
        .closeMatch(matchId)
        .accounts({
            host: hostKeypair.publicKey,
            matchAccount: matchPublicKey,
        })
        .signers([hostKeypair])
        .rpc();
        console.log("Match closed:", result);
    } catch (err) {
        console.log("ERROR closing match", err);
        throw err;
    }
}