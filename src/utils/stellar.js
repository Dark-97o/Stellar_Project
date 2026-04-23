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
// Level 2 Soroban Contract ID
export const CONTRACT_ID = "CA2HLEFQOV7TITGBR2XYWMZ6OVPPJMOHLFJYMWIZPZ2AKWCHGEFHWYG5"; 

// Level 4 NFT Marketplace Contract IDs
export const NFT_CONTRACT_ID = "CAMRRPYB6WXPPSIFZJJZRUIQXE7GELBOZVJST56X5MF2MEYYZRSLM3ZJ";
export const SHOP_CONTRACT_ID = "CDUHM32DBT53G5XFNJS7JXXHCEHAFEC4IY52NR3THRG2XIFO3LZSEFIK";
export const XLM_TOKEN_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

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
 * Build a StellarExpert transaction explorer link
 */
export const getExplorerUrl = (hash) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;

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
    // If it's a contract ID (starts with C), use SAC query
    if (publicKey.startsWith('C')) {
      return await getContractXlmBalance(publicKey);
    }
    const account = await horizonServer.loadAccount(publicKey);
    const nativeBalance = account.balances.find((b) => b.asset_type === 'native');
    return nativeBalance ? nativeBalance.balance : "0.00";
  } catch (error) {
    if (error.response?.status === 404) return ErrorTypes.UNFUNDED_ACCOUNT;
    throw error;
  }
};

/**
 * Fetches XLM balance for a contract via SAC
 */
export const getContractXlmBalance = async (contractId) => {
  try {
    const xlmContract = new StellarSdk.Contract(XLM_TOKEN_ID);
    
    const balanceOp = xlmContract.call("balance", StellarSdk.nativeToScVal(contractId, { type: "address" }));
    const sim = await rpcServer.simulateTransaction(
      new StellarSdk.TransactionBuilder(new StellarSdk.Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0"), { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(balanceOp)
        .setTimeout(30)
        .build()
    );

    if (sim.result) {
      const balance = StellarSdk.scValToNative(sim.result.retval);
      // SAC balance for XLM is in stroops (7 decimals)
      return (Number(balance) / 10000000).toFixed(2);
    }
    return "0.00";
  } catch (e) {
    console.error("SAC Balance Query Failed:", e);
    return "0.00";
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
  const CACHE_KEY = `history_${publicKey}`;
  const CACHE_TTL = 30000; // 30 seconds

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        return parsed.data;
      }
    }

    const response = await horizonServer.operations()
      .forAccount(publicKey)
      .order("desc")
      .limit(20)
      .call();
    
    const historyData = response.records
      .filter(rec =>
        rec.type === 'payment' ||
        rec.type === 'create_account' ||
        rec.type === 'invoke_host_function' // Soroban contract calls
      )
      .map(rec => {
        if (rec.type === 'invoke_host_function') {
          return {
            id: rec.id,
            addr: `Contract: ${CONTRACT_ID.substring(0, 8)}...`,
            amt: 'CONTRACT CALL',
            status: 'success',
            hash: rec.transaction_hash
          };
        }
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
      .slice(0, 8);

    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: historyData, timestamp: Date.now() }));
    return historyData;
  } catch (error) {
    console.error("History Fetch Error:", error);
    return [];
  }
};


/**
 * SOROBAN: Read Data from Contract (Level 2)
 */
