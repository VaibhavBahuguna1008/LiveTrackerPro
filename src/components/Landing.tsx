import { motion, useScroll, useTransform } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Shield, Zap, ArrowRight, Activity, Globe, Sun, Moon, Cpu, Satellite, Radar, Clock, Target, History, BarChart3, Route, Trophy, EyeOff, ChevronRight } from 'lucide-react';

export default function Landing({ theme, setTheme }: { theme: 'light' | 'dark', setTheme: (t: 'light' | 'dark') => void }) {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 200]);

  return (
    <div className={`min-h-screen transition-colors duration-700 overflow-hidden relative ${theme === 'dark' ? 'bg-[#050505] text-white' : 'bg-[#fcfdfd] text-slate-900'} font-sans`}>

      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          style={{ y: y1 }}
          className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] blur-[160px] rounded-full mix-blend-screen opacity-[0.15] ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-400'}`}
        />
        <motion.div
          style={{ y: y2 }}
          className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] blur-[160px] rounded-full mix-blend-screen opacity-[0.1] ${theme === 'dark' ? 'bg-emerald-600' : 'bg-emerald-400'}`}
        />
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[url("https://www.transparenttextures.com/patterns/carbon-fibre.png")] opacity-[0.03]' : 'bg-[url("https://www.transparenttextures.com/patterns/cubes.png")] opacity-[0.05]'} pointer-events-none`} />
      </div>

      {/* Navigation */}
      <nav className="relative z-[100] flex items-center justify-between p-4 sm:p-6 lg:px-12 lg:py-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 sm:gap-3"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-600 flex items-center justify-center shadow-[0_10px_30px_rgba(37,99,235,0.4)]">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <span className="font-black tracking-tight text-lg sm:text-2xl uppercase">Live Tracker <span className="text-blue-500">Pro</span></span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 sm:gap-5"
        >
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all hover:scale-110 shadow-sm ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300' : 'bg-white border-black/5 hover:bg-slate-50 text-slate-600'}`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
          <button
            onClick={() => navigate('/login')}
            className={`hidden sm:block text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:text-blue-500 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}
          >
            Log In
          </button>
          <button
            onClick={() => navigate('/signup')}
            className={`px-5 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-xl ${theme === 'dark' ? 'bg-white text-black hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
          >
            Join
          </button>
        </motion.div>
      </nav>

      {/* Side-by-Side Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-4 sm:pt-8 lg:pt-12 pb-16 sm:pb-24 lg:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: Text & CTA */}
          <div className="space-y-6 sm:space-y-8 lg:space-y-12 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`inline-flex items-center gap-3 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border shadow-lg ${theme === 'dark' ? 'bg-white/5 border-white/10 backdrop-blur-xl' : 'bg-white border-black/5'}`}
            >
              <div className="flex -space-x-1.5">
                {[1, 2, 3].map(i => <div key={i} className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 ${theme === 'dark' ? 'border-[#0a0a0a] bg-blue-600' : 'border-white bg-blue-500'}`} />)}
              </div>
              <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-900'}`}>
                <Satellite className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-1 sm:mr-2 text-emerald-500" />
                Satellite Uplink Active
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              className="text-5xl sm:text-7xl lg:text-7xl xl:text-[7.5rem] font-black tracking-tighter leading-[0.9] mb-4 sm:mb-8 max-w-2xl"
            >
              Track <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-500 via-blue-400 to-emerald-400">
                Everything.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`text-base sm:text-lg lg:text-xl font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
            >
              The world's most elegant location intelligence platform. Deploy precision telemetry and <span className="text-blue-500 font-bold italic">Radar Geofencing</span> across global coordinate matrices.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-6"
            >
              <button
                onClick={() => navigate('/signup')}
                className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] sm:text-[10px] uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_-10px_rgba(37,99,235,0.6)] flex items-center justify-center gap-3"
              >
                Initialize <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/about')}
                className={`w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 rounded-xl sm:rounded-2xl border font-black text-[9px] sm:text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 hover:scale-105 active:scale-95 shadow-xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-black/5 text-slate-700'}`}
              >
                Tech Specs <Cpu className="w-4 h-4" />
              </button>
            </motion.div>
          </div>

          {/* Right: Feature Graphic / Logo Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 80, delay: 0.2 }}
            className="hidden lg:flex flex-col items-center justify-center relative"
          >
            <div className={`w-[450px] h-[450px] rounded-[4rem] border relative overflow-hidden flex items-center justify-center ${theme === 'dark' ? 'bg-[#0f0f0f] border-white/5 shadow-2xl' : 'bg-white border-black/5 shadow-[0_50px_100px_-20px_rgba(37,99,235,0.1)] shadow-xl'}`}>
              <div className="absolute inset-0 opacity-10 animate-pulse">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-blue-500" style={{ top: '25%' }} />
                <div className="absolute top-0 left-0 w-full h-[1px] bg-blue-500" style={{ top: '50%' }} />
                <div className="absolute top-0 left-0 w-full h-[1px] bg-blue-500" style={{ top: '75%' }} />
                <div className="absolute top-0 left-0 h-full w-[1px] bg-blue-500" style={{ left: '25%' }} />
                <div className="absolute top-0 left-0 h-full w-[1px] bg-blue-500" style={{ left: '50%' }} />
                <div className="absolute top-0 left-0 h-full w-[1px] bg-blue-500" style={{ left: '75%' }} />
              </div>
              <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="w-24 h-24 rounded-[2rem] bg-blue-600 flex items-center justify-center shadow-[0_20px_50px_rgba(37,99,235,0.5)]">
                  <MapPin className="w-12 h-12 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 mb-2">LIVE TRACKER PRO</p>
                  <p className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>COORDINATE MATRIX 4.0</p>
                </div>
              </div>
            </div>
            {/* Floating Accents */}
            <div className="absolute top-0 right-0 p-8">
              <Activity className="w-12 h-12 text-emerald-500 animate-pulse" />
            </div>
            <div className="absolute bottom-0 left-0 p-8">
              <Globe className="w-16 h-16 text-blue-500 opacity-20" />
            </div>
          </motion.div>

        </div>
      </div>

      {/* Feature Highlight — Hero Card */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-8 sm:pb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className={`p-8 sm:p-12 lg:p-16 rounded-[2rem] sm:rounded-[3rem] border relative overflow-hidden group transition-all duration-500 ${theme === 'dark' ? 'bg-[#0f0f0f] border-white/5 hover:border-white/10 shadow-2xl' : 'bg-white border-black/5 shadow-xl shadow-blue-600/5'}`}
        >
          <div className="absolute top-0 right-0 p-6 sm:p-12 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
            <Globe className="w-48 h-48 sm:w-72 sm:h-72 text-blue-500" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-8">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20 shrink-0">
              <Navigation className="w-7 h-7 sm:w-10 sm:h-10 text-blue-500" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-500 mb-3">Core Engine</p>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4 tracking-tight leading-tight">Millisecond Precision.</h3>
              <p className={`text-base sm:text-lg font-medium leading-relaxed max-w-2xl ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Coordinate telemetry rendered with zero visual lag across every device — powered by WebSocket real-time sync and high-accuracy Geolocation API.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Feature Grid — 2×3 */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-16 sm:pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {[
            {
              icon: <Radar className="w-6 h-6 text-blue-500" />,
              bg: 'bg-blue-600/10 border-blue-500/20',
              title: 'Radar Geofencing',
              desc: 'Draw security perimeters from 100m to 5km. Instant entry/exit alerts dispatched to your dashboard.',
            },
            {
              icon: <Shield className="w-6 h-6 text-emerald-500" />,
              bg: 'bg-emerald-500/10 border-emerald-500/20',
              title: 'Privacy Ghost Mode',
              desc: 'Fuzz your broadcast coordinates with ±500m offset. Stay hidden while staying connected.',
            },
            {
              icon: <Clock className="w-6 h-6 text-cyan-400" />,
              bg: 'bg-cyan-500/10 border-cyan-500/20',
              title: 'Time Travel Replay',
              desc: 'Scrub through your location history. Play back at 0.5×, 1×, 2×, or 4× speed with full playback controls.',
            },
            {
              icon: <Target className="w-6 h-6 text-amber-400" />,
              bg: 'bg-amber-500/10 border-amber-500/20',
              title: 'Exact Positioning',
              desc: '6-decimal GPS coordinates with accuracy ring. Copy to clipboard in one tap.',
            },
            {
              icon: <History className="w-6 h-6 text-purple-400" />,
              bg: 'bg-purple-500/10 border-purple-500/20',
              title: 'Location Timeline',
              desc: 'Every GPS fix logged with address, speed, and timestamp. Full position history at your fingertips.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-blue-400" />,
              bg: 'bg-blue-500/10 border-blue-500/20',
              title: 'Fleet Analytics',
              desc: 'Anomaly detection, top locations, behavioral insights, and activity breakdowns — all from your trip data.',
            },
            {
              icon: <Route className="w-6 h-6 text-rose-400" />,
              bg: 'bg-rose-500/10 border-rose-500/20',
              title: 'Trip Recording',
              desc: 'One-tap capture. Auto-fills name, location, and stats. Saved to cloud with full history and search.',
            },
            {
              icon: <Trophy className="w-6 h-6 text-amber-400" />,
              bg: 'bg-amber-500/10 border-amber-500/20',
              title: 'XP & Leveling',
              desc: 'Earn XP for every metre travelled. Level up, unlock badges, and display progression on the live map.',
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 3) * 0.08 }}
              className={`p-7 sm:p-9 rounded-[2rem] border relative overflow-hidden group transition-all duration-500 hover:scale-[1.02] ${theme === 'dark' ? 'bg-[#0f0f0f]/80 border-white/5 hover:border-white/10 shadow-xl' : 'bg-white border-black/5 shadow-lg hover:shadow-xl'}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border ${card.bg}`}>
                {card.icon}
              </div>
              <h3 className="text-lg sm:text-xl font-black mb-3 tracking-tight">{card.title}</h3>
              <p className={`text-sm font-medium leading-relaxed ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-16 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`rounded-[2rem] sm:rounded-[3rem] p-10 sm:p-14 border ${theme === 'dark' ? 'bg-blue-600/8 border-blue-500/15' : 'bg-blue-50 border-blue-200/60 shadow-xl shadow-blue-600/5'}`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 text-center">
            {[
              { val: '99.9%', label: 'Uptime' },
              { val: '<100ms', label: 'Latency' },
              { val: '±3m', label: 'GPS Precision' },
              { val: '14+', label: 'Features' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
                <p className="text-3xl sm:text-5xl font-black text-blue-500 tracking-tighter">{stat.val}</p>
                <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.35em] mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* CTA band */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-24 sm:pb-36">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className={`rounded-[2rem] sm:rounded-[3rem] p-10 sm:p-16 lg:p-20 border text-center relative overflow-hidden ${theme === 'dark' ? 'bg-[#0f0f0f] border-white/5' : 'bg-white border-black/5 shadow-2xl'}`}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[2px] ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-200'}`} />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.35em] text-blue-500 mb-5">Ready to deploy?</p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter mb-6 leading-none">
            Start tracking<br />
            <span className="text-blue-500">everything.</span>
          </h2>
          <p className={`text-base sm:text-lg font-medium mb-10 max-w-xl mx-auto leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Free to join. Real-time from the first second. No setup required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto px-10 py-4 sm:py-5 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] sm:text-[10px] uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_-10px_rgba(37,99,235,0.5)] flex items-center justify-center gap-3"
            >
              Initialize <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/about')}
              className={`w-full sm:w-auto px-10 py-4 sm:py-5 rounded-xl sm:rounded-2xl border font-black text-[9px] sm:text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 hover:scale-105 active:scale-95 ${theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-slate-50 border-black/5 text-slate-700 hover:bg-slate-100'}`}
            >
              Full Feature Docs <Cpu className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-20 border-t border-slate-500/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-[0_10px_25px_rgba(37,99,235,0.4)]">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="font-black tracking-tight text-xl sm:text-2xl uppercase">Live Tracker <span className="text-blue-500">Pro</span></span>
          </div>

          <div className="flex items-center gap-6 sm:gap-8">
            {[
              { label: 'About', path: '/about' },
              { label: 'Sign Up', path: '/signup' },
              { label: 'Login', path: '/login' },
            ].map(link => (
              <button key={link.label} onClick={() => navigate(link.path)}
                className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:text-blue-500 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                {link.label}
              </button>
            ))}
          </div>

          <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.25em] ${theme === 'dark' ? 'text-slate-700' : 'text-slate-400'}`}>
            © 2026 Kinetic Observer Systems
          </p>
        </div>
        <p className={`text-center text-[8px] font-bold italic mt-8 uppercase tracking-widest opacity-40 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
          "Precision is our only protocol."
        </p>
      </footer>
    </div>
  );
}
