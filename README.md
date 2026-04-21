# 🚀 Stellar Network Payment Terminal

A decentralized payment terminal for the **Stellar Testnet** built with React + Vite. Connect your [Freighter wallet](https://www.freighter.app/), view your XLM balance, and send payments — all through a dystopian-themed terminal interface.

<img width="1863" height="952" alt="image" src="https://github.com/user-attachments/assets/d13c621a-d1f8-46cc-a441-93cf258678b1" />

---

## ✨ Features

- **🔗 Freighter Wallet Integration** — Connect/disconnect your Stellar wallet via the Freighter browser extension
- **💰 Real-Time Balance** — Fetch and display your Testnet XLM balance from Horizon
- **📤 Send Payments** — Transfer XLM to any Stellar address on the Testnet
- **📋 Transaction Logs** — Live diagnostic console showing all operations and errors
- **🔍 Explorer Links** — View completed transactions on Stellar Expert
- **🎨 Dystopian UI** — Immersive dark terminal aesthetic with CRT scanlines, glassmorphism cards, and animated effects
- **📱 Zero-Scroll Architecture** — High-density design optimized for professional monitoring without vertical scrolling
- **💎 Dynamic Discovery Engine** — Tiered leaderboard protocol that "hunts" for new network whales via live ledger scanning
- **🏦 Multi-Wallet Gateway** — Unified uplink supporting Freighter, Rabe, Hana, xBull, and Albedo
- **⚡ Soroban Relief Protocol** — Direct smart contract interaction for decentralized relief funding
- **🔔 Tactical Notifications** — Real-time red-dot alert system for critical system events
- **📱 Responsive** — Adapts from desktop two-column layout to single-column on mobile
- **🛡️ Error Boundary** — Graceful crash recovery with themed error screen

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| [React 19](https://react.dev/) | UI framework |
| [Vite 8](https://vitejs.dev/) | Build tool & dev server |
| [@stellar/stellar-sdk](https://www.npmjs.com/package/@stellar/stellar-sdk) | Stellar blockchain interactions |
| [@stellar/freighter-api](https://www.npmjs.com/package/@stellar/freighter-api) | Freighter wallet integration |
| [Horizon Testnet](https://horizon-testnet.stellar.org) | Stellar Testnet API endpoint |
| [Soroban RPC](https://soroban-testnet.stellar.org) | Smart contract interaction layer |
| [StellarWalletsKit](https://www.npmjs.com/package/@CREW-SDK/stellar-wallets-kit) | Multi-wallet abstraction layer |

### 🧠 Advanced Architectures

#### 1. Triple-Redundant Leaderboard (Hunters Protocol)
The Hub employs a three-tier strategy to ensure the Network Leaderboard is never empty:
- **Tier 1 (Analytical)**: Real-time rich-list data from StellarExpert APIs.
- **Tier 2 (Discovery)**: A live "Discovery Engine" that scans the latest 50-100 ledger operations to identify active high-volume accounts and audits their balances directly via Horizon.
- **Tier 3 (Fail-safe)**: A hardcoded registry of verified high-balance accounts used as a mission-critical last resort.

#### 2. Soroban Smart Contract Integration
The **DONATE** module interfaces directly with a WASM-based smart contract on the Soroban testnet. It handles:
- Real-time simulation of contract state (Goal vs. Secured).
- Transaction preparation, footprint analysis, and multi-wallet signing.
- Event tracking to identify recent network contributors.

---

## 📦 Setup Instructions

### Prerequisites

- **Node.js** v18+ and **npm** v9+
- **Git** installed
- **Freighter** browser extension ([Install here](https://www.freighter.app/))

### 1. Clone the Repository

```bash
git clone https://github.com/Dark-97o/Stellar_Project.git
cd Stellar_Project
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Locally

```bash
npm run dev
```

The app will be available at **http://localhost:5173**

### 4. Set Up Freighter Wallet

1. Install the [Freighter browser extension](https://www.freighter.app/)
2. Create a new wallet and set a password
3. **Switch to TESTNET**: Settings → Network → Select **TESTNET**
4. **Fund your account**: Copy your public key and visit:
   ```
   https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY
   ```
   This gives you 10,000 free test XLM

### 5. Connect and Use

1. Open `http://localhost:5173` in the same browser with Freighter
2. Click **Link Freighter** → Approve the connection in the Freighter popup
3. Your balance will appear automatically
4. Enter a destination address and amount to send a test transaction

---

## 📸 Screenshots

### Wallet Connected State

<img width="565" height="113" alt="Screenshot 2026-04-21 100301" src="https://github.com/user-attachments/assets/fb88409e-f79c-4acc-bfc5-d1fe9705492e" />

### Balance Displayed

<img width="546" height="582" alt="image" src="https://github.com/user-attachments/assets/a6dcabe5-0e62-4a12-91e8-6eca2cae6f57" />

### Successful Testnet Transaction

<img width="1791" height="944" alt="image" src="https://github.com/user-attachments/assets/65e13602-7263-405e-aacc-7e3840ebe495" />

### Transaction Result

<img width="789" height="392" alt="image" src="https://github.com/user-attachments/assets/555d4525-ffa1-426c-884f-d4e869ab2efb" />

### Multi-Wallet Gateway

<img width="568" height="638" alt="image" src="https://github.com/user-attachments/assets/b5ab111c-1f87-4d72-a376-876a15900c36" />

### Deployment Environment

<img width="1142" height="441" alt="Screenshot 2026-04-21 001619" src="https://github.com/user-attachments/assets/ac6b3b24-894f-4019-b10e-cdbada59ad70" />

<img width="1177" height="530" alt="Screenshot 2026-04-21 001601" src="https://github.com/user-attachments/assets/f5cf6b75-0aa2-4217-87d8-b571a8b72db7" />

<img width="1851" height="950" alt="Screenshot 2026-04-20 233857" src="https://github.com/user-attachments/assets/d7bf2631-e696-48d7-bdaf-ee462e8b4281" />

---

## 📜 Deployed Contracts & Transactions

| Resource | Address / Hash |
|---|---|
| **Contract Address** | `CA2HLEFQOV7TITGBR2XYWMZ6OVPPJMOHLFJYMWIZPZ2AKWCHGEFHWYG5` |
| **Transaction Hash** | `72fc0335e3b271d1e211295e63a1772a4345bd7414965f16e4207974255ad6cb` |




---

## 📁 Project Structure

```
Stellar_Project/
├── TranscendenceContract/       # Soroban Smart Contract Source (Rust)
│   ├── contracts/
│   │   └── hello-world/         # Core Relief Protocol logic
│   └── Cargo.toml               # Workspace configuration
├── public/
│   └── dystopian-bg.png         # Background image
├── src/
│   ├── assets/                  # Static assets & 3D Spline scenes
│   ├── utils/
│   │   ├── stellar.js           # Triple-tier logic & Discovery Engine
│   │   └── kit.js               # Multi-wallet shim & abstraction
│   ├── App.jsx                  # Tactical interface & tab routing
│   ├── index.css                # Enterprise design system (Green-tier lights)
│   └── main.jsx                 # Entry point
├── index.html                   # HTML structure
├── vite.config.js               # Build logic & polyfills
└── README.md                    # Operational walkthrough
```

---

## 🔧 Key Implementation Details

### Wallet Connection Flow (`stellar.js`)

```
isConnected() → requestAccess() → getAddress() → loadAccount()
```

1. **`isConnected()`** — Checks if Freighter extension is installed
2. **`requestAccess()`** — Triggers the Freighter popup for user authorization
3. **`getAddress()`** — Retrieves the user's public key (fallback)
4. **`loadAccount()`** — Fetches account data from Horizon Testnet

### Payment Flow

```
loadAccount() → buildTransaction() → signTransaction() → submitTransaction()
```

1. Build a Stellar `TransactionBuilder` with the payment operation
2. Sign via Freighter's `signTransaction()` (user approval in extension)
3. Submit the signed XDR to the Horizon Testnet server
4. Display the result hash with an explorer link

---

## ⚠️ Important Notes

- This app runs on the **Stellar Testnet** — no real funds are involved
- Multiple wallets are supported; ensure your chosen extension is set to **TESTNET**
- Fund your testnet account via **FAUCET** or [Friendbot](https://friendbot.stellar.org)
- The **Discovery Engine** audits identity-level fluidity across recent ledger activity
- Zero-balance accounts are automatically pruned from the Network Leaderboard

---

## 📜 License

This project is licensed under the terms specified in the [LICENSE](./LICENSE) file.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

<p align="center">
  <b>Stellar Network Payment Terminal</b> — Built with ❤️ on the Stellar Testnet
</p>
