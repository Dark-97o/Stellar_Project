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
  ErrorTypes
} from './utils/stellar';
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
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletType, setWalletType] = useState(null);

  // Real Data States
  const [history, setHistory] = useState([]);
  const [fundTotal, setFundTotal] = useState(0);
  const [donors, setDonors] = useState([]);
  const [whales, setWhales] = useState([]);
  const [hasAlerts, setHasAlerts] = useState(true); // Tactical alert simulation
  const [fundGoal, setFundGoal] = useState(10000);

  // New Feature States
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
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
    } catch (e) {
      console.warn("Sync Error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  /* ── LEVEL 2 WALLET ACTIONS ───────────────────────────────── */
  const handleConnect = () => {
    setShowWalletModal(true);
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
                  <p className="field-label" style={{ marginBottom: '1rem' }}>Configure recipients then execute — each payment broadcasts independently with live status.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.2rem', maxHeight: '340px', overflowY: 'auto' }}>
                    {multiRecipients.map((r, i) => {
                      const status = multiStatuses[i];
                      return (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 36px 80px', gap: '0.5rem', alignItems: 'center' }}>
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
                <p className="field-label">CONTRACT-MANAGED DISTRIBUTION</p>
                <div className="progress-meter">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                  <div className="progress-label">{progress.toFixed(1)}% SECURED</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <div><span className="field-label">Global Pool</span><br /><span className="balance-num" style={{ fontSize: '1.5rem' }}>{fundTotal.toLocaleString()}</span> XLM</div>
                  <div style={{ textAlign: 'right' }}><span className="field-label">Target Goal</span><br /><span className="balance-num" style={{ fontSize: '1.5rem', opacity: 0.5 }}>{fundGoal.toLocaleString()}</span> XLM</div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn--full" onClick={() => handleDonate(10)} disabled={loading || !address}>
                    DONATE 10
                  </button>
                  <button className="btn btn--full" onClick={() => handleDonate(100)} disabled={loading || !address}>
                    DONATE 100
                  </button>
                </div>
                {donationTxHash && (
                  <div className="tx-result" style={{ marginTop: '1.5rem' }}>
                    <div className="sep" />
                    <p className="tx-hash" style={{ fontSize: '0.65rem' }}>STATUS: SYNCED | HASH: {donationTxHash.substring(0,20)}...</p>
                    <button
                      className="btn btn--ghost btn--full"
                      onClick={() => window.open(getExplorerUrl(donationTxHash), '_blank')}
                    >
                      VIEW TRANSACTION ON STELLAR EXPERT ↗
                    </button>
                  </div>
                )}
                <div className="sep" style={{ margin: '1.5rem 0' }} />
                <p className="field-label" style={{ marginBottom: '1rem' }}>Latest Smart Contract Events</p>
                <div className="leaderboard-list">
                  {donors.length === 0 && (
                    <div style={{ padding: '1rem', opacity: 0.5, fontSize: '0.75rem', textAlign: 'center' }}>
                      NO CONTRACT EVENTS DETECTED
                    </div>
                  )}
                  {donors.map((d, i) => (
                    <div key={i} className="leaderboard-item" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '3px',
                        background: d.type === 'WITHDRAWAL' ? 'rgba(255,80,80,0.15)' : 'rgba(80,255,150,0.12)',
                        color: d.type === 'WITHDRAWAL' ? '#ff6b6b' : '#4ade80',
                        border: `1px solid ${d.type === 'WITHDRAWAL' ? '#ff6b6b44' : '#4ade8044'}`,
                        flexShrink: 0
                      }}>
                        {d.type || 'EVENT'}
                      </span>
                      <span className="leaderboard-addr" style={{ fontSize: '0.68rem', flex: 1 }}>{d.addr}</span>
                      <span className="leaderboard-amt" style={{ fontSize: '0.85rem', flexShrink: 0 }}>
                        {d.type === 'WITHDRAWAL' ? '-' : '+'}{d.amt} XLM
                      </span>
                      {d.txHash && (
                        <button
                          onClick={() => window.open(getExplorerUrl(d.txHash), '_blank')}
                          style={{
                            background: 'none',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: 'rgba(255,255,255,0.6)',
                            cursor: 'pointer',
                            fontSize: '0.6rem',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '3px',
                            flexShrink: 0
                          }}
                          title={d.txHash}
                        >
                          TX↗
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
              <div className="card-corner-br" />
              <div className="card-tag">✦ Network Stakeholders</div>
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
              <div className="card-tag" style={{ color: 'var(--red)', borderLeftColor: 'var(--red)' }}>⚠ Admin Security Tests</div>
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
                </div>

              </div>
            </div>
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
                  <h1 className="hero-title">
                    COMMAND THE <br />
                    <span className="text-cyan">STELLAR NETWORK</span>
                  </h1>
                  <p className="hero-subtitle">Secure, lighting-fast, global terminal uplink.</p>
                  <button className="pill-btn" onClick={handleGetStarted}>
                    GET STARTED <span className="arrow">→</span>
                  </button>
                </div>

                <div className="hero-visual-pane">
                  <div className="pc-container">
                    <div className="quarter-arc" />
                    <img src="/img/pc.png" alt="Terminal" className="pc-image" />
                  </div>
                </div>
              </div>

              <div className="hero-lower-zone">
                <div className="feature-row">
                  {services.map((s, i) => (
                    <div key={i} className="feature-item card">
                      <div className="card-scanner" />
                      <h3 className="feature-title">{s.title}</h3>
                      <p className="feature-desc">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <footer className="site-footer" style={{ padding: '2rem 4rem', background: '#000', borderTop: '1px solid var(--border)' }}>
            <div className="footer-content">
              <div>© 2026 VAULT-TEC INDUSTRIES <span className="dot-sep">•</span> STELLAR MANAGEMENT HUB</div>
              <div className="tech-stack">
                <span>SOROBAN</span>
                <span className="dot-sep">•</span>
                <span>REACT</span>
                <span className="dot-sep">•</span>
                <span>SPLINE 3D</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell enter">
      <div className="bg-layer">
        <div className="bg-3d">
          <Spline scene="https://prod.spline.design/To1j6z2qfMCDNQE1/scene.splinecode" />
        </div>
        <div className="bg-gradients" />
        <div className="bg-vignette" />
      </div>
      
      <div className="app-container">
        <header className="site-header">
          <div className="header-top">
            <div className="header-brand">
              <div className="header-brand-row">
                <img src={logoImg} alt="Stellar Management Hub Logo" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '6px' }} />
                <div><h1 className="site-title">STELLAR NETWORK</h1><h1 className="site-title" style={{ fontSize: '1.1rem', opacity: 0.9, fontWeight: 500, letterSpacing: '2px', color: 'var(--primary)' }}>MANAGEMENT INTERFACE V2.1</h1></div>
              </div>
            </div>
            <div className="header-badges">
              <span className="badge badge--net">Testnet</span>
              <span className="badge badge--warn">Restricted</span>
              <div className="notification-wrapper" onClick={() => { setActiveTab('events'); setHasAlerts(false); }} title="VIEW SYSTEM EVENTS">
                <span className="notification-bell">🔔</span>
                {hasAlerts && <div className="notification-dot" />}
              </div>
            </div>
          </div>
          <div className="header-status">
            <span className={`dot ${address ? 'dot--on' : ''}`} />
              {address ? (
                <>
                  <span style={{ color: '#23d18b', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '1px' }}>OFFICIAL UPLINK ACTIVE: {formatAddress(address, 6, 4)}</span>
                </>
              ) : <span style={{ color: '#ff5f5f', fontWeight: 700, letterSpacing: '1px' }}>SYSTEM OFFLINE</span>}
          </div>
        </header>

        <main className="survivor-hub">
          <nav className="nav-top-bar">
            <div className={`nav-item ${activeTab === 'terminal' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('terminal')}>Payments</div>
            <div className={`nav-item ${activeTab === 'multipay' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('multipay')}>Batch Transfer</div>
            <div className={`nav-item ${activeTab === 'calculator' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('calculator')}>Split Bill</div>
            <div className={`nav-item ${activeTab === 'tracker' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('tracker')}>History</div>
            <div className={`nav-item ${activeTab === 'events' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('events')}>System Events</div>
            {address && adminAddress && address === adminAddress && (
              <div className={`nav-item nav-item--diag ${activeTab === 'diagnostics' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('diagnostics')}>⚠ DIAGNOSTICS</div>
            )}
          </nav>

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
                </div>
              )}

              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', marginBottom: '1rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Session Control</div>
                {!address ? (
                  <button className="btn btn--full" onClick={handleConnect}>Link Operator Wallet</button>
                ) : (
                  <button className="btn btn--danger btn--full" onClick={handleDisconnect}>Sever Uplink</button>
                )}
              </div>

              <div className="card" style={{ padding: '1rem' }}>
                 <div style={{ fontSize: '0.75rem', marginBottom: '1rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Quick Protocols</div>
                 <div className="flex-col" style={{ gap: '0.5rem' }}>
                   <button className="btn btn--ghost btn--full" onClick={() => setActiveTab('faucet')}>Testnet Faucet</button>
                   <button className="btn btn--ghost btn--full" onClick={() => setActiveTab('fund')}>Soroban Relief Fund</button>
                 </div>
              </div>
            </div>

            {/* ── CENTER COLUMN: Primary Interface ── */}
            <div className="flex-col" style={{ gap: '1.5rem' }}>
              {renderContent()}
            </div>

            {/* ── RIGHT COLUMN: Diagnostics ── */}
            <div className="card card--diag">
              <div className="card-tag">Terminal Diagnostics</div>
              <div className="card-body">
                <div className="console">
                  {logs.map((l, i) => (
                    <div key={i} className={`console-line console-line--${l.type}`}>
                      <span className="console-ts">[{l.ts}]</span>{l.msg}
                    </div>
                  ))}
                  <div ref={logEnd} />
                </div>
              </div>
              <button className="btn btn--danger" style={{ marginTop: '1rem', fontSize: '0.65rem' }} onClick={() => setLogs([])}>Clear Console</button>
            </div>
          </div>
        </main>

        <footer className="site-footer">
          <div className="footer-content">
            <span className="copyright">© 2024 STELLAR NETWORK OPERATIONS. ALL RIGHTS RESERVED.</span>
            <div className="tech-stack">
              <span>STELLAR</span>
              <span className="dot-sep">•</span>
              <span>SOROBAN</span>
              <span className="dot-sep">•</span>
              <span>REACT</span>
              <span className="dot-sep">•</span>
              <span>SPLINE 3D</span>
            </div>
          </div>
        </footer>
      </div>

      {showWalletModal && (
        <div className="modal-overlay" onClick={() => setShowWalletModal(false)}>
          <div className="modal-content card" onClick={e => e.stopPropagation()}>
            <div className="card-corner-br" />
            <div className="modal-header">
              <div className="card-tag" style={{ margin: 0 }}>📡 Select Uplink Protocol</div>
              <button className="btn btn--ghost" style={{ padding: '0.2rem 0.5rem', minWidth: 'auto' }} onClick={() => setShowWalletModal(false)}>X</button>
            </div>
            <div className="modal-body">
              <div className="wallet-grid">
                <div className="wallet-option" onClick={() => connectToSpecificWallet(ALLOWED_WALLETS.FREIGHTER)}>
                  <div className="wallet-icon">F</div>
                  <div className="wallet-info">
                    <div className="wallet-name">Freighter</div>
                    <div className="wallet-desc">Standard Survivor Terminal Uplink</div>
                  </div>
                </div>
                <div className="wallet-option" onClick={() => connectToSpecificWallet(ALLOWED_WALLETS.ALBEDO)}>
                  <div className="wallet-icon">A</div>
                  <div className="wallet-info">
                    <div className="wallet-name">Albedo</div>
                    <div className="wallet-desc">Web-based secure protocol</div>
                  </div>
                </div>
                <div className="wallet-option" onClick={() => connectToSpecificWallet(ALLOWED_WALLETS.XBULL)}>
                  <div className="wallet-icon">B</div>
                  <div className="wallet-info">
                    <div className="wallet-name">xBull</div>
                    <div className="wallet-desc">Alternative hardened terminal</div>
                  </div>
                </div>
                <div className="wallet-option" onClick={() => connectToSpecificWallet(ALLOWED_WALLETS.RABE)}>
                  <div className="wallet-icon">R</div>
                  <div className="wallet-info">
                    <div className="wallet-name">Rabe</div>
                    <div className="wallet-desc">Simplified Survivor Uplink</div>
                  </div>
                </div>
                <div className="wallet-option" onClick={() => connectToSpecificWallet(ALLOWED_WALLETS.HANA)}>
                  <div className="wallet-icon">H</div>
                  <div className="wallet-info">
                    <div className="wallet-name">Hana</div>
                    <div className="wallet-desc">Soroban Optimized Gateway</div>
                  </div>
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