export const fetchReliefFundStats = async () => {
  const DEFAULT_GOAL = 100; // Fallback if contract can't be read
  const NATIVE_SAC = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
  // Valid 56-char account for simulation (simulation never submits real txs)
  const DUMMY_PK = "GB2VHOGXRWAF53JHDTBXYV3FZUNSTTNCTAVA2M5NLVXPFDVYDSVE2HBJ";

  let total = 0;
  let goal = DEFAULT_GOAL;
  let donors = [];

  // Read the on-chain goal from the contract's get_stats simulation
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const dummyAccount = new StellarSdk.Account(DUMMY_PK, "0");
    const tx = new StellarSdk.TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE
    })
      .addOperation(contract.call("get_stats"))
      .setTimeout(30)  // 0 can cause immediately-expired transactions
      .build();
    const sim = await rpcServer.simulateTransaction(tx);

    // Explicit check for RPC-level errors (sim.error is set when simulation fails)
    if (sim.error) {
      console.warn("[fetchReliefFundStats] get_stats sim error:", sim.error);
    } else if (sim.result?.retval) {
      const stats = StellarSdk.scValToNative(sim.result.retval);
      // i128 comes back as BigInt — Number() is safe for XLM-scale values
      const goalStroops = typeof stats.goal === 'bigint' ? Number(stats.goal) : stats.goal;
      const onChainGoal = goalStroops / 10000000;
      console.log("[fetchReliefFundStats] On-chain goal:", onChainGoal, "XLM");
      if (onChainGoal > 0) goal = onChainGoal;
    } else {
      console.warn("[fetchReliefFundStats] get_stats returned no retval. sim:", sim);
    }
  } catch (e) {
    console.warn("[fetchReliefFundStats] get_stats simulation threw:", e.message);
  }

  try {
    const latestLedger = await rpcServer.getLatestLedger();
    const eventResponse = await rpcServer.getEvents({
      startLedger: Math.max(1, latestLedger.sequence - 10000),
      filters: [{ type: "contract", contractIds: [CONTRACT_ID] }],
      limit: 50
    });

    let donatedTotal = 0;
    let withdrawnTotal = 0;

    eventResponse.events.forEach(e => {
      try {
        const data = StellarSdk.scValToNative(e.value);
        const amtXlm = Number(data.amount || 0) / 10000000;
        if (data.donor) {
          // DonationEvent
          donatedTotal += amtXlm;
          donors.push({
            addr: `${data.donor.substring(0, 8)}...${data.donor.slice(-4)}`,
            amt: amtXlm,
            type: 'DONATION',
            txHash: e.txHash || null
          });
        } else if (data.recipient) {
          // WithdrawalEvent — include in list AND subtract from pool
          withdrawnTotal += amtXlm;
          donors.push({
            addr: `${data.recipient.substring(0, 8)}...${data.recipient.slice(-4)}`,
            amt: amtXlm,
            type: 'WITHDRAWAL',
            txHash: e.txHash || null
          });
        }
      } catch { /* skip malformed events */ }
    });

    // Net current pool = donations - withdrawals
    total = Math.max(0, donatedTotal - withdrawnTotal);
    
    // Sort array so newest events sit at the top, then strictly limit to latest 5
    donors = donors.reverse().slice(0, 5); 

  } catch {
    // FALLBACK: SAC balance query via Soroban simulation
    try {
      const sacContract = new StellarSdk.Contract(NATIVE_SAC);
      const dummyAccount = new StellarSdk.Account(DUMMY_PK, "0");
      const tx = new StellarSdk.TransactionBuilder(dummyAccount, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE
      })
        .addOperation(
          sacContract.call("balance",
            StellarSdk.nativeToScVal(CONTRACT_ID, { type: "address" })
          )
        )
        .setTimeout(0)
        .build();
      const sim = await rpcServer.simulateTransaction(tx);
      if (sim.result?.retval) {
        total = Number(StellarSdk.scValToNative(sim.result.retval)) / 10000000;
      }
    } catch { total = 0; }
  }

  let adminAddr = null;
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const dummyAccount = new StellarSdk.Account(DUMMY_PK, "0");
    const tx = new StellarSdk.TransactionBuilder(dummyAccount, { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("get_stats"))
      .setTimeout(30).build();
    const sim = await rpcServer.simulateTransaction(tx);
    if (sim.result?.retval) {
      const stats = StellarSdk.scValToNative(sim.result.retval);
      adminAddr = stats.admin;
    }
  } catch (e) { /* ignore */ }

  return { total, goal, donors, admin: adminAddr };
};


/**
 * SOROBAN: Write Data to Contract (Level 2)
 * Demonstrates calling a contract function from the frontend
 */
