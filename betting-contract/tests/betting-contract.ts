import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BettingContract } from "../target/types/betting_contract";
import { nanoid } from "nanoid";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";

describe("betting-contract", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.bettingContract as Program<BettingContract>;

  const newMatchId = nanoid();
  console.log("New match id:", newMatchId);

  // Keep track of players and tx logs
  const players: anchor.web3.Keypair[] = [];
  const results: any = { create: "", joins: [], start: "", settle: "" };

  it("create match", async () => {
    const tx = await program.methods
      .createMatch(newMatchId, new anchor.BN(LAMPORTS_PER_SOL))
      .rpc();

    results.create = tx;
    console.log("Created match tx:", tx);
  });

  it("join 4 players", async () => {
    for (let i = 0; i < 4; i++) {
      const player = anchor.web3.Keypair.generate();
      players.push(player);

      console.log(`Player ${i + 1} pubkey:`, player.publicKey.toString());

      // Airdrop SOL
      const sig = await program.provider.connection.requestAirdrop(
        player.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await program.provider.connection.confirmTransaction(sig);

      // Join match
      const tx = await program.methods
        .joinMatch(newMatchId)
        .accounts({
          player: player.publicKey,
        })
        .signers([player])
        .rpc();

      results.joins.push({ player: player.publicKey.toString(), tx });
      console.log(`Player ${i + 1} joined, tx:`, tx);
    }
  });

  it("start match", async () => {
    const tx = await program.methods.startMatch(newMatchId).rpc();
    results.start = tx;
    console.log("Started match tx:", tx);
  });

  it("settle match with a specific winner", async () => {
    const winnerIndex = 0; // Let's choose the first player as the winner
    const winner = players[winnerIndex];

    const [matchPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("match"), Buffer.from(newMatchId)],
      program.programId
    );

    // Fetch match account data from blockchain
    const matchAccount = await program.account.matchAccount.fetch(matchPda);

    console.log("Match account state:", matchAccount);

    const tx = await program.methods
      .settleMatch(newMatchId, winnerIndex)
      .accounts({
        player1: players[0].publicKey,
        player2: players[1].publicKey,
        player3: players[2].publicKey,
        player4: players[3].publicKey,
      })
      .rpc();

    results.settle = { tx, winner: winner.publicKey.toString() };
    console.log(
      `Settled match. Winner is Player ${
        winnerIndex + 1
      } (${winner.publicKey.toString()})`
    );

    // Now, close the match account
    const closeTx = await program.methods
      .closeMatch(newMatchId)
      .accounts({
        matchAccount: matchPda,
      })
      .rpc();
    console.log("Closed match tx:", closeTx);
  });

  it("should refund all players if winner_index is -1", async () => {
    const matchId = nanoid();
    console.log("New match id for refund test:", matchId);
    const refundPlayers: anchor.web3.Keypair[] = [];

    await program.methods
      .createMatch(matchId, new anchor.BN(LAMPORTS_PER_SOL))
      .rpc();

    for (let i = 0; i < 4; i++) {
      const player = anchor.web3.Keypair.generate();
      refundPlayers.push(player);
      const sig = await program.provider.connection.requestAirdrop(
        player.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await program.provider.connection.confirmTransaction(sig);
      await program.methods
        .joinMatch(matchId)
        .accounts({
          player: player.publicKey,
        })
        .signers([player])
        .rpc();
    }

    await program.methods.startMatch(matchId).rpc();

    const tx = await program.methods
      .settleMatch(matchId, -1)
      .accounts({
        player1: refundPlayers[0].publicKey,
        player2: refundPlayers[1].publicKey,
        player3: refundPlayers[2].publicKey,
        player4: refundPlayers[3].publicKey,
      })
      .rpc();

    console.log("Refund tx:", tx);
  });

  it("a player should be able to leave a match and get a refund", async () => {
    const matchId = nanoid();
    console.log("New match id for leave test:", matchId);
    const player = anchor.web3.Keypair.generate();

    await program.methods
      .createMatch(matchId, new anchor.BN(LAMPORTS_PER_SOL))
      .rpc();

    const sig = await program.provider.connection.requestAirdrop(
      player.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await program.provider.connection.confirmTransaction(sig);

    await program.methods
      .joinMatch(matchId)
      .accounts({
        player: player.publicKey,
      })
      .signers([player])
      .rpc();

    const tx = await program.methods
      .leaveMatch(matchId)
      .accounts({
        player: player.publicKey,
      })
      .signers([player])
      .rpc();

    console.log("Leave match tx:", tx);
  });

  it("log final results", async () => {
    console.log("\n========= FINAL RESULTS ========");
    console.log("Match ID:", newMatchId);
    console.log("Create tx:", results.create);
    results.joins.forEach((j: any, idx: number) => {
      console.log(`Player ${idx + 1}: ${j.player}, join tx: ${j.tx}`);
    });
    console.log("Start tx:", results.start);
    console.log("Winner:", results.settle.winner, "tx:", results.settle.tx);
    console.log("=================================\n");
  });
});
