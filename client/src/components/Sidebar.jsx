import { Link, useLocation, useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const currentPath = location.pathname;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-brand">PaperTrade</Link>
      </div>
      <nav className="sidebar-nav">
        <Link 
          to="/dashboard" 
          className={`sidebar-link ${currentPath === '/dashboard' ? 'active' : ''}`}
        >
          Dashboard
        </Link>
        {/* We can scroll to portfolio or add it as a separate page, for now link back to dashboard */ }
        <Link 
          to="/dashboard" 
          className="sidebar-link"
          onClick={() => window.scrollTo(0, document.body.scrollHeight)}
        >
          Portfolio
        </Link>
        <Link 
          to="/backtest" 
          className={`sidebar-link ${currentPath === '/backtest' ? 'active' : ''}`}
        >
          Backtest
        </Link>
        
        <div className="mobile-logout sidebar-link" onClick={handleLogout} style={{ cursor: 'pointer', color: 'var(--error-color)' }}>
          Logout
        </div>
      </nav>
      <div className="sidebar-footer">
        <button onClick={handleLogout} style={{ width: '100%', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