const executeSorobanOperation = async (publicKey, operation, onLog, walletType) => {
  try {
    const sourceAccount = await horizonServer.loadAccount(publicKey);
    let tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: "1000", // Increased fee for Soroban
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(60)
      .build();

    onLog("SIMULATING CONTRACT EXECUTION...", "info");
    tx = await rpcServer.prepareTransaction(tx);
    
    onLog("UPLINK READY: AWAITING SIGNATURE...", "warn");
    const { signedTxXdr } = await kit.signTransaction(tx.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
      address: publicKey,
      walletType
    });
    
    onLog("SIGNATURE ACQUIRED. BROADCASTING...", "ok");
    const sendResponse = await rpcServer.sendTransaction(StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE));
    
    if (sendResponse.status === 'ERROR') {
      throw new Error(`RPC_REJECTED: ${sendResponse.errorResultXdr}`);
    }

    onLog("TRANSACTION SUBMITTED. POLLING FOR INCLUSION...", "info");
    
    // Poll for status
    let status = 'PENDING';
    let txHash = sendResponse.hash;
    let attempts = 0;
    
    while (status === 'PENDING' && attempts < 10) {
      const txResponse = await rpcServer.getTransaction(txHash);
      status = txResponse.status;
      if (status === 'SUCCESS') {
        onLog("CONTRACT TRANSACTION FINALIZED.", "ok");
        return { hash: txHash };
      } else if (status === 'FAILED') {
        throw new Error("CONTRACT_EXECUTION_FAILED");
      }
      attempts++;
      await new Promise(r => setTimeout(r, 2000));
    }
    
    return { hash: txHash };
  } catch (err) {
    console.error("Soroban Error:", err);
    throw err;
  }
};

export const invokeContractDonate = async (publicKey, amount, onLog, walletType) => {
  onLog("CRAFTING SOROBAN UPLINK...", "info");
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const op = contract.call(
    "donate", 
    StellarSdk.nativeToScVal(publicKey, { type: "address" }),
    StellarSdk.nativeToScVal(BigInt(Math.floor(amount * 10000000)), { type: "i128" })
  );
  return await executeSorobanOperation(publicKey, op, onLog, walletType);
};

export const invokeContractWithdraw = async (publicKey, destination, onLog, walletType) => {
  onLog("CRAFTING WITHDRAW UPLINK...", "info");
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const op = contract.call(
    "withdraw", 
    StellarSdk.nativeToScVal(destination, { type: "address" })
  );
  return await executeSorobanOperation(publicKey, op, onLog, walletType);
};

export const invokeContractSetAdmin = async (publicKey, newAdmin, onLog, walletType) => {
  onLog("CRAFTING ADMIN HANDOFF UPLINK...", "info");
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const op = contract.call(
    "set_admin", 
    StellarSdk.nativeToScVal(newAdmin, { type: "address" })
  );
  return await executeSorobanOperation(publicKey, op, onLog, walletType);
};

export const invokeContractSetActive = async (publicKey, isActive, onLog, walletType) => {
  onLog(`CRAFTING PROTOCOL PAUSE (${isActive}) UPLINK...`, "info");
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const op = contract.call(
    "set_active", 
    StellarSdk.nativeToScVal(isActive, { type: "bool" })
  );
  return await executeSorobanOperation(publicKey, op, onLog, walletType);
};

export const invokeContractSetGoal = async (publicKey, newGoalXlm, onLog, walletType) => {
  onLog(`CRAFTING GOAL ADJUSTMENT (${newGoalXlm} XLM) UPLINK...`, "info");
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  // Convert XLM to stroops (BigInt)
  const stroops = BigInt(Math.floor(newGoalXlm * 10000000));
  const op = contract.call(
    "set_goal", 
    StellarSdk.nativeToScVal(stroops, { type: "i128" })
  );
  return await executeSorobanOperation(publicKey, op, onLog, walletType);
};

