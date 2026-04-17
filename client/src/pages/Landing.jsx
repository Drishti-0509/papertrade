import { Link, Navigate } from 'react-router-dom';

const Landing = () => {
  const token = localStorage.getItem('token');
  
  // If already logged in, redirect to dashboard
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', backgroundColor: '#0a0e1a', color: '#ffffff' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: '800', marginBottom: '1rem', color: '#ffffff', letterSpacing: '-0.02em' }}>
        PaperTrade
      </h1>
      <h2 style={{ fontSize: '1.5rem', color: '#94a3b8', marginBottom: '3rem', maxWidth: '800px', fontWeight: '400' }}>
        Practice trading with $100,000 virtual money
      </h2>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <Link to="/login" style={{ textDecoration: 'none' }}>
          <button style={{ fontSize: '1.125rem', padding: '0.875rem 2.5rem', minWidth: '160px', backgroundColor: 'transparent', border: '1px solid #00d4aa', color: '#00d4aa', borderRadius: '8px' }}>
            Login
          </button>
        </Link>
        <Link to="/register" style={{ textDecoration: 'none' }}>
          <button style={{ fontSize: '1.125rem', padding: '0.875rem 2.5rem', minWidth: '160px', backgroundColor: '#00d4aa', color: '#fff', border: '1px solid #00d4aa', borderRadius: '8px' }}>
            Register
          </button>
        </Link>
      </div>
    </div>
  );
};

export default Landing;
