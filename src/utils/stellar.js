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
export const CONTRACT_ID = "CA2HLEFQOV7TITGBR2XYWMZ6OVPPJMOHLFJYMWIZPZ2AKWCHGEFHWYG5"; 

// Initialize Multi-Wallet Kit (using local shim)
const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  allowedWallets: [
    ALLOWED_WALLETS.FREIGHTER,
    ALLOWED_WALLETS.XBULL,
    ALLOWED_WALLETS.ALBEDO,
    ALLOWED_WALLETS.RABE,
    ALLOWED_WALLETS.HANA
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
 * FAUCET: Fund Testnet account via Friendbot
 */
export const fundFromFaucet = async (publicKey, onLog) => {
  try {
    onLog("CONTACTING FRIENDBOT FOR RESOURCES...", "info");
    const response = await fetch(`https://friendbot.stellar.org/?addr=${publicKey}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail = errorData.detail || errorData.title || "FRIENDBOT_UPLINK_REJECTED";
      
      if (detail.includes("exists")) {
        onLog("ACCOUNT ALREADY INITIALIZED ON TESTNET.", "info");
        return true;
      }
      
      throw new Error(detail);
    }
    
    onLog("FRIENDBOT UPLINK SUCCESS! RESOURCES DEPLOYED.", "ok");
    return true;
  } catch (error) {
    onLog(`FAUCET_FAILURE: ${error.message}`, "err");
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
  try {
    // 1. Fetch Contract State via Simulation
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const tx = new StellarSdk.TransactionBuilder(
      new StellarSdk.Account("GDBLVEG3X3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3", "0"), 
      { fee: "100", networkPassphrase: NETWORK_PASSPHRASE }
    )
      .addOperation(contract.call("get_stats"))
      .setTimeout(0)
      .build();

    const sim = await rpcServer.simulateTransaction(tx);
    let total = 0;
    let goal = 10000;

    if (sim.result) {
      const stats = StellarSdk.scValToNative(sim.result.retval);
      total = Number(stats.total) / 10000000; // Assuming 7 decimals for XLM stroops
      goal = Number(stats.goal) / 10000000;
    }

    // 2. Fetch Latest Donation Events
    const latestLedger = await rpcServer.getLatestLedger();
    const eventResponse = await rpcServer.getEvents({
      startLedger: latestLedger.sequence - 10000, // Look back ~1 day
      filters: [{
        type: "contract",
        contractIds: [CONTRACT_ID]
      }],
      limit: 10
    });

    const donors = eventResponse.events
      .filter(e => e.type === "contract")
      .map(e => {
        const data = StellarSdk.scValToNative(e.value);
        return {
          addr: `${data.donor.substring(0, 8)}...${data.donor.slice(-4)}`,
          amt: Number(data.amount) / 10000000
        };
      })
      .slice(0, 5);

    return { total, goal, donors };
  } catch (error) {
    console.error("Relief Stats Error:", error);
    return { total: 0, goal: 10000, donors: [] };
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
    const operation = contract.call(
      "donate", 
      StellarSdk.Address.fromString(publicKey).toScVal(), // Parameter 1: donor
      StellarSdk.nativeToScVal(amount, { type: "i128" })    // Parameter 2: amount
    );
    
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
 * WHALE REGISTRY: Verified high-balance accounts on Stellar Testnet
 * Used as a definitive fallback for the Network Leaderboard.
 */
const WHALE_REGISTRY = [
  "GBFAIH5WKAJQ77NG6BZG7TGVGXHPX4SQLIJ7BENJMCVCZSUZPSISCLU5", // Top Holder (~81B)
  "GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR", // ~425M
  "GATXZXYXXG4ARRZC4G7KYK3OXQFSR4DWPXWJ7R6TEG3J6LPUFDV745EY", // ~206M
  "GDYLAPA3DZGK2EYZFV73WR4THTVQAQ3HWT5ROIS7EHNUYTJTDRY7YS2K", // ~105M
  "GB36MNPDBOFH3GSNI7YWXHPUMUM7RTYEN3WRHACB6UEXRFZI6B2IE2YA", // 50M
  "GC5HP3IRHO6EHJQF3AAPTJCTD7E7H7IA4THR4B3G4GPIS67M3KFMKDKT", // ~35M
  "GDC2FARLUU4UHGY3DWQW4DWSOPCDGI5TFMIKE4HEUFY4DS4QYCPLA7B6", // ~32M
  "GDMVY5CPSEY6IDQBEX7KMJSOVFNHMOMT5QY4MTOCSDFORV24AOFYDDGS", // ~32M
  "GCHT7QGJH22UPY7IGKR45IFXT6Y5ZTNCPNQKQL5YHUV6LBLJKEOEJS4P", // ~32M
  "GCF2WGTHROHG2MK2BRC4CLMQPENFD4ZS4YGGLQHKNZCJ6BVR6PEU62FF"  // ~32M
];

/**
 * FETCH NETWORK WHALES: Real-time top holders (Testnet)
 * Strategy: 
 * 1. Primary: StellarExpert Analytics (Rich List)
 * 2. Secondary: Direct Ledger Probe of Verified Registry
 * 3. Fallback: Static Cached Estimates
 */
export const fetchNetworkWhales = async (onLog) => {
  try {
    if (onLog) onLog("INITIATING TIER-1 ANALYTICS UPLINK...", "info");
    
    // TIER 1: Analytical Data from StellarExpert (Live Rich List)
    const response = await fetch("https://api.stellar.expert/explorer/testnet/asset/XLM/holders?order=desc&limit=10", {
      mode: 'cors'
    });
    
    if (!response.ok) throw new Error("UPSTREAM_OFFLINE");
    const data = await response.json();
    const records = data._embedded?.records || [];
    
    if (records.length > 0) {
      if (onLog) onLog("TIER-1 UPLINK SYNCHRONIZED: SUCCESS.", "ok");
      return records.map(r => ({
        addr: r.address,
        displayAddr: `${r.address.substring(0, 8)}...${r.address.slice(-4)}`,
        amt: parseFloat(r.balance) / 10000000,
        source: 'ST_EXPERT'
      }));
    }
  } catch (error) {
    if (onLog) onLog("TIER-1 RESTRICTED. INITIATING TIER-2 DIRECT PROBE...", "warn");
  }

  try {
    // TIER 2: Dynamic Discovery Protocol (Direct Ledger Audit)
    // This phase scans recent network activity to find active 'whales' moving value
    if (onLog) onLog("TIER-1 RESTRICTED. INITIATING DYNAMIC DISCOVERY...", "warn");
    
    const paymentRecords = await horizonServer.payments()
      .limit(50)
      .order("desc")
      .call();
    
    // Extract involved accounts from recent high-activity operations
    const activePool = new Set();
    paymentRecords.records.forEach(p => {
      if (p.from) activePool.add(p.from);
      if (p.to) activePool.add(p.to);
    });

    // Merge with known icons and ensure they are prioritized in the audit set
    const totalPool = Array.from(new Set([...WHALE_REGISTRY, ...activePool]));
    
    if (onLog) onLog(`AUDITING ${totalPool.length} IDENTITIES FOR RECENT VOLUME...`, "info");

    // Batch resolve balances for the discovery pool (Prioritizing known icons first)
    const discoveryData = await Promise.all(totalPool.slice(0, 30).map(async (addr) => {
      try {
        const account = await horizonServer.loadAccount(addr);
        const bal = account.balances.find(b => b.asset_type === 'native')?.balance || "0";
        const balanceNum = parseFloat(bal);
        
        if (balanceNum < 10) return null; // Filter out noise/small accounts

        return {
          addr,
          displayAddr: `${addr.substring(0, 8)}...${addr.slice(-4)}`,
          amt: balanceNum,
          source: 'HORIZON_DISCOVERY'
        };
      } catch {
        return null; 
      }
    }));

    const validDiscovery = discoveryData.filter(w => w !== null).sort((a, b) => b.amt - a.amt);
    
    if (validDiscovery.length > 0) {
      if (onLog) onLog(`DISCOVERY PROTOCOL COMPLETE: ${validDiscovery.length} WHALES SYNCED.`, "ok");
      return validDiscovery.slice(0, 8);
    }

  } catch (error) {
    if (onLog) onLog("DISCOVERY PROTOCOL FAILED. REVERTING TO TIER-3 FAIL-SAFE...", "err");
    console.error("Discovery Error:", error);
  }

  // TIER 3: Fail-safe Registry 
  if (onLog) onLog("TIER-3 ACTIVE: EMERGENCY TELEMETRY ENGAGED.", "info");
  return WHALE_REGISTRY.slice(0, 8).map((addr, i) => ({
    addr,
    displayAddr: `${addr.substring(0, 8)}...${addr.slice(-4)}`,
    amt: i === 0 ? 81700030400 : (10000000 / (i + 1)), 
    source: 'FAILSAFE_REG'
  }));
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

/**
 * MULTI-PAYMENT: Send XLM to multiple recipients in ONE transaction
 */
export const sendMultiPayment = async (sourcePublicKey, payments, onLog, walletType) => {
  try {
    onLog(`BATCHING ${payments.length} TRANSFERS INTO SINGLE UPLINK...`, "info");
    const sourceAccount = await horizonServer.loadAccount(sourcePublicKey);
    
    const builder = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    payments.forEach(p => {
      builder.addOperation(StellarSdk.Operation.payment({
        destination: p.dest,
        asset: StellarSdk.Asset.native(),
        amount: p.amt.toString(),
      }));
    });

    const transaction = builder.setTimeout(60).build();

    onLog("MULTI-PAY UPLINK READY. AWAITING SIGNATURE...", "warn");
    
    const { signedTxXdr } = await kit.signTransaction(transaction.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
      address: sourcePublicKey,
      walletType
    });
    
    onLog("UPLINK SIGNED. SYNCING BATCH WITH LEDGER...", "info");
    const response = await horizonServer.submitTransaction(StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE));
    
    onLog("BATCH UPLINK FINALIZED: SUCCESS.", "ok");
    return response;
  } catch (error) {
    throw error;
  }
};

export const getExplorerUrl = (hash) => `https://stellar.expert/explorer/testnet/tx/${hash}`;
