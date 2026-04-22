import { useState, useEffect, useRef, Component } from 'react';
import { 
  connectWallet, 
  getXlmBalance, 
  sendPayment, 
  getExplorerUrl, 
  fetchAccountHistory, 
  fetchReliefFundStats, 
  fetchNetworkWhales, 
  RELIEF_ADDR,
  invokeContractDonate,
  invokeContractWithdraw,
  invokeContractSetAdmin,
  invokeContractSetActive,
  invokeContractInit,
  fundFromFaucet,
  sendMultiPayment,
  invokeContractBuyNft,
  invokeContractSellNft,
  invokeAdminFreeNft,
  invokeShopWithdraw,
  fetchNftOwner,
  fetchNftMetadata,
  SHOP_CONTRACT_ID,
  ErrorTypes
} from './utils/stellar';
import { getXlmPrice } from './utils/PriceService';
import { ALLOWED_WALLETS } from './utils/kit';
import Spline from '@splinetool/react-spline';
import logoImg from '/logo.png';
import './index.css';

/* ══════════════════════════════════════════════════════════════
   ERROR BOUNDARY
   ══════════════════════════════════════════════════════════════ */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Terminal crash:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell">
          <div className="bg-layer">
            <div className="bg-image" />
            <div className="bg-gradients" />
            <div className="bg-vignette" />
          </div>
          <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div className="card" style={{ maxWidth: 520, textAlign: 'center', padding: '3rem 2rem' }}>
              <div className="card-corner-br" />
              <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
                ⚠ CRITICAL SYSTEM FAILURE
              </h1>
              <p style={{ color: 'var(--text-body)', fontSize: '0.82rem', marginBottom: '2rem', lineHeight: 1.7 }}>
                {this.state.error?.message || 'An unrecoverable error occurred in the terminal subsystem.'}
              </p>
              <button className="btn" onClick={() => this.setState({ hasError: false, error: null })}>
                REBOOT TERMINAL
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ══════════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
   ══════════════════════════════════════════════════════════════ */
