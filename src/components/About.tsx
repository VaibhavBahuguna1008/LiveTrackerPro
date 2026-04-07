import { motion, useScroll, useTransform } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Shield, Zap, Users, Navigation, Activity, Globe, Smartphone, Clock,
  ArrowLeft, Radar, History, Target, Copy, Play, BarChart3, Route,
  Compass, AlertTriangle, Lock, Navigation2, ChevronRight, Check,
  Gauge, Flame, Trophy, Map, GitBranch, Eye, EyeOff, Cpu
} from 'lucide-react';

const FEATURE_SECTIONS = [
  {
    tag: 'Core Tracking',
    color: 'blue',
    title: 'Real-time Location Intelligence',
    description: 'Sub-second GPS updates broadcast to all connected clients via WebSocket. High-accuracy positioning with ±3m precision in optimal conditions.',
    icon: <Navigation2 className="w-6 h-6 text-blue-500" />,
    details: [
      'Live GPS via browser Geolocation API with high-accuracy mode',
      'Automatic activity detection: walk / bike / car / flight',
      'Speed & heading calculation from consecutive GPS fixes',
      'Haversine distance formula for accurate trip measurement',
    ],
    accent: 'blue'
  },
  {
    tag: 'Time Travel',
    color: 'cyan',
    title: 'Temporal Replay Engine',
    description: 'Scrub through your location history with frame-by-frame control. Play, pause, and step through every recorded position.',
    icon: <Clock className="w-6 h-6 text-cyan-400" />,
    details: [
      'Up to 100-point high-resolution breadcrumb buffer',
      'Play / Pause with 0.5×, 1×, 2×, 4× speed control',
      'Step forward/back through individual position snapshots',
      'Historical path overlay renders cyan on the live map',
    ],
    accent: 'cyan'
  },
  {
    tag: 'Radar & Geofencing',
    color: 'blue',
    title: 'Adaptive Geofence Radar',
    description: 'Draw circular security perimeters from 100m to 5km. Get instant entry and exit notifications for every tracked entity.',
    icon: <Radar className="w-6 h-6 text-blue-500" />,
    details: [
      'Adjustable radius via real-time slider (100m – 5km)',
      'Entry / exit notifications dispatched in < 1 second',
      'Live count of users currently inside the zone',
      'Visual dashed perimeter ring on the map canvas',
    ],
    accent: 'blue'
  },
  {
    tag: 'Exact Positioning',
    color: 'emerald',
    title: 'Precision Coordinate Engine',
    description: 'Six-decimal latitude/longitude display with one-tap clipboard copy. GPS accuracy ring shows your exact confidence radius on the map.',
    icon: <Target className="w-6 h-6 text-emerald-400" />,
    details: [
      'Coordinates shown to 6 decimal places (~11cm resolution)',
      'One-tap copy to clipboard with visual confirmation',
      'Colour-coded GPS accuracy: green ≤ 10m / amber ≤ 30m / red > 30m',
      'Accuracy circle overlay dynamically drawn on map',
    ],
    accent: 'emerald'
  },
  {
    tag: 'Manual Location',
    color: 'amber',
    title: 'Manual Position Override',
    description: 'Input coordinates by hand, pick a point directly on the map, or switch between live GPS and manual mode at any time.',
    icon: <MapPin className="w-6 h-6 text-amber-400" />,
    details: [
      'Latitude / longitude text fields with instant validation',
      'Tap-to-select mode — click anywhere on the map to teleport',
      'Address reverse-geocoding appears immediately after update',
      'Manual updates propagate to all connected peers in real time',
    ],
    accent: 'amber'
  },
  {
    tag: 'Location Timeline',
    color: 'purple',
    title: 'Location Change Timeline',
    description: 'Every GPS fix is logged with timestamp, coordinates, and reverse-geocoded address. Browse your full position history in the side panel.',
    icon: <History className="w-6 h-6 text-purple-400" />,
    details: [
      'Chronological list of up to 50 recent position entries',
      'Address lookup every 5 updates (Nominatim reverse geocoding)',
      'Speed at each recorded point displayed inline',
      'Dual-tab panel: Positions view + Activity Events view',
    ],
    accent: 'purple'
  },
  {
    tag: 'Trip Recording',
    color: 'rose',
    title: 'Trip Capture & Storage',
    description: 'One-tap recording with automatic stats. Save trips to MongoDB with name, location, distance, duration, and average speed.',
    icon: <Route className="w-6 h-6 text-rose-400" />,
    details: [
      'Start / stop recording with live elapsed-time display',
      'Activity type tagging: walking, bike, car, plane, other',
      'Trip name & location pre-filled, fully editable before save',
      'Persistent history with search, sort, filter, and delete',
    ],
    accent: 'rose'
  },
  {
    tag: 'Analytics',
    color: 'blue',
    title: 'Fleet & Performance Analytics',
    description: 'Deep-dive into your movement patterns with fleet stats, anomaly detection, top locations, and behavioral insights.',
    icon: <BarChart3 className="w-6 h-6 text-blue-500" />,
    details: [
      'Fleet overview: distance, idle %, XP, vehicle type per trip',
      'Anomaly detection: speed spikes, sudden route deviations',
      'Top-5 most visited locations ranked by visit count',
      'AI behavioral insight generated from trip patterns',
    ],
    accent: 'blue'
  },
  {
    tag: 'AI Surveillance',
    color: 'red',
    title: 'AI Surveillance Layer',
    description: 'Continuous background analysis flags unusual movement: extreme speed, prolonged stops, and abrupt direction changes.',
    icon: <AlertTriangle className="w-6 h-6 text-red-400" />,
    details: [
      'Speed anomaly alert when velocity exceeds 140 km/h',
      'Stationary alert after 10 minutes without movement',
      'Sudden heading change > 90° triggers route deviation alert',
      'All alerts dispatched as toast + sidebar notifications',
    ],
    accent: 'red'
  },
  {
    tag: 'Gamification',
    color: 'amber',
    title: 'Operative XP & Leveling',
    description: 'Every meter you travel earns XP. Level up, unlock badges, and see your progression displayed on the map for all to see.',
    icon: <Trophy className="w-6 h-6 text-amber-400" />,
    details: [
      '1 XP per 10 metres — accumulates in real time',
      'Level threshold: Level × 1000 XP per tier',
      'Level-up toast notification on promotion',
      'XP progress bar displayed in map popups and sidebar',
    ],
    accent: 'amber'
  },
  {
    tag: 'Privacy Mode',
    color: 'slate',
    title: 'Ghost Privacy Mode',
    description: 'Activate Ghost Mode to fuzz your broadcast coordinates with ±500m random offset. Your approximate location is shared; exact position stays private.',
    icon: <EyeOff className="w-6 h-6 text-slate-400" />,
    details: [
      'Coordinate fuzzing applied before every socket broadcast',
      'Your map view remains exact — only broadcast is obscured',
      'Ghost entity type shown on other users\' maps',
      'Toggle instantly from the top action bar',
    ],
    accent: 'slate'
  },
  {
    tag: 'AI Prediction',
    color: 'blue',
    title: 'Predictive Destination Engine',
    description: 'Dead-reckoning algorithm projects where each entity will be in 5 minutes. Destination is reverse-geocoded and shown as a dashed vector on the map.',
    icon: <Cpu className="w-6 h-6 text-blue-400" />,
    details: [
      'Great-circle dead-reckoning from current speed & heading',
      'Activates when speed exceeds 10 km/h',
      'Destination suburb/city resolved via Nominatim geocoding',
      'Dashed arrow polyline + floating label on the live map',
    ],
    accent: 'blue'
  },
];

