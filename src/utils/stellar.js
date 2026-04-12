import * as StellarSdk from '@stellar/stellar-sdk';

// Initialize the Horizon server for Stellar Testnet
const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

/**
 * Connects to the Freighter wallet extension.
 * Uses requestAccess() to trigger the authorization popup,
 * then falls back to getAddress() if already authorized.
 */
export const connectWallet = async () => {
  try {
    const freighterApi = await import('@stellar/freighter-api');

    // Step 1: Check if Freighter extension is installed
    let isInstalled = false;
    try {
      const connResult = await freighterApi.isConnected();
      // v6 returns { isConnected: boolean }, older returns boolean
      isInstalled = typeof connResult === 'object'
        ? connResult?.isConnected === true
        : connResult === true;
    } catch {
      isInstalled = false;
    }

    if (!isInstalled) {
      throw new Error(
        "Freighter wallet not detected. Please install the Freighter browser extension from freighter.app and reload the page."
      );
    }

    // Step 2: Request access — this triggers the Freighter popup
    // for the user to authorize this dApp
    let publicKey = '';

    try {
      const accessResult = await freighterApi.requestAccess();
      // v6 returns { address: string }, older returns string
      publicKey = typeof accessResult === 'string'
        ? accessResult
        : accessResult?.address || '';
    } catch (accessErr) {
      console.warn('requestAccess failed, trying getAddress:', accessErr);
    }

    // Step 3: Fallback — if requestAccess didn't return a key,
    // try getAddress (works if user previously authorized)
    if (!publicKey) {
      try {
        const addressResult = await freighterApi.getAddress();
        publicKey = typeof addressResult === 'string'
          ? addressResult
          : addressResult?.address || '';
      } catch (addrErr) {
        console.warn('getAddress also failed:', addrErr);
      }
    }

    if (!publicKey || typeof publicKey !== 'string' || !publicKey.startsWith('G')) {
      throw new Error(
        "Could not retrieve public key. Make sure Freighter is unlocked, set to TESTNET, and you click 'Allow' on the popup."
      );
    }

    return publicKey;
  } catch (error) {
    console.error("Connection Error:", error);
    throw error;
  }
};

/**
 * Fetches the XLM balance for a given public key.
 */
export const getXlmBalance = async (publicKey) => {
  try {
    const account = await server.loadAccount(publicKey);
    const nativeBalance = account.balances.find((b) => b.asset_type === 'native');
    return nativeBalance ? nativeBalance.balance : "0.0000000";
  } catch (error) {
    console.error("Fetch Balance Error:", error);
    if (error.response && error.response.status === 404) {
      return "0.0000000 (Not funded)";
    }
    throw error;
  }
};

/**
 * Sends XLM to a destination address.
 */
export const sendPayment = async (sourcePublicKey, destinationId, amount, onLog) => {
  try {
    onLog("INITIALIZING LINK...", "info");
    
    const sourceAccount = await server.loadAccount(sourcePublicKey);
    onLog("ACCOUNT SYNCED.", "success");

    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: destinationId,
          asset: StellarSdk.Asset.native(),
          amount: amount.toString(),
        })
      )
      .setTimeout(60)
      .build();

    onLog("ENCRYPTING PAYLOAD...", "info");
    const xdr = transaction.toXDR();

    onLog("AWAITING AGENT SIGNATURE...", "info");
    const freighterApi = await import('@stellar/freighter-api');
    const signResult = await freighterApi.signTransaction(xdr, {
      network: "TESTNET",
    });

    if (signResult.error) {
      throw new Error(signResult.error);
    }

    const signedXdr = signResult.signedTxXdr || signResult;
    onLog("SIGNATURE VERIFIED.", "success");

    onLog("UPLOADING TO STELLAR NETWORK...", "info");
    const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, StellarSdk.Networks.TESTNET);
    const response = await server.submitTransaction(tx);
    
    onLog(`TRANSACTION COMPLETE. HASH: ${response.hash.substring(0, 16)}...`, "success");
    return response;
  } catch (error) {
    onLog(`ERROR: ${error.message || "TRANSACTION FAILED"}`, "error");
    throw error;
  }
};

export const getExplorerUrl = (hash) => `https://stellar.expert/explorer/testnet/tx/${hash}`;
