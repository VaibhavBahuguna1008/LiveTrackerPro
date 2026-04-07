import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Shield, Bell, Lock, Trash2, AlertCircle,
  Download, History, Eye, EyeOff, CheckCircle2, XCircle, ArrowUpRight
} from 'lucide-react';

export default function AccountSettings({
  theme, user, setUser, onLogout
}: {
  theme: 'light' | 'dark';
  user: any;
  setUser: (u: any) => void;
  onLogout: () => void;
}) {
  const isDark = theme === 'dark';
  const card = `${isDark ? 'bg-[#111] border-white/5' : 'bg-white border-black/5'} border rounded-[2rem] p-6 sm:p-8 shadow-xl`;

  // ── States ──────────────────────────────────────────────
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  
  const [profileStatus, setProfileStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwStatus, setPwStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const [dataStatus, setDataStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  
  // ── Auto-dismiss banners ──────────────────────────────────
  useEffect(() => {
    if (profileStatus) {
      const timer = setTimeout(() => setProfileStatus(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [profileStatus]);

  useEffect(() => {
    if (pwStatus) {
      const timer = setTimeout(() => setPwStatus(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [pwStatus]);

  useEffect(() => {
    if (dataStatus) {
      const timer = setTimeout(() => setDataStatus(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [dataStatus]);

  // ── Profile ──────────────────────────────────────────────
  const handleUpdateProfile = async () => {
    if (!name.trim() || !email.trim()) {
      setProfileStatus({ ok: false, msg: 'Name and email are required.' });
      return;
    }
    setSavingProfile(true);
    setProfileStatus(null);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const updated = { ...user, ...data.user };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      setProfileStatus({ ok: true, msg: 'Profile updated successfully.' });
    } catch (err: any) {
      setProfileStatus({ ok: false, msg: err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Password ──────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      setPwStatus({ ok: false, msg: 'All password fields are required.' });
      return;
    }
    if (newPw.length < 6) {
      setPwStatus({ ok: false, msg: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwStatus({ ok: false, msg: 'New passwords do not match.' });
      return;
    }
    setSavingPw(true);
    setPwStatus(null);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPwStatus({ ok: true, msg: 'Password changed successfully.' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: any) {
      setPwStatus({ ok: false, msg: err.message || 'Failed to change password.' });
    } finally {
      setSavingPw(false);
    }
  };

  // ── Notifications ─────────────────────────────────────────
  const [notifications, setNotifications] = useState(user?.notifications || { geofence: true, speed: true, newUser: false });

  const toggleNotification = async (key: keyof typeof notifications) => {
    const isEnabling = !notifications[key];
    const updated = { ...notifications, [key]: isEnabling };
    setNotifications(updated);

    // If enabling, request permission and show a sample
    if (isEnabling && "Notification" in window) {
      if (Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          new Notification("LiveTrack Pro", {
            body: `Notifications for ${String(key)} alerts enabled!`,
            icon: "/favicon.ico"
          });
        }
      } else {
        new Notification("LiveTrack Pro", {
          body: `Notifications for ${String(key)} alerts enabled!`,
          icon: "/favicon.ico"
        });
      }
    }
    
    // Sync with backend
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, notifications: updated }),
      });
      if (!res.ok) throw new Error('Failed to save notification preference.');
      const data = await res.json();
      setUser({ ...user, notifications: data.user.notifications });
      localStorage.setItem('user', JSON.stringify({ ...user, notifications: data.user.notifications }));
    } catch (err: any) {
      console.error(err);
      // Revert if failed
      setNotifications(notifications);
      alert(err.message || 'Failed to update notification settings.');
    }
  };

  // ── Data Actions ──────────────────────────────────────────
  const [exportingData, setExportingData] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  const handleExportData = async () => {
    setExportingData(true);
    setDataStatus(null);
    try {
      const res = await fetch(`/api/trips/${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch trips.');
      const trips = await res.json();
      const payload = { exportedAt: new Date().toISOString(), user: { id: user.id, name: user.name, email: user.email }, trips };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `livetrack-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDataStatus({ ok: true, msg: `Exported ${trips.length} trip${trips.length !== 1 ? 's' : ''} successfully.` });
    } catch (err: any) {
      setDataStatus({ ok: false, msg: err.message || 'Export failed.' });
    } finally {
      setExportingData(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all trip history? This cannot be undone.')) return;
    setClearingHistory(true);
    setDataStatus(null);
    try {
      const res = await fetch(`/api/trips/user/${user.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to clear history.');
      setDataStatus({ ok: true, msg: 'All trip history cleared.' });
    } catch (err: any) {
      setDataStatus({ ok: false, msg: err.message || 'Failed to clear history.' });
    } finally {
      setClearingHistory(false);
    }
  };

  // ── Delete Account ────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteSection, setShowDeleteSection] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/auth/account/${user.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete account.');
      onLogout();
    } catch (err: any) {
      setDeleting(false);
      alert(err.message || 'Failed to delete account.');
    }
  };

  // ── Helpers ───────────────────────────────────────────────
  const StatusBanner = ({ status }: { status: { ok: boolean; msg: string } | null }) => (
    <AnimatePresence>
      {status && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-[11px] font-bold ${status.ok ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
        >
          {status.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {status.msg}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const inputCls = `w-full px-4 py-3 rounded-xl border font-medium text-sm focus:outline-none focus:border-blue-500 transition-all ${isDark ? 'bg-white/5 border-white/8 text-white placeholder:text-slate-600' : 'bg-slate-50 border-black/8 text-slate-900 placeholder:text-slate-400'}`;

  return (
    <div className={`min-h-full p-4 sm:p-6 lg:p-10 transition-colors duration-500 ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>

      <header className="mb-8 max-w-4xl">
        <motion.h1 initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
          Account Settings
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className={`text-sm font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Manage your profile, security, and data preferences.
        </motion.p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl">

        {/* ── Left Column ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Profile Information */}
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={card}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
                <User className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-base font-black tracking-tight">Profile Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-1.5">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Your name" />
              </div>
              <div className="space-y-1.5">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" />
              </div>
            </div>

            <StatusBanner status={profileStatus} />

            <div className="flex justify-end mt-4">
              <button onClick={handleUpdateProfile} disabled={savingProfile}
                className={`px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm tracking-wide transition-all active:scale-95 shadow-lg shadow-blue-600/20 ${savingProfile ? 'opacity-60 cursor-not-allowed' : ''}`}>
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.section>

          {/* Change Password */}
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={card}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-100'}`}>
                <Lock className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-base font-black tracking-tight">Change Password</h2>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Current Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                    className={inputCls} placeholder="••••••••" />
                  <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>New Password</label>
                  <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                    className={inputCls} placeholder="Min 6 chars" />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Confirm New</label>
                  <input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                    className={`${inputCls} ${confirmPw && newPw !== confirmPw ? 'border-red-500' : ''}`} placeholder="Repeat password" />
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <StatusBanner status={pwStatus} />
              <div className="flex justify-end">
                <button onClick={handleChangePassword} disabled={savingPw}
                  className={`px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black text-sm tracking-wide transition-all active:scale-95 shadow-lg shadow-amber-500/20 ${savingPw ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  {savingPw ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </motion.section>

          {/* Notification Preferences */}
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className={card}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-100'}`}>
                <Bell className="w-5 h-5 text-purple-500" />
              </div>
              <h2 className="text-base font-black tracking-tight">Notification Preferences</h2>
            </div>

            <div className="space-y-5">
              {[
                { id: 'geofence', title: 'Geofence Alerts', desc: 'Notify when a user enters or exits your radar zone.' },
                { id: 'speed', title: 'Speed Anomaly', desc: 'Alert when velocity deviates significantly from normal.' },
                { id: 'newUser', title: 'New User Joined', desc: 'Alert when someone new joins your live session.' },
              ].map(item => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black mb-0.5">{item.title}</p>
                    <p className={`text-[10px] font-medium leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.desc}</p>
                  </div>
                  <button onClick={() => toggleNotification(item.id as keyof typeof notifications)}
                    className={`relative w-12 h-7 rounded-full transition-all duration-300 p-1 shrink-0 ${notifications[item.id] ? 'bg-blue-600' : isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-lg transition-all duration-300 ${notifications[item.id] ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
            </div>
          </motion.section>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-6">

          {/* Account Summary */}
          <motion.section 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.1, duration: 0.8, ease: "easeOut" }}
            className="relative overflow-hidden rounded-[2.5rem] p-8 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-2xl shadow-blue-900/30 border border-white/10"
          >
            {/* Background flourish */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-black/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex flex-col gap-6">
                {/* Avatar & Identifiers */}
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl font-black border border-white/20 shadow-inner">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/80">Active Session</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-none truncate mb-1">
                      {user.name}
                    </h2>
                    <p className="text-blue-100/60 text-sm font-medium tracking-wide truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Tags & Metadata */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2 shadow-sm">
                    <Shield className="w-3.5 h-3.5 text-blue-300" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {user.role === 'admin' ? 'Administrator' : 'Standard Access'}
                    </span>
                  </div>
                  <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
                  </div>
                </div>

                {/* Bottom Stats */}
                <div className="mt-4 pt-6 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-blue-200/60" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-200/60">Data Security</p>
                      <p className="text-[11px] font-bold text-white/90">E2E Matrix Encrypted</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-white/20" />
                </div>
              </div>
            </div>
          </motion.section>

          {/* Data Management */}
          <motion.section initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className={card}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'}`}>
                <History className="w-5 h-5 text-emerald-500" />
              </div>
              <h2 className="text-base font-black tracking-tight">Data Management</h2>
            </div>

            <div className="space-y-3">
              <button onClick={handleExportData} disabled={exportingData}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-sm font-bold ${isDark ? 'border-white/8 bg-white/4 hover:bg-white/8 text-slate-300' : 'border-black/6 bg-slate-50 hover:bg-slate-100 text-slate-700'} ${exportingData ? 'opacity-60 cursor-not-allowed' : 'active:scale-[0.98]'}`}>
                <Download className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="flex-1 text-left">
                  <p className="text-[11px] font-black uppercase tracking-widest">{exportingData ? 'Exporting...' : 'Export Trip Data'}</p>
                  <p className={`text-[9px] font-medium mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Download all trips as JSON</p>
                </div>
              </button>

              <button onClick={handleClearHistory} disabled={clearingHistory}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${isDark ? 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10' : 'border-amber-200 bg-amber-50 hover:bg-amber-100'} ${clearingHistory ? 'opacity-60 cursor-not-allowed' : 'active:scale-[0.98]'}`}>
                <Trash2 className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex-1 text-left">
                  <p className="text-[11px] font-black uppercase tracking-widest text-amber-500">{clearingHistory ? 'Clearing...' : 'Clear Trip History'}</p>
                  <p className={`text-[9px] font-medium mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Permanently removes all recorded trips</p>
                </div>
              </button>
            </div>

            <div className="mt-3">
              <StatusBanner status={dataStatus} />
            </div>
          </motion.section>

          {/* Danger Zone */}
          <motion.section initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className={`${isDark ? 'bg-red-500/5 border-red-500/15' : 'bg-red-50 border-red-200'} border rounded-[2rem] p-6`}>
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <h2 className="text-base font-black text-red-500">Danger Zone</h2>
            </div>
            <p className={`text-[11px] font-medium leading-relaxed mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Permanently deletes your account, all trips, and location history. This cannot be undone.
            </p>

            {!showDeleteSection ? (
              <button onClick={() => setShowDeleteSection(true)}
                className="text-red-500 font-black text-[10px] uppercase tracking-widest hover:text-red-400 transition-colors flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5" /> Delete My Account
              </button>
            ) : (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Type <span className="text-red-500">DELETE</span> to confirm
                  </p>
                  <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                    className={`${inputCls} border-red-500/30 focus:border-red-500`}
                    placeholder="DELETE" />
                  <div className="flex gap-2">
                    <button onClick={() => { setShowDeleteSection(false); setDeleteConfirm(''); }}
                      className={`flex-1 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${isDark ? 'border-white/8 text-slate-400 hover:bg-white/5' : 'border-black/8 text-slate-500 hover:bg-slate-100'}`}>
                      Cancel
                    </button>
                    <button onClick={handleDeleteAccount}
                      disabled={deleteConfirm !== 'DELETE' || deleting}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${deleteConfirm === 'DELETE' ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 active:scale-95' : isDark ? 'bg-white/5 text-slate-600 cursor-not-allowed' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                      {deleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </motion.section>
        </div>
      </div>
    </div>
  );
}
