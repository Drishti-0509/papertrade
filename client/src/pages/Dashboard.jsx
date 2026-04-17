import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
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

const SentimentCard = ({ symbol }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    axios.get(`${import.meta.env.VITE_API_URL}/api/sentiment/${symbol}`)
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) return <div className="spinner" style={{ marginTop: '1.5rem' }}></div>;
  if (!data) return null;

  const color = data.label === 'Bullish' ? '#00d4aa' : data.label === 'Bearish' ? '#ff4757' : '#888';

  return (
    <div style={{ background: '#0f172a', borderRadius: 12, padding: 20, marginTop: 24, border: '1px solid var(--border-color)' }}>
      <h3 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>Market Sentiment</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ background: color, color: '#fff', padding: '4px 14px', borderRadius: 20, fontWeight: 600, fontSize: 14 }}>
          {data.label}
        </span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Score: {data.score}</span>
      </div>
      <div>
        {data.headlines.map((h, i) => (
          <div key={i} style={{ borderBottom: '1px solid var(--border-color)', padding: '8px 0', color: 'var(--text-secondary)', fontSize: 13, display: 'flex', gap: 8 }}>
            <span style={{ color: h.score > 0 ? '#00d4aa' : h.score < 0 ? '#ff4757' : '#888', flexShrink: 0 }}>
              {h.score > 0 ? '▲' : h.score < 0 ? '▼' : '—'}
            </span>
            <a href={h.url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
              {h.headline}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [tradeShares, setTradeShares] = useState(1);
  const [livePrices, setLivePrices] = useState({});
  const [flashStates, setFlashStates] = useState({});

  const fetchPortfolio = async (token) => {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/portfolio`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setPortfolio(res.data);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      navigate('/login');
    } else {
      setUser(JSON.parse(userData));
      fetchPortfolio(token);
    }
  }, [navigate]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL);
    const symbols = portfolio.map(h => h.symbol);
    if (selectedStock) symbols.push(selectedStock.symbol);
    socket.emit('subscribe', symbols);

    socket.on('price_update', (data) => {
      setLivePrices(prev => ({ ...prev, [data.symbol]: data.price }));
    });

    return () => socket.disconnect();
  }, [portfolio, selectedStock]);

  if (!user) return null;

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '20px 0',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '2rem'
      }}>
        <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '2rem' }}>Dashboard</h2>
        <div style={{ fontWeight: 'bold', color: '#00d4aa', fontSize: '2rem' }}>
          ${user.balance?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </div>
      </div>

      {/* EXISTING CONTENT */}
      <h2>Welcome, {user.name}</h2>

      {/* Your remaining UI stays SAME */}
      {selectedStock && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '2rem', margin: 0 }}>{selectedStock.symbol}</h2>
            {livePrices[selectedStock.symbol] && (
               <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                 ${livePrices[selectedStock.symbol].toFixed(2)}
               </div>
            )}
          </div>

          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={selectedStock.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="price" stroke="#00d4aa" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <SentimentCard symbol={selectedStock.symbol} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;