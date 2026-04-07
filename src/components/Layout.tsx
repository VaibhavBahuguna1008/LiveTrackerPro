import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, LogOut, User, Shield, Activity, ChevronLeft, ChevronRight, X, Sun, Moon, Settings, History, Bell, Radar, BarChart3, ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';

export default function Layout({ user, onLogout, theme, setTheme }: { user: any, onLogout: () => void, theme: 'light' | 'dark', setTheme: (t: 'light' | 'dark') => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [radarNotifications, setRadarNotifications] = useState<{id: number; message: string; type: string; userName: string; time: string}[]>([]);

  // Listen for radar notifications from Dashboard
  useEffect(() => {
    const handleRadarNotification = (e: any) => {
      const detail = e.detail;
      setRadarNotifications(prev => [{
        ...detail,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }, ...prev].slice(0, 20));
    };
    window.addEventListener('radar-notification', handleRadarNotification);
    return () => window.removeEventListener('radar-notification', handleRadarNotification);
  }, []);





  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const navLinks = [
    { to: '/', icon: <MapPin className="w-5 h-5" />, label: 'Map View' },
    { to: '/history', icon: <History className="w-5 h-5" />, label: 'Detailed History' },
    { to: '/stats', icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics' },
    { to: '/settings', icon: <Settings className="w-5 h-5" />, label: 'Account Settings' },
  ];

  const topNavLinks = [
    { to: '/', label: 'Dashboard' },
    { to: '/history', label: 'History' },
    { to: '/stats', label: 'Analytics' },
    { to: '/settings', label: 'Settings' },
  ];

  return (
    <div className={`flex h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0a0a0a] text-slate-100' : 'bg-[#f4f7f2] text-slate-900'} overflow-hidden relative font-sans`}>
      {/* Sidebar (Desktop) */}
      <aside 
        className={`hidden lg:flex flex-col border-r transition-all duration-500 ease-in-out relative z-40 ${theme === 'dark' ? 'bg-[#0f0f0f] border-white/5' : 'bg-white border-black/5'} ${isCollapsed ? 'w-24' : 'w-72'}`}
      >
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute -right-4 top-24 p-2 rounded-full border-4 transition-all hover:scale-110 z-50 shadow-2xl ${theme === 'dark' ? 'bg-blue-600 border-[#0a0a0a] text-white' : 'bg-blue-600 border-[#f4f7f2] text-white'}`}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className="flex-1 px-6 py-10 space-y-3 overflow-y-auto scrollbar-hide">
          <div className={`flex items-center gap-2 mb-8 ${isCollapsed ? 'justify-center' : 'px-5'}`}>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)] shrink-0">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            {!isCollapsed && (
              <span className="font-black tracking-tight text-xl">Live Tracker <span className="text-blue-500">Pro</span></span>
            )}
          </div>
          {navLinks.map((link) => (
            <Link 
              key={link.to}
              to={link.to} 
              className={`flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-300 group ${
                location.pathname === link.to 
                  ? 'bg-blue-600 text-white shadow-[0_10px_25px_rgba(37,99,235,0.3)]' 
                  : `hover:bg-blue-600/5 ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-blue-600'}`
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isCollapsed ? link.label : ''}
            >
              <div className="shrink-0">{link.icon}</div>
              {!isCollapsed && <span className="font-black text-sm tracking-wide">{link.label}</span>}
            </Link>
          ))}
          
          {user?.role === 'admin' && (
            <div className={`pt-8 mt-8 border-t ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}>
              {!isCollapsed && <p className="px-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Management</p>}
              <Link to="/" className={`flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : ''} ${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-600/5'}`}>
                <Shield className="w-5 h-5" />
                {!isCollapsed && <span className="font-black text-sm tracking-wide">Admin Panel</span>}
              </Link>
            </div>
          )}
        </div>

        <div className={`p-8 border-t transition-all duration-300 ${theme === 'dark' ? 'border-white/5' : 'border-black/5'} ${isCollapsed ? 'px-4' : ''}`}>
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-300 group ${isCollapsed ? 'justify-center px-0' : ''} ${theme === 'dark' ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-500 hover:text-red-600 hover:bg-red-500/5'}`}
            title={isCollapsed ? 'Logout' : ''}
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform shrink-0" />
            {!isCollapsed && <span className="font-black text-sm tracking-wide">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Navigation Bar - Visible on all screens for consistent actions */}
        <header className={`h-20 flex items-center justify-between px-6 z-[100] transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0a0a0a]/80 border-b border-white/5' : 'bg-white/80 border-b border-black/5'} backdrop-blur-xl sticky top-0`}>
          <div className="flex items-center gap-4">
            {/* Branding removed as per request */}
          </div>

          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle - Now visible on all screens */}
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`flex p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${theme === 'dark' ? 'bg-white/5 text-amber-400 hover:bg-white/10' : 'bg-black/5 text-slate-600 hover:bg-black/10'}`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Radar Notifications */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                }}
                className={`p-2.5 rounded-xl transition-all relative ${theme === 'dark' ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-black/5 text-slate-500 hover:text-blue-600'}`}
              >
                <Bell className="w-5 h-5" />
                {radarNotifications.length > 0 && (
                  <span className={`absolute top-1.5 right-1.5 w-3 h-3 ${radarNotifications.some(n => n.type === 'anomaly') ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]'} rounded-full border-2 border-white dark:border-[#0a0a0a] animate-pulse`} />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowNotifications(false)}
                      className="fixed inset-0 z-[998]"
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={`absolute right-0 mt-3 w-80 rounded-[2rem] border shadow-2xl z-[999] overflow-hidden ${theme === 'dark' ? 'bg-[#0f0f0f]/95 border-white/8 backdrop-blur-2xl' : 'bg-white/95 border-black/8 backdrop-blur-2xl'}`}
                    >
                      <div className={`p-6 border-b ${theme === 'dark' ? 'border-white/8' : 'border-black/5'} flex items-center justify-between bg-gradient-to-r ${theme === 'dark' ? 'from-blue-600/10 to-transparent' : 'from-blue-50 to-transparent'}`}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-blue-500">Tactical Feed</h3>
                        </div>
                        {radarNotifications.length > 0 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setRadarNotifications([]); }}
                            className="text-[9px] font-black opacity-40 hover:opacity-100 hover:text-red-500 uppercase tracking-widest cursor-pointer transition-all"
                          >
                            Purge All
                          </button>
                        )}
                      </div>
                      <div className="max-h-[450px] overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {radarNotifications.length > 0 ? radarNotifications.map((n) => (
                          <div key={n.id} className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer group ${n.type === 'anomaly' ? (theme === 'dark' ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15' : 'bg-red-50 border-red-100 hover:bg-red-100/50 shadow-sm shadow-red-500/5') : (theme === 'dark' ? 'bg-white/3 border-white/5 hover:bg-white/5 hover:border-blue-500/30' : 'bg-slate-50 border-black/5 hover:bg-white hover:border-blue-200 shadow-sm')}`}>
                            <div className="flex gap-3.5">
                              <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${n.type === 'anomaly' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                {n.type === 'anomaly' ? <ShieldAlert className="w-5 h-5" /> : <Radar className="w-5 h-5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className={`text-[10px] font-black uppercase tracking-wider ${n.type === 'anomaly' ? 'text-red-500' : 'text-blue-500'}`}>
                                    {n.type === 'anomaly' ? 'Anomaly Detected' : 'Radar Alert'}
                                  </p>
                                  <p className="text-[8px] font-bold opacity-40">{n.time}</p>
                                </div>
                                <p className={`text-[11px] font-black leading-tight mb-1.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{n.message}</p>
                                <div className="flex items-center gap-1.5 opacity-50">
                                  <User className="w-2.5 h-2.5" />
                                  <p className="text-[8px] font-bold uppercase tracking-widest">{n.userName || 'System'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="py-12 text-center">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${theme === 'dark' ? 'bg-blue-600/5 border-blue-500/15' : 'bg-blue-50 border-blue-200'}`}>
                               <ShieldCheck className="w-7 h-7 text-blue-500/50" />
                            </div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Operational Silence</p>
                            <p className="text-[8px] text-slate-600 mt-2 font-bold uppercase tracking-widest">No Active Irregularities</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Sign Out Button */}
            <button 
              onClick={handleLogout}
              className={`sm:hidden p-2.5 rounded-xl transition-all ${theme === 'dark' ? 'bg-red-500/10 text-red-400' : 'bg-red-500/5 text-red-600'}`}
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Menu Overlay removed as per request */}
        
        {/* Main Content */}
        <main className="flex-1 relative overflow-auto pb-24 lg:pb-0">
          <Outlet />
        </main>

        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-[50]">
          <nav className={`flex items-center justify-around p-2.5 rounded-[2.5rem] shadow-[0_15px_40px_rgba(0,0,0,0.3)] border backdrop-blur-xl ${theme === 'dark' ? 'bg-[#111111]/80 border-white/5' : 'bg-white/80 border-black/5'}`}>
            {navLinks.map((link) => (
              <Link 
                key={link.to}
                to={link.to}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-full transition-all duration-300 flex-1 active:scale-95 ${
                  location.pathname === link.to 
                    ? 'text-blue-500' 
                    : `${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`
                }`}
              >
                <div className={`p-3 rounded-full transition-all duration-500 ${
                  location.pathname === link.to 
                    ? 'bg-blue-600/10 scale-110 shadow-[0_0_15px_rgba(37,99,235,0.1)]' 
                    : 'hover:bg-blue-600/5'
                }`}>
                  {link.icon}
                </div>
              </Link>
            ))}
          </nav>
        </div>


      </div>
    </div>
  );
}
