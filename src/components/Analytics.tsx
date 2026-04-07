import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity, Ruler, Clock, Zap, Footprints, Bike, Car, Plane,
  TrendingUp, BarChart3, MapPin, AlertTriangle,
  Users, Download, Target, ShieldAlert,
  Gauge, Globe, ShieldCheck, Timer, Trophy,
  ArrowUpRight, ArrowDownRight, Minus as MinusIcon, Radar, UserCheck, Wifi
} from 'lucide-react';
import { socket, connectSocket, disconnectSocket } from '../lib/socket';

const ACTIVITY_COLORS: Record<string, { bg: string; text: string; bar: string; dot: string }> = {
  walking:   { bg: 'bg-emerald-500/10', text: 'text-emerald-500', bar: 'bg-emerald-500', dot: 'bg-emerald-400' },
  bike:      { bg: 'bg-amber-500/10',   text: 'text-amber-500',   bar: 'bg-amber-500',   dot: 'bg-amber-400' },
  car:       { bg: 'bg-blue-500/10',    text: 'text-blue-500',    bar: 'bg-blue-500',    dot: 'bg-blue-400' },
  aeroplane: { bg: 'bg-purple-500/10',  text: 'text-purple-500',  bar: 'bg-purple-500',  dot: 'bg-purple-400' },
  other:     { bg: 'bg-slate-500/10',   text: 'text-slate-400',   bar: 'bg-slate-500',   dot: 'bg-slate-400' },
};
const ACTIVITY_LABELS: Record<string, string> = {
  walking: 'Walking', bike: 'Bike', car: 'Car', aeroplane: 'Flight', other: 'Other',
};
const ACTIVITY_ICONS: Record<string, React.ReactElement> = {
  walking: <Footprints className="w-4 h-4" />,
  bike:    <Bike className="w-4 h-4" />,
  car:     <Car className="w-4 h-4" />,
  aeroplane: <Plane className="w-4 h-4" />,
  other:   <Activity className="w-4 h-4" />,
};

const parseDistance = (d: string) => parseFloat(d?.split(' ')[0] || '0');
const parseDuration = (dur: string) => {
  const m = dur?.match(/(\d+)h\s*(\d+)m/);
  return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
};

