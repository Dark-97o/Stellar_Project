/**
 * PriceService: Real-time XLM/USD Oracle
 * Fetches current market rates to power the dynamic marketplace pricing.
 */

const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd";

export const getXlmPrice = async () => {
  try {
    // Attempt to fetch live data from CoinGecko
    const response = await fetch(COINGECKO_API);
    
    if (!response.ok) {
      throw new Error(`Oracle HTTP Failure: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.stellar && data.stellar.usd) {
      console.log(`[PriceService] Live Rate: 1 XLM = $${data.stellar.usd} USD`);
      return data.stellar.usd;
    }
    
    throw new Error("Malformed Oracle Response");
  } catch (error) {
    console.warn("[PriceService] Falling back to baseline simulation:", error.message);
    // Return a stable fallback value ($0.12) if the API is rate-limited or offline
    return 0.12; 
  }
};

/**
 * Calculates how much XLM is required for a given USD price
 */
export const calculateXlmCost = (usdPrice, xlmPrice) => {
  if (!xlmPrice || xlmPrice <= 0) return 0;
  return Math.ceil(usdPrice / xlmPrice);
};
