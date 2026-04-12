import { useState, useEffect, useRef, Component } from 'react';
import { connectWallet, getXlmBalance, sendPayment, getExplorerUrl } from './utils/stellar';
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
  const [logs, setLogs] = useState([
    { msg: 'TERMINAL ONLINE. AWAITING OPERATOR INPUT...', type: 'info', ts: new Date().toLocaleTimeString() },
  ]);
  const [dest, setDest] = useState('');
  const [amt, setAmt] = useState('');
  const [txHash, setTxHash] = useState('');

  const logEnd = useRef(null);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const log = (msg, type = 'info') => {
    setLogs(p => [...p, { msg, type, ts: new Date().toLocaleTimeString() }]);
  };

  /* ── Wallet Actions ───────────────────────────────────────── */
  const handleConnect = async () => {
    setLoading(true);
    try {
      log('INITIATING SECURE UPLINK...', 'info');
      const key = await connectWallet();
      if (!key || typeof key !== 'string') throw new Error('Invalid key from wallet.');
      setAddress(key);
      log(`UPLINK OK → ${key.substring(0, 6)}...${key.slice(-6)}`, 'ok');

      try {
        const b = await getXlmBalance(key);
        setBalance(b);
        log(`RESOURCES: ${parseFloat(b).toFixed(4)} XLM`, 'ok');
      } catch (e) {
        log(`BALANCE WARN: ${e?.message || 'unavailable'}`, 'err');
      }
    } catch (err) {
      log(`UPLINK FAILED → ${err instanceof Error ? err.message : String(err)}`, 'err');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setAddress('');
    setBalance('0.0000000');
    setTxHash('');
    log('UPLINK SEVERED.', 'info');
  };

  const handleRefresh = async () => {
    if (!address) return;
    setLoading(true);
    try {
      log('SYNCING...', 'info');
      const b = await getXlmBalance(address);
      setBalance(b);
      log(`SYNC OK: ${parseFloat(b).toFixed(4)} XLM`, 'ok');
    } catch (e) {
      log(`SYNC ERR: ${e?.message || 'unknown'}`, 'err');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!address) { log('ERROR: UPLINK REQUIRED.', 'err'); return; }
    if (!dest || !amt) { log('ERROR: MISSING FIELDS.', 'err'); return; }

    setLoading(true);
    setTxHash('');
    try {
      const res = await sendPayment(address, dest, amt, (m, t) => log(m, t === 'success' ? 'ok' : t));
      setTxHash(res.hash);
      handleRefresh();
      setDest('');
      setAmt('');
    } catch {
      // errors logged internally
    } finally {
      setLoading(false);
    }
  };

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className="app-shell">
      {/* Background layers */}
      <div className="bg-layer">
        <div className="bg-image" />
        <div className="bg-gradients" />
        <div className="bg-vignette" />
      </div>

      <div className="app-container">
        {/* ── HEADER ──────────────────────────────────────── */}
        <header className="site-header">
          <div className="header-top">
            <div className="header-brand">
              <div className="header-brand-row">
                {/* Stellar Rocket Logo */}
                <svg className="header-logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="48" stroke="#ffc300" strokeWidth="2" fill="none" opacity="0.3"/>
                  <path d="M74.4 32.8L25.7 55.4C24.3 56 24.3 58 25.7 58.6L33.5 62L74.4 43.2V32.8Z" fill="#ffc300"/>
                  <path d="M74.4 43.2L33.5 62L36.8 63.5L74.4 46V43.2Z" fill="#ff6d00" opacity="0.7"/>
                  <path d="M74.4 50.6L25.7 73.2C24.3 73.8 24.3 75.8 25.7 76.4L33.5 79.8L74.4 61V50.6Z" fill="#ffc300"/>
                  <path d="M74.4 61L33.5 79.8L36.8 81.3L74.4 63.8V61Z" fill="#ff6d00" opacity="0.7"/>
                  <circle cx="50" cy="50" r="3" fill="#ffc300" opacity="0.15"/>
                </svg>
                <div>
                  <h1 className="site-title">Stellar Network</h1>
                  <h1 className="site-title" style={{ fontSize: 'clamp(0.9rem, 2vw, 1.4rem)', opacity: 0.8 }}>Payment Terminal</h1>
                </div>
              </div>
              <span className="site-subtitle">Decentralized XLM Operations</span>
            </div>
            <div className="header-badges">
              <span className="badge badge--net">⬡ Testnet</span>
              <span className="badge badge--warn">◈ Restricted</span>
            </div>
          </div>
          <div className="header-status">
            <span className={`dot ${address ? 'dot--on' : ''}`} />
            <span className={`status-label ${address ? 'status-label--on' : ''}`}>
              {address ? 'Uplink Active — Stellar Testnet' : 'Offline — Awaiting Secure Uplink'}
            </span>
          </div>
        </header>

        {/* ── TWO-COLUMN LAYOUT ─────────────────────────── */}
        <div className="grid">

          {/* ══ LEFT: Transfer Protocol (70%) ════════════════ */}
          <div className="g-8 left-col enter">
            <div className="card card--tall">
              <div className="card-corner-br" />
              <div className="card-tag">
                <span className="card-tag__icon">⬡</span> Data Transfer Protocol
              </div>
              <div className="card-body">
                <form onSubmit={handleSend}>
                  <div className="input-group">
                    <label className="field-label">Destination Address</label>
                    <input
                      className="input"
                      placeholder="GA... (Stellar Public Key)"
                      value={dest}
                      onChange={e => setDest(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="field-label">Payload Amount (XLM)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.0000001"
                      placeholder="0.00"
                      value={amt}
                      onChange={e => setAmt(e.target.value)}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="field-label">Memo (Optional)</label>
                    <input
                      className="input"
                      placeholder="Transaction note..."
                    />
                  </div>
                  <button className="btn btn--full" type="submit" disabled={loading || !address}>
                    {loading ? <><span className="spinner" /> Processing...</> : 'Initiate Transfer'}
                  </button>
                </form>

                {/* TX Success inline */}
                {txHash && (
                  <div className="tx-result enter">
                    <div className="sep" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--yellow)', fontSize: '1rem' }}>✦</span>
                      <span className="field-label" style={{ margin: 0, color: 'var(--yellow)' }}>Transfer Complete</span>
                    </div>
                    <p className="tx-hash">HASH: {txHash}</p>
                    <button
                      className="btn btn--ghost btn--full"
                      onClick={() => window.open(getExplorerUrl(txHash), '_blank')}
                      style={{ marginTop: '0.75rem' }}
                    >
                      View on Explorer ↗
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══ RIGHT: Stacked Cards (30%) ═══════════════════ */}
          <div className="g-4 right-stack enter">

            {/* ▸ Connect Wallet */}
            <div className="card card--compact">
              <div className="card-corner-br" />
              <div className="card-tag">
                <span className="card-tag__icon">◈</span> Wallet
              </div>
              <div className="card-body">
                <p className="field-label">Public Key</p>
                <p className={`field-value ${!address ? 'field-value--empty' : ''}`} style={{ marginBottom: '0.75rem', fontSize: '0.72rem' }}>
                  {address ? `${address.substring(0, 12)}...${address.slice(-8)}` : '— Not Connected —'}
                </p>
                {!address ? (
                  <button className="btn btn--full" onClick={handleConnect} disabled={loading}>
                    {loading && <span className="spinner" />}
                    {loading ? 'Connecting...' : 'Link Freighter'}
                  </button>
                ) : (
                  <button className="btn btn--danger btn--full" onClick={handleDisconnect}>
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* ▸ Balance */}
            <div className="card card--compact">
              <div className="card-corner-br" />
              <div className="card-tag">
                <span className="card-tag__icon">◆</span> Balance
              </div>
              <div className="card-body" style={{ textAlign: 'center' }}>
                <div className="balance-num" style={{ fontSize: '2rem' }}>{parseFloat(balance).toFixed(2)}</div>
                <div className="balance-unit" style={{ fontSize: '0.65rem', letterSpacing: '6px' }}>XLM</div>
                <div className="balance-bar" />
                <button className="btn btn--ghost btn--full" onClick={handleRefresh} disabled={loading || !address} style={{ marginTop: '0.75rem' }}>
                  {loading && address ? <><span className="spinner" /> Syncing...</> : 'Refresh'}
                </button>
              </div>
            </div>

            {/* ▸ Diagnostics */}
            <div className="card card--compact card--diag">
              <div className="card-corner-br" />
              <div className="card-tag">
                <span className="card-tag__icon">▣</span> Diagnostics
              </div>
              <div className="card-body">
                <div className="console console--short">
                  {logs.map((l, i) => (
                    <div key={i} className={`console-line console-line--${l.type === 'success' || l.type === 'ok' ? 'ok' : l.type === 'error' || l.type === 'err' ? 'err' : 'info'}`}>
                      <span className="console-ts">[{l.ts}]</span>{l.msg}
                    </div>
                  ))}
                  <div ref={logEnd} />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="site-footer">
        <p className="footer-line">
          Stellar Network Payment Terminal &nbsp;│&nbsp; Testnet Node #42 &nbsp;│&nbsp; Terminal v3.1.7
        </p>
      </footer>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
function WrappedApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default WrappedApp;
