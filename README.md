# 📡 Stellar Survivor Hub v2.0 (Level 2)

A state-of-the-art decentralized survivor network hub built on the **Stellar Testnet**. Transitioned from a simple payment terminal to a multi-functional management system with **Soroban Smart Contract** integration.

## 🚀 Level 2 Major Features
- **Smart Contract Integration (Soroban)**: Deployed the `Relief Fund` contract for decentralized survivor aid.
- **Relief Fund Dashboard**: Real-time progress tracking for crowdfunding campaigns using aggregate ledger polling.
- **Network Whale Watch**: Dynamic ranking of top network entities with live XLM balance monitoring.
- **Payment Terminal**: Live monitoring of payment history for the connected uplink.
- **Enhanced Error Subsystem**: Robust handling for `Link Refusal`, `Insufficient Resources`, and `Unfunded Account` states.

<img width="1870" height="958" alt="Screenshot 2026-04-12 121044" src="https://github.com/user-attachments/assets/23928d75-d48e-4dc9-9593-d4a35ed988a3" />

## 🛠️ Tech Stack Expansion
- **Smart Contract**: Rust (Soroban SDK)
- **Frontend Engine**: React + Stellar SDK (Horizon & RPC integration)
- **Logistics**: `@stellar/freighter-api` (Advanced tx signing for network events)

## 📸 Technical Verification (Level 2)
- **Relief Fund Dash**: [Relief Fund View](./relief_fund_view_1775977939927.png)
- **Network Whale Watch**: [Leaderboard View](./leaderboard_view_1775977988255.png)
- **Payment Terminal (Real History)**: [Payment Tracker View (Verified)](./after_linking_freighter_1775967180738.png)

## 🏗️ Local Setup (Survivors Only)
1. **Clone & Install**:
   ```bash
   git clone https://github.com/Dark-97o/Stellar_Project
   npm install
   ```
2. **Environment**: Ensure **Freighter** is set to **Testnet**.
3. **Execute**:
   ```bash
   npm run dev
   ```

## 🛡️ Development Standards
- **Modular Utilities**: Logic segregated in `stellar.js`.
- **Dystopian Design System**: High-fidelity CSS variables and custom CRT layout.
- **Event-Driven UI**: 15-second polling loops for real-time ledger synchronization.

---

## 📁 Project Structure

```
Stellar_Project/
├── contracts/
│   └── relief_fund/            # Soroban Smart Contract
├── src/
│   ├── assets/                 # Icons and image assets
│   ├── utils/
│   │   └── stellar.js          # Horizon API & Data Transformers
│   ├── App.jsx                 # Main hub logic & state management
│   ├── index.css               # Dystopian design tokens & component styles
│   └── main.jsx/
├── index.html                  # Main entry point
├── package.json                # Project dependencies
└── README.md                   # System Documentation
```

---

## ⚠️ Important Notes

- This app runs on the **Stellar Testnet** — no real funds are involved.
- Freighter must be set to **TESTNET** mode to work with this app.
- Fund your testnet account via [Friendbot](https://friendbot.stellar.org) before transacting.
- The minimum balance for a Stellar account is **1 XLM** (testnet).

---

## 📜 License
This project is licensed under the terms specified in the [LICENSE](./LICENSE) file.

<p align="center">
  <b>Stellar Survivor Network Hub</b> — Built with ❤️ on the Stellar Testnet
</p>