const AppFooter = () => (
  <footer className="site-footer" style={{ padding: '2rem 4rem', background: '#000', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
    <div className="footer-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ color: '#666', fontSize: '0.8rem' }}>© 2026 STELLAR TERMINAL <span className="dot-sep">•</span> MANAGEMENT SUITE <span className="dot-sep">•</span> @subhranil</div>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <a href="https://github.com/Dark-97o/" target="_blank" rel="noreferrer" style={{ color: '#888', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#888'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        </a>
        <a href="https://www.linkedin.com/in/subhranil-baul-b4802a287/" target="_blank" rel="noreferrer" style={{ color: '#888', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = '#888'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
        </a>
      </div>
      <div className="tech-stack" style={{ display: 'flex', gap: '1rem', color: '#666', fontSize: '0.8rem' }}>
        <span>STELLAR</span>
        <span>SOROBAN</span>
        <span>REACT</span>
      </div>
    </div>
  </footer>
);

/* ══════════════════════════════════════════════════════════════
   MAIN APPLICATION
   ══════════════════════════════════════════════════════════════ */
function App() {
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState('0.00');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('terminal');
  const [isLanding, setIsLanding] = useState(true);
  const [isZooming, setIsZooming] = useState(false);
  const [logs, setLogs] = useState([
    { msg: 'SURVIVOR HUB v2.1 ONLINE. MULTI-UPLINK ESTABLISHED.', type: 'info', ts: new Date().toLocaleTimeString() },
  ]);

  // View States
  const [dest, setDest] = useState('');
  const [amt, setAmt] = useState('');
  const [txHash, setTxHash] = useState('');
  const [donationTxHash, setDonationTxHash] = useState('');
  const [nfts, setNfts] = useState([
    { id: 1, name: 'Nexus Core', priceUSD: 45, icon: '💠', owner: null, color: '#4facfe' },
    { id: 2, name: 'Void Pulse', priceUSD: 85, icon: '⚛️', owner: null, color: '#00f2fe' },
    { id: 3, name: 'Stellar Gate', priceUSD: 250, icon: '🌌', owner: null, color: '#a18cd1' },
    { id: 4, name: 'Data Ghost', priceUSD: 120, icon: '👻', owner: null, color: '#fbc2eb' },
  ]);
  const [xlmPriceUSD, setXlmPriceUSD] = useState(0.166); // Calibrated to 6 XLM/$1
  
  useEffect(() => {
    const updatePrice = async () => {
      const price = await getXlmPrice();
      setXlmPriceUSD(price);
    };
    updatePrice();
    const interval = setInterval(updatePrice, 300000); // Sync every 5 mins
    return () => clearInterval(interval);
  }, []);
  
  const handleBuyNft = async (nftId) => {
    if (!address) return setShowConnectPrompt(true);
    const nft = nfts.find(n => n.id === nftId);
    
    if (!nft) {
      log(`CRITICAL: NFT ID ${nftId} NOT FOUND IN LOCAL REGISTRY.`, "err");
      return;
    }
    
    setLoading(true);
    try {
      log(`INITIATING UPLINK FOR ${nft.name.toUpperCase()}...`, "info");
      const res = await invokeContractBuyNft(
        address, 
        nftId, 
        `metadata://stellar-nft-shop/${nftId}`, 
        nft.priceUSD, 
        (m, t) => log(m, t), 
        walletType
      );
      
      if (res && res.hash) {
        log(`PURCHASE SUCCESSFUL: ${nft.name} MINTED. HASH: ${res.hash.substring(0,16)}...`, "ok");
        // Optimistic update
        setNfts(prev => prev.map(n => n.id === nftId ? { ...n, owner: address } : n));
        setTimeout(() => syncAllData(), 5000);
      }
    } catch (e) {
      log(`PURCHASE FAILED: ${e.message || "Unknown error during transaction."}`, "err");
    } finally {
      setLoading(false);
    }
  };

  const handleSellNft = async (nftId) => {
    if (!address) return;
    const nft = nfts.find(n => n.id === nftId);
    
    setLoading(true);
    try {
      log(`INITIATING SELL-BACK UPLINK FOR ${nft.name.toUpperCase()}...`, "warn");
      const res = await invokeContractSellNft(address, nftId, nft.priceUSD, (m, t) => log(m, t), walletType);
      
      if (res.hash) {
        log(`SELL-BACK SUCCESSFUL. ASSET RETURNED TO HUB. HASH: ${res.hash.substring(0,16)}...`, "ok");
        setNfts(prev => prev.map(n => n.id === nftId ? { ...n, owner: null } : n));
        setTimeout(() => syncAllData(), 5000);
      }
    } catch (e) {
      log(`SELL-BACK FAILED: ${e.message}`, "err");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminFreeNft = async (nftId) => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await invokeAdminFreeNft(address, nftId, (m, t) => log(m, t), walletType);
      if (res && res.hash) {
        log(`ADMIN ACTION SUCCESSFUL: NFT ID ${nftId} RESET.`, "ok");
        setTimeout(() => syncAllData(), 3000);
      }
    } catch (e) {
      log(`ADMIN ACTION FAILED: ${e.message}`, "err");
    } finally {
      setLoading(false);
    }
  };

  const handleShopWithdraw = async () => {
    const amt = prompt("ENTER AMOUNT TO WITHDRAW FROM SHOP TREASURY (XLM):");
    if (!amt || isNaN(amt)) return;
    setLoading(true);
    try {
      const res = await invokeShopWithdraw(address, parseFloat(amt), (m, t) => log(m, t), walletType);
      if (res.hash) {
        log(`TREASURY WITHDRAWAL SUCCESSFUL. HASH: ${res.hash.substring(0,16)}...`, "ok");
        setTimeout(() => syncAllData(), 3000);
      }
    } catch (e) {
      log(`WITHDRAWAL FAILED: ${e.message}`, "err");
    } finally {
      setLoading(false);
    }
  };

  const [showConnectPrompt, setShowConnectPrompt] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletType, setWalletType] = useState(null);

  const isLoginRequired = !isLanding && !address;
  const displayPrompt = (showConnectPrompt || isLoginRequired) && !showWalletModal;

  // Real Data States
  const [history, setHistory] = useState([]);
  const [fundTotal, setFundTotal] = useState(0);
  const [donors, setDonors] = useState([]);
  const [whales, setWhales] = useState([]);
  const [hasAlerts, setHasAlerts] = useState(true); // Tactical alert simulation
  const [fundGoal, setFundGoal] = useState(10000);

  // New Feature States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [selectedNft, setSelectedNft] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [shopBalance, setShopBalance] = useState('0.00');
  const [adminAddress, setAdminAddress] = useState(null);
  const [splitMode, setSplitMode] = useState('single'); // 'single' or 'multi'
  const [calcTotal, setCalcTotal] = useState('');
  const [calcN, setCalcN] = useState(2);
  const [multiRecipients, setMultiRecipients] = useState([{ dest: '', amt: '' }]);
  const [multiStatuses, setMultiStatuses] = useState([]); // per-recipient {state, hash}

  const logEnd = useRef(null);
  useEffect(() => { logEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const log = (msg, type = 'info') => {
    setLogs(p => [...p, { msg, type, ts: new Date().toLocaleTimeString() }]);
  };

  const formatAddress = (addr, start = 6, end = 4) => {
    if (!addr || typeof addr !== 'string') return 'UNKNOWN_IDENTITY';
    if (addr.length <= start + end) return addr;
    return `${addr.substring(0, start)}...${addr.slice(-end)}`;
  };

  // Sync Interval
  useEffect(() => {
    const loadWhales = async () => {
      const data = await fetchNetworkWhales(log);
      setWhales(data);
    };
    loadWhales();
    const interval = setInterval(loadWhales, 3600000); // Sync once per hour
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!address) return;
    const interval = setInterval(() => {
      syncAllData();
    }, 15000);
    return () => clearInterval(interval);
  }, [address, activeTab]);

  const syncAllData = async (addr = address) => {
    if (!addr) return;
    setIsSyncing(true);
    try {
      const b = await getXlmBalance(addr);
      setBalance(b === "UPLINK_NOT_INITIALIZED" ? "0.00" : b);
      
      const hist = await fetchAccountHistory(addr);
      setHistory(hist);

      const relief = await fetchReliefFundStats();
      setFundTotal(relief.total);
      setFundGoal(relief.goal || 10000);
      setDonors(relief.donors);
      if (relief.admin) setAdminAddress(relief.admin);

      // Sync Shop Balance
      const sb = await getXlmBalance(SHOP_CONTRACT_ID);
      setShopBalance(sb === "UPLINK_NOT_INITIALIZED" ? "0.00" : sb);

      // Sync NFT Owners
      const updatedNfts = await Promise.all(nfts.map(async (nft) => {
        const owner = await fetchNftOwner(nft.id);
        return { ...nft, owner };
      }));
      setNfts(updatedNfts);

    } catch (e) {
      console.warn("Sync Error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  /* ── LEVEL 2 WALLET ACTIONS ───────────────────────────────── */
  const handleConnect = () => {
    setShowConnectPrompt(true);
  };

  const connectToSpecificWallet = async (type) => {
    setShowWalletModal(false);
    setLoading(true);
    try {
      log(`INITIATING UPLINK VIA [${type}]...`, 'info');
      const key = await connectWallet(type);
      setAddress(key);
      setWalletType(type);
      log(`UPLINK SECURED → [${formatAddress(key, 12, 0)}...]`, 'ok');
      await syncAllData(key);
    } catch (err) {
      const errorMsg = err.message === 'SURVIVOR_REJECTED_LINK' 
        ? 'UPLINK ABORTED BY OPERATOR.' 
        : `CRITICAL ERROR: ${err.message}`;
      log(errorMsg, "err");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setAddress('');
    setBalance('0.00');
    setWalletType(null);
    setHistory([]);
    log('UPLINK SEVERED BY OPERATOR.', 'info');
  };

  /* ── TRANSACTION LIFECYCLE HANDLERS ─────────────────────── */
  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTxHash('');
    try {
      const res = await sendPayment(address, dest, amt, (m, t) => log(m, t), walletType);
      setTxHash(res.hash);
      log("UPLINK FINALIZED. LEDGER SYNCHRONIZED.", "ok");
      await syncAllData();
      setDest(''); setAmt('');
    } catch (err) {
      log(`TRANSACTION FAILURE: ${err.message}`, "err");
    } finally {
      setLoading(false);
    }
  };

  const handleDonate = async (amount = 50) => {
    if (!address) { log("UPLINK REQUIRED FOR ACTION.", "err"); return; }
    setLoading(true);
    try {
      log(`INITIATING SOROBAN CONTRACT DONATION: ${amount} XLM...`, "info");
      const res = await invokeContractDonate(address, amount, (m, t) => log(m, t), walletType);
      
      if (res.hash) {
        setTxHash(res.hash);
        setDonationTxHash(res.hash);
        log(`DONATION FINALIZED VIA CONTRACT. HASH: ${res.hash.substring(0,16)}...`, "ok");
      } else {
        log(`DONATION FINALIZED VIA CONTRACT.`, "ok");
      }
      
      // Optimistic update: immediately show the donated amount in the progress bar
      setFundTotal(prev => parseFloat((prev + amount).toFixed(2)));
      log(`POOL UPDATED: +${amount} XLM. CONFIRMING ON-CHAIN IN 5s...`, "info");

      // Confirmed sync after 5s to let Soroban RPC and contract storage settle
      setTimeout(() => syncAllData(), 5000);
    } catch (err) {
      log(`CONTRACT_ERR: ${err.message}`, "err");
    } finally {
      setLoading(false);
    }
  };

  const handleFaucet = async () => {
    if (!address) { log("UPLINK REQUIRED.", "err"); return; }
    setFaucetLoading(true);
    try {
      await fundFromFaucet(address, (m, t) => log(m, t));
      await syncAllData();
    } catch (err) {
      log("FAUCET FAILURE.", "err");
    } finally {
      setFaucetLoading(false);
    }
  };

  const handleSplitPay = async (e) => {
    e.preventDefault();
    if (!address) return;
    setLoading(true);
    try {
      await sendMultiPayment(address, multiRecipients, (m, t) => log(m, t), walletType);
      await syncAllData();
      setMultiRecipients([{ dest: '', amt: '' }]);
    } catch (err) {
      log(`MULTI-PAY ERROR: ${err.message}`, "err");
    } finally {
      setLoading(false);
    }
  };

  /* ── ADMIN DIAGNOSTICS HANDLERS ───────────────────────────────── */
  const handleAdminWithdraw = async (e) => {
    e.preventDefault();
    const dest = prompt("ENTER AUTHORIZED RECIPIENT ADDRESS (G...):");
    if (!dest) return;
    setLoading(true);
    try {
      await invokeContractWithdraw(address, dest, (m, t) => log(m, t), walletType);
      await syncAllData();
    } catch (err) { log(`WITHDRAW REJECTED: ${err.message}`, "err"); }
    setLoading(false);
  };

  const handleAdminTransfer = async (e) => {
    e.preventDefault();
    const newAdmin = prompt("ENTER NEW PROTOCOL ADMIN (G...):");
    if (!newAdmin) return;
    setLoading(true);
    try {
      await invokeContractSetAdmin(address, newAdmin, (m, t) => log(m, t), walletType);
      await syncAllData();
    } catch (err) { log(`ADMIN HANDOFF ERROR: ${err.message}`, "err"); }
    setLoading(false);
  };

  const handleAdminTogglePause = async (isActive) => {
    setLoading(true);
    try {
      await invokeContractSetActive(address, isActive, (m, t) => log(m, t), walletType);
      await syncAllData();
    } catch (err) { log(`PAUSE TOGGLE ERROR: ${err.message}`, "err"); }
    setLoading(false);
  };

  const handleMaliciousInit = async () => {
    setLoading(true);
    try {
      await invokeContractInit(address, (m, t) => log(m, t), walletType);
      await syncAllData();
    } catch (err) { log(`MALICIOUS INIT REJECTED: ${err.message}`, "ok"); }
    setLoading(false);
  };

  const handleMultiPay = async () => {
    if (!address) { log('UPLINK REQUIRED FOR MULTI-PAY.', 'err'); return; }
    const valid = multiRecipients.filter(r => r.dest.trim() && parseFloat(r.amt) > 0);
    if (!valid.length) { log('NO VALID RECIPIENTS CONFIGURED.', 'err'); return; }
    setLoading(true);
    // Init all statuses as PENDING
    const initStatuses = valid.map(() => ({ state: 'pending', hash: null }));
    setMultiStatuses(initStatuses);
    setBatchProgress(0);
    log(`INITIATING BATCH UPLINK → ${valid.length} TARGETS...`, 'info');

    // Fire all payments in parallel, capturing individual results
    const results = await Promise.allSettled(
      valid.map((r, i) =>
        sendPayment(address, r.dest, r.amt, (m, t) => log(`[${i+1}/${valid.length}] ${m}`, t), walletType)
          .then(res => {
            setMultiStatuses(prev => {
              const next = [...prev];
              next[i] = { state: 'ok', hash: res.hash };
              return next;
            });
            setBatchProgress(prev => prev + (100 / valid.length));
            return res;
          })
          .catch(err => {
            setMultiStatuses(prev => {
              const next = [...prev];
              next[i] = { state: 'err', hash: null, msg: err.message };
              return next;
            });
            setBatchProgress(prev => prev + (100 / valid.length));
            throw err;
          })
      )
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - succeeded;
    log(`BATCH COMPLETE: ${succeeded} OK / ${failed} FAILED.`, failed ? 'err' : 'ok');
    await syncAllData();
    setLoading(false);
  };

  const applySplit = () => {
    const total = parseFloat(calcTotal);
    const n = parseInt(calcN);
    if (!total || !n) return;
    const splitAmt = (total / n).toFixed(7);
    const newRecipients = Array.from({ length: n }, () => ({ dest: '', amt: splitAmt }));
    setMultiRecipients(newRecipients);
    log(`CALCULATED SPLIT: ${splitAmt} XLM x ${n}`, "info");
  };

  /* ── VIEW RENDERING ───────────────────────────────────────── */
  const renderContent = () => {
    switch(activeTab) {
      case 'terminal':
        return (
          <div className="enter">
            <div className="card card--tall">
              <div className="card-tag">Payments Gateway</div>
              <div className="card-body">
                <div className="preview-frame">
                  <video src="/img/pay.mov" autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
                  <div style={{ position: 'absolute', bottom: '15px', right: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="dot dot--on" style={{ width: '6px', height: '6px' }} />
                    <span style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 600, opacity: 0.8, letterSpacing: '1px' }}>PAYMENT_NODE_LIVE</span>
                  </div>
                </div>
                <form onSubmit={handleSend}>
                  <div className="input-group">
                    <label className="field-label">Target Identity (Public Key)</label>
                    <input className="input" placeholder="GA..." value={dest} onChange={e => setDest(e.target.value)} required />
                  </div>
                  <div className="input-group">
                    <label className="field-label">XLM Resources to Transfer</label>
                    <input className="input" type="number" placeholder="0.00" value={amt} onChange={e => setAmt(e.target.value)} required />
                  </div>
                  <button className="btn btn--full" type="submit" disabled={loading || !address}>
                    {loading ? <span className="spinner" /> : 'Execute Transfer'}
                  </button>
                </form>
                {txHash && (
                  <div className="tx-result">
                    <div className="sep" />
                    <p className="tx-hash">STATUS: FINALIZED | HASH: {txHash.substring(0,16)}...</p>
                    <button className="btn btn--ghost btn--full" onClick={() => window.open(getExplorerUrl(txHash), '_blank')}>VERIFY ON LEDGER ↗</button>
                  </div>
                )}
              </div>
            </div>
            </div>
          );
        case 'multipay':
          return (
            <div className="enter">
              <div className="card card--tall">
                <div className="card-tag">Batch Payments</div>
                <div className="card-body">
                <div className="preview-frame">
                  <video src="/img/pay.mov" autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
                  <div style={{ position: 'absolute', bottom: '15px', right: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="dot dot--on" style={{ width: '6px', height: '6px' }} />
                    <span style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 600, opacity: 0.8, letterSpacing: '1px' }}>BATCH_GATEWAY_ACTIVE</span>
                  </div>
                </div>
                <p className="field-label" style={{ marginBottom: '1rem' }}>Configure recipients then execute — each payment broadcasts independently with live status.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.2rem', maxHeight: '340px', overflowY: 'auto' }}>
                    {multiRecipients.map((r, i) => {
                      const status = multiStatuses[i];
                      return (
                        <div key={i} className="multipay-row">
                          <input
                            className="input"
                            placeholder={`Recipient ${i + 1} (G...)`}
                            value={r.dest}
                            onChange={e => {
                              const next = [...multiRecipients];
                              next[i] = { ...next[i], dest: e.target.value };
                              setMultiRecipients(next);
                            }}
                            style={{ fontSize: '0.7rem' }}
                          />
                          <input
                            className="input"
                            type="number"
                            placeholder="XLM"
                            value={r.amt}
                            onChange={e => {
                              const next = [...multiRecipients];
                              next[i] = { ...next[i], amt: e.target.value };
                              setMultiRecipients(next);
                            }}
                            style={{ fontSize: '0.75rem' }}
                          />
                          <button
                            onClick={() => {
                              const next = multiRecipients.filter((_, idx) => idx !== i);
                              setMultiRecipients(next.length ? next : [{ dest: '', amt: '' }]);
                              setMultiStatuses(prev => prev.filter((_, idx) => idx !== i));
                            }}
                            style={{ background: 'rgba(255,60,60,0.12)', border: '1px solid rgba(255,60,60,0.25)', color: '#ff6b6b', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', height: '100%' }}
                          >✕</button>
                          {/* Per-recipient live status badge */}
                          {status ? (
                            status.state === 'pending' ? (
                              <span style={{ fontSize: '0.6rem', color: 'var(--yellow)', background: 'rgba(255,195,0,0.1)', border: '1px solid rgba(255,195,0,0.3)', borderRadius: '4px', padding: '0.2rem 0.4rem', textAlign: 'center' }}>⏳ PENDING</span>
                            ) : status.state === 'ok' ? (
                              <span
                                title={status.hash}
                                onClick={() => status.hash && window.open(getExplorerUrl(status.hash), '_blank')}
                                style={{ fontSize: '0.6rem', color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '4px', padding: '0.2rem 0.4rem', textAlign: 'center', cursor: 'pointer' }}
                              >✓ OK ↗</span>
                            ) : (
                              <span title={status.msg} style={{ fontSize: '0.6rem', color: '#ff6b6b', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: '4px', padding: '0.2rem 0.4rem', textAlign: 'center' }}>✗ FAIL</span>
                            )
                          ) : <span />}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <button
                      className="btn btn--ghost"
                      style={{ flex: 1 }}
                      onClick={() => { setMultiRecipients(p => [...p, { dest: '', amt: '' }]); }}
                    >+ ADD RECIPIENT</button>
                    <button
                      className="btn btn--ghost"
                      style={{ flex: 1 }}
                      onClick={() => { setMultiRecipients([{ dest: '', amt: '' }]); setMultiStatuses([]); }}
                    >⟳ RESET</button>
                  </div>

                  <button
                    className="btn btn--full"
                    onClick={handleMultiPay}
                    disabled={loading || !address}
                  >
                    {loading ? <span className="spinner" /> : `EXECUTE BATCH (${multiRecipients.filter(r => r.dest && r.amt).length} TARGETS)`}
                  </button>

                  {loading && batchProgress > 0 && (
                    <div className="progress-bar-container">
                      <div className="progress-fill" style={{ width: `${batchProgress}%` }} />
                    </div>
                  )}

                  {!address && (
                    <p style={{ textAlign: 'center', color: 'var(--red)', fontSize: '0.7rem', marginTop: '1rem' }}>CONNECT WALLET TO ENABLE BATCH UPLINK</p>
                  )}
                </div>
              </div>
            </div>
          );
        case 'calculator':
          return (
            <div className="enter">
              <div className="card">
                <div className="card-tag">Split Bill Calculator</div>
                <div className="card-body">
                <div className="preview-frame">
                  <video src="/img/pay.mov" autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
                  <div style={{ position: 'absolute', bottom: '15px', right: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="dot dot--on" style={{ width: '6px', height: '6px' }} />
                    <span style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 600, opacity: 0.8, letterSpacing: '1px' }}>PRECISION_CALC_UPLINK</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="input-group">
                      <label className="field-label">Total to Split (XLM)</label>
                      <input className="input" type="number" value={calcTotal} onChange={e => setCalcTotal(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="input-group">
                      <label className="field-label">Number of Survivors (N)</label>
                      <input className="input" type="number" value={calcN} onChange={e => setCalcN(e.target.value)} placeholder="2" />
                    </div>
                  </div>
                  <button className="btn btn--full" onClick={applySplit} style={{ marginBottom: '2rem' }}>
                    CALCULATE & GENERATE BATCH
                  </button>

                  <div className="sep" />
                  <p className="field-label">Batch Recipients</p>
                  <form onSubmit={handleSplitPay}>
                    {multiRecipients.map((r, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input className="input" placeholder="GA..." value={r.dest} onChange={e => {
                          const newR = [...multiRecipients];
                          newR[i].dest = e.target.value;
                          setMultiRecipients(newR);
                        }} required />
                        <input className="input" value={r.amt} readOnly />
                      </div>
                    ))}
                    <button className="btn btn--full" type="submit" disabled={loading || !address || multiRecipients.some(r => !r.dest)}>
                      {loading ? <span className="spinner" /> : 'EXECUTE BATCH UPLINK'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        case 'faucet':
          return (
            <div className="enter">
              <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <div className="card-tag">Resource Faucet</div>
                <div className="card-body">
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⛲</div>
                  <h2 className="site-title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Testnet Friendbot</h2>
                  <p className="field-value" style={{ marginBottom: '2rem' }}>
                    Request a resupply of 10,000 Testnet XLM. This uplink can be initiated once per day per survivor identity.
                  </p>
                  <button className="btn btn--full" onClick={handleFaucet} disabled={faucetLoading || !address}>
                    {faucetLoading ? <><span className="spinner" /> CONTACTING FRIENDBOT...</> : 'REQUEST RESUPPLY (10,000 XLM)'}
                  </button>
                </div>
              </div>
            </div>
          );
        case 'events':
          return (
            <div className="enter">
              <div className="card">
                <div className="card-tag">Protocol Activity Feed</div>
                <div className="card-body">
                  <p className="field-label" style={{ marginBottom: '1.5rem' }}>LIVE SMART CONTRACT NOTIFICATIONS</p>
                  {donors.length === 0 ? (
                    <p className="field-value--empty" style={{ textAlign: 'center', padding: '2rem' }}>AWAITING PROTOCOL EVENTS...</p>
                  ) : (
                    <div className="event-feed">
                      {donors.map((event, i) => {
                        const isWithdrawal = event.type === 'WITHDRAWAL';
                        return (
                          <div key={i} className="event-item enter" style={{ 
                            padding: '1rem', 
                            borderLeft: `2px solid ${isWithdrawal ? '#ff6b6b' : 'var(--yellow)'}`, 
                            background: isWithdrawal ? 'rgba(255,80,80,0.04)' : 'rgba(255,195,0,0.03)',
                            marginBottom: '0.75rem'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: isWithdrawal ? '#ff6b6b' : 'var(--yellow)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                {isWithdrawal ? '⬇ WITHDRAWAL_DETECTED' : '✦ TRANSFER_RECOGNIZED'}
                              </span>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span className="console-ts">{new Date().toLocaleDateString()}</span>
                                {event.txHash && (
                                  <button
                                    onClick={() => window.open(getExplorerUrl(event.txHash), '_blank')}
                                    style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: '3px' }}
                                  >TX↗</button>
                                )}
                              </div>
                            </div>
                            <p className="field-value" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                              {isWithdrawal
                                ? <>Admin withdrew <span style={{ color: '#ff6b6b' }}>{event.amt} XLM</span> to <span style={{ color: '#ff6b6b' }}>{event.addr}</span>.</>
                                : <>Survivor <span style={{ color: 'var(--yellow)' }}>{event.addr}</span> contributed <span style={{ color: 'var(--yellow)' }}>{event.amt} XLM</span> to the Global Pool.</>
                              }
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        case 'tracker':
        return (
          <div className="enter">
            <div className="card">
              <div className="card-tag">Recent Ledger Activity</div>
              <div className="card-body">
                {isSyncing && history.length === 0 ? (
                  <div className="skeleton-pulse" style={{ height: '200px', width: '100%', borderRadius: '6px' }} />
                ) : history.length === 0 ? (
                  <p className="field-value--empty" style={{ textAlign: 'center', padding: '2rem' }}>AWAITING DATA SYNC...</p>
                ) : (
                  <table className={`tracker-table ${isSyncing ? 'skeleton-pulse' : ''}`}>
                    <thead>
                      <tr><th>Identifier</th><th>Volume</th><th>Protocol</th></tr>
                    </thead>
                    <tbody>
                      {history.map(item => (
                        <tr key={item.id} style={{ opacity: isSyncing ? 0.3 : 1, transition: 'opacity 0.3s' }}>
                          <td>{item.addr}</td>
                          <td style={{ color: 'var(--yellow)' }}>{item.amt}</td>
                          <td>
                            <a href={getExplorerUrl(item.hash)} target="_blank" rel="noreferrer" style={{ color: 'var(--orange)', textDecoration: 'none' }}>↗ VERIFY</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      case 'fund':
        const progress = Math.min((fundTotal / fundGoal) * 100, 100);
        return (
          <div className="enter">
            <div className="card">
              <div className="card-tag">Soroban Relief Protocol</div>
              <div className="card-body">
                <div className="preview-frame">
                  <video src="/img/poverty.mp4" autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
                  <div style={{ position: 'absolute', bottom: '15px', right: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="dot dot--on" style={{ width: '6px', height: '6px' }} />
                    <span style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 600, opacity: 0.8, letterSpacing: '1px' }}>LIVE_TX_STREAM</span>
                  </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                    <p className="field-label" style={{ margin: 0, fontSize: '0.75rem' }}>PROTOCOL DISTRIBUTION PROGRESS</p>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>{progress.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: '22px', width: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: '100px', padding: '4px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${progress}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, #ffffff 0%, #eeeeee 100%)', 
                        borderRadius: '100px',
                        boxShadow: '0 0 25px rgba(255, 255, 255, 0.3)',
                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative'
                      }} 
                    >
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)', animation: 'scanning 2s infinite linear' }} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div><span className="field-label">Global Pool</span><br /><span className="balance-num" style={{ fontSize: '1.3rem' }}>{fundTotal.toLocaleString()}</span> <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>XLM</span></div>
                  <div style={{ textAlign: 'right' }}><span className="field-label">Target Goal</span><br /><span className="balance-num" style={{ fontSize: '1.3rem', opacity: 0.5 }}>{fundGoal.toLocaleString()}</span> <span style={{ fontSize: '0.6rem', opacity: 0.3 }}>XLM</span></div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <button className="btn btn--full" onClick={() => handleDonate(10)} disabled={loading || !address} style={{ padding: '0.6rem' }}>
                    DONATE 10 XLM
                  </button>
                  <button className="btn btn--full" onClick={() => handleDonate(100)} disabled={loading || !address} style={{ padding: '0.6rem' }}>
                    DONATE 100 XLM
                  </button>
                </div>

                {donationTxHash && (
                  <div className="tx-result" style={{ marginBottom: '1.5rem' }}>
                    <div className="sep" />
                    <p className="tx-hash" style={{ fontSize: '0.6rem', opacity: 0.7 }}>SYNCED | {donationTxHash.substring(0,24)}...</p>
                  </div>
                )}

                <div className="sep" style={{ margin: '1rem 0' }} />
                <p className="field-label" style={{ marginBottom: '0.75rem' }}>Live Protocol Events</p>
                <div className="leaderboard-list" style={{ maxHeight: '200px', overflowY: 'auto', gap: '2px', display: 'flex', flexDirection: 'column' }}>
                  {donors.length === 0 && (
                    <div style={{ padding: '1rem', opacity: 0.5, fontSize: '0.75rem', textAlign: 'center' }}>
                      NO LIVE EVENTS
                    </div>
                  )}
                  {donors.map((d, i) => (
                    <div key={i} className="leaderboard-item" style={{ padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                      <span style={{
                        fontSize: '0.55rem',
                        fontWeight: 800,
                        padding: '0.1rem 0.35rem',
                        borderRadius: '3px',
                        background: d.type === 'WITHDRAWAL' ? 'rgba(255,80,80,0.1)' : 'rgba(35,209,139,0.1)',
                        color: d.type === 'WITHDRAWAL' ? '#ff6b6b' : '#23d18b',
                        border: `1px solid ${d.type === 'WITHDRAWAL' ? '#ff6b6b33' : '#23d18b33'}`,
                        flexShrink: 0,
                        textTransform: 'uppercase'
                      }}>
                        {d.type === 'WITHDRAWAL' ? 'OUT' : 'IN'}
                      </span>
                      <span className="leaderboard-addr" style={{ fontSize: '0.65rem', opacity: 0.8, fontFamily: 'var(--font-mono)' }}>{formatAddress(d.addr, 6, 4)}</span>
                      <span className="leaderboard-amt" style={{ fontSize: '0.8rem', fontWeight: 700, color: d.type === 'WITHDRAWAL' ? '#ff6b6b' : '#23d18b', flexShrink: 0 }}>
                        {d.type === 'WITHDRAWAL' ? '-' : '+'}{d.amt}
                      </span>
                      {d.txHash && (
                        <button 
                          onClick={() => window.open(getExplorerUrl(d.txHash), '_blank')}
                          className="btn btn--ghost"
                          style={{ 
                            fontSize: '0.55rem', padding: '0.15rem 0.4rem', border: '1px solid rgba(255,255,255,0.1)', 
                            color: 'rgba(255,255,255,0.5)', borderRadius: '3px', marginLeft: 'auto'
                          }}
                        >
                          VERIFY
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'rank':
        return (
          <div className="enter">
            <div className="card">
              <div className="card-tag">Network Stakeholders</div>
              <div className="card-body">
                <p className="field-label" style={{ marginBottom: '1rem' }}>REAL-TIME TOP HOLDERS (TESTNET)</p>
                <div className="leaderboard-list">
                  {whales.map((w, idx) => (
                    <div key={idx} className="leaderboard-item">
                      <div className="leaderboard-rank">#{idx+1}</div>
                      <div className="flex-col" style={{ flex: 1 }}>
                        <div className="leaderboard-addr" title={w.addr}>{w.displayAddr || w.addr}</div>
                        <span style={{ fontSize: '0.5rem', opacity: 0.4, letterSpacing: '1px' }}>SOURCE: {w.source || 'LEGACY_CACHE'}</span>
                      </div>
                      <div className="leaderboard-amt">{w.amt.toLocaleString(undefined, { maximumFractionDigits: 0 })} XLM</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'diagnostics':
        return (
          <div className="enter">
            <div className="card" style={{ border: '1px solid var(--red)' }}>
              <div className="card-tag" style={{ color: 'var(--red)', borderLeftColor: 'var(--red)' }}>Admin Security Tests</div>
              <div className="card-body">
                <p className="field-label" style={{ marginBottom: '1.5rem', color: 'var(--text-main)', opacity: 0.8 }}>
                  These strict actions execute live invocations simulating Soroban Testnet security features. 
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>1. Authorized Withdraw</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Proves the admin can safely access the communal protocol pool.</p>
                      </div>
                      <button className="btn" onClick={handleAdminWithdraw} disabled={loading}>WITHDRAW FUNDS</button>
                    </div>
                  </div>

                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>2. Transfer Ownership</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Proves the protocol is secure from deadlocks via decentralized handoffs.</p>
                      </div>
                      <button className="btn" onClick={handleAdminTransfer} disabled={loading}>SET ADMIN</button>
                    </div>
                  </div>

                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>3. Protocol Pause Toggle</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Proves external inputs can be halted securely and resumed seamlessly.</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn--danger" onClick={() => handleAdminTogglePause(false)} disabled={loading}>PAUSE</button>
                        <button className="btn btn--ghost" onClick={() => handleAdminTogglePause(true)} disabled={loading}>RESUME</button>
                      </div>
                    </div>
                  </div>

                   <div style={{ padding: '1rem', background: 'rgba(255,80,80,0.05)', borderRadius: '8px', border: '1px solid rgba(255,80,80,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ color: 'var(--red)' }}>4. Malicious Initialization</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Proves hijacked initialization endpoints are blocked permanently.</p>
                      </div>
                      <button className="btn btn--danger" onClick={handleMaliciousInit} disabled={loading}>TRIGGER HIJACK</button>
                    </div>
                  </div>

                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>5. Inventory Management</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Free all NFTs currently held by the Contract Hub.</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {nfts.filter(n => n.owner === SHOP_CONTRACT_ID).length > 0 ? (
                           nfts.filter(n => n.owner === SHOP_CONTRACT_ID).map(n => (
                             <button key={n.id} className="btn btn--ghost" style={{ fontSize: '0.6rem' }} onClick={() => handleAdminFreeNft(n.id)}>FREE ID {n.id}</button>
                           ))
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#444' }}>NO ASSETS HELD BY HUB</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '1rem', background: 'rgba(79, 172, 254, 0.05)', borderRadius: '8px', border: '1px solid rgba(79, 172, 254, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>6. Shop Treasury Control</strong>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Protocol Liquidity: <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{shopBalance} XLM</span></p>
                      </div>
                      <button className="btn btn--ghost" onClick={handleShopWithdraw} disabled={loading}>WITHDRAW FEES</button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      case 'shop':
        return (
          <div className="enter">
            <div className="card" style={{ background: 'rgba(5,5,5,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="card-tag">Stellar NFT Shop</div>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <p className="field-label">OFFICIAL ASSET MARKETPLACE</p>
                  <div style={{ fontSize: '0.7rem', color: '#666', textAlign: 'right' }}>1 XLM ≈ ${xlmPriceUSD.toFixed(3)} USD (ORACLE FEED)</div>
                </div>

                <div className="shop-grid">
                  {nfts.map(nft => {
                    const xlmCost = nft.priceUSD * 6; // Fixed contract rate for transparency
                    const isOwner = nft.owner === address;
                    const isSold = nft.owner && !isOwner;
                    
                    return (
                      <div key={nft.id} className="nft-card" onClick={() => setSelectedNft(nft)} style={{ cursor: 'pointer' }}>
                        <div className="nft-image-container" style={{ background: `radial-gradient(circle at center, ${nft.color}22 0%, #000 100%)` }}>
                          <div style={{ fontSize: '4rem', filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.2))' }}>{nft.icon}</div>
                          {nft.owner && (
                            <div style={{ 
                              position: 'absolute', top: '10px', left: '10px', 
                              background: 'rgba(0,0,0,0.7)', padding: '3px 10px', 
                              borderRadius: '100px', fontSize: '0.6rem', 
                              border: '1px solid rgba(255,255,255,0.2)', color: '#fff' 
                            }}>
                              {isOwner ? "YOU OWN THIS" : `HELD BY ${formatAddress(nft.owner, 4, 3)}`}
                            </div>
                          )}
                          <div className="nft-badge" style={{ background: 'var(--primary)', color: '#000', fontWeight: 800 }}>TKN-{nft.id.toString().padStart(4, '0')}</div>
                        </div>
                        <div style={{ padding: '1.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#fff' }}>{nft.name}</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>${nft.priceUSD}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      case 'terminal_logs':
        return (
          <div className="card card--diag terminal-panel">
            <div className="card-tag">Terminal Diagnostics</div>
            <div className="card-body console-container">
              <div className="console">
                {logs.map((l, i) => (
                  <div key={i} className={`console-line console-line--${l.type}`}>
                    <span className="console-ts">[{l.ts}]</span>{l.msg}
                  </div>
                ))}
                <div ref={logEnd} />
              </div>
            </div>
            <button className="btn btn--danger" style={{ marginTop: '1rem', fontSize: '0.65rem', alignSelf: 'flex-start' }} onClick={() => setLogs([])}>Clear Console</button>
          </div>
        );
      default: return null;
    }
  };

  const handleGetStarted = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Ensure we zoom from the hero
    setIsZooming(true);
    setTimeout(() => {
      setIsLanding(false);
    }, 2200);
  };

  const services = [
    { title: 'GLOBAL PAYMENTS', desc: 'Secure, lightning-fast XLM transfers across the Stellar ledger with real-time verification.' },
    { title: 'BATCH COMMAND', desc: 'Execute complex multi-recipient payment scripts in a single operation with per-target status.' },
    { title: 'SOROBAN PROTOCOLS', desc: 'Engage with smart-contract-governed relief funds and community donation systems.' },
    { title: 'NETWORK INSIGHTS', desc: 'Deep-dive ledger analytics, account history, and real-time network whale tracking.' },
    { title: 'TACTICAL CALCULATOR', desc: 'Built-in precision tools for splitting bills and calculating resource distribution.' },
    { title: 'SECURE UPLINK', desc: 'Advanced multi-wallet integration supporting Freighter, Hana, and Rabe identity kits.' },
  ];

  if (isLanding) {
    return (
      <div className={`landing-viewport ${isZooming ? 'zoom-active' : ''}`}>
        <div className="zoom-fade-overlay" />
        <div className="landing-wrapper">
          <video 
            className="landing-bg-video" 
            autoPlay 
            muted 
            loop 
            playsInline
            src="/img/vidbg.mov"
          />
          
          <section className="landing-section hero-section">
            <div className="landing-content cinemax-layout">
              <div className="hero-upper-zone">
                <div className="hero-text-pane">
                  <h1 className="hero-title" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    COMMAND THE <br />
                    <span style={{ color: '#fff' }}>STELLAR NETWORK</span>
                  </h1>
                  <p className="hero-subtitle" style={{ color: '#888', fontFamily: 'Inter, system-ui, sans-serif' }}>Secure, lightning-fast, global terminal uplink.</p>
                  <button className="btn" onClick={handleGetStarted} style={{ padding: '0.85rem 1.5rem', borderRadius: '8px', width: 'fit-content' }}>
                    GET STARTED <span className="arrow">→</span>
                  </button>
                </div>

                <div className="hero-visual-pane">
                  <div className="pc-container">
                    <img src="/img/pc.png" alt="Terminal" className="pc-image" style={{ filter: 'grayscale(1) contrast(1.1) brightness(0.9)', animation: 'rotate3d 8s ease-in-out infinite' }} />
                  </div>
                </div>
              </div>

              <div className="hero-lower-zone">
                <div className="feature-row">
                  {services.map((s, i) => (
                    <div key={i} className="feature-item card" style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(10,10,10,0.8)' }}>
                      <h3 className="feature-title" style={{ fontSize: '0.85rem', color: '#fff', marginBottom: '0.5rem' }}>{s.title}</h3>
                      <p className="feature-desc" style={{ fontSize: '0.72rem', color: '#888', margin: 0 }}>{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <AppFooter />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell enter">
      <div className="bg-layer">
        <div className="bg-3d">
          <Spline scene="https://prod.spline.design/hofxv-IBnIcq38B2/scene.splinecode" />
        </div>
        <div className="bg-vignette" style={{ background: 'radial-gradient(circle at center, transparent 0%, #000 100%)' }} />
      </div>
      
      <div className="app-container">
        <header className="site-header" style={{ padding: '1rem 0' }}>
          <div className="header-top" style={{ alignItems: 'center' }}>
            <div className="header-brand">
              <div className="header-brand-row">
                <img src={logoImg} alt="Stellar Management Hub Logo" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px' }} />
                <div><h1 className="site-title" style={{ fontSize: '2.2rem', marginBottom: '4px', letterSpacing: '1px' }}>STELLAR NETWORK</h1><h1 className="site-title" style={{ fontSize: '0.9rem', opacity: 0.8, fontWeight: 500, letterSpacing: '2px', color: 'var(--primary)' }}>MANAGEMENT INTERFACE V2.1</h1></div>
              </div>
            </div>
            <div className="header-badges" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 1rem', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className={`dot ${address ? 'dot--on' : ''}`} style={{ marginRight: '0.5rem', width: '8px', height: '8px' }} />
                {address ? (
                  <span style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>CONNECTED: {formatAddress(address, 6, 4)}</span>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>SYSTEM OFFLINE</span>
                )}
              </div>
              <span className="badge badge--net" style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem' }}>Testnet</span>
              <div className="notification-wrapper" onClick={() => { setActiveTab('events'); setHasAlerts(false); }} title="VIEW SYSTEM EVENTS">
                <span className="notification-bell" style={{ fontSize: '1.2rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                </span>
                {hasAlerts && <div className="notification-dot" />}
              </div>
              
              <button 
                className="hamburger-btn" 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle Menu"
              >
                <div className={`ham-line ${isMenuOpen ? 'ham-line--open' : ''}`} />
                <div className={`ham-line ${isMenuOpen ? 'ham-line--open' : ''}`} />
                <div className={`ham-line ${isMenuOpen ? 'ham-line--open' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        <main className="survivor-hub">
          <div className="nav-container">
            <nav className={`nav-top-bar ${isMenuOpen ? 'nav-top-bar--open' : ''}`}>
              <div className={`nav-item ${activeTab === 'terminal' ? 'nav-item--active' : ''}`} onClick={() => { setActiveTab('terminal'); setIsMenuOpen(false); }}>Payments</div>
              <div className={`nav-item ${activeTab === 'multipay' ? 'nav-item--active' : ''}`} onClick={() => { setActiveTab('multipay'); setIsMenuOpen(false); }}>Batch Transfer</div>
              <div className={`nav-item ${activeTab === 'calculator' ? 'nav-item--active' : ''}`} onClick={() => { setActiveTab('calculator'); setIsMenuOpen(false); }}>Split Bill</div>
              <div className={`nav-item ${activeTab === 'tracker' ? 'nav-item--active' : ''}`} onClick={() => { setActiveTab('tracker'); setIsMenuOpen(false); }}>History</div>
              <div className={`nav-item ${activeTab === 'events' ? 'nav-item--active' : ''}`} onClick={() => { setActiveTab('events'); setIsMenuOpen(false); }}>System Events</div>
              {address && adminAddress && address === adminAddress && (
                <div className={`nav-item nav-item--diag ${activeTab === 'diagnostics' ? 'nav-item--active' : ''}`} onClick={() => { setActiveTab('diagnostics'); setIsMenuOpen(false); }}>Diagnostics</div>
              )}
              <div 
                className={`nav-item shop-nav-btn ${activeTab === 'shop' ? 'nav-item--active' : ''}`} 
                onClick={() => { setActiveTab('shop'); setIsMenuOpen(false); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                SHOP
              </div>
            </nav>
          </div>

          <div className="bento-grid">
            {/* ── LEFT COLUMN: Telemetry & Actions ── */}
            <div className="flex-col" style={{ gap: '1rem' }}>
              {address && (
                <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Network Balance</div>
                  {isSyncing ? (
                    <div className="skeleton-pulse" style={{ height: '35px', width: '120px', margin: '0 auto', borderRadius: '4px' }} />
                  ) : (
                    <div style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                      {parseFloat(balance) >= 100000 ? '99999+' : parseFloat(balance).toLocaleString(undefined, { maximumFractionDigits: 0 })} <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>XLM</span>
                    </div>
                  )}
                  {/* Live Graph Mockup */}
                  <div style={{ marginTop: '1rem', height: '40px', width: '100%', position: 'relative' }}>
                    <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                      <defs>
                        <linearGradient id="gradient-graph" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="var(--success)" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,30 L0,20 Q10,10 20,15 T40,25 T60,10 T80,18 T100,5 L100,30 Z" fill="url(#gradient-graph)" />
                      <path d="M0,20 Q10,10 20,15 T40,25 T60,10 T80,18 T100,5" fill="none" stroke="var(--success)" strokeWidth="2" />
                    </svg>
                    <div style={{ position: 'absolute', top: '-5px', right: '0', fontSize: '0.65rem', color: 'var(--success)', fontWeight: 600 }}>+2.4% LIVE</div>
                  </div>
                </div>
              )}

              {address && (
                <div className="card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', marginBottom: '1rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Session Control</div>
                  <button className="btn btn--danger btn--full" onClick={handleDisconnect}>Sever Uplink</button>
                </div>
              )}

               <div className="card" style={{ padding: '1rem' }}>
                 <div style={{ fontSize: '0.75rem', marginBottom: '1rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Quick Protocols</div>
                 <div className="flex-col" style={{ gap: '0.75rem' }}>
                   
                   <div 
                     onClick={() => setActiveTab('fund')}
                     style={{ 
                       display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1rem', 
                       background: 'rgba(255,255,255,0.03)', borderRadius: '12px', cursor: 'pointer', 
                       border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s'
                     }}
                     onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = '#fff'; }}
                     onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                   >
                     <img src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&q=80" alt="Relief Fund" style={{ width: '100%', height: '100px', borderRadius: '8px', objectFit: 'cover' }} />
                     <div style={{ textAlign: 'center' }}>
                       <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', marginBottom: '0px', letterSpacing: '1.5px' }}>POVERTY RELIEF FUND</div>
                     </div>
                   </div>

                   <button className="btn btn--ghost btn--full" onClick={() => setActiveTab('faucet')}>Testnet Faucet</button>
                   <button className="btn btn--ghost btn--full" onClick={() => setActiveTab('rank')}>Network Leaderboards</button>
                   <button className="btn btn--ghost btn--full" onClick={() => setActiveTab('terminal_logs')}>Terminal</button>
                 </div>
              </div>
            </div>

            {/* ── CENTER COLUMN: Primary Interface ── */}
            <div className="flex-col" style={{ gap: '1.5rem' }}>
              {renderContent()}
            </div>
          </div>
        </main>

        <AppFooter />
      </div>

      {displayPrompt && (
        <div className="modal-overlay" style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }} onClick={() => { if (!isLoginRequired) setShowConnectPrompt(false); }}>
          <div 
            className="modal-content prompt-modal-layout" 
            style={{ 
              width: 800, 
              maxWidth: '95%', 
              padding: 0, 
              overflow: 'hidden', 
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
              background: '#0a0a0a'
            }} 
            onClick={e => e.stopPropagation()}
          >
            {/* LEFT 40% - IMAGE */}
            <div className="prompt-modal-left" style={{ background: '#000', position: 'relative', overflow: 'hidden' }}>
              <img 
                src="/img/person.jpg" 
                alt="Professional Profile" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  filter: 'brightness(0.9) contrast(1.05)'
                }} 
              />
            </div>
            
            {/* RIGHT 60% - CONTENT */}
            <div className="prompt-modal-right" style={{ 
              position: 'relative', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center',
              padding: '4rem 3rem',
              background: '#0a0a0a'
            }}>
              {!isLoginRequired && (
                <button 
                  onClick={() => setShowConnectPrompt(false)} 
                  style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#666', fontSize: '1.2rem', cursor: 'pointer', zIndex: 10, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = '#fff'}
                  onMouseLeave={e => e.target.style.color = '#666'}
                >
                  ✕
                </button>
              )}
              
              <div style={{ zIndex: 2 }}>
                <h2 style={{ 
                  fontSize: '1.8rem', 
                  fontFamily: 'Inter, system-ui, sans-serif', 
                  fontWeight: 600,
                  marginBottom: '0.75rem', 
                  color: '#ffffff', 
                  letterSpacing: '-0.5px'
                }}>
                  Sign in to Terminal
                </h2>
                
                <p style={{ 
                  fontSize: '0.95rem', 
                  color: '#888', 
                  lineHeight: 1.6, 
                  marginBottom: '2.5rem', 
                  fontFamily: 'Inter, system-ui, sans-serif'
                }}>
                  Welcome back. Please connect your verified Web3 wallet to access your dashboard and continue.
                </p>
                
                <button 
                  style={{ 
                    width: '100%', 
                    padding: '0.85rem 1rem', 
                    fontSize: '0.95rem', 
                    fontWeight: 500,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    color: '#000',
                    background: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={e => { e.target.style.background = '#e0e0e0'; e.target.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.target.style.background = '#fff'; e.target.style.transform = 'translateY(0)'; }}
                  onClick={() => {
                    setShowConnectPrompt(false);
                    setShowWalletModal(true);
                  }}
                >
                  Connect Wallet <span style={{ marginLeft: '4px' }}>→</span>
                </button>
                
                <div style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#555', textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Secured by Stellar Network
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWalletModal && (
        <div className="modal-overlay" onClick={() => { if (!isLoginRequired) setShowWalletModal(false); }}>
          <div className="modal-content card" onClick={e => e.stopPropagation()}>
            <div className="card-corner-br" />
            <div className="modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: '1.2rem', color: '#fff' }}>Select Wallet</div>
              {!isLoginRequired && (
                <button 
                  style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '1.2rem', cursor: 'pointer', transition: 'color 0.2s' }} 
                  onClick={() => setShowWalletModal(false)}
                  onMouseEnter={e => e.target.style.color = '#fff'}
                  onMouseLeave={e => e.target.style.color = '#666'}
                >
                  ✕
                </button>
              )}
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { id: ALLOWED_WALLETS.FREIGHTER, name: 'Freighter', desc: 'Standard Stellar Wallet', url: 'https://freighter.app' },
                  { id: ALLOWED_WALLETS.ALBEDO, name: 'Albedo', desc: 'Web-based Secure Protocol', url: 'https://albedo.link' },
                  { id: ALLOWED_WALLETS.XBULL, name: 'xBull', desc: 'Alternative Gateway', url: 'https://xbull.app' },
                  { id: ALLOWED_WALLETS.RABE, name: 'Rabe', desc: 'Simplified Extension', url: 'https://rabe.app' },
                  { id: ALLOWED_WALLETS.HANA, name: 'Hana', desc: 'Soroban Optimized', url: 'https://hanawallet.app' }
                ].map(wallet => (
                  <div 
                    key={wallet.id}
                    onClick={() => connectToSpecificWallet(wallet.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <img 
                      src={`https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${wallet.url}&size=64`} 
                      alt={wallet.name} 
                      style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#fff' }} 
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>{wallet.name}</div>
                      <div style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.2rem' }}>{wallet.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedNft && (
        <div className="modal-overlay" onClick={() => setSelectedNft(null)}>
          <div 
            className="modal-content card" 
            style={{ width: 600, padding: 0, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ 
                height: '300px', 
                background: `radial-gradient(circle at center, ${selectedNft.color}33 0%, #000 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                <div style={{ fontSize: '8rem', filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.3))' }}>{selectedNft.icon}</div>
                <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
                  <button onClick={() => setSelectedNft(null)} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%' }}>✕</button>
                </div>
                <div style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem' }}>
                   <div style={{ background: 'var(--primary)', color: '#000', padding: '4px 12px', borderRadius: '4px', fontWeight: 800, fontSize: '0.8rem' }}>TKN-{selectedNft.id.toString().padStart(4, '0')}</div>
                </div>
                {selectedNft.owner && (
                   <div style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', background: 'rgba(0,0,0,0.7)', padding: '6px 12px', borderRadius: '100px', fontSize: '0.7rem', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                     CURRENT OWNER: {formatAddress(selectedNft.owner)}
                   </div>
                )}
              </div>
              
              <div style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>{selectedNft.name}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Strategic Digital Asset • Soroban Token Standard</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>{selectedNft.priceUSD * 6} XLM</div>
                    <div style={{ fontSize: '0.85rem', color: '#555' }}>VALUATION: ${selectedNft.priceUSD} USD</div>
                  </div>
                </div>

                <div className="sep" style={{ margin: '1.5rem 0' }} />

                <div style={{ marginBottom: '2rem' }}>
                  <p className="field-label" style={{ marginBottom: '0.75rem' }}>Ownership History</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: '#fff' }}>GENESIS MINT</span>
                      <span style={{ color: 'var(--text-muted)' }}>{formatAddress(SHOP_CONTRACT_ID)}</span>
                    </div>
                    {selectedNft.owner && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--primary-faint)' }}>
                        <span style={{ color: 'var(--primary)' }}>CURRENT HOLDER</span>
                        <span style={{ color: '#fff' }}>{formatAddress(selectedNft.owner)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  {selectedNft.owner === address ? (
                    <button className="btn btn--danger btn--full" onClick={() => { handleSellNft(selectedNft.id); setSelectedNft(null); }} disabled={loading}>LIQUIDATE ASSET (SELL)</button>
                  ) : selectedNft.owner && selectedNft.owner !== address ? (
                    <button className="btn btn--full" style={{ opacity: 0.3, cursor: 'not-allowed' }} disabled>PRIVATE ASSET</button>
                  ) : (
                    <button className="btn btn--full" style={{ background: '#fff', color: '#000', fontWeight: 700 }} onClick={() => { handleBuyNft(selectedNft.id); setSelectedNft(null); }} disabled={loading}>
                      {loading ? <span className="spinner" /> : 'CONFIRM ACQUISITION'}
                    </button>
                  )}
                  <button className="btn btn--ghost" onClick={() => setSelectedNft(null)}>CANCEL</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WrappedApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default WrappedApp;