export const invokeContractInit = async (publicKey, onLog, walletType) => {
  onLog("CRAFTING DOUBLE-INIT HIJACK UPLINK...", "warn");
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const SAC = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
  const op = contract.call(
    "init", 
    StellarSdk.nativeToScVal(publicKey, { type: "address" }),
    StellarSdk.nativeToScVal(SAC, { type: "address" }),
    StellarSdk.nativeToScVal(10000n, { type: "i128" })
  );
  return await executeSorobanOperation(publicKey, op, onLog, walletType);
};

/* ── LEVEL 4 NFT SHOP ACTIONS ───────────────────────────────── */

/**
 * Buy an NFT via the Shop contract (ICC)
 */
export const invokeContractBuyNft = async (publicKey, nftId, metadata, priceUsd, onLog, walletType) => {
  onLog(`INITIATING NFT ACQUISITION: ID ${nftId} via ICC...`, "info");
  const contract = new StellarSdk.Contract(SHOP_CONTRACT_ID);
  const op = contract.call(
    "buy_nft",
    StellarSdk.nativeToScVal(publicKey, { type: "address" }),
    StellarSdk.nativeToScVal(nftId, { type: "u32" }),
    StellarSdk.nativeToScVal(metadata, { type: "string" }),
    StellarSdk.nativeToScVal(priceUsd, { type: "u32" })
  );
  return await executeSorobanOperation(publicKey, op, onLog, walletType);
};

/**
 * Sell back an NFT to the hub (ICC)
 */
export const invokeContractSellNft = async (publicKey, nftId, priceUSD, onLog, walletType) => {
  onLog(`INITIATING NFT LIQUIDATION: ID ${nftId}...`, "warn");
  const contract = new StellarSdk.Contract(SHOP_CONTRACT_ID);
  const op = contract.call(
    "sell_nft",
    StellarSdk.nativeToScVal(publicKey, { type: "address" }),
    StellarSdk.nativeToScVal(nftId, { type: "u32" }),
    StellarSdk.nativeToScVal(priceUSD, { type: "u32" })
  );
  return await executeSorobanOperation(publicKey, op, onLog, walletType);
};

/**
 * Admin: Free/Reset an NFT held by the contract
 */
export const invokeAdminFreeNft = async (publicKey, nftId, onLog, walletType) => {
  onLog(`ADMIN: COMMANDING NFT RESET FOR ID ${nftId}...`, "warn");
  const contract = new StellarSdk.Contract(SHOP_CONTRACT_ID);
  const op = contract.call(
    "admin_free_nft",
    StellarSdk.nativeToScVal(nftId, { type: "u32" })
  );
  return await executeSorobanOperation(publicKey, op, onLog, walletType);
};

/**
 * Admin: Withdraw XLM from Shop Treasury
 */
export const invokeShopWithdraw = async (publicKey, amountXlm, onLog, walletType) => {
  onLog(`ADMIN: WITHDRAWING ${amountXlm} XLM FROM SHOP TREASURY...`, "warn");
  const contract = new StellarSdk.Contract(SHOP_CONTRACT_ID);
  // Convert XLM to stroops (amount * 10^7)
  const stroops = BigInt(Math.floor(amountXlm * 10000000));
  const op = contract.call(
    "withdraw_xlm",
    StellarSdk.nativeToScVal(publicKey, { type: "address" }),
    StellarSdk.nativeToScVal(stroops, { type: "i128" })
  );
  return await executeSorobanOperation(publicKey, op, onLog, walletType);
};

/**
 * Query the owner of a specific NFT
 */
export const fetchNftOwner = async (nftId) => {
  try {
    const contract = new StellarSdk.Contract(NFT_CONTRACT_ID);
    const dummyAccount = new StellarSdk.Account("GB2VHOGXRWAF53JHDTBXYV3FZUNSTTNCTAVA2M5NLVXPFDVYDSVE2HBJ", "0");
    const tx = new StellarSdk.TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE
    })
      .addOperation(contract.call("owner_of", StellarSdk.nativeToScVal(nftId, { type: "u32" })))
      .setTimeout(30).build();
    
    const sim = await rpcServer.simulateTransaction(tx);
    if (sim.result?.retval) {
      return StellarSdk.scValToNative(sim.result.retval);
    }
  } catch (e) {
    // Return null if NFT doesn't exist or error occurs
  }
  return null;
};