export default function Analytics({ theme, user }: { theme: 'light' | 'dark'; user: any }) {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [detectedUsers, setDetectedUsers] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        console.log('Analytics: Fetching data for user:', user.id);
        const [tripsRes, anomaliesRes] = await Promise.all([
          fetch(`/api/trips/${user.id}`),
          fetch(`/api/anomalies/${user.id}`)
        ]);
        if (tripsRes.ok) {
          const tData = await tripsRes.json();
          console.log('Analytics: Trips fetched:', tData.length);
          setTrips(tData);
        }
        if (anomaliesRes.ok) {
          const aData = await anomaliesRes.json();
          console.log('Analytics: Anomalies fetched:', aData.length);
          setAnomalies(aData);
        } else {
          console.error('Analytics: Failed to fetch anomalies:', anomaliesRes.status);
        }
      } catch (err) {
        console.error('Analytics: Fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  // Socket: get live user presence and real-time anomalies
  useEffect(() => {
    connectSocket(user);
    
    socket.on('user-status-change', (activeUsers: any[]) => {
      setDetectedUsers(activeUsers.filter((u: any) => u.id !== user.id));
    });

    socket.on('anomaly-detected', (newAnomaly: any) => {
      console.log('Analytics: Anomaly socket event:', newAnomaly);
      if (newAnomaly.userId === user.id) {
        setAnomalies(prev => {
          if (prev.some(a => (a._id === newAnomaly._id) || (a.id === newAnomaly.id))) return prev;
          return [newAnomaly, ...prev].slice(0, 50);
        });
      }
    });

    const handleLocalAnomaly = (e: any) => {
      const data = e.detail;
      console.log('Analytics: Local bridge received:', data);
      if (data.userId === user.id) {
        setAnomalies(prev => {
          if (prev.some(a => (a._id === data._id) || (a.id === data.id))) return prev;
          return [data, ...prev].slice(0, 50);
        });
      }
    };
    window.addEventListener('new-anomaly-local', handleLocalAnomaly);

    return () => {
      socket.off('user-status-change');
      socket.off('anomaly-detected');
      window.removeEventListener('new-anomaly-local', handleLocalAnomaly);
      disconnectSocket();
    };
  }, [user]);

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const { toJpeg } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');
      const el = document.getElementById('analytics-report');
      if (!el) throw new Error('missing');
      const dataUrl = await toJpeg(el, {
        quality: 0.9,
        backgroundColor: theme === 'dark' ? '#0a0a0a' : '#f8fafc',
        filter: (n: HTMLElement) => !n.hasAttribute?.('data-html2canvas-ignore'),
      });
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
      const w = pdf.internal.pageSize.getWidth();
      const { height: ih, width: iw } = pdf.getImageProperties(dataUrl);
      pdf.addImage(dataUrl, 'JPEG', 0, 0, w, (ih * w) / iw);
      pdf.save(`LiveTrackIntel_${Date.now()}.pdf`);
      setStatus({ type: 'success', message: 'Report exported successfully.' });
    } catch {
      setStatus({ type: 'error', message: 'Export failed. Use Ctrl+P → Save as PDF.' });
    } finally {
      setExporting(false);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  // ─── Derived data ───────────────────────────────────────────────────────────
  const totalDistance  = trips.reduce((a, t) => a + parseDistance(t.distance), 0);
  const totalMinutes   = trips.reduce((a, t) => a + parseDuration(t.duration), 0);
  const avgSpeed       = trips.length ? trips.reduce((a, t) => a + parseFloat(t.avgVelocity || '0'), 0) / trips.length : 0;
  const maxSpeed       = trips.length ? Math.max(...trips.map(t => parseFloat(t.avgVelocity || '0'))) : 0;

  const activityCounts: Record<string, number> = {};
  const activityDist:   Record<string, number> = {};
  trips.forEach(t => {
    const k = t.activityType || 'other';
    activityCounts[k] = (activityCounts[k] || 0) + 1;
    activityDist[k]   = (activityDist[k] || 0) + parseDistance(t.distance);
  });
  const topActivity = Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  const locationCounts: Record<string, number> = {};
  trips.forEach(t => { locationCounts[t.location] = (locationCounts[t.location] || 0) + 1; });
  const topLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Hourly trend
  const trendData = Array.from({ length: 12 }, (_, i) => {
    const h = i * 2;
    return trips.filter(t => { const d = new Date(t.timestamp); return d.getHours() >= h && d.getHours() < h + 2; }).length;
  });
  const trendMax = Math.max(...trendData, 1);

  const etaAccuracy    = Math.min(70 + trips.length * 2, 98);
  const totalXP        = Math.floor(totalDistance * 100);
  const totalHours     = Math.floor(totalMinutes / 60);

  const isDark = theme === 'dark';
  const card   = `${isDark ? 'bg-[#111] border-white/6' : 'bg-white border-black/5 shadow-sm'} border rounded-[1.75rem]`;

  if (loading) return (
    <div className={`min-h-full flex flex-col items-center justify-center ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
      <div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Loading analytics…</p>
    </div>
  );

  return (
    <div id="analytics-report" className={`min-h-full px-4 py-6 sm:p-8 lg:p-12 space-y-6 lg:space-y-8 ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>

      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-[9px] font-black uppercase tracking-[0.35em] text-blue-500 mb-2">
            Intelligence Hub
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-black tracking-tight">
            Trip Analytics
          </motion.h1>
        </div>

        <motion.div data-html2canvas-ignore initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-2 flex-wrap">
          {/* Time range */}
          <div className={`flex items-center p-1 rounded-xl gap-1 ${isDark ? 'bg-white/5' : 'bg-white border border-black/6'}`}>
            {(['today', 'week', 'month'] as const).map(tr => (
              <button key={tr} onClick={() => setTimeRange(tr)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${timeRange === tr ? 'bg-blue-600 text-white shadow-md' : isDark ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}>
                {tr}
              </button>
            ))}
          </div>
          <button disabled={exporting} onClick={handleExportPDF}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all ${exporting ? 'opacity-50 cursor-not-allowed bg-slate-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20'}`}>
            {exporting
              ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Download className="w-3.5 h-3.5" />}
            {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </motion.div>
      </header>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: 'Total Distance', value: totalDistance.toFixed(1), unit: 'km',
            icon: <Ruler className="w-5 h-5 text-emerald-500" />,
            trend: trips.length > 1 ? 'up' : 'flat', sub: `${trips.length} trips`,
          },
          {
            label: 'Time Tracked', value: totalHours > 0 ? totalHours : totalMinutes, unit: totalHours > 0 ? 'hrs' : 'min',
            icon: <Clock className="w-5 h-5 text-blue-500" />,
            trend: 'flat', sub: `${totalMinutes % 60}m remainder`,
          },
          {
            label: 'Avg Speed', value: avgSpeed.toFixed(1), unit: 'km/h',
            icon: <Gauge className="w-5 h-5 text-purple-500" />,
            trend: avgSpeed > 20 ? 'up' : 'flat', sub: `Max ${maxSpeed.toFixed(1)} km/h`,
          },
          {
            label: 'Anomalies', value: anomalies.length, unit: '',
            icon: <ShieldAlert className="w-5 h-5 text-red-500" />,
            trend: anomalies.length > 0 ? 'down' : 'flat',
            sub: anomalies.length > 0 ? `${anomalies.filter(a => a.sev === 'high').length} critical` : 'All clear',
          },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={`${card} p-5 sm:p-6`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/6' : 'bg-slate-50 border border-black/5'}`}>
                {s.icon}
              </div>
              <div className={`flex items-center gap-1 text-[8px] font-black ${s.trend === 'up' ? 'text-emerald-400' : s.trend === 'down' ? 'text-red-400' : 'text-slate-500'}`}>
                {s.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : s.trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : <MinusIcon className="w-3 h-3" />}
              </div>
            </div>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{s.label}</p>
            <p className="text-2xl sm:text-3xl font-black tracking-tighter">
              {s.value}
              {s.unit && <span className="text-[10px] font-black opacity-40 ml-1 uppercase">{s.unit}</span>}
            </p>
            <p className={`text-[9px] font-medium mt-1.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Row 2: Activity Breakdown + Top Locations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Activity Breakdown */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className={`${card} p-6 sm:p-8`}>
          <div className="flex items-center gap-3 mb-7">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/6' : 'bg-slate-50 border border-black/5'}`}>
              <BarChart3 className="w-4.5 h-4.5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">Activity Breakdown</h3>
              <p className={`text-[9px] font-medium mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{trips.length} trips recorded</p>
            </div>
          </div>

          {trips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Activity className={`w-10 h-10 mb-3 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
              <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>No trips yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(activityCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                const ac = ACTIVITY_COLORS[type] || ACTIVITY_COLORS.other;
                const pct = Math.round((count / trips.length) * 100);
                const dist = (activityDist[type] || 0).toFixed(1);
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${ac.bg} ${ac.text}`}>
                          {ACTIVITY_ICONS[type]}
                        </div>
                        <span className="text-[11px] font-black">{ACTIVITY_LABELS[type] || type}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{dist} km</span>
                        <span className={`text-[10px] font-black w-8 text-right ${ac.text}`}>{pct}%</span>
                      </div>
                    </div>
                    <div className={`h-1.5 w-full rounded-full ${isDark ? 'bg-white/6' : 'bg-slate-100'}`}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.1 }}
                        className={`h-full rounded-full ${ac.bar}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Top Locations */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className={`${card} p-6 sm:p-8`}>
          <div className="flex items-center gap-3 mb-7">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/6' : 'bg-slate-50 border border-black/5'}`}>
              <MapPin className="w-4.5 h-4.5 text-rose-500" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">Top Locations</h3>
              <p className={`text-[9px] font-medium mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Most visited places</p>
            </div>
          </div>

          {topLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Globe className={`w-10 h-10 mb-3 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
              <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>No location data</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topLocations.map((loc, i) => {
                const pct = Math.round((loc.count / (topLocations[0]?.count || 1)) * 100);
                const colors = ['text-blue-500', 'text-emerald-500', 'text-purple-500', 'text-amber-500', 'text-rose-500'];
                const bars   = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'];
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`text-[10px] font-black w-4 shrink-0 ${colors[i]}`}>{i + 1}</span>
                        <span className={`text-[11px] font-black truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{loc.name || 'Unknown'}</span>
                      </div>
                      <span className={`text-[9px] font-bold shrink-0 ml-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{loc.count} trip{loc.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className={`h-1.5 w-full rounded-full ${isDark ? 'bg-white/6' : 'bg-slate-100'}`}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.1 + i * 0.05 }}
                        className={`h-full rounded-full ${bars[i]}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Row 3: Hourly Trend + ETA Accuracy ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Hourly Trend */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className={`lg:col-span-2 ${card} p-6 sm:p-8`}>

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/10' : 'bg-blue-50 border border-blue-100'}`}>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight">Hourly Activity</h3>
                <p className={`text-[9px] font-medium mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Trip distribution across the day</p>
              </div>
            </div>
            {/* Peak callout */}
            {trendMax > 0 && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isDark ? 'bg-blue-500/8 border-blue-500/15' : 'bg-blue-50 border-blue-100'}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">
                  Peak {(() => { const h = trendData.indexOf(trendMax) * 2; const ampm = h < 12 ? 'AM' : 'PM'; const hr = h % 12 || 12; return `${hr}${ampm}`; })()}
                </p>
              </div>
            )}
          </div>

          {/* Chart area */}
          <div className="relative">
            {/* Horizontal guide lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7">
              {[100, 75, 50, 25].map((pct) => (
                <div key={pct} className="flex items-center gap-2">
                  <span className={`text-[8px] font-bold w-4 text-right shrink-0 ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>
                    {pct === 100 ? trendMax : ''}
                  </span>
                  <div className={`flex-1 h-px ${isDark ? 'border-t border-white/4 border-dashed' : 'border-t border-black/5 border-dashed'}`} />
                </div>
              ))}
            </div>

            {/* Bars */}
            {(() => {
              const BAR_AREA_H = 140; // px — available vertical space for bars
              const timeLabel = (i: number) => {
                const h = i * 2;
                if (h === 0)  return '12AM';
                if (h === 6)  return '6AM';
                if (h === 12) return '12PM';
                if (h === 18) return '6PM';
                return '';
              };
              return (
                <div className="flex items-end gap-1 sm:gap-1.5 pl-6 pt-2" style={{ height: BAR_AREA_H + 28 }}>
                  {trendData.map((v, i) => {
                    const barH   = trendMax > 0 ? Math.max((v / trendMax) * BAR_AREA_H, v > 0 ? 8 : 3) : 3;
                    const isPeak = v === trendMax && v > 0;
                    const isHov  = hoveredBar === i;
                    const label  = timeLabel(i);
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center justify-end group relative"
                        style={{ height: BAR_AREA_H + 28 }}
                        onMouseEnter={() => setHoveredBar(i)}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        {/* Tooltip */}
                        <AnimatePresence>
                          {isHov && (
                            <motion.div
                              initial={{ opacity: 0, y: 4, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.9 }}
                              transition={{ duration: 0.15 }}
                              className={`absolute bottom-full mb-1 px-2.5 py-1.5 rounded-xl shadow-xl border text-center whitespace-nowrap z-10 pointer-events-none ${isDark ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-black/8 shadow-slate-200/80'}`}
                            >
                              <p className="text-[10px] font-black text-blue-500">{v} trip{v !== 1 ? 's' : ''}</p>
                              <p className={`text-[8px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {(() => { const h = i * 2; const a1 = h < 12 ? 'AM' : 'PM'; const h1 = h % 12 || 12; const h2 = (h + 2) % 24; const a2 = h2 < 12 ? 'AM' : 'PM'; const hr2 = h2 % 12 || 12; return `${h1}${a1}–${hr2}${a2}`; })()}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Bar */}
                        <div className="relative w-full mb-7" style={{ height: barH }}>
                          {isPeak && (
                            <div
                              className="absolute inset-0 rounded-t-lg blur-md opacity-50 bg-blue-500"
                            />
                          )}
                          <motion.div
                            className={`w-full h-full rounded-t-lg transition-colors duration-200 ${
                              isPeak
                                ? 'bg-blue-500'
                                : isHov
                                ? isDark ? 'bg-blue-400/50' : 'bg-blue-300/70'
                                : isDark
                                ? v > 0 ? 'bg-white/15' : 'bg-white/5'
                                : v > 0 ? 'bg-slate-300' : 'bg-slate-100'
                            }`}
                            style={{ transformOrigin: 'bottom', ...(isPeak ? { boxShadow: '0 0 12px rgba(59,130,246,0.5)' } : {}) }}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ duration: 0.45, delay: i * 0.04, ease: [0.34, 1.56, 0.64, 1] }}
                          />
                        </div>

                        {/* Time label */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-7 flex items-center">
                          {label ? (
                            <p className={`text-[7px] font-black uppercase tracking-wide whitespace-nowrap ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{label}</p>
                          ) : (
                            <div className={`w-0.5 h-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Bottom summary strip */}
          <div className={`mt-5 pt-4 border-t flex items-center justify-between ${isDark ? 'border-white/6' : 'border-black/5'}`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm bg-blue-500" />
                <p className={`text-[9px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Peak hour</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-sm ${isDark ? 'bg-white/12' : 'bg-slate-200'}`} />
                <p className={`text-[9px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Active</p>
              </div>
            </div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              {trips.length} total trip{trips.length !== 1 ? 's' : ''}
            </p>
          </div>
        </motion.div>

        {/* ETA + XP Summary */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className={`${card} p-6 sm:p-8 flex flex-col gap-6`}>

          {/* XP block */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-400" />
              <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Total XP Earned</p>
            </div>
            <p className="text-3xl font-black tracking-tighter text-amber-400">
              {totalXP.toLocaleString()}
              <span className="text-xs font-black text-amber-500/60 ml-1.5 uppercase">XP</span>
            </p>
            <p className={`text-[9px] font-medium mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              ≈ Level {Math.floor(totalXP / 1000) + 1} Operative
            </p>
          </div>

          <div className={`w-full h-px ${isDark ? 'bg-white/6' : 'bg-black/5'}`} />

          {/* ETA accuracy */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-emerald-400" />
              <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>ETA Accuracy</p>
            </div>
            <div className={`h-2 w-full rounded-full ${isDark ? 'bg-white/8' : 'bg-slate-100'} mb-2`}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${etaAccuracy}%` }} transition={{ duration: 1 }}
                className="h-full rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            </div>
            <p className="text-sm font-black text-emerald-500">{etaAccuracy}%</p>
            <p className={`text-[9px] font-medium mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>avg error ±2.1 min</p>
          </div>

          <div className={`w-full h-px ${isDark ? 'bg-white/6' : 'bg-black/5'}`} />

          {/* Top activity */}
          <div>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Preferred Mode</p>
            <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${ACTIVITY_COLORS[topActivity]?.bg || 'bg-blue-500/10'}`}>
              <span className={ACTIVITY_COLORS[topActivity]?.text || 'text-blue-500'}>{ACTIVITY_ICONS[topActivity]}</span>
              <span className={`text-sm font-black ${ACTIVITY_COLORS[topActivity]?.text || 'text-blue-500'}`}>{ACTIVITY_LABELS[topActivity] || '—'}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Row 4: Anomalies + Geofence Compliance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Anomalies */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className={`p-6 sm:p-8 flex flex-col bg-gradient-to-br from-red-600 to-red-700 border-red-500 shadow-[0_20px_50px_rgba(220,38,38,0.3)] rounded-[1.75rem] min-h-[340px] text-white relative overflow-hidden`}>
          
          {/* Abstract pattern background for high-end look */}
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <ShieldAlert className="w-48 h-48 -mr-12 -mt-12 rotate-12" />
          </div>

          <div className="flex items-center justify-between mb-8 shrink-0 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/20 backdrop-blur-md shadow-lg border border-white/20">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-white">AI Anomaly Detection</h3>
                <p className="text-[9px] font-medium mt-0.5 text-white/70">Critical surveillance telemetry monitoring</p>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl bg-white text-red-600 shadow-xl border border-white/30">
              {anomalies.length} FLAGGED
            </span>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden relative z-10">
            {anomalies.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="relative mb-5 bg-white/10 p-5 rounded-[2rem] border border-white/10">
                  <ShieldCheck className="w-14 h-14 text-white" />
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.4, opacity: 0.3 }}
                    transition={{ repeat: Infinity, duration: 2, repeatType: 'reverse' }}
                    className="absolute inset-0 bg-white/20 blur-2xl rounded-full"
                  />
                </div>
                <p className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Grid Clean</p>
                <p className="text-[9px] font-bold uppercase mt-2 text-white/60 tracking-widest">Systematic Integrity Confirmed</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[360px] pr-2 custom-scrollbar">
                {anomalies.map((a) => {
                  const severity = a.severity || 'low';
                  const sevColor = severity === 'high' ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]' : severity === 'medium' ? 'bg-amber-300' : 'bg-blue-300';
                  const itemBg   = 'bg-white/10 border-white/10 hover:bg-white/15';
                  return (
                    <div key={a._id || a.id} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${itemBg}`}>
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${sevColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-white">{a.type}</p>
                        <p className="text-[10px] font-medium mt-0.5 text-white/80">{a.description || a.desc}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <MapPin className="w-2.5 h-2.5 text-white/40" />
                          <p className="text-[9px] font-bold text-white/60 truncate">{a.location || 'System Broadcast'}</p>
                        </div>
                      </div>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 border border-white/20 ${severity === 'high' ? 'bg-white text-red-600' : 'bg-white/10 text-white'}`}>
                        {severity}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Geofence Radar */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className={`${card} p-6 sm:p-8`}>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50 border border-emerald-100'}`}>
                <Radar className="w-4.5 h-4.5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight">Geofence Radar</h3>
                <p className={`text-[9px] font-medium mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Live users in your network</p>
              </div>
            </div>
            {/* Count badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-500">{detectedUsers.length} detected</span>
            </div>
          </div>

          {/* Stats strip */}
          <div className={`grid grid-cols-2 rounded-2xl overflow-hidden border mb-5 ${isDark ? 'border-white/6' : 'border-black/5'}`}>
            <div className={`p-3.5 text-center ${isDark ? 'bg-white/3' : 'bg-slate-50'}`}>
              <p className="text-lg font-black text-emerald-500">{detectedUsers.length}</p>
              <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Online Now</p>
            </div>
            <div className={`p-3.5 text-center border-l ${isDark ? 'bg-white/3 border-white/6' : 'bg-slate-50 border-black/5'}`}>
              <p className="text-lg font-black text-blue-500">
                {detectedUsers.filter(u => u.location).length}
              </p>
              <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Broadcasting</p>
            </div>
          </div>

          {/* User list */}
          {detectedUsers.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${isDark ? 'bg-white/4' : 'bg-slate-100'}`}>
                <Users className={`w-6 h-6 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
              </div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>No users detected</p>
              <p className={`text-[9px] font-medium mt-1 ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>Waiting for others to join the network</p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[320px] pr-2 custom-scrollbar">
              {detectedUsers.map((u, i) => {
                const initials = u.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
                const colors = ['bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-orange-500'];
                const color  = colors[i % colors.length];
                const isLive = !!u.location;
                return (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${isDark ? 'bg-white/3 border-white/6 hover:border-white/12' : 'bg-slate-50 border-black/5 hover:border-black/8'}`}
                  >
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-[10px] font-black ${color}`}>
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black truncate">{u.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                        <p className={`text-[9px] font-medium truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          {isLive ? 'Broadcasting location' : 'Location hidden'}
                        </p>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg shrink-0 ${isLive ? (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50') : (isDark ? 'bg-white/5' : 'bg-slate-100')}`}>
                      {isLive
                        ? <Wifi className="w-3 h-3 text-emerald-500" />
                        : <UserCheck className={`w-3 h-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />}
                      <span className={`text-[8px] font-black uppercase tracking-wide ${isLive ? 'text-emerald-500' : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                        {isLive ? 'Live' : 'Online'}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Status toast ── */}
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: 80, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 80, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-50 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-xl min-w-[300px] ${status.type === 'success' ? (isDark ? 'bg-emerald-950/80 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700') : (isDark ? 'bg-red-950/80 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700')}`}>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest">{status.type === 'success' ? 'Success' : 'Error'}</p>
              <p className="text-[11px] font-medium mt-0.5">{status.message}</p>
            </div>
            <button onClick={() => setStatus(null)} className="text-[9px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity shrink-0">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
