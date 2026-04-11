import { Server, TransactionBuilder, Networks, Operation, Asset, BASE_FEE } from '@stellar/stellar-sdk';
import { isConnected, getAddress, signTransaction } from '@stellar/freighter-api';

// Initialize the Horizon server for Stellar Testnet
const server = new Server('https://horizon-testnet.stellar.org');

/**
 * Checks if the Freighter wallet is installed and connected.
 */
export const connectWallet = async () => {
  try {
    const connected = await isConnected();
    if (!connected) {
      throw new Error("Freighter wallet not detected. Please install the extension.");
    }
    
    const publicKey = await getAddress();
    if (!publicKey) {
      throw new Error("Could not retrieve public key. Please unlock Freighter.");
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
      return "0.0000000 (Account not funded)";
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
    
    // 1. Fetch source account details
    const sourceAccount = await server.loadAccount(sourcePublicKey);
    onLog("ACCOUNT SYNCED.", "success");

    // 2. Build the transaction
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: destinationId,
          asset: Asset.native(),
          amount: amount.toString(),
        })
      )
      .setTimeout(60) // 1 minute timeout
      .build();

    onLog("ENCRYPTING PAYLOAD...", "info");
    const xdr = transaction.toXDR();

    // 3. Sign with Freighter
    onLog("AWAITING AGENT SIGNATURE...", "info");
    const signResult = await signTransaction(xdr, {
      network: "TESTNET",
    });

    if (signResult.error) {
      throw new Error(signResult.error);
    }

    const signedXdr = signResult.signedTxXdr;
    onLog("SIGNATURE VERIFIED.", "success");

    // 4. Submit to the network
    onLog("UPLOADING TO STELLAR NETWORK...", "info");
    const response = await server.submitTransaction(signedXdr);
    
    onLog(`TRANSACTION COMPLETE. HASH: ${response.hash.substring(0, 16)}...`, "success");
    return response;
  } catch (error) {
    onLog(`ERROR: ${error.message || "TRANSACTION FAILED"}`, "error");
    throw error;
  }
};

export const getExplorerUrl = (hash) => `https://stellar.expert/explorer/testnet/tx/${hash}`;
