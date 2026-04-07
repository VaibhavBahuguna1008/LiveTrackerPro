import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Clock, Navigation, ChevronRight, ChevronLeft, Calendar, Filter, Activity, Ruler, Zap, Bike, Car, Plane, Footprints, Trash2, AlertCircle, CheckCircle, Info, X, ChevronDown, ArrowUpDown } from 'lucide-react';

const ACTIVITY_ICONS: Record<string, any> = {
  walking: <Footprints className="w-4 h-4" />,
  bike: <Bike className="w-4 h-4" />,
  car: <Car className="w-4 h-4" />,
  aeroplane: <Plane className="w-4 h-4" />,
  other: <Activity className="w-4 h-4" />
};

const ACTIVITY_LABELS: Record<string, string> = {
  walking: 'Walking',
  bike: 'Bike Ride',
  car: 'Car Ride',
  aeroplane: 'Aeroplane',
  other: 'Other'
};

const ACTIVITY_COLORS: Record<string, { bg: string, text: string, border: string }> = {
  walking: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  bike: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
  car: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  aeroplane: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20' },
  other: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' }
};

type TimeFilter = 'all' | 'last10' | 'last30';
type SortOrder = 'newest' | 'oldest' | 'distance_desc' | 'distance_asc' | 'duration_desc';

const SORT_OPTIONS: { id: SortOrder, label: string }[] = [
  { id: 'newest', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'distance_desc', label: 'Longest Distance' },
  { id: 'distance_asc', label: 'Shortest Distance' },
  { id: 'duration_desc', label: 'Longest Duration' },
];

