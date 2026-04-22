# Stellar Hub: Contract Registry (Level 4)

This document tracks the official deployment addresses and transaction hashes for the Soroban smart contracts powering the Stellar Management Hub.

---

## 1. Contract Directory

### A. TranscendenceContract (The Hub)
- **Role**: Core protocol for relief funds and communal resource management.
- **Contract ID**: `CA2HLEFQOV7TITGBR2XYWMZ6OVPPJMOHLFJYMWIZPZ2AKWCHGEFHWYG5`
- **Status**: Legacy (Deployed in Level 2)

### B. StellarNFT (The Asset)
- **Role**: Soroban NFT contract managing asset ownership and metadata.
- **Contract ID**: `CAMRRPYB6WXPPSIFZJJZRUIQXE7GELBOZVJST56X5MF2MEYYZRSLM3ZJ`
- **Deployment Hash**: `ccf3e1264526c06b12b8957a7a3f61b51a6ec3913128da041cedc3768bb80f9d`
- **Initialization Hash**: `0147d8f95d45ff27daa751ea2f7f7a01831d574c9c0d41dffffbe111a6968e91`
- **Wasm Hash**: `cd8df86e1b8f857c573848b1cf07538043eb85a90d1acc5da09d8ae837482024`

### C. NFTShop (The Exchange)
- **Role**: Marketplace handling USD pricing logic and XLM transfers (ICC).
- **Contract ID**: `CDUHM32DBT53G5XFNJS7JXXHCEHAFEC4IY52NR3THRG2XIFO3LZSEFIK`
- **Deployment Hash**: `0c6bf49cdad29a9bf9d2059f292f4e5e4f8e3613d897f2cf24ce4fc06a402367`
- **Initialization Hash**: `7c99ffee918604b5f21e766a95a951f1c147c1d44235bf990196da219ac382ce`
- **Wasm Hash**: `ba5e4842855553593c40be7fe414921825f1d9568f872c701f676f18910ffa9c`

---

## 2. Integrated Architectural Flow

### Flow A: NFT Acquisition (Purchase)
1. **User Request**: User calls `NFTShop.buy_nft(nft_id, metadata, price_usd)`.
2. **Pricing**: Shop calculates XLM cost based on the simulated `usd_rate`.
3. **Authentication**: User signs the transaction, authorizing the payment.
4. **ICC Execution**: `NFTShop` calls `StellarNFT.mint(user_address, nft_id, metadata)`.
5. **Finalization**: NFT is recorded on the ledger with the user as the owner.

### Flow B: Asset Liquidation (Sell Back)
1. **User Request**: User calls `NFTShop.sell_nft(nft_id)`.
2. **Verification**: Shop verifies the user owns the specific NFT.
3. **Escrow/Transfer**: Shop calls `StellarNFT.transfer(user, shop_address, nft_id)`.
4. **Payout**: Shop transfers XLM from its treasury (or simulated pool) back to the user.
5. **Restock**: NFT status is reset to "Available" in the NFT Shop.

---

## 3. Network Configuration
- **Network**: Stellar Testnet
- **Horizon URL**: `https://horizon-testnet.stellar.org`
- **Soroban RPC**: `https://soroban-testnet.stellar.org`
- **Passphrase**: `Test SDF Network ; September 2015`
