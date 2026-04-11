# Stellar Blockchain Research - Testnet dApp Development

This document outlines the core fundamentals, tools, and technical requirements for building a functional decentralized application (dApp) on the Stellar Testnet.

## 1. Core Fundamentals

### What is Stellar?
Stellar is an open-source decentralized protocol for moving money. It's designed for speed, low cost, and cross-border payments.

### XLM (Lumens)
Lumens (XLM) are the native asset of the Stellar network. They are used to pay for transaction fees and meet minimum balance requirements.

### Testnet vs. Mainnet
- **Testnet**: A sandbox environment for developers to test applications without real money. Assets have no real-world value.
- **Mainnet**: The live Stellar network where real money is moved.

---

## 2. Essential Tools & SDKs

### Wallet: Freighter
Freighter is the recommended browser-based wallet for Stellar dApps.
- **Extension**: [Freighter App](https://www.freighter.app/)
- **Network**: Ensure the extension is set to **Testnet** via the settings/network dropdown.

### Developer SDKs
1. **`@stellar/stellar-sdk`**: The official JavaScript library for building transactions and interacting with Horizon (Stellar's API server).
2. **`@stellar/freighter-api`**: A lightweight library to interact with the Freighter browser extension for signing transactions.

### Network Endpoints
- **Horizon API (Testnet)**: `https://horizon-testnet.stellar.org`
- **Friendbot (Faucet)**: `https://friendbot.stellar.org` (used to fund accounts with 10,000 test XLM).

---

## 3. Implementation Guide

### A. Wallet Connection logic
To connect a Stellar dApp to Freighter, you use the `isConnected` and `getAddress` functions.

```javascript
import { isConnected, getAddress } from "@stellar/freighter-api";

async function connectWallet() {
  if (await isConnected()) {
    const publicKey = await getAddress();
    return publicKey;
  } else {
    throw new Error("Freighter not installed");
  }
}
```

### B. Fetching XLM Balance
Use the `Server` class from `stellar-sdk` to load account details.

```javascript
import { Server } from "@stellar/stellar-sdk";

const server = new Server("https://horizon-testnet.stellar.org");

async function getBalance(publicKey) {
  const account = await server.loadAccount(publicKey);
  const nativeBalance = account.balances.find(b => b.asset_type === 'native');
  return nativeBalance ? nativeBalance.balance : "0";
}
```

### C. Sending a Transaction
The flow involves building a transaction, having the user sign it via Freighter, and then submitting it to Horizon.

```javascript
import { TransactionBuilder, Asset, Operation, Networks } from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

async function sendPayment(sourceKey, destinationKey, amount) {
  const account = await server.loadAccount(sourceKey);
  
  // 1. Build Transaction
  const transaction = new TransactionBuilder(account, {
    fee: await server.fetchBaseFee(),
    networkPassphrase: Networks.TESTNET
  })
    .addOperation(Operation.payment({
      destination: destinationKey,
      asset: Asset.native(),
      amount: amount
    }))
    .setTimeout(30)
    .build();

  // 2. Sign Transaction with Freighter
  const xdr = transaction.toXDR();
  const signedXDR = await signTransaction(xdr, { network: "TESTNET" });

  // 3. Submit Transaction
  const result = await server.submitTransaction(signedXDR);
  return result;
}
```

---

## 4. Security Best Practices
- **No Secret Keys**: Never store or prompt for a user's secret key (Seed Phrase). Always use a wallet like Freighter for signing.
- **XDR Safety**: Always verify the transaction details (amount, destination) in the Freighter popup before signing.
- **Error Handling**: Implement robust error handling for network failures, insufficient funds, or user-rejected transactions.

## 5. Resources
- [Stellar Documentation](https://developers.stellar.org/docs/)
- [Freighter API Docs](https://docs.freighter.app/)
- [Stellar Lab](https://laboratory.stellar.org/) (Great for testing transactions manually)
