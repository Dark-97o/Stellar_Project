# Level 4: Enterprise Ecosystem & NFT Marketplace

This document is the definitive research and specification for the Level 4 transformation of the Stellar Management Hub. It details the expansion into multi-contract architecture, custom assets, and a real-world integrated NFT shop.

---

## 1. Multi-Contract Architecture (ICC)
Level 4 necessitates the transition from a monolithic structure to a modular, service-oriented architecture using **Inter-Contract Calls (ICC)**.

### A. The Three-Contract System
1.  **`TranscendenceContract` (The Hub)**: The primary entry point for users (Relief Fund, Governance).
2.  **`StellarNFT` (The Asset)**: A dedicated contract for NFT minting and ownership tracking (Soroban NFT Standard).
3.  **`NFTShop` (The Exchange)**: A middle-tier contract that handles the logic for buying and selling NFTs, price calculations, and escrow.

### B. Inter-Contract Flow
- **Purchase Flow**: User -> `NFTShop.buy(id)` -> `NFTShop` verifies XLM payment -> `NFTShop` calls `StellarNFT.mint(user, id)`.
- **Resale Flow**: User -> `NFTShop.sell(id)` -> `NFTShop` calls `StellarNFT.transfer(user, shop_addr, id)` -> `NFTShop` pays user in XLM.

---

## 2. Real-World NFT Implementation

### A. Real On-Chain Minting
Unlike "lazy minting," Level 4 uses **Persistent Storage** on the Stellar Testnet to record every unique NFT.
- **Contract Address**: Yes, a separate contract address is required for the `StellarNFT` contract to maintain a clean ledger for the asset.
- **Metadata**: Each NFT will store:
    - `TokenID`: Unique uint64.
    - `MetadataURI`: Link to off-chain data (IPFS/JSON).
    - `CurrentHolder`: Address of the owner.
    - `MintTimestamp`: Block height/time of creation.

### B. Price Oracle & USD Conversion
To maintain "real-world" value, the `NFTShop` uses a conversion logic:
- **Price Formula**: `XLM_Required = USD_Price / Current_XLM_USD_Rate`.
- **Implementation**: The contract will fetch the current rate from a **Price Oracle** contract (or a trusted admin-updated feed for the demo) to ensure dynamic pricing.

---

## 3. The "Stellar Bazaar" (Shop Interface)

### A. Exclusive Ownership Logic
- **Global State**: The `NFTShop` tracks the status of each item (`Available`, `Sold`).
- **Conditional Rendering**:
    - If `status == Sold` and `viewer == owner`: Show **Sell Back** option.
    - If `status == Sold` and `viewer != owner`: Hide **Buy/Sell** buttons (Item locked).
    - If `status == Available`: Show **Buy** button.

### B. Real-Time Activity Streaming
The "Latest Events" dashboard will be upgraded to listen for `NFT_PURCHASED` and `NFT_SOLD` events, updating the shop state across all connected clients instantly.

---

## 4. UI/UX Transformation

### A. Quick Protocols Update
- **Leaderboards Integration**: A new dedicated entry point in the "Quick Protocols" bento grid to view the top NFT collectors and network stakeholders.

### B. Animated Shop Interface
- **Entry Point**: A floating, animated shop icon (using Framer Motion-style CSS transitions).
- **Interface**: A glassmorphic modal displaying the "NFT Gallery" with real-time status indicators.

---

## 5. Deployment & Execution Guide

To successfully transition to Level 4, follow these precise steps and commands:

### Phase 1: Environment Preparation
We have already initialized the new contract workspaces. You can see them in `contracts/stellar-nft` and `contracts/nft-shop`.

### Phase 2: Build & Compile
Run these commands for each new contract once the code implementation is finished:
```powershell
# 1. Build the NFT Contract
cd TranscendenceContract/contracts/stellar-nft
stellar contract build

# 2. Build the Shop Contract
cd TranscendenceContract/contracts/nft-shop
stellar contract build
```

### Phase 3: Network Deployment
Deploy the compiled `.wasm` files to the Stellar Testnet:
```powershell
# 1. Deploy NFT
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/stellar_nft.wasm --source <IDENTITY> --network testnet

# 2. Deploy Shop
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/nft_shop.wasm --source <IDENTITY> --network testnet
```
*Note: Save the returned Contract IDs (e.g., `C...`) as we will need them for the frontend.*

### Phase 4: Linking (Initialization)
Once deployed, the Shop must be "told" where the NFT contract is:
```powershell
stellar contract invoke --id <SHOP_CONTRACT_ID> --source <IDENTITY> --network testnet -- init --nft_address <NFT_CONTRACT_ID> --usd_rate 15
```

---

## 6. Technical Changes Roadmap

### Smart Contracts (Rust)
- [x] **[NEW] `StellarNFT`**: Standard Soroban NFT logic (mint, transfer, metadata) - **COMPLETED**.
- [x] **[NEW] `NFTShop`**: Sales logic, pricing logic, and Inter-Contract Call (ICC) to NFT contract - **COMPLETED**.
- [x] **[MODIFY] `TranscendenceContract`**: Remove legacy token minting (to keep systems separate as requested).

### Frontend (React/Vite)
- [ ] **[NEW] `ShopInterface.jsx`**: Animated shop component.
- [ ] **[NEW] `PriceService.js`**: Service to fetch real-world USD/XLM rates (simulated or API-based).
- [ ] **[MODIFY] `App.jsx`**: Add "Leaderboards" to Quick Protocols and integrate the Shop entry point.

### DevOps (CI/CD)
- [ ] **GitHub Actions**: Expand the pipeline to run unit tests for all three contracts simultaneously.
- [ ] **Mobile Pass**: CSS Media Queries for the new Shop and Leaderboard components.

---

## 6. Research Conclusion
Transitioning to Level 4 with a real NFT marketplace requires a sophisticated multi-contract dance. By separating the **Asset** from the **Marketplace**, we ensure security and scalability. The integration of USD pricing bridges the gap between Web3 and traditional finance aesthetics.
