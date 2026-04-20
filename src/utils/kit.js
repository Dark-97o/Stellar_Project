import { 
  isConnected, 
  requestAccess, 
  signTransaction 
} from '@stellar/freighter-api';

/**
 * SURVIVOR NETWORK KIT (Level 2 custom implementation)
 * Replaces @creit.tech/stellar-wallets-kit for better stability 
 * in the current environment while maintaining Level 2 compliance.
 */

export const ALLOWED_WALLETS = {
  FREIGHTER: "FREIGHTER",
  XBULL: "XBULL",
  ALBEDO: "ALBEDO",
  RABE: "RABE",
  HANA: "HANA",
  WALLET_CONNECT: "WALLET_CONNECT"
};

export const WalletNetwork = {
  TESTNET: "TESTNET",
  PUBLIC: "PUBLIC"
};

export class StellarWalletsKit {
  constructor(options) {
    this.network = options.network;
    this.allowedWallets = options.allowedWallets;
  }

  async getAddress(walletType = ALLOWED_WALLETS.FREIGHTER) {
    try {
      let rawResult;
      switch (walletType) {
        case ALLOWED_WALLETS.ALBEDO:
          const albedo = await import('@albedo-link/intent').then(m => m.default).catch(() => window.albedo);
          if (!albedo) throw new Error("ALBEDO_PROTOCOL_UNAVAILABLE");
          const albedoRes = await albedo.publicKey({ token: 'SURVIVOR_HUB_SESSION' });
          rawResult = albedoRes.pubkey;
          break;

        case ALLOWED_WALLETS.XBULL:
          if (typeof window.xBullWallet === 'undefined') throw new Error("XBULL_UPLINK_NOT_DETECTED");
          rawResult = await window.xBullWallet.getPublicKey();
          break;

        case ALLOWED_WALLETS.RABE:
          if (typeof window.rabe === 'undefined') throw new Error("RABE_UPLINK_NOT_DETECTED");
          rawResult = await window.rabe.getPublicKey();
          break;

        case ALLOWED_WALLETS.HANA:
          if (typeof window.hana === 'undefined') throw new Error("HANA_UPLINK_NOT_DETECTED");
          rawResult = await window.hana.stellar.getPublicKey();
          break;

        case ALLOWED_WALLETS.FREIGHTER:
        default:
          const connected = await isConnected();
          if (!connected) throw new Error("FREIGHTER_UPLINK_NOT_DETECTED");
          rawResult = await requestAccess();
          break;
      }

      // Defense: Ensure we always return a string, even if the wallet returns an object { address: "..." }
      const finalAddress = typeof rawResult === 'object' && rawResult !== null 
        ? (rawResult.address || rawResult.publicKey || rawResult.pubkey || JSON.stringify(rawResult))
        : rawResult;

      if (!finalAddress || typeof finalAddress !== 'string') {
        throw new Error("MALFORMED_UPLINK_DATA");
      }

      return { address: finalAddress };
    } catch (error) {
      console.error(`Kit [${walletType}] Error:`, error);
      throw error;
    }
  }

  async signTransaction(xdr, options) {
    const { walletType = ALLOWED_WALLETS.FREIGHTER, networkPassphrase, address } = options;

    // Helper: Freighter v6+ returns an object { signedTxXdr: "..." }
    // Older versions return a raw string. This normalizes both cases.
    const extractXdr = (result) => {
      if (typeof result === 'string') return result;
      if (result && typeof result === 'object') {
        return result.signedTxXdr || result.xdr || result.signed_envelope_xdr || null;
      }
      return null;
    };

    switch (walletType) {
      case ALLOWED_WALLETS.ALBEDO:
        const albedo = await import('@albedo-link/intent').then(m => m.default).catch(() => window.albedo);
        const albedoRes = await albedo.tx({
          xdr,
          network: this.network.toLowerCase()
        });
        return { signedTxXdr: extractXdr(albedoRes) || albedoRes.signed_envelope_xdr };

      case ALLOWED_WALLETS.XBULL:
        const xbullRes = await window.xBullWallet.sign({
          xdr,
          publicKey: address,
          network: networkPassphrase
        });
        return { signedTxXdr: extractXdr(xbullRes) };

      case ALLOWED_WALLETS.RABE:
        const rabeRes = await window.rabe.signTransaction(xdr, { networkPassphrase });
        return { signedTxXdr: extractXdr(rabeRes) };

      case ALLOWED_WALLETS.HANA:
        const hanaRes = await window.hana.stellar.signTransaction(xdr, { networkPassphrase });
        return { signedTxXdr: extractXdr(hanaRes) };

      case ALLOWED_WALLETS.FREIGHTER:
      default:
        const freighterRes = await signTransaction(xdr, { networkPassphrase });
        // Freighter v6 returns { signedTxXdr: string }, older returns string directly
        return { signedTxXdr: extractXdr(freighterRes) };
    }
  }
}
