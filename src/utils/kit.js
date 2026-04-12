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
      switch (walletType) {
        case ALLOWED_WALLETS.ALBEDO:
          // Albedo usually provides a global or can be used via web trigger
          // If no extension, it opens a popup. 
          if (typeof window.albedo === 'undefined') {
             console.warn("Albedo extension missing, falling back to web intent.");
          }
          const albedo = await import('@albedo-link/intent').then(m => m.default).catch(() => window.albedo);
          if (!albedo) throw new Error("ALBEDO_PROTOCOL_UNAVAILABLE");
          const { pubkey } = await albedo.publicKey({
            token: 'SURVIVOR_HUB_SESSION'
          });
          return { address: pubkey };

        case ALLOWED_WALLETS.XBULL:
          if (typeof window.xBullWallet === 'undefined') throw new Error("XBULL_UPLINK_NOT_DETECTED");
          const xbullAddress = await window.xBullWallet.getPublicKey();
          return { address: xbullAddress };

        case ALLOWED_WALLETS.RABE:
          if (typeof window.rabe === 'undefined') throw new Error("RABE_UPLINK_NOT_DETECTED");
          const rabeAddress = await window.rabe.getPublicKey();
          return { address: rabeAddress };

        case ALLOWED_WALLETS.HANA:
          if (typeof window.hana === 'undefined') throw new Error("HANA_UPLINK_NOT_DETECTED");
          const hanaAddress = await window.hana.stellar.getPublicKey();
          return { address: hanaAddress };

        case ALLOWED_WALLETS.FREIGHTER:
        default:
          const connected = await isConnected();
          if (!connected) throw new Error("FREIGHTER_UPLINK_NOT_DETECTED");
          const address = await requestAccess();
          return { address };
      }
    } catch (error) {
      console.error(`Kit [${walletType}] Error:`, error);
      throw error;
    }
  }

  async signTransaction(xdr, options) {
    const { walletType = ALLOWED_WALLETS.FREIGHTER, networkPassphrase, address } = options;

    switch (walletType) {
      case ALLOWED_WALLETS.ALBEDO:
        const albedo = await import('@albedo-link/intent').then(m => m.default).catch(() => window.albedo);
        const { signed_envelope_xdr } = await albedo.tx({
          xdr,
          network: this.network.toLowerCase()
        });
        return { signedTxXdr: signed_envelope_xdr };

      case ALLOWED_WALLETS.XBULL:
        const signedXdr = await window.xBullWallet.sign({
          xdr,
          publicKey: address,
          network: networkPassphrase
        });
        return { signedTxXdr: signedXdr };

      case ALLOWED_WALLETS.RABE:
        const rabeSignedXdr = await window.rabe.signTransaction(xdr, { 
          networkPassphrase 
        });
        return { signedTxXdr: rabeSignedXdr };

      case ALLOWED_WALLETS.HANA:
        const hanaSignedXdr = await window.hana.stellar.signTransaction(xdr, { 
          networkPassphrase 
        });
        return { signedTxXdr: hanaSignedXdr };

      case ALLOWED_WALLETS.FREIGHTER:
      default:
        const freighterSignedXdr = await signTransaction(xdr, { 
          networkPassphrase 
        });
        return { signedTxXdr: freighterSignedXdr };
    }
  }
}
