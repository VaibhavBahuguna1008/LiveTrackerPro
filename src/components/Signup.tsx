import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Mail, Lock, User, ArrowRight, Loader2, Home, Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';

export default function Signup({ onSignup, theme, setTheme }: { onSignup: (user: any, token: string) => void, theme: 'light' | 'dark', setTheme: (t: 'light' | 'dark') => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();
      if (response.ok) {
        onSignup(data.user, data.token);
        navigate('/');
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f8fafc]'}`}>
      
      {/* Navigation Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-50">
        <Link 
          to="/" 
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border shadow-sm ${theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-black/5 text-slate-600 hover:text-blue-600'}`}
        >
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`p-3 rounded-xl transition-all border shadow-sm ${theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400 hover:text-blue-400' : 'bg-white border-black/5 text-slate-600 hover:text-blue-600'}`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] blur-[150px] rounded-full ${theme === 'dark' ? 'bg-blue-600/10' : 'bg-blue-600/5'}`}></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-lg backdrop-blur-xl border p-8 lg:p-10 rounded-[2.5rem] shadow-2xl relative z-10 ${theme === 'dark' ? 'bg-[#111]/80 border-white/5' : 'bg-white/80 border-black/5'}`}
      >
        <div className="flex flex-col items-center mb-10">
          <div className="bg-blue-600 p-4 rounded-2xl mb-6 shadow-[0_10px_25px_rgba(37,99,235,0.4)]">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-3xl font-black tracking-tight font-display ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Create Account</h1>
          <p className="text-slate-500 mt-2 font-medium">Join Live Tracker Pro ecosystem</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl mb-8 text-xs font-black uppercase tracking-widest flex items-center gap-3"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full border text-sm font-bold pl-14 pr-6 py-4.5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-600 ${theme === 'dark' ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-100/50 border-black/5 text-slate-900'}`}
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure Email</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full border text-sm font-bold pl-14 pr-6 py-4.5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-600 ${theme === 'dark' ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-100/50 border-black/5 text-slate-900'}`}
                  placeholder="identity@tracker.pro"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Access Key</label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full border text-sm font-bold pl-14 pr-6 py-4.5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-600 ${theme === 'dark' ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-100/50 border-black/5 text-slate-900'}`}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed mt-4 text-xs uppercase tracking-widest"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Register Operative
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-500/10 text-center">
          <p className="text-slate-500 text-sm font-medium">
            Protocol already established? {' '}
            <Link to="/login" className="text-blue-500 font-black hover:text-blue-400 transition-colors uppercase tracking-widest text-xs">Sign in here</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
