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
  fundFromFaucet,
  sendMultiPayment,
  ErrorTypes
} from './utils/stellar';
import { ALLOWED_WALLETS } from './utils/kit';
import Spline from '@splinetool/react-spline';
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
  const [logs, setLogs] = useState([
    { msg: 'SURVIVOR HUB v2.1 ONLINE. MULTI-UPLINK ESTABLISHED.', type: 'info', ts: new Date().toLocaleTimeString() },
  ]);

  // View States
  const [dest, setDest] = useState('');
  const [amt, setAmt] = useState('');
  const [txHash, setTxHash] = useState('');
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
  const [splitMode, setSplitMode] = useState('single'); // 'single' or 'multi'
  const [calcTotal, setCalcTotal] = useState('');
  const [calcN, setCalcN] = useState(2);
  const [multiRecipients, setMultiRecipients] = useState([{ dest: '', amt: '' }]);

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
    const interval = setInterval(loadWhales, 60000);
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
    try {
      const b = await getXlmBalance(addr);
      setBalance(b === "UPLINK_NOT_INITIALIZED" ? "0.00" : b);
      
      const hist = await fetchAccountHistory(addr);
      setHistory(hist);

      const relief = await fetchReliefFundStats();
      setFundTotal(relief.total);
      setFundGoal(relief.goal || 10000);
      setDonors(relief.donors);

      const netWhales = await fetchNetworkWhales(log);
      setWhales(netWhales);
    } catch (e) {
      console.warn("Sync Error:", e);
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
        log(`DONATION FINALIZED VIA CONTRACT. HASH: ${res.hash.substring(0,16)}...`, "ok");
      } else {
        log(`DONATION FINALIZED VIA CONTRACT.`, "ok");
      }
      
      await syncAllData();
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
              <div className="card-corner-br" />
              <div className="card-tag">📡 PAYMENTS GATEWAY</div>
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
                    {loading ? <span className="spinner" /> : 'EXECUTE UPLINK'}
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
        case 'calculator':
          return (
            <div className="enter">
              <div className="card">
                <div className="card-corner-br" />
                <div className="card-tag">➗ Split Bill Calculator</div>
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
                <div className="card-corner-br" />
                <div className="card-tag">⛲ Resource Faucet</div>
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
                <div className="card-corner-br" />
                <div className="card-tag">▣ Protocol Activity Feed</div>
                <div className="card-body">
                  <p className="field-label" style={{ marginBottom: '1.5rem' }}>LIVE SMART CONTRACT NOTIFICATIONS</p>
                  {donors.length === 0 ? (
                    <p className="field-value--empty" style={{ textAlign: 'center', padding: '2rem' }}>AWAITING PROTOCOL EVENTS...</p>
                  ) : (
                    <div className="event-feed">
                      {donors.map((event, i) => (
                        <div key={i} className="event-item enter" style={{ 
                          padding: '1rem', 
                          borderLeft: '2px solid var(--yellow)', 
                          background: 'rgba(255,195,0,0.03)',
                          marginBottom: '0.75rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--yellow)', fontSize: '0.8rem', fontWeight: 'bold' }}>✦ TRANSFER_RECOGNIZED</span>
                            <span className="console-ts">{new Date().toLocaleDateString()}</span>
                          </div>
                          <p className="field-value" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                            Survivor <span style={{ color: 'var(--yellow)' }}>{event.addr}</span> contributed <span style={{ color: 'var(--yellow)' }}>{event.amt} XLM</span> to the Global Pool.
                          </p>
                        </div>
                      ))}
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
              <div className="card-corner-br" />
              <div className="card-tag">▣ Recent Ledger Activity</div>
              <div className="card-body">
                {history.length === 0 ? (
                  <p className="field-value--empty" style={{ textAlign: 'center', padding: '2rem' }}>AWAITING DATA SYNC...</p>
                ) : (
                  <table className="tracker-table">
                    <thead>
                      <tr><th>Identifier</th><th>Volume</th><th>Protocol</th></tr>
                    </thead>
                    <tbody>
                      {history.map(item => (
                        <tr key={item.id}>
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
              <div className="card-corner-br" />
              <div className="card-tag">▣ Soroban Relief Protocol</div>
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
                {txHash && activeTab === 'fund' && (
                  <div className="tx-result" style={{ marginTop: '1.5rem' }}>
                    <div className="sep" />
                    <p className="tx-hash" style={{ fontSize: '0.65rem' }}>STATUS: SYNCED | HASH: {txHash.substring(0,16)}...</p>
                    <button className="btn btn--ghost btn--full" onClick={() => window.open(getExplorerUrl(txHash), '_blank')}>VERIFY CONTRACT CALL ↗</button>
                  </div>
                )}
                <div className="sep" style={{ margin: '1.5rem 0' }} />
                <p className="field-label" style={{ marginBottom: '1rem' }}>Latest Smart Contract Events</p>
                <div className="leaderboard-list">
                  {donors.map((d, i) => (
                    <div key={i} className="leaderboard-item" style={{ padding: '0.6rem 1rem' }}>
                      <span className="leaderboard-rank">#</span>
                      <span className="leaderboard-addr" style={{ fontSize: '0.7rem' }}>{d.addr}</span>
                      <span className="leaderboard-amt" style={{ fontSize: '0.9rem' }}>{d.amt} XLM</span>
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
      default: return null;
    }
  };

  return (
    <div className="app-shell">
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
                <svg className="header-logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="48" stroke="var(--cyan)" strokeWidth="2" fill="none" opacity="0.3"/>
                  <path d="M74.4 32.8L25.7 55.4C24.3 56 24.3 58 25.7 58.6L33.5 62L74.4 43.2V32.8Z" fill="var(--cyan)"/>
                  <path d="M74.4 43.2L33.5 62L36.8 63.5L74.4 46V43.2Z" fill="var(--cyan)" opacity="0.5"/>
                  <path d="M74.4 50.6L25.7 73.2C24.3 73.8 24.3 75.8 25.7 76.4L33.5 79.8L74.4 61V50.6Z" fill="var(--cyan)"/>
                  <path d="M74.4 61L33.5 79.8L36.8 81.3L74.4 63.8V61Z" fill="var(--cyan)" opacity="0.5"/>
                </svg>
                <div><h1 className="site-title">STELLAR NETWORK</h1><h1 className="site-title" style={{ fontSize: '1.1rem', opacity: 0.7, fontWeight: 500, letterSpacing: '2px' }}>MANAGEMENT INTERFACE V2.1</h1></div>
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
          <nav className="nav-sidebar">
            {address && (
              <div className="balance-pill balance-pill--large" style={{ marginBottom: '1rem', width: '100%', justifyContent: 'center' }}>
                <span>{parseFloat(balance).toLocaleString()} XLM</span>
              </div>
            )}
            <div className={`nav-item ${activeTab === 'terminal' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('terminal')}>PAYMENTS</div>
            <div className={`nav-item ${activeTab === 'calculator' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('calculator')}>SPLIT BILL</div>
            <div className={`nav-item ${activeTab === 'tracker' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('tracker')}>HISTORY</div>
            
            <div className="sep" style={{ margin: '0.4rem 0' }} />
            
            <div className={`nav-item nav-item--green ${activeTab === 'rank' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('rank')}>LEADERBOARD</div>
            <div className={`nav-item nav-item--green ${activeTab === 'fund' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('fund')}>DONATE</div>
            <div className={`nav-item nav-item--green ${activeTab === 'faucet' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('faucet')}>FAUCET</div>

            <div className="mt-auto">
              <button className="btn btn--danger" style={{ width: '100%', fontSize: '0.55rem', padding: '0.4rem' }} onClick={() => setLogs([])}>Clear Logs</button>
              {!address ? (
                <button className="btn btn--full btn--pulse" onClick={handleConnect} style={{ marginTop: '1rem' }}>LINK OPERATOR</button>
              ) : (
                <button className="btn btn--danger btn--full" onClick={handleDisconnect} style={{ marginTop: '1rem' }}>SEVER UPLINK</button>
              )}
            </div>
          </nav>

          <section className="view-container">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', height: '100%' }}>
              <div className="flex-col" style={{ gap: '1.5rem' }}>
                {renderContent()}
              </div>
              <div className="card card--diag">
                <div className="card-corner-br" />
                <div className="card-tag">Diagnostics</div>
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
              </div>
            </div>
          </section>
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