export default function DetailedHistory({ theme, user }: { theme: 'light' | 'dark', user: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('all');
  const [activeActivityFilter, setActiveActivityFilter] = useState<string>('all');
  const [showActivityDropdown, setShowActivityDropdown] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const ITEMS_PER_PAGE = 3;

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const response = await fetch(`/api/trips/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setTrips(data);
        }
      } catch (err) {
        console.error('Error fetching trips:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [user.id]);

  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info', id: number } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setNotification({ message, type, id });
    setTimeout(() => {
      setNotification(prev => prev?.id === id ? null : prev);
    }, 4000);
  };

  const triggerDelete = (tripId: string) => {
    setTripToDelete(tripId);
  };

  const confirmDelete = async () => {
    if (!tripToDelete) return;
    const tripId = tripToDelete;
    setTripToDelete(null);

    showNotification('Deleting trip...', 'info');

    try {
      const response = await fetch(`/api/trips/${tripId}`, { method: 'DELETE' });
      if (response.ok) {
        setTrips(prev => prev.filter(t => t.id !== tripId));
        showNotification('Trip successfully deleted', 'success');
      } else {
        showNotification('Failed! Please restart terminal server to sync.', 'error');
      }
    } catch (err) {
      console.error('Error deleting trip:', err);
      showNotification('Network error occurred.', 'error');
    }
  };

  const parseDuration = (dur: string) => {
    if (!dur) return 0;
    const match = dur.match(/(\d+)h\s*(\d+)m/);
    if (match) {
      return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
    return 0;
  };

  // Time-based filter
  const getFilteredByTime = (tripsArr: any[]) => {
    const now = new Date();
    if (activeFilter === 'last10') {
      const cutoff = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      return tripsArr.filter(t => new Date(t.timestamp) >= cutoff);
    }
    if (activeFilter === 'last30') {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return tripsArr.filter(t => new Date(t.timestamp) >= cutoff);
    }
    return tripsArr;
  };

  // Activity type filter
  const getFilteredByActivity = (tripsArr: any[]) => {
    if (activeActivityFilter === 'all') return tripsArr;
    return tripsArr.filter(t => t.activityType === activeActivityFilter);
  };

  const timeFilteredTrips = getFilteredByActivity(getFilteredByTime(trips));

  const totalMinutes = timeFilteredTrips.reduce((acc, trip) => acc + parseDuration(trip.duration), 0);
  const formattedDurationResult = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

  const stats = {
    totalDistance: timeFilteredTrips.reduce((acc, trip) => acc + parseFloat(trip.distance || 0), 0).toFixed(1),
    totalDuration: formattedDurationResult,
    avgVelocity: timeFilteredTrips.length > 0 ? (timeFilteredTrips.reduce((acc, trip) => acc + parseFloat(trip.avgVelocity || 0), 0) / timeFilteredTrips.length).toFixed(1) : '0'
  };

  const filteredTrips = timeFilteredTrips
    .filter(trip => 
      trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ACTIVITY_LABELS[trip.activityType] || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortOrder) {
        case 'oldest':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'distance_desc':
          return parseFloat(b.distance || 0) - parseFloat(a.distance || 0);
        case 'distance_asc':
          return parseFloat(a.distance || 0) - parseFloat(b.distance || 0);
        case 'duration_desc':
          return parseDuration(b.duration) - parseDuration(a.duration);
        case 'newest':
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / ITEMS_PER_PAGE));
  const paginatedTrips = filteredTrips.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filters/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, activeActivityFilter, searchQuery, sortOrder]);

  const handleTimeFilter = (filter: TimeFilter) => {
    setActiveFilter(filter);
  };

  const getActivityColor = (type: string) => ACTIVITY_COLORS[type] || ACTIVITY_COLORS.other;
  const getActivityLabel = (type: string) => ACTIVITY_LABELS[type] || type;

  return (
    <div className={`min-h-full px-4 py-4 sm:p-6 lg:p-12 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl border backdrop-blur-xl ${
              theme === 'dark' ? 'bg-black/80 border-white/10' : 'bg-white/80 border-black/10'
            }`}
          >
            {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
            {notification.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
            <span className={`text-[11px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {notification.message}
            </span>
            <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-50 transition-opacity">
              <X className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tripToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border ${theme === 'dark' ? 'bg-[#111111] border-white/10' : 'bg-white border-black/10'}`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className={`text-lg font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Delete Trip</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setTripToDelete(null)}
                  className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="mb-8 lg:mb-12 max-w-4xl pt-2 sm:pt-4">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-4xl font-black tracking-tight mb-2 sm:mb-4"
        >
          Detailed History
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-slate-500 text-sm sm:text-lg font-medium leading-relaxed"
        >
          Review your journey logistics and previous session analysis.
        </motion.p>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-8 sm:mb-12">
        {[
          { label: 'Total Distance', value: stats.totalDistance, unit: 'km', icon: <Ruler className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" /> },
          { label: 'Total Duration', value: stats.totalDuration, unit: '', icon: <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" /> },
          { label: 'Avg. Velocity', value: stats.avgVelocity, unit: 'km/h', icon: <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" /> }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`${theme === 'dark' ? 'bg-[#111111] border-white/5' : 'bg-white border-black/5'} border rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-xl sm:shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6`}
          >
            <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest sm:tracking-[0.2em] mb-0.5 sm:mb-1">{stat.label}</p>
              <p className="text-lg sm:text-3xl font-black tracking-tighter">
                {stat.value} <span className="text-[8px] sm:text-xs font-black opacity-50 uppercase tracking-widest ml-0.5 sm:ml-1">{stat.unit}</span>
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-3 w-full overflow-x-auto scrollbar-hide pb-1">
          {/* Time Filters */}
          <button 
            onClick={() => handleTimeFilter('all')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : (theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
            }`}
          >
            <Calendar className="w-3.5 h-3.5 inline-block mr-2 -mt-0.5" />
            All Time
          </button>
          <button 
            onClick={() => handleTimeFilter('last10')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${
              activeFilter === 'last10'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : (theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
            }`}
          >
            Last 10 Days
          </button>
          <button 
            onClick={() => handleTimeFilter('last30')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${
              activeFilter === 'last30'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : (theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
            }`}
          >
            Last 30 Days
          </button>

        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          {/* Sort Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className={`px-4 sm:px-5 py-3 sm:py-4 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {SORT_OPTIONS.find(s => s.id === sortOrder)?.label || 'Sort'}
              <ChevronDown className={`w-3 h-3 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showSortDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className={`absolute top-full mt-2 right-0 z-50 w-56 rounded-2xl shadow-2xl border overflow-hidden ${
                    theme === 'dark' ? 'bg-[#111111] border-white/10' : 'bg-white border-black/10'
                  }`}
                >
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setSortOrder(opt.id); setShowSortDropdown(false); }}
                      className={`w-full px-5 py-3.5 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                        sortOrder === opt.id 
                          ? 'bg-blue-600/10 text-blue-500' 
                          : (theme === 'dark' ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50')
                      }`}
                    >
                      {opt.label}
                      {sortOrder === opt.id && <CheckCircle className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 sm:pl-12 pr-4 sm:pr-6 py-3 sm:py-4 rounded-full border transition-all focus:outline-none focus:border-blue-500 font-bold text-xs sm:text-sm ${theme === 'dark' ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-100 border-black/5 text-slate-900'}`}
            />
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {(activeFilter !== 'all' || activeActivityFilter !== 'all') && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-3 mb-6 flex-wrap"
        >
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Filters:</span>
          {activeFilter !== 'all' && (
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
              <Calendar className="w-3 h-3" />
              {activeFilter === 'last10' ? 'Last 10 Days' : 'Last 30 Days'}
              <button onClick={() => setActiveFilter('all')} className="ml-1 hover:opacity-50"><X className="w-3 h-3" /></button>
            </span>
          )}
          {/* Active filters removed as per request */}
          <span className={`text-[9px] font-bold ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
            — {filteredTrips.length} trip{filteredTrips.length !== 1 ? 's' : ''} found
          </span>
        </motion.div>
      )}

      {/* Sessions List */}
      <div className="space-y-6 mb-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Loading your journeys...</p>
          </div>
        ) : paginatedTrips.map((session, i) => {
          const activityColor = getActivityColor(session.activityType);
          return (
          <motion.div 
            key={session.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`${theme === 'dark' ? 'bg-[#111111] border-white/5' : 'bg-white border-black/5'} border rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 lg:p-8 shadow-xl sm:shadow-2xl flex flex-col lg:flex-row items-start lg:items-center gap-4 sm:gap-6 lg:gap-8 group hover:border-blue-500/30 transition-all`}
          >
            <div className={`w-full lg:w-40 h-16 sm:h-20 lg:h-28 rounded-xl sm:rounded-2xl lg:rounded-3xl shrink-0 flex flex-col items-center justify-center p-3 border border-white/5 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'}`}>
              <MapPin className={`w-4 h-4 sm:w-5 sm:h-5 mb-1 opacity-50 ${theme === 'dark' ? 'text-white' : 'text-slate-500'}`} />
              <p className="font-mono text-[8px] sm:text-[10px] font-black tracking-widest text-center text-slate-500 uppercase">
                {session.coordinates ? `${session.coordinates.lat.toFixed(4)}, ${session.coordinates.lng.toFixed(4)}` : 'GPS UNAVAILABLE'}
              </p>
            </div>

            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-[9px] sm:text-[10px] font-black text-blue-500 uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-0.5 sm:mb-1">
                    {new Date(session.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <h3 className="text-lg sm:text-2xl font-black tracking-tight mb-1.5 sm:mb-2">{session.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <Clock className="w-3.5 h-3.5" />
                      {session.duration}
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {session.location}
                    </div>
                    <div className={`flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-[10px] font-black uppercase tracking-widest px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full border ${getActivityColor(session.activityType).bg} ${getActivityColor(session.activityType).text} ${getActivityColor(session.activityType).border}`}>
                      {ACTIVITY_ICONS[session.activityType] || <Activity className="w-4 h-4" />}
                      {getActivityLabel(session.activityType) || 'Other'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 sm:gap-12">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Distance</p>
                    <p className="text-xl font-black tracking-tighter">{session.distance}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Speed</p>
                    <p className="text-xl font-black tracking-tighter">{session.avgVelocity}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col lg:w-auto w-full gap-3 mt-4 lg:mt-0 shrink-0">
              <button 
                onClick={() => triggerDelete(session.id)}
                className={`w-full lg:w-auto px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${theme === 'dark' ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white'}`}
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </motion.div>
          );
        })}
        {!loading && filteredTrips.length === 0 && (
          <div className="text-center py-20">
            <div className={`w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`}>
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <p className={`font-black uppercase tracking-widest text-[11px] mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              No trips found
            </p>
            <p className="text-[10px] text-slate-500">
              {activeFilter !== 'all' || activeActivityFilter !== 'all'
                ? 'Try adjusting your filters to see more results'
                : 'Start recording your first trip from the dashboard'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredTrips.length > 0 && (
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <div className="flex items-center justify-center gap-1.5 sm:gap-3">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95'} ${theme === 'dark' ? 'bg-white/5 text-slate-500 hover:bg-white/10' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button 
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full font-black text-[10px] sm:text-xs transition-all ${currentPage === page ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : (theme === 'dark' ? 'bg-white/5 text-slate-500 hover:bg-white/10' : 'bg-slate-100 text-slate-400 hover:bg-slate-200')}`}
              >
                {page}
              </button>
            ))}
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95'} ${theme === 'dark' ? 'bg-white/5 text-slate-500 hover:bg-white/10' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
          <p className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredTrips.length)} of {filteredTrips.length} · Page {currentPage}/{totalPages}
          </p>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {(showActivityDropdown || showSortDropdown) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowActivityDropdown(false); setShowSortDropdown(false); }} />
      )}
    </div>
  );
}
