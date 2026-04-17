import { useState } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: 'var(--card-bg)', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '5px' }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{label}</p>
        <p style={{ margin: 0, color: 'var(--primary-color)', fontWeight: 'bold' }}>
          ${payload[0].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

const Backtest = () => {
  const [formData, setFormData] = useState({
    symbol: '',
    strategy: 'MA_CROSSOVER',
    startDate: '',
    endDate: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value.toUpperCase() });
  };

  const handleRun = async (e) => {
    e.preventDefault();
    if (!formData.symbol || !formData.startDate || !formData.endDate) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResults(null);

      const token = localStorage.getItem('token');
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/backtest`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run backtest. Check rate limits.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Strategy Backtester</h2>
      </div>

      <div className="auth-card" style={{ maxWidth: 'none', margin: '0', padding: '1.5rem' }}>
        <form onSubmit={handleRun} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Symbol</label>
            <input
              type="text"
              name="symbol"
              placeholder="AAPL"
              value={formData.symbol}
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Strategy</label>
            <select
              name="strategy"
              value={formData.strategy}
              onChange={(e) => setFormData({...formData, strategy: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', backgroundColor: '#0f172a', color: 'var(--text-primary)' }}
            >
              <option value="MA_CROSSOVER">50/200 Day MA Crossover</option>
              <option value="RSI">RSI (14-period, 30/70)</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Start Date</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>End Date</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <button type="submit" disabled={loading} style={{ width: 'auto', minWidth: '150px' }}>
              {loading ? 'Running...' : 'Run Strategy'}
            </button>
          </div>
        </form>
        {error && <div className="error-message" style={{ marginTop: '1rem', textAlign: 'left' }}>{error}</div>}
      </div>

      {results && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="auth-card" style={{ maxWidth: 'none', margin: '0', padding: '1.5rem' }}>
               <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Final Equity (from $10k)</div>
               <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>${results.finalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className="auth-card" style={{ maxWidth: 'none', margin: '0', padding: '1.5rem' }}>
               <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Return</div>
               <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: results.totalReturn >= 0 ? 'var(--success-color)' : 'var(--error-color)' }}>
                 {results.totalReturn.toFixed(2)}%
               </div>
            </div>
            <div className="auth-card" style={{ maxWidth: 'none', margin: '0', padding: '1.5rem' }}>
               <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Win Rate</div>
               <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{results.winRate.toFixed(1)}%</div>
            </div>
            <div className="auth-card" style={{ maxWidth: 'none', margin: '0', padding: '1.5rem' }}>
               <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Max Drawdown</div>
               <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--error-color)' }}>-{results.maxDrawdown.toFixed(2)}%</div>
            </div>
            <div className="auth-card" style={{ maxWidth: 'none', margin: '0', padding: '1.5rem' }}>
               <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Trades Executed</div>
               <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{results.numberOfTrades}</div>
            </div>
          </div>

          <div className="auth-card" style={{ maxWidth: 'none', margin: '0' }}>
            <h3 style={{ marginTop: 0 }}>Equity Curve</h3>
            <div style={{ height: '400px', width: '100%', marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={results.equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-secondary)" 
                    tick={{ fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={50}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    stroke="var(--text-secondary)" 
                    tick={{ fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="stepAfter" 
                    dataKey="equity" 
                    stroke="var(--primary-color)" 
                    strokeWidth={2} 
                    dot={false}
                    activeDot={{ r: 6, fill: 'var(--primary-color)', stroke: 'var(--card-bg)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="auth-card" style={{ maxWidth: 'none', margin: '0' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Trade Log</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Date</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Type</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Execution Price</th>
                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Profit % (Sell Only)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.trades.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No trades executed in this timeframe</td>
                    </tr>
                  ) : (
                    results.trades.map((trade, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem' }}>{trade.date}</td>
                        <td style={{ 
                            padding: '0.75rem', 
                            fontWeight: 'bold',
                            color: trade.type === 'BUY' ? 'var(--primary-color)' : 'var(--text-primary)'
                        }}>
                          {trade.type}
                        </td>
                        <td style={{ padding: '0.75rem' }}>${trade.price.toFixed(2)}</td>
                        <td style={{ 
                            padding: '0.75rem', 
                            color: trade.profitPercent > 0 ? 'var(--success-color)' : (trade.profitPercent < 0 ? 'var(--error-color)' : 'var(--text-primary)')
                        }}>
                          {trade.type === 'SELL' ? `${trade.profitPercent.toFixed(2)}%` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Backtest;
