import { useState, useEffect, useRef } from 'react';
import { connectWallet, getXlmBalance, sendPayment, getExplorerUrl } from './utils/stellar';
import './index.css';

function App() {
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState('0.0000000');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([{ msg: 'SYSTEM READY. AWAITING INPUT...', type: 'info', time: new Date().toLocaleTimeString() }]);
  const [destAddress, setDestAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  
  const logEndRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg, type = 'info') => {
    setLogs((prev) => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      addLog('INITIATING WALLET LINK...', 'info');
      const pubKey = await connectWallet();
      setAddress(pubKey);
      addLog(`LINK ESTABLISHED: ${pubKey.substring(0, 8)}...${pubKey.substring(pubKey.length - 8)}`, 'success');
      
      // Fetch balance immediately after connecting
      const bal = await getXlmBalance(pubKey);
      setBalance(bal);
    } catch (error) {
      addLog(`LINK FAILURE: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshBalance = async () => {
    if (!address) return;
    setLoading(true);
    try {
      addLog('SYNCING ACCOUNT DATA...', 'info');
      const bal = await getXlmBalance(address);
      setBalance(bal);
      addLog('SYNC COMPLETE.', 'success');
    } catch (error) {
      addLog(`SYNC ERROR: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!address) {
      addLog('ERROR: CONNECTION REQUIRED.', 'error');
      return;
    }
    if (!destAddress || !amount) {
      addLog('ERROR: MISSING TARGET OR PAYLOAD.', 'error');
      return;
    }

    setLoading(true);
    setTxHash('');
    try {
      const result = await sendPayment(address, destAddress, amount, (msg, type) => addLog(msg, type));
      setTxHash(result.hash);
      handleRefreshBalance(); // Refresh balance after success
      setDestAddress('');
      setAmount('');
    } catch (error) {
      // Error handled inside sendPayment via logs
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header style={{ marginBottom: '2rem', borderBottom: '2px solid var(--fallout-border)', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>VAULT-TEC STELLAR TERMINAL</h1>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem' }}>
          <span className={`status-dot ${address ? 'active' : ''}`}></span>
          <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            {address ? `CONNECTED TO TESTNET` : 'OFFLINE - AWAITING LINK'}
          </span>
        </div>
      </header>

      <div className="bento-grid">
        {/* WALLET & STATUS */}
        <div className="terminal-card col-4">
          <div className="header-label">Agent Status</div>
          <div style={{ marginTop: '1rem' }}>
            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem' }}>PUBLIC KEY:</p>
            <p style={{ wordBreak: 'break-all', fontSize: '0.9rem', marginBottom: '1.5rem', color: address ? 'var(--fallout-text)' : 'var(--fallout-border)' }}>
              {address || 'UNIDENTIFIED'}
            </p>
            {!address ? (
              <button onClick={handleConnect} disabled={loading} style={{ width: '100%' }}>
                {loading ? 'CONNECTING...' : 'LINK FREIGHTER'}
              </button>
            ) : (
              <button className="danger" onClick={() => { setAddress(''); addLog('LINK TERMINATED.', 'info'); }} style={{ width: '100%' }}>
                DISCONNECT
              </button>
            )}
          </div>
        </div>

        {/* BALANCE */}
        <div className="terminal-card col-4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="header-label">Resource Levels</div>
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <h3 style={{ fontSize: '3rem', margin: '0.5rem 0', color: '#fff' }}>{parseFloat(balance).toFixed(2)}</h3>
            <p style={{ fontSize: '1.2rem', color: 'var(--fallout-text)' }}>XLM</p>
          </div>
          <button onClick={handleRefreshBalance} disabled={loading || !address} style={{ marginTop: 'auto' }}>
            REFRESH SYNC
          </button>
        </div>

        {/* TRANSACTION LOGS */}
        <div className="terminal-card col-4">
          <div className="header-label">Diagnostic Logs</div>
          <div className="log-console">
            {logs.map((log, idx) => (
              <div key={idx} className={`log-entry ${log.type}`}>
                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>[{log.time}]</span> {log.msg}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* PAYMENT FORM */}
        <div className="terminal-card col-8">
          <div className="header-label">Data Transfer Protocol</div>
          <form onSubmit={handleSend} style={{ marginTop: '1rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem' }}>DESTINATION ADDRESS</label>
              <input 
                placeholder="GA... (Stellar Public Key)" 
                value={destAddress}
                onChange={(e) => setDestAddress(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem' }}>PAYLOAD AMOUNT (XLM)</label>
              <input 
                type="number" 
                step="0.0000001"
                placeholder="0.00" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading || !address} style={{ width: '100%', fontSize: '1.2rem' }}>
              {loading ? 'UPLOADING...' : 'INITIATE TRANSFER'}
            </button>
          </form>
        </div>

        {/* TRANSACTION SUCCESS */}
        {txHash && (
          <div className="terminal-card col-4" style={{ borderColor: 'var(--fallout-text)' }}>
            <div className="header-label" style={{ backgroundColor: 'var(--fallout-text)', color: '#000' }}>Transfer Success</div>
            <p style={{ fontSize: '0.9rem', margin: '1rem 0' }}>Payload successfully uploaded to Stellar Testnet.</p>
            <p style={{ fontSize: '0.7rem', opacity: 0.6 }}>HASH: {txHash}</p>
            <button 
              onClick={() => window.open(getExplorerUrl(txHash), '_blank')}
              style={{ width: '100%', marginTop: '1rem', padding: '0.5rem' }}
            >
              VIEW ON EXPLORER
            </button>
          </div>
        )}
      </div>

      <footer style={{ marginTop: '4rem', textAlign: 'center', opacity: 0.4, fontSize: '0.8rem', borderTop: '1px solid var(--fallout-border)', paddingTop: '1rem' }}>
        PROPERTY OF VAULT-TEC INDUSTRIES © 2077 | STELLAR TESTNET NODE #42
      </footer>
    </div>
  );
}

export default App;
