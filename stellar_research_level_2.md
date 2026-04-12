# 🚀 Stellar Research: Level 2 - Smart Contracts & Real-Time Logistics

This document outlines the research and technical strategy for transitioning the **Stellar Network Payment Terminal** to Level 2 capabilities, focusing on Soroban Smart Contracts, multi-wallet logistics, and real-time event integration.

---

## 🛠️ 1. Smart Contract Integration (Soroban)

To move beyond simple payments, we will integrate **Soroban**, Stellar's native smart contract platform.

### A. Environment Setup
- **Language**: Rust (Standard for Soroban).
- **Target**: `wasm32-unknown-unknown` (Compilation target for Stellar).
- **Tooling**: `stellar-cli` (v20+) for deployment and environment management.

### B. "Crowdfunding" Contract Architecture
We will implement a `DystopianRelief` contract:
- **State**: `TotalContributions`, `Deadline`, `TargetAmount`.
- **Functions**:
  - `donate(caller: Address, amount: i128)`: Records a donation.
  - `get_total() -> i128`: Returns the current pool size.
  - `get_goal() -> i128`: Returns the target.

### C. Frontend Integration
- **SDK**: `@stellar/stellar-sdk` (v11+ supports Soroban RPC).
- **Network**: `Testnet` with RPC URL `https://soroban-testnet.stellar.org:443`.
- **Method**: `contract.invoke()` via Freighter's `signTransaction`.

---

## 🏗️ 2. New Features: Technical Strategy

### A. Payment Tracker (Multi-Address)
**Requirement**: Send XLM to multiple survivors simultaneously and track their status.
- **Implementation**:
  - Use `StellarSdk.Operation.payment()` multiple times within a single `TransactionBuilder`.
  - **Status Logic**: Map the `TransactionResult` to each address.
  - **Error Handling**: Use `tx-failed` result codes to identify precisely which payment failed.

### B. Crowdfunding Page (Real-Time Progress)
**Requirement**: A visual dashboard showing campaign progress.
- **Logic**:
  - Poll the `DystopianRelief` contract every 5 seconds using `server.getEvents`.
  - **Events API**: `server.getEvents({ startLedger: LAST_SEEN, type: 'contract', contractIds: [CONTRACT_ID] })`.
  - **UI**: CSS progress bar that transitions based on the `current / target` ratio.

### C. Token Leaderboard
**Requirement**: Display the top contributors to the relief fund.
- **Implementation**:
  - Store contributor addresses in a `Map` within the smart contract state.
  - Use `contract.get_contributors()` or index results from emitted events.
  - **Sort**: Rank by contribution weight in a CSS table.

---

## 🛡️ 3. Error Handling Strategy

To meet Level 2 requirements, we will implement specific handlers for:
1. **`UserRejectedError`**: Handled when the survivor cancels the decryption (wallet popup).
2. **`InsufficientBalanceError`**: Specific check before transaction building (Code 400/402).
3. **`TimeoutError`**: Logic to handle transactions that didn't land within the 60s window (resync required).
4. **`ContractError`**: Handling Soroban-specific reverts (e.g., campaign ended).

---

## 📈 4. Real-Time Event Implementation

Stellar Soroban RPC does not support native WebSockets for events. We will implement a custom **Event Listener Hook**:

```javascript
// High-level Logic
function useStellarEvents(contractId) {
  useEffect(() => {
    const interval = setInterval(async () => {
      const events = await server.getEvents({
        startLedger: latestLedger,
        contractIds: [contractId]
      });
      processEvents(events);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
}
```

---

## 🗓️ 5. Next Steps

1. **Deploy Contract**: Initialize Soroban environment and deploy `DystopianRelief.wasm`.
2. **Update `stellar.js`**: Add `invokeContract` and `getEvents` utilities.
3. **UI Expansion**:
   - Create a side-navigation for "Relief Fund" (Crowdfunding) and "Leaderboard".
   - Implement the "Multi-Payment" form in the main terminal.
4. **Commit Sequence**:
   - `feat: deploy relief fund smart contract to testnet`
   - `feat: implement real-time event polling and crowdfunding dashboard`
