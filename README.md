# 📡 Stellar Survivor Hub v2.0 (Level 2)

A state-of-the-art decentralized survivor network hub built on the **Stellar Testnet**. Transitioned from a simple payment terminal to a multi-functional management system with **Soroban Smart Contract** integration.

## 🚀 Level 2 Major Features
- **Smart Contract Integration (Soroban)**: Deployed the `Relief Fund` contract for decentralized survivor aid.
- **Relief Fund Dashboard**: Real-time progress tracking for crowdfunding campaigns using Soroban event polling.
- **Token Leaderboard**: Dynamic ranking of top contributors based on ledger events.
- **Multi-Address Payment Tracker**: Concurrent monitoring and batch execution of XLM transfers to multiple survivors.
- **Enhanced Error Subsystem**: Robust handling for `Link Refusal`, `Insufficient Resources`, and `Unfunded Account` states.

## 🛠️ Tech Stack Expansion
- **Smart Contract**: Rust (Soroban SDK)
- **Frontend Engine**: React + Stellar SDK (Soroban RPC integration)
- **Logistics**: `@stellar/freighter-api` (Advanced tx signing for host functions)

## 📸 Technical Verification (Level 2)
- **Relief Fund Dash**: [Relief Fund View](./relief_fund_view_1775977939927.png)
- **Real-Time Leaderboard**: [Leaderboard View](./leaderboard_view_1775977988255.png)
- **Multi-Address Tracker**: [Payment Tracker View (Verified)](./after_linking_freighter_1775967180738.png)

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
- **Event-Driven UI**: 5-second polling loops for real-time ledger synchronization.
