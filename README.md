# 🃏 Callbreak Game

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

- **`callbreak-engine`**: 🃏 The core game logic for Callbreak.
- **`callbreak-ui`**: 🖥️ The Next.js frontend for the game.
- **`room-service`**: 🚪 Defines player and room-related mechanics.
- **`server`**: 🌐 Handles the main server logic and WebSockets.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/installation)

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

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a pull request.

## 📄 License

This project is licensed under the ISC License.