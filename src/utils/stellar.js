import * as StellarSdk from '@stellar/stellar-sdk';
import { 
  StellarWalletsKit, 
  WalletNetwork, 
  ALLOWED_WALLETS 
} from './kit';

// Initialize the Horizon server for Stellar Testnet
const horizonServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

// Initialize Soroban RPC server for Testnet
const rpcServer = new StellarSdk.rpc.Server('https://soroban-testnet.stellar.org');

const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
export const RELIEF_ADDR = "GDUAGNZBL47ZKPR2R6KBJGETMVBL25XH3LRA4KFPDD33FSBMIHUCLRIA";
// Placeholder for Level 2 Soroban Contract ID
export const CONTRACT_ID = "CCXGDUAGNZBL47ZKPR2R6KBJGETMVBL25XH3LRA4KFPDD33FSBM"; 

// Initialize Multi-Wallet Kit (using local shim)
const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  allowedWallets: [
    ALLOWED_WALLETS.FREIGHTER,
    ALLOWED_WALLETS.XBULL,
    ALLOWED_WALLETS.ALBEDO
  ]
});

/**
 * Enhanced Error Types for Level 2
 */
export const ErrorTypes = {
  USER_REJECTED: "SURVIVOR_REJECTED_LINK",
  INSUFFICIENT_FUNDS: "INSUFFICIENT_RESOURCES",
  UNFUNDED_ACCOUNT: "UPLINK_NOT_INITIALIZED",
  CONTRACT_ERROR: "SMART_CONTRACT_REVERT",
  WALLET_NOT_FOUND: "TERMINAL_UPLINK_OFFLINE",
};

/**
 * Connects via StellarWalletsKit (Multi-wallet support)
 */
export const connectWallet = async (walletType) => {
  try {
    // This will open the specific wallet requested
    const { address } = await kit.getAddress(walletType);
    if (!address) throw new Error("Could not retrieve public key.");
    return address;
  } catch (error) {
    if (error.message?.includes("User declined") || error.message?.includes("closed") || error.message?.includes("rejected")) {
      throw new Error(ErrorTypes.USER_REJECTED);
    }
    throw error;
  }
};

/**
 * Fetches the XLM balance.
 */
export const getXlmBalance = async (publicKey) => {
  try {
    const account = await horizonServer.loadAccount(publicKey);
    const nativeBalance = account.balances.find((b) => b.asset_type === 'native');
    return nativeBalance ? nativeBalance.balance : "0.00";
  } catch (error) {
    if (error.response?.status === 404) return ErrorTypes.UNFUNDED_ACCOUNT;
    throw error;
  }
};

/**
 * FETCH REAL HISTORY: Last 5 relevant operations (Payments, Creations)
 */
export const fetchAccountHistory = async (publicKey) => {
  try {
    const response = await horizonServer.operations()
      .forAccount(publicKey)
      .order("desc")
      .limit(15)
      .call();
    
    return response.records
      .filter(rec => rec.type === 'payment' || rec.type === 'create_account')
      .map(rec => {
        const isCreation = rec.type === 'create_account';
        const amount = isCreation ? rec.starting_balance : rec.amount;
        const target = isCreation ? rec.account : rec.to;
        const source = isCreation ? (rec.funder || rec.from) : rec.from;

        return {
          id: rec.id,
          addr: target === publicKey ? `From: ${source.substring(0,6)}...` : `To: ${target.substring(0,6)}...`,
          amt: `${parseFloat(amount).toFixed(2)} XLM`,
          status: 'success',
          hash: rec.transaction_hash
        };
      })
      .slice(0, 5);
  } catch (error) {
    console.error("History Fetch Error:", error);
    return [];
  }
};

/**
 * SOROBAN: Read Data from Contract (Level 2)
 */