/**
 * Query metadata for an NFT
 */
export const fetchNftMetadata = async (nftId) => {
  try {
    const contract = new StellarSdk.Contract(NFT_CONTRACT_ID);
    const dummyAccount = new StellarSdk.Account("GB2VHOGXRWAF53JHDTBXYV3FZUNSTTNCTAVA2M5NLVXPFDVYDSVE2HBJ", "0");
    const tx = new StellarSdk.TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE
    })
      .addOperation(contract.call("get_metadata", StellarSdk.nativeToScVal(nftId, { type: "u32" })))
      .setTimeout(30).build();
    
    const sim = await rpcServer.simulateTransaction(tx);
    if (sim.result?.retval) {
      return StellarSdk.scValToNative(sim.result.retval);
    }
  } catch (e) {
    // Return null if NFT doesn't exist
  }
  return null;
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
  const CACHE_KEY = `whales_cache`;
  const CACHE_TTL = 3600000; // 1 hour

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        if (onLog) onLog("LEADERBOARD SYNCED: RESTORED FROM SECURE CACHE (Tier 0)", "ok");
        return parsed.data;
      }
    }
  } catch (e) {
    // skip err
  }

  let finalData = [];

  try {
    // TIER 1: Analytical Data from StellarExpert (Live Rich List)
    const response = await fetch("https://api.stellar.expert/explorer/testnet/asset/XLM/holders?order=desc&limit=10", {
      mode: 'cors'
    });
    
    if (response.ok) {
      const data = await response.json();
      const records = data._embedded?.records || [];
      
      if (records.length > 0) {
        if (onLog) onLog("LEADERBOARD SYNCED: TIER-1 ANALYTICS (Rich List Source)", "ok");
        finalData = records.map(r => ({
          addr: r.address,
          displayAddr: `${r.address.substring(0, 8)}...${r.address.slice(-4)}`,
          amt: parseFloat(r.balance) / 10000000,
          source: 'ST_EXPERT'
        }));
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: finalData, timestamp: Date.now() }));
        return finalData;
      }
    }
  } catch (error) {
    // Silent catch, proceed to Tier 2
  }

  try {
    // TIER 2: Dynamic Discovery Protocol (Direct Ledger Audit)
    const paymentRecords = await horizonServer.payments()
      .limit(50)
      .order("desc")
      .call();
    
    const activePool = new Set();
    paymentRecords.records.forEach(p => {
      if (p.from) activePool.add(p.from);
      if (p.to) activePool.add(p.to);
    });

    const totalPool = Array.from(new Set([...WHALE_REGISTRY, ...activePool]));
    
    const discoveryData = await Promise.all(totalPool.slice(0, 30).map(async (addr) => {
      try {
        const account = await horizonServer.loadAccount(addr);
        const bal = account.balances.find(b => b.asset_type === 'native')?.balance || "0";
        const balanceNum = parseFloat(bal);
        
        if (balanceNum < 10) return null; 

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
      finalData = validDiscovery.slice(0, 8);
      if (onLog) onLog(`LEADERBOARD SYNCED: TIER-2 DYNAMIC DISCOVERY (${validDiscovery.length} Active Whales)`, "ok");
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: finalData, timestamp: Date.now() }));
      return finalData;
    }
  } catch (error) {
    // Proceed to Tier 3
  }

  // TIER 3: Fail-safe Registry 
  if (onLog) onLog("LEADERBOARD SYNCED: TIER-3 FALLBACK (Registry Protocol)", "warn");
  finalData = WHALE_REGISTRY.slice(0, 8).map((addr, i) => ({
    addr,
    displayAddr: `${addr.substring(0, 8)}...${addr.slice(-4)}`,
    amt: i === 0 ? 81700030400 : (10000000 / (i + 1)), 
    source: 'FAILSAFE_REG'
  }));
  sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: finalData, timestamp: Date.now() }));
  return finalData;
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

