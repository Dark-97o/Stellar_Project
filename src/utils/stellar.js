import * as StellarSdk from '@stellar/stellar-sdk';

// Initialize the Horizon server for Stellar Testnet
const horizonServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

// Initialize Soroban RPC server for Testnet
const rpcServer = new StellarSdk.rpc.Server('https://soroban-testnet.stellar.org');

const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
export const RELIEF_ADDR = "GDUAGNZBL47ZKPR2R6KBJGETMVBL25XH3LRA4KFPDD33FSBMIHUCLRIA";

/**
 * Enhanced Error Types for Level 2
 */
export const ErrorTypes = {
  USER_REJECTED: "SURVIVOR_REJECTED_LINK",
  INSUFFICIENT_FUNDS: "INSUFFICIENT_RESOURCES",
  UNFUNDED_ACCOUNT: "UPLINK_NOT_INITIALIZED",
  CONTRACT_ERROR: "SMART_CONTRACT_REVERT",
};

/**
 * Connects to the Freighter wallet extension.
 */
export const connectWallet = async () => {
  try {
    const freighterApi = await import('@stellar/freighter-api');
    const isInstalled = await freighterApi.isConnected();

    if (!isInstalled) {
      throw new Error("Freighter wallet not detected.");
    }

    const accessResult = await freighterApi.requestAccess();
    const publicKey = typeof accessResult === 'string' ? accessResult : accessResult?.address || '';

    if (!publicKey) throw new Error("Could not retrieve public key.");
    return publicKey;
  } catch (error) {
    if (error.message?.includes("User declined")) throw new Error(ErrorTypes.USER_REJECTED);
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
    return nativeBalance ? nativeBalance.balance : "0.0000000";
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
 * FETCH RELIEF FUND DATA: Aggregated Donators
 */
export const fetchReliefFundStats = async () => {
  try {
    // 1. Get Balance
    const account = await horizonServer.loadAccount(RELIEF_ADDR);
    const balance = account.balances.find(b => b.asset_type === 'native')?.balance || "0";

    // 2. Get Payments to aggregate donators
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
 * FETCH NETWORK WHALES: Curated high-balance accounts
 */
export const fetchNetworkWhales = async () => {
  const whales = [
    "GAB7Z6CB7S76MWD6S3CHY3G6V6CUZCHYCHOCHYCHOCHYCHOCHYCHOCHY", // SDF
    "GAI3B5YTYHNHCVKRE6I24U6HKEW5O5NH6S2I7TETIHSF5YCOAIAIDRDM", // SDF Distribution
    "GDWNFWP5H6TCS773V6Z2Z6CUZCHYCHOCHYCHOCHYCHOCHYCHOCHYCHO"  // Example 
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
 * Sends XLM Payment (Enhanced for Level 2)
 */
export const sendPayment = async (sourcePublicKey, destinationId, amount, onLog) => {
  try {
    onLog("INITIALIZING LINK...", "info");
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

    const xdr = transaction.toXDR();
    const freighterApi = await import('@stellar/freighter-api');
    const signResult = await freighterApi.signTransaction(xdr, { networkPassphrase: NETWORK_PASSPHRASE });
    
    const signedXdr = signResult.signedTxXdr || signResult;
    const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const response = await horizonServer.submitTransaction(tx);
    
    return response;
  } catch (error) {
    if (error.message?.includes("User declined")) throw new Error(ErrorTypes.USER_REJECTED);
    throw error;
  }
};

export const getExplorerUrl = (hash) => `https://stellar.expert/explorer/testnet/tx/${hash}`;