const ACCENT_CLASSES: Record<string, { bg: string; border: string; text: string; tag: string }> = {
  blue:   { bg: 'bg-blue-500/5',   border: 'border-blue-500/15',   text: 'text-blue-400',   tag: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  cyan:   { bg: 'bg-cyan-500/5',   border: 'border-cyan-500/15',   text: 'text-cyan-400',   tag: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  emerald:{ bg: 'bg-emerald-500/5',border: 'border-emerald-500/15',text: 'text-emerald-400',tag: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  amber:  { bg: 'bg-amber-500/5',  border: 'border-amber-500/15',  text: 'text-amber-400',  tag: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  purple: { bg: 'bg-purple-500/5', border: 'border-purple-500/15', text: 'text-purple-400', tag: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  rose:   { bg: 'bg-rose-500/5',   border: 'border-rose-500/15',   text: 'text-rose-400',   tag: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  red:    { bg: 'bg-red-500/5',    border: 'border-red-500/15',    text: 'text-red-400',    tag: 'bg-red-500/10 text-red-400 border-red-500/20' },
  indigo: { bg: 'bg-indigo-500/5', border: 'border-indigo-500/15', text: 'text-indigo-400', tag: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  slate:  { bg: 'bg-slate-500/5',  border: 'border-slate-500/15',  text: 'text-slate-400',  tag: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

const STATS = [
  { val: '99.9%', label: 'Uptime', sub: 'Always on' },
  { val: '<100ms', label: 'Latency', sub: 'Global avg' },
  { val: '±3m', label: 'GPS Precision', sub: 'Optimal conditions' },
  { val: '256-bit', label: 'Encryption', sub: 'AES at rest' },
  { val: '100pts', label: 'History Buffer', sub: 'Per session' },
  { val: '14', label: 'Features', sub: 'Built in' },
];

export default function About({ theme }: { theme: 'light' | 'dark' }) {
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const navigate = useNavigate();

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen relative transition-colors duration-700 ${isDark ? 'bg-[#050505] text-white' : 'bg-[#fcfdfd] text-slate-900'} overflow-hidden font-sans`}>

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div style={{ y: y1 }} className={`absolute top-[-5%] right-[-5%] w-[40%] h-[40%] blur-[140px] rounded-full opacity-[0.08] ${isDark ? 'bg-blue-600' : 'bg-blue-400'}`} />
        <motion.div style={{ y: y2 }} className={`absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] blur-[140px] rounded-full opacity-[0.06] ${isDark ? 'bg-emerald-600' : 'bg-emerald-400'}`} />
      </div>

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(-1)}
        className={`fixed top-6 left-6 z-50 p-3.5 rounded-2xl flex items-center gap-2.5 font-black tracking-[0.15em] uppercase text-[9px] transition-all hover:scale-105 active:scale-95 border shadow-lg ${isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10' : 'bg-white border-black/5 text-slate-600 hover:text-blue-600 shadow-blue-600/5'}`}
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </motion.button>

      <div className="max-w-6xl mx-auto px-6 lg:px-12 pt-24 pb-32 space-y-28 relative z-10">

        {/* Hero */}
        <section className="text-center space-y-7 pt-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full border text-[9px] font-black uppercase tracking-[0.25em] shadow-lg ${isDark ? 'bg-blue-600/10 border-blue-500/20 text-blue-500' : 'bg-blue-50 border-blue-200/50 text-blue-600'}`}>
            <MapPin className="w-3 h-3" />
            Full Feature Reference — v4.0
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-5xl lg:text-8xl font-black tracking-tighter leading-none">
            Live Tracker <span className="text-blue-500">Pro</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className={`text-lg lg:text-2xl max-w-2xl mx-auto font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Every feature, every capability — documented in full. Built with React, Leaflet, Socket.io, and MongoDB.
          </motion.p>
        </section>

        {/* Stats bar */}
        <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className={`rounded-[3rem] p-10 lg:p-14 border ${isDark ? 'bg-white/3 border-white/8' : 'bg-white border-black/5 shadow-xl shadow-blue-900/5'}`}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 text-center">
            {STATS.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                <p className="text-3xl lg:text-4xl font-black text-blue-500 tracking-tighter">{s.val}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-2 mb-1">{s.label}</p>
                <p className={`text-[8px] uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{s.sub}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Feature grid */}
        <section>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <p className={`text-[10px] font-black uppercase tracking-[0.4em] mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Platform Capabilities</p>
            <h2 className="text-4xl lg:text-6xl font-black tracking-tighter">Everything you need.</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURE_SECTIONS.map((feat, i) => {
              const ac = ACCENT_CLASSES[feat.accent] || ACCENT_CLASSES.blue;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i % 4) * 0.08 }}
                  className={`p-8 rounded-[2.5rem] border transition-all duration-500 group hover:scale-[1.01] ${isDark ? `bg-[#0e0e0e] ${ac.border} hover:border-opacity-40` : `bg-white border-black/5 shadow-lg hover:shadow-xl`}`}
                >
                  {/* Tag + Icon */}
                  <div className="flex items-start justify-between mb-6">
                    <span className={`text-[8px] font-black uppercase tracking-[0.25em] px-3 py-1.5 rounded-full border ${ac.tag}`}>
                      {feat.tag}
                    </span>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${ac.bg} ${ac.border}`}>
                      {feat.icon}
                    </div>
                  </div>

                  <h3 className="text-xl font-black tracking-tight mb-3">{feat.title}</h3>
                  <p className={`text-sm font-medium leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{feat.description}</p>

                  {/* Detail bullets */}
                  <ul className="space-y-2">
                    {feat.details.map((d, di) => (
                      <li key={di} className="flex items-start gap-2.5">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${ac.text.replace('text-', 'bg-')}`} />
                        <p className={`text-[11px] font-medium leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{d}</p>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Tech Stack */}
        <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className={`rounded-[3rem] p-12 lg:p-20 border ${isDark ? 'bg-blue-600/8 border-blue-500/15' : 'bg-blue-50 border-blue-200/50 shadow-xl shadow-blue-600/5'}`}>
          <div className="text-center mb-14">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-blue-500 mb-4">Built With</p>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter">Modern Stack.</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'React 19', desc: 'Frontend UI', color: 'text-cyan-400' },
              { name: 'Leaflet', desc: 'Map rendering', color: 'text-emerald-400' },
              { name: 'Socket.io', desc: 'Real-time sync', color: 'text-blue-400' },
              { name: 'MongoDB', desc: 'Trip storage', color: 'text-green-400' },
              { name: 'TypeScript', desc: 'Type safety', color: 'text-blue-300' },
              { name: 'Tailwind v4', desc: 'Styling', color: 'text-sky-400' },
              { name: 'Framer Motion', desc: 'Animations', color: 'text-purple-400' },
              { name: 'Nominatim', desc: 'Geocoding', color: 'text-amber-400' },
            ].map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className={`p-5 rounded-2xl border text-center ${isDark ? 'bg-white/3 border-white/8' : 'bg-white border-black/5'}`}>
                <p className={`text-lg font-black tracking-tight ${t.color}`}>{t.name}</p>
                <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Map Features highlight */}
        <section className="space-y-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <p className={`text-[10px] font-black uppercase tracking-[0.4em] mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Map Section</p>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter">What's on the map.</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: <Target className="w-5 h-5 text-emerald-400" />, title: 'GPS Accuracy Ring', desc: 'Green / amber / red circle shows your real-time position confidence radius on the canvas.' },
              { icon: <Play className="w-5 h-5 text-cyan-400" />, title: 'Replay Ghost Path', desc: 'During time travel, a cyan dashed trail renders your historical track from start to current replay point.' },
              { icon: <Navigation className="w-5 h-5 text-blue-400" />, title: 'Directional Markers', desc: 'Entity icons rotate to face their heading. Cars, buses, and scooters track movement direction continuously.' },
              { icon: <Radar className="w-5 h-5 text-blue-500" />, title: 'Geofence Overlay', desc: 'Blue dashed circle centred on your position. Radius adjustable from 100m to 5km in the radar panel.' },
              { icon: <Cpu className="w-5 h-5 text-blue-400" />, title: 'Prediction Vectors', desc: 'Dashed arrow from current position projects 5-minute dead-reckoned destination with geocoded label.' },
              { icon: <MapPin className="w-5 h-5 text-rose-400" />, title: 'Coordinate Overlay', desc: 'Current coordinates shown to 5 decimal places in the bottom-left map badge. Updates live.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className={`p-6 rounded-2xl border ${isDark ? 'bg-white/3 border-white/8 hover:border-white/15' : 'bg-white border-black/5 shadow-md'} transition-all duration-300 hover:scale-[1.02]`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${isDark ? 'bg-white/5' : 'bg-slate-50'} border border-white/5`}>
                  {item.icon}
                </div>
                <h4 className="text-sm font-black mb-2">{item.title}</h4>
                <p className={`text-[11px] font-medium leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Trip Details Breakdown */}
        <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className={`rounded-[3rem] p-12 lg:p-20 border ${isDark ? 'bg-[#0e0e0e] border-white/8' : 'bg-white border-black/5 shadow-xl'}`}>
          <div className="text-center mb-14">
            <p className={`text-[9px] font-black uppercase tracking-[0.4em] mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Trip System</p>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter">What gets saved.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              { field: 'Title', example: '"Morning Commute"', note: 'Auto-named; fully editable' },
              { field: 'Location', example: '"Downtown Mumbai"', note: 'Reverse-geocoded from GPS fix' },
              { field: 'Distance', example: '"4.72 km"', note: 'Haversine accumulated total' },
              { field: 'Duration', example: '"0h 38m"', note: 'Elapsed recording time' },
              { field: 'Avg Velocity', example: '"7.4 km/h"', note: 'Distance ÷ time in seconds' },
              { field: 'Activity Type', example: '"bike"', note: 'Walking / Bike / Car / Plane / Other' },
              { field: 'Coordinates', example: '{ lat, lng }', note: 'Exact start-point position stored' },
              { field: 'Timestamp', example: 'ISO 8601 UTC', note: 'Persisted to MongoDB Atlas' },
            ].map((row, i) => (
              <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${isDark ? 'bg-white/3 border-white/5' : 'bg-slate-50 border-black/5'}`}>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">{row.field}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-medium">{row.note}</p>
                </div>
                <code className={`text-[10px] font-black font-mono px-3 py-1.5 rounded-xl ${isDark ? 'bg-white/8 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>{row.example}</code>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="border-t border-slate-500/10 pt-16 flex flex-col items-center text-center">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-3xl bg-blue-600 flex items-center justify-center shadow-[0_10px_25px_rgba(37,99,235,0.4)]">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <span className="font-black tracking-tight text-3xl uppercase">Live Tracker <span className="text-blue-500">Pro</span></span>
          </div>
          <p className="text-slate-500 font-bold italic mb-10 max-w-xs text-[10px] uppercase tracking-widest opacity-60">"Precision is our only protocol."</p>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-700">© 2026 Kinetic Observer Systems. All Manifests Recorded.</p>
        </footer>

      </div>
    </div>
  );
}