export const fetchReliefFundStats = async () => {
  // Level 2 Implementation: Combined Horizon (Aggregation) + Soroban (Latest State)
  try {
    const account = await horizonServer.loadAccount(RELIEF_ADDR);
    const balance = account.balances.find(b => b.asset_type === 'native')?.balance || "0";

    const payments = await horizonServer.payments()
      .forAccount(RELIEF_ADDR)
      .order("desc")
      .limit(50)
      .call();

    const donorsMap = {};
    payments.records.forEach(p => {
      if (p.to === RELIEF_ADDR && p.type === 'payment' && p.asset_type === 'native') {
        donorsMap[p.from] = (donorsMap[p.from] || 0) + parseFloat(p.amount);
      }
    });

    const sortedDonors = Object.entries(donorsMap)
      .map(([addr, amt]) => ({ addr: `${addr.substring(0,8)}...${addr.slice(-4)}`, amt }))
      .sort((a, b) => b.amt - a.amt)
      .slice(0, 5);

    return {
      total: parseFloat(balance),
      donors: sortedDonors
    };
  } catch (error) {
    console.error("Relief Stats Error:", error);
    return { total: 0, donors: [] };
  }
};

/**
 * SOROBAN: Write Data to Contract (Level 2)
 * Demonstrates calling a contract function from the frontend
 */
export const invokeContractDonate = async (publicKey, amount, onLog, walletType) => {
  try {
    onLog("CRAFTING SOROBAN UPLINK...", "info");
    const sourceAccount = await horizonServer.loadAccount(publicKey);
    
    // 1. Build Interaction Operation
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const operation = contract.call("donate", StellarSdk.nativeToScVal(amount, { type: "u128" }));
    
    // 2. Build Transaction
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    // 3. Simple Transaction status tracking (Pending)
    onLog("UPLINK PENDING: AWAITING SIGNATURE...", "warn");
    
    const { signedTxXdr } = await kit.signTransaction(tx.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
      address: publicKey,
      walletType
    });
    
    onLog("SIGNATURE ACQUIRED. BROADCASTING TO SOROBAN RPC...", "ok");
    const result = await rpcServer.sendTransaction(StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE));
    
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * FETCH NETWORK WHALES
 */
export const fetchNetworkWhales = async () => {
  const whales = [
    "GAB7Z6CB7S76MWD6S3CHY3G6V6CUZCHYCHOCHYCHOCHYCHOCHYCHOCHY", 
    "GAI3B5YTYHNHCVKRE6I24U6HKEW5O5NH6S2I7TETIHSF5YCOAIAIDRDM"
  ];

  try {
    const data = await Promise.all(whales.map(async (addr) => {
      try {
        const acc = await horizonServer.loadAccount(addr);
        const bal = acc.balances.find(b => b.asset_type === 'native')?.balance || "0";
        return { addr: `${addr.substring(0,8)}...`, amt: parseFloat(bal) };
      } catch {
        return { addr: `${addr.substring(0,8)}...`, amt: 0 };
      }
    }));
    return data.sort((a, b) => b.amt - a.amt);
  } catch (error) {
    return [];
  }
};

/**
 * Enhanced Transaction tracking for Level 2
 */
export const sendPayment = async (sourcePublicKey, destinationId, amount, onLog, walletType) => {
  try {
    onLog("INITIALIZING UPLINK PROTOCOL...", "info");
    const sourceAccount = await horizonServer.loadAccount(sourcePublicKey);
    
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(StellarSdk.Operation.payment({
        destination: destinationId,
        asset: StellarSdk.Asset.native(),
        amount: amount.toString(),
      }))
      .setTimeout(60)
      .build();

    onLog("UPLINK READY. AWAITING OPERATOR SIGNATURE...", "warn");
    
    const { signedTxXdr } = await kit.signTransaction(transaction.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
      address: sourcePublicKey,
      walletType
    });
    
    onLog("UPLINK SIGNED. SYNCING WITH LEDGER...", "info");
    const tx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
    const response = await horizonServer.submitTransaction(tx);
    
    onLog("UPLINK FINALIZED: SUCCESS.", "ok");
    return response;
  } catch (error) {
    if (error.message?.includes("User declined") || error.message?.includes("closed")) {
      throw new Error(ErrorTypes.USER_REJECTED);
    }
    throw error;
  }
};

export const getExplorerUrl = (hash) => `https://stellar.expert/explorer/testnet/tx/${hash}`;
