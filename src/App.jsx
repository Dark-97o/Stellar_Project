import { useState, useEffect, useRef, Component } from 'react';
import { 
  connectWallet, 
  getXlmBalance, 
  sendPayment, 
  getExplorerUrl, 
  fetchAccountHistory, 
  fetchReliefFundStats, 
  fetchNetworkWhales, 
  RELIEF_ADDR 
} from './utils/stellar';
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
  const [balance, setBalance] = useState('0.0000000');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('terminal');
  const [logs, setLogs] = useState([
    { msg: 'SURVIVOR HUB v2.0 ONLINE. UPLINK STANDBY.', type: 'info', ts: new Date().toLocaleTimeString() },
  ]);

  // View States
  const [dest, setDest] = useState('');
  const [amt, setAmt] = useState('');
  const [txHash, setTxHash] = useState('');

  // Real Data States
  const [history, setHistory] = useState([]);
  const [fundTotal, setFundTotal] = useState(0);
  const [donors, setDonors] = useState([]);
  const [whales, setWhales] = useState([]);
  const fundGoal = 10000;

  const logEnd = useRef(null);
  useEffect(() => { logEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const log = (msg, type = 'info') => {
    setLogs(p => [...p, { msg, type, ts: new Date().toLocaleTimeString() }]);
  };

  // Sync Interval
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
      setDonors(relief.donors);

      const netWhales = await fetchNetworkWhales();
      setWhales(netWhales);
    } catch (e) {
      console.warn("Sync Error:", e);
    }
  };

  /* ── WALLET ACTIONS ───────────────────────────────────────── */
  const handleConnect = async () => {
    setLoading(true);
    try {
      log('INITIATING SECURE UPLINK...', 'info');
      const key = await connectWallet();
      setAddress(key);
      log(`UPLINK OK → ${key.substring(0, 8)}...`, 'ok');
      await syncAllData(key);
    } catch (err) {
      log(`UPLINK FAILED → ${err.message}`, "err");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setAddress('');
    setBalance('0.0000000');
    setHistory([]);
    log('UPLINK SEVERED.', 'info');
  };

  /* ── FEATURE HANDLERS ────────────────────────────────────── */
  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTxHash('');
    try {
      const res = await sendPayment(address, dest, amt, (m, t) => log(m, t));
      setTxHash(res.hash);
      log("TRANSACTION LANDED ON LEDGER.", "ok");
      await syncAllData();
      setDest(''); setAmt('');
    } catch (err) {
      log(`TRANS_ERR: ${err.message}`, "err");
    } finally {
      setLoading(false);
    }
  };

  const handleDonate = async (amount = 50) => {
    if (!address) { log("UPLINK REQUIRED.", "err"); return; }
    setLoading(true);
    try {
      log(`INITIATING DONATION: ${amount} XLM...`, "info");
      const res = await sendPayment(address, RELIEF_ADDR, amount.toString(), (m, t) => log(m, t));
      log("DONATION SECURED. RELIEF FUND UPDATED.", "ok");
      await syncAllData();
    } catch (err) {
      log(`DONATE_ERR: ${err.message}`, "err");
    } finally {
      setLoading(false);
    }
  };

  /* ── VIEW RENDERING ───────────────────────────────────────── */
  const renderContent = () => {
    switch(activeTab) {
      case 'terminal':
        return (
          <div className="enter">
            <div className="card card--tall">
              <div className="card-corner-br" />
              <div className="card-tag">⬡ Payment Terminal</div>
              <div className="card-body">
                <form onSubmit={handleSend}>
                  <div className="input-group">
                    <label className="field-label">Recipient Identity</label>
                    <input className="input" placeholder="GA..." value={dest} onChange={e => setDest(e.target.value)} required />
                  </div>
                  <div className="input-group">
                    <label className="field-label">Resource Amount (XLM)</label>
                    <input className="input" type="number" placeholder="0.00" value={amt} onChange={e => setAmt(e.target.value)} required />
                  </div>
                  <button className="btn btn--full" type="submit" disabled={loading || !address}>
                    {loading ? <span className="spinner" /> : 'Execute Sequence'}
                  </button>
                </form>
                {txHash && (
                  <div className="tx-result">
                    <div className="sep" />
                    <p className="tx-hash">HASH: {txHash.substring(0,24)}...</p>
                    <button className="btn btn--ghost btn--full" onClick={() => window.open(getExplorerUrl(txHash), '_blank')}>EXPLORER UPLINK ↗</button>
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
              <div className="card-tag">◆ Payment Tracker (Last 5)</div>
              <div className="card-body">
                {history.length === 0 ? (
                  <p className="field-value--empty" style={{ textAlign: 'center', padding: '2rem' }}>NO RECENT DATA DETECTED ON LEDGER</p>
                ) : (
                  <table className="tracker-table">
                    <thead>
                      <tr><th>Identity</th><th>Amount</th><th>Link</th></tr>
                    </thead>
                    <tbody>
                      {history.map(item => (
                        <tr key={item.id}>
                          <td>{item.addr}</td>
                          <td style={{ color: 'var(--yellow)' }}>{item.amt}</td>
                          <td>
                            <a href={getExplorerUrl(item.hash)} target="_blank" rel="noreferrer" style={{ color: 'var(--orange)', textDecoration: 'none' }}>↗ VIEW</a>
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
              <div className="card-tag">▣ Relief Fund</div>
              <div className="card-body">
                <p className="field-label">Real-Time Distribution</p>
                <div className="progress-meter">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                  <div className="progress-label">{progress.toFixed(1)}% SECURED</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <div><span className="field-label">Current Pool</span><br /><span className="balance-num" style={{ fontSize: '1.5rem' }}>{fundTotal.toLocaleString()}</span> XLM</div>
                  <div style={{ textAlign: 'right' }}><span className="field-label">Target Goal</span><br /><span className="balance-num" style={{ fontSize: '1.5rem', opacity: 0.5 }}>{fundGoal.toLocaleString()}</span> XLM</div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn--full" onClick={() => handleDonate(10)} disabled={loading || !address}>
                    10 XLM
                  </button>
                  <button className="btn btn--full" onClick={() => handleDonate(50)} disabled={loading || !address}>
                    50 XLM
                  </button>
                </div>
                <div className="sep" style={{ margin: '1.5rem 0' }} />
                <p className="field-label" style={{ marginBottom: '1rem' }}>Top Survivors Contributors</p>
                <div className="leaderboard-list">
                  {donors.map((d, i) => (
                    <div key={i} className="leaderboard-item" style={{ padding: '0.6rem 1rem' }}>
                      <span className="leaderboard-rank">#{i+1}</span>
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
              <div className="card-tag">✦ Network Whale Watch</div>
              <div className="card-body">
                <p className="field-label" style={{ marginBottom: '1rem' }}>Total Network Stakeholders (Testnet)</p>
                <div className="leaderboard-list">
                  {whales.map((w, idx) => (
                    <div key={idx} className="leaderboard-item">
                      <div className="leaderboard-rank">#{idx+1}</div>
                      <div className="leaderboard-addr">{w.addr}</div>
                      <div className="leaderboard-amt">{w.amt.toLocaleString()} XLM</div>
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
      <div className="bg-layer"><div className="bg-image" /><div className="bg-gradients" /><div className="bg-vignette" /></div>
      
      <div className="app-container">
        <header className="site-header">
          <div className="header-top">
            <div className="header-brand">
              <div className="header-brand-row">
                <svg className="header-logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="48" stroke="#ffc300" strokeWidth="2" fill="none" opacity="0.3"/>
                  <path d="M74.4 32.8L25.7 55.4C24.3 56 24.3 58 25.7 58.6L33.5 62L74.4 43.2V32.8Z" fill="#ffc300"/>
                  <path d="M74.4 43.2L33.5 62L36.8 63.5L74.4 46V43.2Z" fill="#ff6d00" opacity="0.7"/>
                  <path d="M74.4 50.6L25.7 73.2C24.3 73.8 24.3 75.8 25.7 76.4L33.5 79.8L74.4 61V50.6Z" fill="#ffc300"/>
                  <path d="M74.4 61L33.5 79.8L36.8 81.3L74.4 63.8V61Z" fill="#ff6d00" opacity="0.7"/>
                </svg>
                <div><h1 className="site-title">Stellar Network</h1><h1 className="site-title" style={{ fontSize: '1.2rem', opacity: 0.8 }}>Survivor Hub v2.0</h1></div>
              </div>
            </div>
            <div className="header-badges"><span className="badge badge--net">⬡ Testnet</span><span className="badge badge--warn">◈ Restricted</span></div>
          </div>
          <div className="header-status">
            <span className={`dot ${address ? 'dot--on' : ''}`} />
            <span className={`status-label ${address ? 'status-label--on' : ''}`}>
              {address ? `UPLINK ACTIVE: ${address.substring(0,8)}...` : 'DISCONNECTED — AWAITING UPLINK'}
            </span>
          </div>
        </header>

        <main className="survivor-hub">
          <nav className="nav-sidebar">
            <div className={`nav-item ${activeTab === 'terminal' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('terminal')}>📡 Payment Terminal</div>
            <div className={`nav-item ${activeTab === 'tracker' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('tracker')}>◆ Payment Tracker</div>
            <div className={`nav-item ${activeTab === 'fund' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('fund')}>▣ Relief Fund</div>
            <div className={`nav-item ${activeTab === 'rank' ? 'nav-item--active' : ''}`} onClick={() => setActiveTab('rank')}>✦ Leaderboard</div>
            <div className="mt-auto">
              <div className="card card--compact" style={{ padding: '0.8rem', border: '1px solid rgba(255,195,0,0.1)' }}>
                <span className="field-label">Current Balance</span>
                <div className="balance-num" style={{ fontSize: '1.2rem', textAlign: 'left' }}>{parseFloat(balance).toLocaleString()}</div>
                <div className="field-label" style={{ fontSize: '0.45rem', marginTop: '0.5rem' }}>XLM DETECTED</div>
              </div>
              {!address ? (
                <button className="btn btn--full" onClick={handleConnect} style={{ marginTop: '1rem' }}>LINK OPERATOR</button>
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
                <div className="card-tag">▣ Diagnostics</div>
                <div className="card-body">
                  <div className="console" style={{ height: 'calc(100vh - 400px)' }}>
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
          <p className="footer-line">Survivor Network Hub &nbsp;│&nbsp; Soroban Powered &nbsp;│&nbsp; System v2.1.0</p>
        </footer>
      </div>
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
