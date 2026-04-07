import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import About from './components/About';
import AccountSettings from './components/AccountSettings';
import DetailedHistory from './components/DetailedHistory';
import Analytics from './components/Analytics';
import Layout from './components/Layout';
import Landing from './components/Landing';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: any, token: string) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login onLogin={handleLogin} theme={theme} setTheme={setTheme} /> : <Navigate to="/" />} />
        <Route path="/signup" element={!user ? <Signup onSignup={handleLogin} theme={theme} setTheme={setTheme} /> : <Navigate to="/" />} />
        <Route path="/about" element={<About theme={theme} />} />
        
        <Route element={user ? <Layout user={user} onLogout={handleLogout} theme={theme} setTheme={setTheme} /> : null}>
          {user && <Route path="/" element={user.role === 'admin' ? <AdminDashboard theme={theme} setTheme={setTheme} /> : <Dashboard user={user} theme={theme} setTheme={setTheme} />} />}
          {user && <Route path="/history" element={<DetailedHistory theme={theme} user={user} />} />}
          {user && <Route path="/stats" element={<Analytics theme={theme} user={user} />} />}
          {user && <Route path="/settings" element={<AccountSettings theme={theme} user={user} setUser={setUser} onLogout={handleLogout} />} />}
        </Route>

        {!user && <Route path="/" element={<Landing theme={theme} setTheme={setTheme} />} />}
        {!user && <Route path="*" element={<Navigate to="/" />} />}
      </Routes>
    </Router>
  );
}
