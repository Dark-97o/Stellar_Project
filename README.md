# 🚀 Stellar Network Payment Terminal

A decentralized payment terminal for the **Stellar Testnet** built with React + Vite. Connect your [Freighter wallet](https://www.freighter.app/), view your XLM balance, and send payments — all through a dystopian-themed terminal interface.

<img width="1870" height="958" alt="Screenshot 2026-04-12 121044" src="https://github.com/user-attachments/assets/23928d75-d48e-4dc9-9593-d4a35ed988a3" />

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

After clicking "Link Freighter" and approving the connection, the wallet public key is displayed and the status indicator turns active.

<img width="587" height="278" alt="Screenshot 2026-04-12 115746" src="https://github.com/user-attachments/assets/eed6ed2a-eb3d-4436-abea-8a2ac5449a61" />

### Balance Displayed

The balance card shows your current XLM balance in large Orbitron font, fetched directly from the Stellar Horizon Testnet API.

<img width="620" height="270" alt="Screenshot 2026-04-12 115806" src="https://github.com/user-attachments/assets/81b9f8f1-8d98-4977-8e44-6981e9e26f93" />


### Successful Testnet Transaction

After submitting a transfer, the transaction is signed via Freighter and submitted to the Stellar Testnet. A success confirmation appears with the transaction hash.

<img width="865" height="391" alt="Screenshot 2026-04-12 120227" src="https://github.com/user-attachments/assets/a87ba249-0658-441f-85b0-641fc661c089" />

<img width="1402" height="909" alt="Screenshot 2026-04-12 120753" src="https://github.com/user-attachments/assets/6d472179-0fdd-434d-a937-a8637f33e388" />

### Transaction Result

<img width="1288" height="775" alt="Screenshot 2026-04-12 120811" src="https://github.com/user-attachments/assets/99ea2086-2f77-46dc-905d-09687c0897bb" />

The completed transaction result shows the full hash and a link to view the transaction on Stellar Expert. The diagnostics panel logs every step of the process.

### Multi-Wallet Gateway
The "Link Operator" interface allows selection between multiple uplink protocols, ensuring accessibility regardless of the operator's preferred extension.

### Deployment Environment
The Hub is optimized for static deployment, providing high-density telemetry across various tactical resolutions.

---

## 📜 Deployed Contracts & Transactions

| Resource | Address / Hash |
|---|---|
| **Relief Protocol (Contract)** | `CA2HLEFQOV7TITGBR2XYWMZ6OVPPJMOHLFJYMWIZPZ2AKWCHGEFHWYG5` |
| **Relief Addr (Vault)** | `GDUAGNZBL47ZKPR2R6KBJGETMVBL25XH3LRA4KFPDD33FSBMIHUCLRIA` |
| **Example Tx (Donation)** | `09033328e18f26a64016b8015c7e108130761e38941074e2d4d9bba7740e7208` |




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
