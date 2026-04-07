import { useState, useEffect } from 'react';
import { socket, connectSocket, disconnectSocket } from '../lib/socket';
import Map from './Map';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Users, MapPin, Bell, AlertTriangle, Search, Filter, MoreVertical, Navigation, Info, Activity } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  entityType?: string;
  location?: { lat: number; lng: number };
  status: string;
  lastUpdate?: Date;
}

export default function AdminDashboard({ theme, setTheme }: { theme: 'light' | 'dark', setTheme: (t: 'light' | 'dark') => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [geofence, setGeofence] = useState<{ center: { lat: number; lng: number }; radius: number } | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    connectSocket(user);

    socket.on('user-status-change', (activeUsers: User[]) => {
      setUsers(activeUsers);
    });

    socket.on('location-update', (updatedUser: User) => {
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...updatedUser, lastUpdate: new Date() } : u));
      
      if (geofence && updatedUser.location) {
        const distance = calculateDistance(
          updatedUser.location.lat, 
          updatedUser.location.lng, 
          geofence.center.lat, 
          geofence.center.lng
        );
        
        if (distance > geofence.radius) {
          addAlert(`Geofence Alert: ${updatedUser.name} exited the safe zone!`);
        }
      }
    });

    return () => {
      disconnectSocket();
    };
  }, [geofence]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const addAlert = (msg: string) => {
    setAlerts(prev => [msg, ...prev].slice(0, 5));
  };

  const setDemoGeofence = () => {
    if (users.length > 0 && users[0].location) {
      setGeofence({
        center: users[0].location,
        radius: 500
      });
      addAlert('Geofence established around first active user.');
    } else {
      addAlert('No active users with location to set geofence.');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || u.entityType === filterType;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (lastUpdate?: Date) => {
    if (!lastUpdate) return 'bg-slate-500';
    const diff = (new Date().getTime() - new Date(lastUpdate).getTime()) / 1000;
    if (diff < 30) return 'bg-emerald-500';
    if (diff < 300) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getLastSeenText = (lastUpdate?: Date) => {
    if (!lastUpdate) return 'Never seen';
    const diff = (new Date().getTime() - new Date(lastUpdate).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className={`h-full flex flex-col transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f7f2] text-slate-900'} p-4 lg:p-6 gap-4 lg:gap-6 overflow-auto lg:overflow-hidden`}>
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 lg:gap-4 w-full sm:w-auto">
          <div className="p-2.5 rounded-2xl">
            <Shield className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <h2 className={`text-xl lg:text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Admin Control Center</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Monitoring {users.length} active users</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-3">
            <button 
              onClick={setDemoGeofence}
              className={`${theme === 'dark' ? 'glass-dark' : 'glass'} flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all text-[10px] uppercase tracking-widest shadow-2xl`}
            >
              <MapPin className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Set Geofence</span>
              <span className="sm:hidden">Fence</span>
            </button>
            <div className="relative">
              <div className={`${theme === 'dark' ? 'glass-dark' : 'glass'} p-3 rounded-2xl shadow-2xl`}>
                <Bell className={`w-5 h-5 cursor-pointer transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`} />
              </div>
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0a0a0a] animate-pulse"></span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-4 gap-4 lg:gap-6 min-h-0">
        {/* Sidebar: User List & Alerts */}
        <div className="lg:col-span-1 flex flex-col gap-4 lg:gap-6 min-h-0 order-2 lg:order-1">
          {/* User List */}
          <div className={`${theme === 'dark' ? 'glass-dark' : 'glass'} rounded-[2.5rem] flex flex-col min-h-[300px] lg:min-h-0 lg:flex-1 overflow-hidden shadow-2xl border border-white/5`}>
            <div className={`p-6 border-b ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} flex items-center gap-2 text-[10px] uppercase tracking-widest`}>
                  <Users className="w-4 h-4 text-blue-500" />
                  Active Users
                </h3>
                <span className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-1 rounded-lg font-black">{users.length}</span>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-black/5'} text-xs pl-12 pr-4 py-3.5 rounded-2xl focus:outline-none focus:border-blue-500 transition-all font-bold`}
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {['all', 'human', 'bike', 'car', 'bus'].map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterType === type ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : (theme === 'dark' ? 'bg-white/5 text-slate-500 hover:bg-white/10' : 'bg-slate-200 text-slate-500 hover:bg-slate-300')}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-3 space-y-2 max-h-[400px] lg:max-h-none scrollbar-hide">
              {filteredUsers.map(u => (
                <button 
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all text-left group ${selectedUser?.id === u.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : (theme === 'dark' ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-50 text-slate-600')}`}
                >
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-200 border-black/5'} flex items-center justify-center border transition-colors group-hover:border-blue-500/30`}>
                      <Users className={`w-5 h-5 ${selectedUser?.id === u.id ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 ${getStatusColor(u.lastUpdate)} rounded-full border-2 ${theme === 'dark' ? 'border-[#111111]' : 'border-white'}`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-black truncate transition-colors ${selectedUser?.id === u.id ? 'text-white' : (theme === 'dark' ? 'text-slate-200 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900')}`}>{u.name}</p>
                    <p className={`text-[10px] truncate capitalize font-black tracking-widest ${selectedUser?.id === u.id ? 'text-white/70' : 'text-slate-500'}`}>{u.entityType || 'Human'} • {getLastSeenText(u.lastUpdate)}</p>
                  </div>
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <div className="p-12 text-center">
                  <p className="text-xs text-slate-500 font-black uppercase tracking-widest">No active users</p>
                </div>
              )}
            </div>
          </div>

          {/* Alerts Card */}
          <div className={`${theme === 'dark' ? 'glass-dark' : 'glass'} rounded-[2.5rem] p-6 shadow-2xl border border-white/5`}>
            <h3 className={`font-black mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              <Bell className="w-4 h-4 text-red-500" />
              Recent Alerts
            </h3>
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {alerts.map((alert, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-red-400 leading-relaxed font-black uppercase tracking-widest">{alert}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
              {alerts.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">No alerts triggered</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Map View */}
        <div className="lg:col-span-3 flex flex-col gap-4 lg:gap-6 order-1 lg:order-2">
          <div className="h-[400px] lg:h-auto lg:flex-1 relative rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl">
            <Map 
              users={users} 
              center={selectedUser?.location}
              geofence={geofence || undefined}
              followUserId={selectedUser?.id}
              theme={theme}
            />
            
            {/* Map Overlay Info */}
            <div className="absolute top-8 left-8 z-[1000] flex flex-col gap-4">
              <div className={`${theme === 'dark' ? 'glass-dark' : 'glass'} p-4 rounded-2xl flex items-center gap-6 shadow-2xl`}>
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)] animate-pulse"></div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Online</span>
                </div>
                <div className={`w-px h-5 ${theme === 'dark' ? 'bg-white/10' : 'bg-black/10'}`}></div>
                <div className="flex items-center gap-3">
                  <Navigation className="w-5 h-5 text-blue-500" />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{users.filter(u => u.location).length} Tracking</span>
                </div>
              </div>
            </div>

            {/* Selected User Detail Overlay */}
            <AnimatePresence>
              {selectedUser && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className={`absolute bottom-8 left-8 right-8 z-[1000] p-6 rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl ${theme === 'dark' ? 'glass-dark' : 'glass'}`}
                >
                  <div className="flex items-center gap-6 w-full sm:w-auto">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                      <Users className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className={`text-xl font-black tracking-tight truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedUser.name}</h4>
                      <div className="flex flex-wrap items-center gap-4 mt-2">
                        <div className="px-3 py-1 rounded-lg bg-blue-600/10 text-[9px] font-black text-blue-500 uppercase tracking-widest border border-blue-500/20">
                          {selectedUser.entityType || 'Human'}
                        </div>
                        <div className="px-3 py-1 rounded-lg bg-purple-600/10 text-[9px] font-black text-purple-500 uppercase tracking-widest border border-purple-500/20">
                          {selectedUser.role}
                        </div>
                        <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                          <Activity className="w-3.5 h-3.5" />
                          {getLastSeenText(selectedUser.lastUpdate)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black transition-all shadow-lg shadow-blue-600/20 text-[10px] uppercase tracking-widest">
                      Message
                    </button>
                    <button 
                      onClick={() => setSelectedUser(null)}
                      className={`flex-1 sm:flex-none px-6 py-4 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest shadow-lg ${theme === 'dark' ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-white text-slate-600 hover:bg-slate-50 border border-black/5'}`}
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 order-3">
            {[
              { label: 'Total Users', value: users.length, icon: <Users className="w-6 h-6 text-blue-500" />, shadow: 'shadow-blue-600/10' },
              { label: 'Active Now', value: users.filter(u => u.location).length, icon: <Activity className="w-6 h-6 text-emerald-500" />, shadow: 'shadow-emerald-600/10' },
              { label: 'Avg Speed', value: '12.4', unit: 'km/h', icon: <Info className="w-6 h-6 text-purple-500" />, shadow: 'shadow-purple-600/10' }
            ].map((stat, i) => (
              <div key={i} className={`${theme === 'dark' ? 'glass-dark' : 'glass'} p-8 rounded-[2.5rem] flex items-center gap-6 shadow-2xl border border-white/5`}>
                <div className={`bg-white/5 p-4 rounded-2xl shadow-2xl ${stat.shadow}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">{stat.label}</p>
                  <p className={`text-3xl font-black tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {stat.value} {stat.unit && <span className="text-xs font-black opacity-50 uppercase tracking-widest ml-1">{stat.unit}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
