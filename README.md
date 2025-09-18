# 🃏 Callbreak Game (In progress)
This is a monorepo for a multiplayer Callbreak card game, built with Next.js and TypeScript.

## ✨ Features
- Multiplayer Callbreak card game
- Real-time gameplay with WebSockets
- Modern UI with Next.js and Tailwind CSS

## 🛠️ Tech Stack

- **Frontend:** [Next.js](https://nextjs.org/), [React](https://reactjs.org/), [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/)
- **Backend:** [TypeScript](https://www.typescriptlang.org/), [Node.js](https://nodejs.org/)
- **Package Manager:** [pnpm](https://pnpm.io/)
- **Build Tool:** [Turbo](https://turbo.build/)

## 📂 Project Structure

This project is a monorepo with the following packages:

- **`betting-contract`**: 🔒 Simple escrow contract that locks the funds on chain and releases them to the winner.
- **`betting-contract-idl`**: 🗺️ Slim package to make the interface available to both the server and the clients (to allow them to talk to the blockchain).
- **`callbreak-engine`**: 🃏 The core game logic for Callbreak.
- **`callbreak-ui`**: 🖥️ The Next.js frontend for the game.
- **`room-service`**: 🚪 Defines player and room-related mechanics.
- **`server`**: 🌐 Handles the main server logic and WebSockets.

## Design

- Two core objects that need to connect for the game to work is `Player` (client) and `Game`.
- This is achieved through the Room interface. Room abstracts away the location of the Game to the player and the location of the player to the Game.
- In single player, Room is just a single interface that passes message to each other.
- A `Game` has `State` object which is mutated by various commands/moves by the player, or automatically (eg. turn timed out, player is forced to move).
- The Client uses `LocalRoomService` to allow the game to be played locally and depends on `RoomService` to connect to Game over the network.
- `Bots` are just `Players` that have some automated logic, usually run alongside the `Game` object, but they are also capable of utilizing the `Room` paradigm to work over the network.
- On chain logic: The server creates a match on chain, where players can join paying the fee set by the creator of match. Once enough players have joined, the server will then start the match. The actual `Game` is played off-chain. Once the game winner is declared, the funds are released to the winner (a small cut is kept by the server).

## Smart contract methods

- create_match(matchId, roomFee, rake) [host]
- join_match(matchId) [player]
- leave_match(matchId) [player]
- start_match(matchId) [host]
- settle_match(winnerId, matchId) [host]

## Limitations
- The game currently works with bots only. Online mode utilizes the escrow contract, but the actual players are bots.
- I was going to add multiplayer but I ran out of time :(

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    ```

### Running the project

Start all the services in development mode:

```bash
npx turbo run dev
```
