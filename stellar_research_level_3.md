# Level 3 Transition Research: Stellar Management Hub

This document details the research and implementation strategies for elevating the Stellar Terminal dApp to "Level 3" readiness. 
This phase focuses on UX stability, RPC optimization, and protocol reliability exactly as requested: **Loading states, Caching implementation, and Automated testing**.

## 1. Advanced Loading States & Progress Indicators
Currently, the dApp uses simple inline inline-spinners (`<span className="spinner" />`) tied to boolean states (`loading`, `faucetLoading`). For a Level 3 application, the UI needs robust loading choreography.

### Implementation Strategy:
*   **Global Layout Skeleton**: When `syncAllData()` is running, transition from "hard failures/blanks" to **Skeleton UI fragments** (e.g., pulsing backgrounds using CSS animations on the balance and history panels).
*   **Overlay Loading**: For high-stake transactions (e.g., Soroban `invokeContractDonate`), implement a cinematic Terminal Progress Overlay. 
*   **Progress Indicators**: For Batch Multi-Pay, track the array progress: `(completed / total) * 100` and map it to a visual CSS `<div className="progress-fill">` during loop execution in `handleMultiPay`.

## 2. Basic Caching Implementation
The current architecture calls `syncAllData()` directly to the Horizon RPC every 15 seconds. This causes excessive unneeded calls overhead. Caching provides a smoother UX and respects node rate limits.

### Implementation Strategy (`sessionStorage` Layer):
*   **Whale Tracking Cache**: `fetchNetworkWhales()` runs on an interval. Create a wrapper in `stellar.js` that writes the parsed ledger result to `sessionStorage.setItem('whales_cache', JSON.stringify({ data, timestamp }))`. Only fetch from Horizon if the cache is older than 1 Hour.
*   **Ledger History Cache**: Cache the history array with a TTL (Time-To-Live). When `syncAllData` is called, perform a fast diff on the local `balance`. If the `balance` is identical, skip the `fetchAccountHistory` call entirely and use cached history.
*   **Resulting Architecture**:
    ```javascript
    // stellar.js modifications
    const cacheKey = `history_${address}`;
    const cached = sessionStorage.getItem(cacheKey);
    // return cached if valid TTL met
    ```

## 3. Automated Testing Validation (Minimum 3 Tests)
A level-3 functional mini-dApp requires provable stability. Testing can be executed in two vectors: Frontend Unit Tests and Smart Contract Integration tests.

### Implementation Strategy A: Smart Contract Tests (Rust)
The `hello-world` Soroban Contract (`TranscendenceContract/contracts/hello-world/src/test.rs`) currently has **two (2)** test cases:
1.  `test_protocol_lifecycle`: Verifies init, donate, set_goal, and deactivate.
2.  `test_prevent_double_init`: Ensures `init()` fails if called twice.

To satisfy the **"Minimum 3 tests passing"** requirement, we will implement a third security test scenario:
3.  **`test_unauthorized_withdraw`**: Proves that if a non-admin (e.g., the `donor`) attempts to call `client.withdraw(&donor)`, the contract will panic or reject the invocation.

### Implementation Strategy B: Frontend Unit Tests (Vitest)
If frontend validation is preferred, the project is structured with Vite. 
1.  Add `vitest` to `package.json`.
2.  Write tests targeting `kit.js` helper methods, ensuring `StellarWalletsKit` normalization runs successfully (e.g., validating that Freighter missing throws the correct `"FREIGHTER_UPLINK_NOT_DETECTED"` error).

---

> Note: The most direct path to fulfilling the Level 3 criteria within the existing project architecture is:
> 1. Wrap `fetchAccountHistory` and `fetchNetworkWhales` in `stellar.js` with a `sessionStorage` JSON cache.
> 2. Add an `isSyncing` skeleton state to the CSS architecture.
> 3. Write and run the 3rd required test (`test_unauthorized_withdraw`) in the Soroban rust contract and run `cargo test`.
