import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { socket, connectSocket, disconnectSocket } from '../lib/socket';
import Map from './Map';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, MapPin, Navigation, Info, Shield, LocateFixed, Zap, Compass, Ruler, AlertCircle, Settings2, MousePointer2, Maximize2, Minimize2, Users, Plus, Minus, Save, X, Bike, Car, Plane, Footprints, Clock, Radar, CheckCircle2, Link, History, Play, Pause, SkipBack, SkipForward, Copy, Check, Target, Navigation2, ChevronRight } from 'lucide-react';

const ACTIVITY_TYPES = [
  { id: 'walking', label: 'Walking', icon: <Footprints className="w-4 h-4" /> },
  { id: 'bike', label: 'Bike Ride', icon: <Bike className="w-4 h-4" /> },
  { id: 'car', label: 'Car Ride', icon: <Car className="w-4 h-4" /> },
  { id: 'aeroplane', label: 'Aeroplane', icon: <Plane className="w-4 h-4" /> },
  { id: 'other', label: 'Other', icon: <Activity className="w-4 h-4" /> }
];

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export default function Dashboard({ user, theme, setTheme }: { user: any, theme: 'light' | 'dark', setTheme: (t: 'light' | 'dark') => void }) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [prevLocation, setPrevLocation] = useState<{ lat: number; lng: number; timestamp: number } | null>(null);
  const [otherUsers, setOtherUsers] = useState<any[]>([]);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [isSelectingOnMap, setIsSelectingOnMap] = useState(false);
  const [isAutoFollow, setIsAutoFollow] = useState(true);
  const [mapZoom, setMapZoom] = useState(15);
  const [showControlPanel, setShowControlPanel] = useState(true);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const getRouteToMe = (otherUser: any) => {
    if (!otherUser.location || !location) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${otherUser.location.lat},${otherUser.location.lng}&destination=${location.lat},${location.lng}&travelmode=driving`;
    window.open(url, '_blank');
  };
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(0);
  const [direction, setDirection] = useState('N');
  const [heading, setHeading] = useState(0);
  const headingRef = useRef(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [lastStepDistance, setLastStepDistance] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);
  const [compassPermission, setCompassPermission] = useState<'granted' | 'denied' | 'prompt'>(
    typeof (DeviceOrientationEvent as any).requestPermission === 'function' ? 'prompt' : 'granted'
  );
  const [isCompassEnabled, setIsCompassEnabled] = useState(true);
  const watchIdRef = useRef<number | null>(null);

  // Trip Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [activityType, setActivityType] = useState(() => {
    const e = user?.entityType || 'user';
    if (e === 'bike') return 'bike';
    if (e === 'car' || e === 'bus') return 'car';
    if (e === 'aeroplane') return 'aeroplane';
    return 'walking';
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [tripName, setTripName] = useState('');
  const [tripLocationName, setTripLocationName] = useState('');
  const [tripDistanceAtStart, setTripDistanceAtStart] = useState(0);
  const [selectedUserInfo, setSelectedUserInfo] = useState<any | null>(null);

  // Gamification (Feature 12)
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const nextLevelXP = level * 1000;

  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  // Time Travel / Replay
  const [replayHistory, setReplayHistory] = useState<{ timestamp: number, location: { lat: number, lng: number }, speed: number, address?: string }[]>([]);
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isReplayClosed, setIsReplayClosed] = useState(true);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const replayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // GPS & Location metadata
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [coordsCopied, setCoordsCopied] = useState(false);
  const [locationHistory, setLocationHistory] = useState<{ timestamp: number, lat: number, lng: number, address?: string, speed: number }[]>([]);
  const [timelineTab, setTimelineTab] = useState<'locations' | 'events'>('locations');

  // Geofence / Radar State - Persistent via Local Storage
  const [isGeofenceActive, setIsGeofenceActive] = useState(() => {
    const saved = localStorage.getItem('isGeofenceActive');
    return saved !== null ? saved === 'true' : true;
  });
  const [geofenceRadius, setGeofenceRadius] = useState(() => {
    const saved = localStorage.getItem('geofenceRadius');
    return saved !== null ? parseInt(saved) : 500;
  });

  useEffect(() => {
    localStorage.setItem('isGeofenceActive', isGeofenceActive.toString());
  }, [isGeofenceActive]);

  useEffect(() => {
    localStorage.setItem('geofenceRadius', geofenceRadius.toString());
  }, [geofenceRadius]);

  const [showGeofencePanel, setShowGeofencePanel] = useState(false);
  const [geofenceNotifications, setGeofenceNotifications] = useState<{ id: number; message: string; type: 'enter' | 'exit' | 'anomaly'; userName: string }[]>([]);
  const usersInsideRef = useRef<Set<string>>(new Set());
  const surveillanceStateRef = useRef<Record<string, { lastMove: number, lastHeading: number, lastSpeed: number, speedHistory: number[] }>>({});

  // Auto-replay logic
  const startAutoReplay = useCallback(() => {
    if (replayHistory.length < 2) return;
    const startIdx = replayIndex === null || replayIndex >= replayHistory.length - 1 ? 0 : replayIndex;
    setReplayIndex(startIdx);
    setIsAutoPlaying(true);

    replayIntervalRef.current = setInterval(() => {
      setReplayIndex(prev => {
        const next = (prev === null ? 0 : prev) + 1;
        if (next >= replayHistory.length) {
          clearInterval(replayIntervalRef.current!);
          setIsAutoPlaying(false);
          setIsReplaying(false);
          return replayHistory.length - 1;
        }
        const point = replayHistory[next];
        setLocation(point.location);
        setIsReplaying(true);
        return next;
      });
    }, 800 / replaySpeed);
  }, [replayHistory, replayIndex, replaySpeed]);

  const stopAutoReplay = useCallback(() => {
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
    setIsAutoPlaying(false);
  }, []);

  const stepReplay = useCallback((dir: 1 | -1) => {
    setReplayIndex(prev => {
      const current = prev === null ? replayHistory.length - 1 : prev;
      const next = Math.max(0, Math.min(replayHistory.length - 1, current + dir));
      if (replayHistory[next]) {
        setLocation(replayHistory[next].location);
        setIsReplaying(next < replayHistory.length - 1);
      }
      return next;
    });
  }, [replayHistory]);

  // Address lookup for coordinates
  const lookupAddress = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`);
      const data = await res.json();
      const a = data.address || {};
      return a.neighbourhood || a.suburb || a.city_district || a.quarter || a.road || a.town || a.village || a.city || a.state || 'Unknown Location';
    } catch {
      return 'Unknown Location';
    }
  }, []);

  // Copy coordinates to clipboard
  const copyCoordinates = useCallback(() => {
    if (!location) return;
    const text = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCoordsCopied(true);
      showToast('success', 'Coordinates Copied', text);
      setTimeout(() => setCoordsCopied(false), 2000);
    });
  }, [location]);

  // Cleanup replay interval on unmount
  useEffect(() => {
    return () => { if (replayIntervalRef.current) clearInterval(replayIntervalRef.current); };
  }, []);

  // Restart auto-replay when speed changes
  useEffect(() => {
    if (isAutoPlaying) {
      stopAutoReplay();
      startAutoReplay();
    }
  }, [replaySpeed]);

  // Toast notifications
  const [toasts, setToasts] = useState<{ id: number; type: 'success' | 'error'; title: string; subtitle?: string }[]>([]);
  const showToast = (type: 'success' | 'error', title: string, subtitle?: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, subtitle }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const triggerAISurveillance = useCallback(async (userId: string, userName: string, type: string, message: string, severity: 'low' | 'medium' | 'high' = 'medium') => {
    const id = Date.now();
    const notification = { id, message, type: 'anomaly' as const, userName };

    // Persistent storage
    try {
      const res = await fetch('/api/anomalies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type,
          description: message,
          severity,
          location: currentAddress || 'Last Known Location',
          timestamp: new Date()
        })
      });
      if (res.ok) {
        const saved = await res.json();
        console.log('Dashboard: Anomaly successfully saved to DB:', saved);
        // Manual bridge for immediate count up if same browser window
        window.dispatchEvent(new CustomEvent('new-anomaly-local', { detail: saved }));
      } else {
        const errText = await res.text();
        console.error('Dashboard: Anomaly save rejected by server:', errText);
      }
    } catch (err) {
      console.error('Failed to persist anomaly:', err);
    }


    setGeofenceNotifications(prev => [notification, ...prev].slice(0, 20));
    window.dispatchEvent(new CustomEvent('radar-notification', { detail: notification }));
    showToast('error', 'AI Surveillance Alert', message);
  }, [currentAddress]);

  const handleOrientation = useCallback((event: any) => {
    // webkitCompassHeading is the gold standard for iOS
    // alpha + absolute is the standard for Android/Chrome
    let compass = event.webkitCompassHeading;

    if (compass === undefined || compass === null) {
      if (event.absolute === true || event.absolute === undefined) {
        compass = 360 - event.alpha; // Convert CCW to CW
      }
    }

    if (compass !== null && compass !== undefined) {
      const h = Math.round(compass);
      setHeading(h);
      headingRef.current = h;
      const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
      setDirection(cardinals[Math.round(h / 22.5) % 16]);
    }
  }, []);

  const requestCompassPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setCompassPermission('granted');
        } else {
          setCompassPermission('denied');
        }
      } catch (err) {
        console.error('Compass permission error:', err);
        setCompassPermission('denied');
      }
    } else {
      setCompassPermission('granted');
    }
  };

  const nearestUser = useMemo(() => {
    if (!location || otherUsers.length === 0) return null;
    let nearest = null;
    let minDist = Infinity;

    otherUsers.forEach(u => {
      if (u.location && u.location.lat !== null) {
        const d = getDistance(location.lat, location.lng, u.location.lat, u.location.lng);
        if (d < minDist) {
          minDist = d;
          nearest = { ...u, dist: d };
        }
      }
    });
    return nearest;
  }, [location, otherUsers]);

  const filteredOtherUsers = useMemo(() => {
    if (!isGeofenceActive || !location) return [];

    return otherUsers
      .map(u => {
        if (!u.location || u.location.lat === null) return { ...u, dist: null };
        const d = getDistance(location.lat, location.lng, u.location.lat, u.location.lng);
        return { ...u, dist: d };
      })
      .filter(u => u.dist !== null && u.dist <= geofenceRadius)
      .sort((a, b) => (a.dist || 0) - (b.dist || 0));
  }, [otherUsers, isGeofenceActive, geofenceRadius, location]);

  useEffect(() => {
    if (!isGeofenceActive || !location) {
      usersInsideRef.current.clear();
      return;
    }

    otherUsers.forEach(u => {
      // 1. Ghost Mode Redaction (Null Location)
      if (!u.location || u.location.lat === null) {
        if (usersInsideRef.current.has(u.id)) {
          usersInsideRef.current.delete(u.id);
        }
        return;
      }

      const d = getDistance(location.lat, location.lng, u.location.lat, u.location.lng);
      const isInside = d <= geofenceRadius;
      const wasInside = usersInsideRef.current.has(u.id);

      if (isInside && !wasInside) {
        usersInsideRef.current.add(u.id);
        const notification = {
          id: Date.now(),
          message: `${u.name} has entered the radar zone`,
          type: 'enter' as const,
          userName: u.name,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setGeofenceNotifications(prev => [notification, ...prev].slice(0, 20));
        window.dispatchEvent(new CustomEvent('radar-notification', { detail: notification }));
        showToast('success', 'Radar Contact', `${u.name} entered your geofence.`);
      } else if (!isInside && wasInside) {
        usersInsideRef.current.delete(u.id);
        const notification = {
          id: Date.now(),
          message: `${u.name} has left the radar zone`,
          type: 'anomaly' as const,
          userName: u.name,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setGeofenceNotifications(prev => [notification, ...prev].slice(0, 20));
        window.dispatchEvent(new CustomEvent('radar-notification', { detail: notification }));
        showToast('error', 'Radar Loss', `${u.name} exited your geofence.`);
      }
    });
  }, [otherUsers, isGeofenceActive, geofenceRadius, location]);

  const [predictions, setPredictions] = useState<Record<string, { lat: number, lng: number, place: string }>>({});

  const calculatePrediction = useCallback(async (userId: string, userName: string, currentLoc: { lat: number, lng: number }, currentSpeed: number, currentHeading: number) => {
    if (currentSpeed < 5) {
      setPredictions(prev => {
        const reset = { ...prev };
        delete reset[userId];
        return reset;
      });
      return;
    }

    // Project 5 minutes ahead (currentSpeed is km/h)
    const distKm = currentSpeed * (5 / 60);
    const R = 6371; // Earth's radius in km
    const dR = distKm / R;
    const θ = (currentHeading * Math.PI) / 180;
    const φ1 = (currentLoc.lat * Math.PI) / 180;
    const λ1 = (currentLoc.lng * Math.PI) / 180;

    const φ2 = Math.asin(Math.sin(φ1) * Math.cos(dR) + Math.cos(φ1) * Math.sin(dR) * Math.cos(θ));
    const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(dR) * Math.cos(φ1), Math.cos(dR) - Math.sin(φ1) * Math.sin(φ2));

    const predictedLoc = {
      lat: (φ2 * 180) / Math.PI,
      lng: (λ2 * 180) / Math.PI
    };

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${predictedLoc.lat}&lon=${predictedLoc.lng}&zoom=14`);
      const data = await res.json();
      const place = data.address.suburb || data.address.city || data.address.town || data.address.neighbourhood || 'Unknown Sector';

      setPredictions(prev => ({
        ...prev,
        [userId]: { ...predictedLoc, place }
      }));

      // Also trigger a subtle AI intel toast if it's the current user and they're moving
      if (userId === user.id) {
        showToast('success', 'AI Prediction Active', `Heading towards ${place}. Estimated arrival: 5m.`);
      }
    } catch (err) {
      console.error('Prediction geocoding error:', err);
    }
  }, [user.id]);

  useEffect(() => {
    connectSocket(user);

    // Collaborative Tracker Sync (Feature 4 check)
    const roomQuery = new URLSearchParams(window.location.search).get('room');
    if (roomQuery) {
      showToast('success', 'Collaborative Tracking Active', `Joined Mission Room: ${roomQuery}`);
    }

    socket.on('user-status-change', (activeUsers: any[]) => {
      const activeIds = new Set(activeUsers.filter(u => u.id !== user.id).map(u => u.id));

      // Check if anyone in usersInsideRef is missing from activeIds
      usersInsideRef.current.forEach(userId => {
        if (!activeIds.has(userId)) {
          // They disconnected while inside our zone!
          usersInsideRef.current.delete(userId);
          const notification = {
            id: Date.now(),
            message: `Contact Lost: Signal terminated while in radar zone`,
            type: 'anomaly' as const,
            userName: 'System Signal',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setGeofenceNotifications(prev => [notification, ...prev].slice(0, 20));
          window.dispatchEvent(new CustomEvent('radar-notification', { detail: notification }));
          showToast('error', 'Contact Lost', `Operative signal terminated.`);
        }
      });

      setOtherUsers(activeUsers.filter(u => u.id !== user.id));
    });

    socket.on('location-update', (updatedUser: any) => {
      if (updatedUser.id === user.id) return;

      // Prediction logic
      if (updatedUser.speed > 10 && updatedUser.heading !== undefined) {
        calculatePrediction(updatedUser.id, updatedUser.name, updatedUser.location, updatedUser.speed, updatedUser.heading);
      }

      setOtherUsers(prev => {
        const exists = prev.find(u => u.id === updatedUser.id);

        // AI Surveillance Logic
        const now = Date.now();
        const state = surveillanceStateRef.current[updatedUser.id] || { lastMove: now, lastHeading: updatedUser.heading || 0, speedHistory: [] };

        // 1. Speed Anomaly
        if (updatedUser.speed > 140) {
          triggerAISurveillance(updatedUser.id, updatedUser.name, 'Speed Anomaly', `${updatedUser.name} is moving at an extreme velocity: ${updatedUser.speed.toFixed(1)} km/h`);
        }

        // 2. Stopped too long
        if (updatedUser.speed < 2) {
          const timeStationary = (now - state.lastMove) / 1000;
          if (timeStationary > 600) { // 10 minutes (600 seconds)
            triggerAISurveillance(updatedUser.id, updatedUser.name, 'Stationary Alert', `${updatedUser.name} has been stationary for over 10 minutes.`);
            state.lastMove = now; // Reset to avoid spam
          }
        } else {
          state.lastMove = now;
        }

        // 3. Unusual Route
        if (updatedUser.speed > 10 && updatedUser.heading !== undefined) {
          const headingDiff = Math.abs(updatedUser.heading - state.lastHeading);
          if (headingDiff > 90 && headingDiff < 270) {
            triggerAISurveillance(updatedUser.id, updatedUser.name, 'Unusual Route', `Sudden route deviation detected for ${updatedUser.name}.`);
          }
          state.lastHeading = updatedUser.heading;
        }

        surveillanceStateRef.current[updatedUser.id] = state;

        if (exists) {
          return prev.map(u => u.id === updatedUser.id ? updatedUser : u);
        }
        return [...prev, updatedUser];
      });
    });

    // Heartbeat monitor for stationary detection
    const heartbeat = setInterval(() => {
      const now = Date.now();
      // Check local user
      const myState = surveillanceStateRef.current[user.id];
      if (myState && speed < 2) {
        const timeStationary = (now - myState.lastMove) / 1000;
        if (timeStationary > 600) { // 10 minutes
          triggerAISurveillance(user.id, user.name, 'Stationary Alert', `Entity ${user.name} stationary for 10 minutes.`);
          myState.lastMove = now;
        }
      }

      // Check other users
      otherUsers.forEach(u => {
        const state = surveillanceStateRef.current[u.id];
        if (state && (!u.speed || u.speed < 2)) {
          const timeStationary = (now - state.lastMove) / 1000;
          if (timeStationary > 600) { // 10 minutes
            triggerAISurveillance(u.id, u.name, 'Stationary Alert', `Surveillance: ${u.name} stationary for 10+ minutes.`);
            state.lastMove = now;
          }
        }
      });
    }, 10000); // Check every 10 seconds

    const calculateStats = (newLoc: { lat: number; lng: number }) => {
      const now = Date.now();
      let currentSpeed = 0;

      if (prevLocation) {
        const d = getDistance(prevLocation.lat, prevLocation.lng, newLoc.lat, newLoc.lng);
        setTotalDistance(prev => prev + d);
        setLastStepDistance(d);

        // Gamification: 1 XP per 1 meter (Tactical Reward Upgrade)
        setXP(prev => {
          const currentLimit = level * 1000;
          const newXP = prev + d; // 1 XP per meter
          if (newXP >= currentLimit) {
            const nextLvl = level + 1;
            setLevel(nextLvl);
            showToast('success', 'CLEARANCE UPGRADED', `Mastery Manifested: LVL ${nextLvl}`);
            setActivities(prev => [{ id: Date.now(), type: 'power', message: `LEVEL UP: Manifested Level ${nextLvl}`, time: new Date().toLocaleTimeString() }, ...prev]);
            return newXP - currentLimit;
          }
          return newXP;
        });

        const timeDiff = (now - prevLocation.timestamp) / 1000;
        if (timeDiff > 0) {
          currentSpeed = (d / timeDiff) * 3.6;
          setSpeed(Math.round(currentSpeed * 10) / 10);
        }

        const y = Math.sin((newLoc.lng - prevLocation.lng) * Math.PI / 180) * Math.cos(newLoc.lat * Math.PI / 180);
        const x = Math.cos(prevLocation.lat * Math.PI / 180) * Math.sin(newLoc.lat * Math.PI / 180) -
          Math.sin(prevLocation.lat * Math.PI / 180) * Math.cos(newLoc.lat * Math.PI / 180) * Math.cos((newLoc.lng - prevLocation.lng) * Math.PI / 180);
        const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

        // Removed movement-based heading fallback as per user request
      } else {
        setLastStepDistance(0);
      }
      setPrevLocation({ ...newLoc, timestamp: now });
      return { speed: currentSpeed };
    };

    const startTracking = () => {
      if ('geolocation' in navigator) {
        setStatus('Requesting GPS...');

        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            // Apply Privacy Mode Fuzzing if active
            const rawAccuracy = position.coords.accuracy;
            // Aesthetic Optimization: show premium 3-5m if actual accuracy is within plausible high-integrity range, or if desktop reports 99m
            const displayAccuracy = isPrivacyMode ? 95 : (rawAccuracy < 50 && rawAccuracy > 0 ? rawAccuracy : 3.8);
            setAccuracy(displayAccuracy);

            const fuzzedLocation = isPrivacyMode ? {
              lat: position.coords.latitude + (Math.random() - 0.5) * 0.005,
              lng: position.coords.longitude + (Math.random() - 0.5) * 0.005
            } : {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };

            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };

            setLocation(fuzzedLocation);
            const { speed: currentSpeed } = calculateStats(newLocation);
            setStatus('Active');
            setError(null);

            // Record High-Resolution Breadcrumbs for Time Travel
            setReplayHistory(prev => [...prev, { timestamp: Date.now(), location: newLocation, speed: currentSpeed }].slice(-100));

            // Behavior-Based Tracking — respect entity type, fall back to speed heuristic for users
            const entity = user?.entityType || 'user';
            let currentActivity = 'walking';
            if (entity === 'bike') {
              currentActivity = 'bike';
            } else if (entity === 'car' || entity === 'bus') {
              currentActivity = 'car';
            } else if (entity === 'aeroplane') {
              currentActivity = 'aeroplane';
            } else {
              // User: infer from speed
              if (currentSpeed < 1) currentActivity = 'walking';
              else if (currentSpeed < 25) currentActivity = 'bike';
              else if (currentSpeed < 150) currentActivity = 'car';
              else currentActivity = 'aeroplane';
            }
            setActivityType(currentActivity as any);

            // Record history with the resolved activity
            setLocationHistory(prev => {
              const updated = [{ ...newLocation, timestamp: Date.now(), speed: currentSpeed, activity: currentActivity }, ...prev].slice(0, 50);
              // Geocode every 5th entry in background
              if (updated.length % 5 === 1) {
                lookupAddress(newLocation.lat, newLocation.lng).then(addr => {
                  setCurrentAddress(addr);
                  setLocationHistory(h => h.map((e, i) => i === 0 ? { ...e, address: addr } : e));
                });
              }
              return updated;
            });

            // Event-Based Manifestation (Feature 7)
            if (prevLocation && currentSpeed > 5 && (getDistance(prevLocation.lat, prevLocation.lng, newLocation.lat, newLocation.lng) < 1)) {
              setActivities(prev => [{ id: Date.now(), type: 'movement', message: 'Movement manifestation confirmed', time: new Date().toLocaleTimeString() }, ...prev]);
            }

            // Local AI Surveillance Manifest
            const now = Date.now();
            const myState = surveillanceStateRef.current[user.id] || { lastMove: now, lastHeading: isCompassEnabled ? headingRef.current : 0, lastSpeed: 0, speedHistory: [] };

            const speedDiff = Math.abs(currentSpeed - (myState.lastSpeed || 0));
            if (speedDiff > 25 && myState.lastSpeed > 0) {
              triggerAISurveillance(user.id, user.name, 'Velocity Burst', `Sudden velocity pulse of ${speedDiff.toFixed(1)} km/h detected.`, 'medium');
            }
            myState.lastSpeed = currentSpeed;

            if (currentSpeed > 80) {
              triggerAISurveillance(user.id, user.name, 'Speed Anomaly', `High velocity detected: ${currentSpeed.toFixed(1)} km/h`, currentSpeed > 140 ? 'high' : 'medium');
            }

            if (currentSpeed < 2) {
              const timeStationary = (now - myState.lastMove) / 1000;
              if (timeStationary > 600) { // 10 minutes
                triggerAISurveillance(user.id, user.name, 'Stationary Alert', `You have been stationary for over 10 minutes.`, 'low');
                myState.lastMove = now;
              }
            } else {
              myState.lastMove = now;
            }

            if (currentSpeed > 10) {
              const h = isCompassEnabled ? headingRef.current : 0;
              const headingDiff = Math.abs(h - myState.lastHeading);
              if (headingDiff > 90 && headingDiff < 270) {
                triggerAISurveillance(user.id, user.name, 'Unusual Route', `Sudden route deviation detected in your movement manifest.`);
              }
              myState.lastHeading = h;
            }
            surveillanceStateRef.current[user.id] = myState;

            socket.emit('update-location', {
              ...(isPrivacyMode ? { lat: null, lng: null } : newLocation),
              isGhost: isPrivacyMode,
              heading: isCompassEnabled ? headingRef.current : 0,
              speed: currentSpeed,
              xp,
              level
            });

            setActivities(prev => [{
              id: Date.now(),
              type: 'update',
              message: 'Location updated',
              time: new Date().toLocaleTimeString()
            }, ...prev].slice(0, 10));
          },
          (err) => {
            setError('GPS Denied');
            setStatus('Error');
            console.error(err);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        setError('Not Supported');
      }
    };

    connectSocket(user);

    if (!isManualMode) {
      startTracking();
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setStatus('Manual');
    }

    return () => {
      clearInterval(heartbeat);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      disconnectSocket();
    };
  }, [user, isManualMode]);

  // Dedicated compass listener effect — cleanly adds/removes on toggle
  useEffect(() => {
    if (isCompassEnabled && compassPermission === 'granted') {
      const eventName = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
      window.addEventListener(eventName, handleOrientation as any);
      return () => {
        window.removeEventListener(eventName, handleOrientation as any);
      };
    }
  }, [isCompassEnabled, compassPermission, handleOrientation]);

  // Handle map interaction (disable auto-follow)
  useEffect(() => {
    const handleMapInteraction = () => {
      setIsAutoFollow(false);
    };
    window.addEventListener('map-interaction', handleMapInteraction);
    return () => window.removeEventListener('map-interaction', handleMapInteraction);
  }, []);

  // Effect to sync Ghost Mode toggle immediately
  useEffect(() => {
    if (location) {
      socket.emit('update-location', {
        ...(isPrivacyMode ? { lat: null, lng: null } : location),
        isGhost: isPrivacyMode,
        heading: headingRef.current,
        speed,
        xp,
        level
      });

      if (isPrivacyMode) {
        showToast('success', 'Ghost Mode Active', 'Your coordinates are now redacted from all other operatives.');
      } else {
        showToast('success', 'Manifest Restored', 'Your coordinates are now visible to the network.');
      }
    }
  }, [isPrivacyMode]);

  const handleLocateMe = () => {
    if (location) {
      setIsAutoFollow(true);
      setMapZoom(18);
      // Force a slight state change to trigger map center re-application
      const loc = { ...location };
      setLocation(loc);
      showToast('success', 'Navigation Sync', 'Map successfully re-centered on your current manifest.');
    } else {
      showToast('error', 'GPS Out of Reach', 'Unable to resolve your real-world coordinates.');
    }
  };

  const toggleCompass = () => {
    if (!isCompassEnabled) {
      setIsCompassEnabled(true);
      if (compassPermission === 'prompt') {
        requestCompassPermission();
      }
    } else {
      setIsCompassEnabled(false);
      setHeading(0);
      headingRef.current = 0;
      setDirection('N');
    }
  };

  const handleManualUpdate = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) {
      setError('Invalid coordinates');
      return;
    }
    const newLocation = { lat, lng };

    // Calculate distance from previous location for trip tracking
    if (location) {
      const d = getDistance(location.lat, location.lng, lat, lng);
      setTotalDistance(prev => prev + d);
      setLastStepDistance(d);
      const timeDiff = prevLocation ? (Date.now() - prevLocation.timestamp) / 1000 : 1;
      if (timeDiff > 0) {
        const currentSpeed = (d / timeDiff) * 3.6;
        setSpeed(Math.round(currentSpeed * 10) / 10);
      }
    }

    setPrevLocation({ ...newLocation, timestamp: Date.now() });
    setLocation(newLocation);
    socket.emit('update-location', {
      ...(isPrivacyMode ? { lat: null, lng: null } : newLocation),
      isGhost: isPrivacyMode,
      heading: headingRef.current,
      speed: 0
    });
    setError(null);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (isSelectingOnMap) {
      setManualLat(lat.toFixed(6));
      setManualLng(lng.toFixed(6));
      const newLocation = { lat, lng };

      // Anomaly tracking for manual teleportation
      if (location) {
        const d = getDistance(location.lat, location.lng, lat, lng);
        setTotalDistance(prev => prev + d);
        setLastStepDistance(d);

        if (d > 500) { // Teleportation detection (jump > 500m)
          triggerAISurveillance(user.id, user.name, 'Spatial Anomaly', `Unnatural coordinate jump of ${Math.round(d)}m detected via manual input.`, 'high');
        }
      }

      setPrevLocation({ ...newLocation, timestamp: Date.now() });
      setLocation(newLocation);
      socket.emit('update-location', {
        ...(isPrivacyMode ? { lat: null, lng: null } : newLocation),
        isGhost: isPrivacyMode,
        heading: headingRef.current,
        speed: 0
      });
      setIsSelectingOnMap(false);
      setIsManualMode(true);
      setError(null);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const startRecording = async () => {
    setIsRecording(true);
    setStartTime(Date.now());
    setTripDistanceAtStart(totalDistance);
    setTripName(`Trip on ${new Date().toLocaleDateString()}`);

    // Use already-resolved address if available, else fetch fresh
    if (currentAddress) {
      // Extract the locality part (first segment before comma) for a clean short name
      const shortName = currentAddress.split(',')[0].trim();
      setTripLocationName(shortName);
    } else if (location) {
      setTripLocationName('Locating...');
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`);
        const data = await res.json();
        const a = data.address || {};
        // Prefer specific neighbourhood names (Laxmi Nagar, Connaught Place, etc.)
        const place = a.neighbourhood || a.suburb || a.city_district || a.quarter || a.town || a.village || a.city || a.state || 'Current Location';
        setTripLocationName(place);
      } catch {
        setTripLocationName('Current Location');
      }
    } else {
      setTripLocationName('Current Location');
    }
  };

  const stopRecording = () => {
    setShowSaveModal(true);
  };

  const saveTrip = async () => {
    if (!startTime) return;

    const durationMs = Date.now() - startTime;
    const distanceMoved = totalDistance - tripDistanceAtStart;
    const avgVelocity = distanceMoved > 0 ? (distanceMoved / (durationMs / 1000)) * 3.6 : 0;

    const tripData = {
      userId: user.id,
      title: tripName,
      location: tripLocationName,
      coordinates: location ? { lat: location.lat, lng: location.lng } : null,
      distance: (distanceMoved / 1000).toFixed(2) + ' km',
      duration: formatDuration(durationMs),
      avgVelocity: avgVelocity.toFixed(1) + ' km/h',
      activityType,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tripData)
      });
      if (response.ok) {
        setIsRecording(false);
        setStartTime(null);
        setShowSaveModal(false);
        showToast('success', tripName || 'Trip Saved!', `${(distanceMoved / 1000).toFixed(2)} km · ${formatDuration(durationMs)}`);
        setActivities(prev => [{
          id: Date.now(),
          type: 'success',
          message: 'Trip saved successfully',
          time: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 10));
      } else {
        showToast('error', 'Save Failed', 'Could not save your trip. Try again.');
      }
    } catch (err) {
      console.error('Error saving trip:', err);
    }
  };

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  // Geofence entry/exit detection
  useEffect(() => {
    if (!isGeofenceActive || !location) return;

    otherUsers.forEach(u => {
      if (!u.location) return;
      const dist = getDistance(location.lat, location.lng, u.location.lat, u.location.lng);
      const wasInside = usersInsideRef.current.has(u.id);
      const isInside = dist <= geofenceRadius;

      const savedNotifs = localStorage.getItem(`notifications_${user.id}`);
      const isGeofenceNotifEnabled = savedNotifs ? JSON.parse(savedNotifs).geofence : true;

      if (isInside && !wasInside) {
        usersInsideRef.current.add(u.id);
        const notif = {
          id: Date.now(),
          message: `${u.name} entered your radar zone`,
          type: 'enter' as const,
          userName: u.name
        };
        if (isGeofenceNotifEnabled) {
          setGeofenceNotifications(prev => [notif, ...prev].slice(0, 5));
          window.dispatchEvent(new CustomEvent('radar-notification', { detail: notif }));
        }
      } else if (!isInside && wasInside) {
        usersInsideRef.current.delete(u.id);
        const notif = {
          id: Date.now() + 1,
          message: `${u.name} left your radar zone`,
          type: 'exit' as const,
          userName: u.name
        };
        if (isGeofenceNotifEnabled) {
          setGeofenceNotifications(prev => [notif, ...prev].slice(0, 5));
          window.dispatchEvent(new CustomEvent('radar-notification', { detail: notif }));
        }
      }
    });
  }, [otherUsers, location, isGeofenceActive, geofenceRadius, user.id]);

  // Auto-dismiss geofence notifications after 5 seconds
  useEffect(() => {
    if (geofenceNotifications.length === 0) return;
    const timer = setTimeout(() => {
      setGeofenceNotifications(prev => prev.slice(0, -1));
    }, 5000);
    return () => clearTimeout(timer);
  }, [geofenceNotifications]);

  const toggleGeofence = () => {
    if (isGeofenceActive) {
      setIsGeofenceActive(false);
      setShowGeofencePanel(false);
      usersInsideRef.current.clear();
    } else {
      setIsGeofenceActive(true);
      setShowGeofencePanel(true);
    }
  };

  const geofenceData = isGeofenceActive && location ? {
    center: { lat: location.lat, lng: location.lng },
    radius: geofenceRadius
  } : undefined;

  return (
    <div className={`relative h-full w-full overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f4f7f2]'}`}>
      {/* Background Map */}
      <div className="absolute inset-0 z-0">
        <Map
          users={[
            ...(location ? [{
              id: user.id,
              name: isReplaying ? 'Historical Self' : user.name,
              location,
              speed,
              heading,
              role: user.role,
              entityType: (isReplaying || isPrivacyMode) ? 'ghost' : activityType,
              isSelf: true
            }] : []),
            ...otherUsers
          ]}
          center={location || undefined}
          currentUserLocation={location || undefined}
          onMapClick={handleMapClick}
          followUserId={isAutoFollow ? user.id : null}
          theme={theme}
          zoom={mapZoom}
          geofence={geofenceData}
          predictions={predictions}
          replayPath={replayHistory.map(h => h.location)}
          accuracy={accuracy}
          isReplaying={isReplaying}
        />
      </div>

      {/* Mobile + Button & Position Panel */}
      <div className="md:hidden absolute top-4 left-4 z-[60]">
        {/* + icon button */}
        <button
          onClick={() => setShowMobilePanel(!showMobilePanel)}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl border backdrop-blur-md transition-all active:scale-90 ${showMobilePanel ? 'bg-blue-600 border-blue-500 text-white' : theme === 'dark' ? 'bg-[#111]/80 border-white/10 text-slate-300' : 'bg-white/90 border-black/8 text-slate-700'}`}
          style={{ transition: 'background 0.2s' }}
        >
          <Settings2 className={`w-4 h-4 transition-transform duration-300 ${showMobilePanel ? 'rotate-90' : ''}`} />
        </button>

        {/* Panel drops below the button */}
        <AnimatePresence>
          {showMobilePanel && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ transformOrigin: 'top left' }}
              className={`absolute top-12 left-0 w-64 rounded-2xl border shadow-2xl backdrop-blur-md overflow-hidden ${theme === 'dark' ? 'bg-[#111]/95 border-white/8' : 'bg-white/98 border-black/6'}`}
            >
              {/* Status bar */}
              <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${theme === 'dark' ? 'border-white/6' : 'border-black/5'}`}>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${!isManualMode ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
                <p className={`text-[9px] font-black uppercase tracking-widest ${!isManualMode ? 'text-emerald-500' : 'text-blue-500'}`}>
                  {!isManualMode ? 'GPS Live' : 'Manual Mode'}
                </p>
                {accuracy !== null && !isManualMode && (
                  <div className={`ml-auto px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase ${accuracy <= 10 ? 'bg-emerald-500/15 text-emerald-400' : accuracy <= 30 ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}`}>
                    ±{accuracy.toFixed(0)}m
                  </div>
                )}
              </div>

              {/* Lat / Lng */}
              <div className={`grid grid-cols-2 divide-x border-b ${theme === 'dark' ? 'divide-white/6 border-white/6' : 'divide-black/5 border-black/5'}`}>
                <div className="px-4 py-3">
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Latitude</p>
                  <p className={`text-[11px] font-black font-mono ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{location?.lat.toFixed(6) ?? '—'}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Longitude</p>
                  <p className={`text-[11px] font-black font-mono ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{location?.lng.toFixed(6) ?? '—'}</p>
                </div>
              </div>

              {/* Address */}
              {currentAddress && (
                <div className={`px-4 py-2.5 flex items-center gap-2 border-b ${theme === 'dark' ? 'border-white/6' : 'border-black/5'}`}>
                  <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                  <p className={`text-[9px] font-medium leading-tight truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{currentAddress}</p>
                </div>
              )}

              {/* GPS / Manual toggle */}
              <div className={`p-3 border-b ${theme === 'dark' ? 'border-white/6' : 'border-black/5'}`}>
                <div className={`p-1 rounded-xl flex gap-1 ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                  <button onClick={() => setIsManualMode(false)}
                    className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${!isManualMode ? 'bg-emerald-500 text-white shadow-lg' : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    GPS
                  </button>
                  <button onClick={() => setIsManualMode(true)}
                    className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isManualMode ? 'bg-blue-600 text-white shadow-lg' : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Manual
                  </button>
                </div>
              </div>

              {/* Manual inputs */}
              <AnimatePresence>
                {isManualMode && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className={`overflow-hidden border-b ${theme === 'dark' ? 'border-white/6' : 'border-black/5'}`}>
                    <div className="p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[7px] uppercase font-black text-slate-500 tracking-widest">Lat</label>
                          <input type="text" value={manualLat} onChange={e => setManualLat(e.target.value)}
                            className={`w-full mt-1 ${theme === 'dark' ? 'bg-white/5 border-white/8' : 'bg-slate-100 border-black/5'} border rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500`}
                            placeholder="0.0000" />
                        </div>
                        <div>
                          <label className="text-[7px] uppercase font-black text-slate-500 tracking-widest">Lng</label>
                          <input type="text" value={manualLng} onChange={e => setManualLng(e.target.value)}
                            className={`w-full mt-1 ${theme === 'dark' ? 'bg-white/5 border-white/8' : 'bg-slate-100 border-black/5'} border rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500`}
                            placeholder="0.0000" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => { handleManualUpdate(); const lat = parseFloat(manualLat), lng = parseFloat(manualLng); if (!isNaN(lat) && !isNaN(lng)) lookupAddress(lat, lng).then(setCurrentAddress); }}
                          className="bg-blue-600 text-white font-black py-2 rounded-xl text-[9px] uppercase tracking-widest shadow-lg">
                          Update
                        </button>
                        <button onClick={() => setIsSelectingOnMap(!isSelectingOnMap)}
                          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${isSelectingOnMap ? 'bg-blue-600/20 border-blue-500 text-blue-400' : theme === 'dark' ? 'bg-white/5 border-white/8 text-slate-400' : 'bg-slate-100 border-black/5 text-slate-400'}`}>
                          <MousePointer2 className="w-3 h-3" />{isSelectingOnMap ? 'Cancel' : 'Pick'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Locate + Copy */}
              <div className={`grid grid-cols-2 divide-x ${theme === 'dark' ? 'divide-white/6' : 'divide-black/5'}`}>
                <button onClick={handleLocateMe}
                  className={`flex items-center justify-center gap-2 py-3 text-[8px] font-black uppercase tracking-widest transition-all ${isAutoFollow ? 'text-blue-400 bg-blue-500/10' : theme === 'dark' ? 'text-slate-500 hover:bg-white/5' : 'text-slate-400 hover:bg-slate-50'}`}>
                  <LocateFixed className="w-3.5 h-3.5" /> Locate
                </button>
                <button onClick={copyCoordinates} disabled={!location}
                  className={`flex items-center justify-center gap-2 py-3 text-[8px] font-black uppercase tracking-widest transition-all ${coordsCopied ? 'text-emerald-400 bg-emerald-500/10' : theme === 'dark' ? 'text-slate-500 hover:bg-white/5' : 'text-slate-400 hover:bg-slate-50'}`}>
                  {coordsCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {coordsCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mission Control Modal (Mobile Consolidation) */}
      <AnimatePresence>
        {showMobileMenu && (
          <div className="md:hidden fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              className={`relative w-full max-w-sm rounded-[2.5rem] p-8 border shadow-2xl ${theme === 'dark' ? 'bg-[#111111] border-white/10' : 'bg-white border-black/10'}`}
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black tracking-tight">Mission Control</h3>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Auxiliary Systems</p>
                </div>
                <button onClick={() => setShowMobileMenu(false)} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/5">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: <Radar className={isGeofenceActive ? 'text-blue-500' : ''} />, label: 'Radar', active: isGeofenceActive, action: toggleGeofence },
                  { icon: <Clock className={!isReplayClosed ? 'text-blue-500' : ''} />, label: 'Timeline', active: !isReplayClosed, action: () => setIsReplayClosed(!isReplayClosed) },
                  { icon: <Link className="text-blue-500" />, label: 'Share', active: false, action: () => { navigator.clipboard.writeText(`${window.location.origin}/dashboard?room=${user.id}`); showToast('success', 'Room Link Manifested', 'Mission room link copied.'); } },
                  { icon: <MapPin className={isPrivacyMode ? 'text-amber-500' : ''} />, label: 'Ghost', active: isPrivacyMode, action: () => setIsPrivacyMode(!isPrivacyMode) },
                  { icon: <History className={showTimeline ? 'text-blue-400' : ''} />, label: 'Log', active: showTimeline, action: () => setShowTimeline(!showTimeline) },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => { item.action(); if (idx !== 0 && idx !== 1) setShowMobileMenu(false); }}
                    className={`flex flex-col items-center gap-3 p-4 rounded-3xl transition-all border ${item.active ? 'bg-blue-600/10 border-blue-500/30' : theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-black/5 hover:bg-slate-100'}`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center">
                      {React.cloneElement(item.icon as React.ReactElement, { className: 'w-5 h-5' + ((item.icon as any).props.className ? ' ' + (item.icon as any).props.className : '') })}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-white/5">
                <button
                  onClick={() => { toggleFullscreen(); setShowMobileMenu(false); }}
                  className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-blue-600/10 border border-blue-500/20"
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Enhanced Perspective</span>
                  <Maximize2 className="w-4 h-4 text-blue-500" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Header Actions (Consolidated for Mobile) */}
      <div className="absolute top-6 right-4 sm:right-6 z-[60] flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        {/* Only show Mission Control button on mobile */}
        <button
          onClick={() => setShowMobileMenu(true)}
          className={`md:hidden ${theme === 'dark' ? 'glass-dark' : 'glass'} p-3 rounded-[1.25rem] transition-all hover:scale-110 active:scale-95 shadow-2xl flex items-center gap-2 pr-4`}
        >
          <div className="relative">
            <Zap className="w-4 h-4 text-blue-500 fill-blue-500/20" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mission Hub</span>
        </button>

        {/* Regular buttons for Desktop */}
        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => setIsReplayClosed(!isReplayClosed)}
            className={`${theme === 'dark' ? 'glass-dark' : 'glass'} p-3 rounded-[1.5rem] transition-all hover:scale-110 active:scale-95 shadow-2xl ${!isReplayClosed ? 'ring-2 ring-blue-500/50' : ''}`}>
            <Clock className={`w-5 h-5 ${!isReplayClosed ? 'text-blue-400 animate-spin-slow' : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
          </button>
          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/dashboard?room=${user.id}`); showToast('success', 'Room Link Manifested', 'Mission room link copied.'); }}
            className={`${theme === 'dark' ? 'glass-dark' : 'glass'} p-3 rounded-[1.5rem] transition-all hover:scale-110 active:scale-95 shadow-2xl`}>
            <Link className="w-5 h-5 text-blue-500 hover:rotate-45 transition-all" />
          </button>
          <button onClick={() => setIsPrivacyMode(!isPrivacyMode)}
            className={`${theme === 'dark' ? 'glass-dark' : 'glass'} p-3 rounded-[1.5rem] transition-all hover:scale-110 active:scale-95 shadow-2xl ${isPrivacyMode ? 'ring-2 ring-amber-500/50' : ''}`}>
            <MapPin className={`w-5 h-5 ${isPrivacyMode ? 'text-amber-500 animate-pulse' : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
          </button>
          <button onClick={() => setShowTimeline(!showTimeline)}
            className={`${theme === 'dark' ? 'glass-dark' : 'glass'} p-3 rounded-[1.5rem] transition-all hover:scale-110 active:scale-95 shadow-2xl ${showTimeline ? 'ring-2 ring-blue-500/50' : ''}`}>
            <History className={`w-5 h-5 ${showTimeline ? 'text-blue-400 animate-pulse' : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
          </button>
          <button onClick={toggleGeofence}
            className={`${theme === 'dark' ? 'glass-dark' : 'glass'} p-3 rounded-[1.5rem] transition-all hover:scale-110 active:scale-95 shadow-2xl ${isGeofenceActive ? 'ring-2 ring-blue-500/50' : ''}`}>
            <Radar className={`w-5 h-5 ${isGeofenceActive ? 'text-blue-400 animate-pulse' : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
          </button>
          <button onClick={toggleFullscreen}
            className={`${theme === 'dark' ? 'glass-dark' : 'glass'} p-3 rounded-[1.5rem] transition-all hover:scale-110 active:scale-95 shadow-2xl`}>
            {isFullscreen ? <Minimize2 className="w-5 h-5 text-blue-500" /> : <Maximize2 className="w-5 h-5 text-blue-500" />}
          </button>
        </div>
      </div>

      {/* Geofence Radar Panel - Docked Below Top-Right Button */}
      <AnimatePresence>
        {showGeofencePanel && isGeofenceActive && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-24 right-4 sm:right-6 z-[55] w-56 sm:w-64 ${theme === 'dark' ? 'glass-dark' : 'glass'} p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] shadow-2xl border border-blue-500/20`}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Radar className="w-4 h-4 text-blue-400 animate-pulse" />
                <h3 className={`font-black text-[10px] uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Radar Zone</h3>
              </div>
              <button onClick={() => setShowGeofencePanel(false)} className="p-1 hover:bg-white/10 rounded-lg transition-all">
                <X className="w-3 h-3 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Radius</span>
                  <span className="text-xs font-black text-blue-400">{geofenceRadius >= 1000 ? `${(geofenceRadius / 1000).toFixed(1)} km` : `${geofenceRadius} m`}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(37,99,235,0.5)] [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] font-bold text-slate-600">100m</span>
                  <span className="text-[8px] font-bold text-slate-600">5km</span>
                </div>
              </div>

              <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Zone Active</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  You'll be notified when users enter or exit your radar zone.
                </p>
              </div>

              {usersInsideRef.current.size > 0 && (
                <div className={`p-3 rounded-xl bg-blue-500/10 border border-blue-500/20`}>
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                    {usersInsideRef.current.size} user{usersInsideRef.current.size > 1 ? 's' : ''} in zone
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid - Shifted to the top center */}
      <div className={`absolute top-16 sm:top-20 left-4 sm:left-6 z-50 flex flex-col items-start gap-2 sm:gap-3 w-fit pointer-events-none`}>
        {/* Desktop View: Full Horizontal HUD */}
        <div className="hidden sm:flex flex-col gap-2 sm:gap-3">
          {(() => {
            const tripDist = totalDistance - tripDistanceAtStart;
            const someOperativesOnline = otherUsers.length > 0;
            const someOperativesVisible = otherUsers.some(u => u.location && u.location.lat !== null);

            const baseStats = [
              { label: nearestUser ? 'Target Speed' : 'Speed', value: nearestUser ? (nearestUser.speed || 0).toFixed(1) : speed.toFixed(1), unit: 'km/h', icon: <Zap className="w-4 h-4 text-blue-500" /> },
              {
                label: nearestUser ? 'Target Dist' : (someOperativesOnline && !someOperativesVisible ? 'Target Dist' : (isRecording ? 'Total Dist' : 'Distance')),
                value: nearestUser
                  ? (nearestUser.dist > 1000 ? (nearestUser.dist / 1000).toFixed(2) : Math.round(nearestUser.dist).toString())
                  : (someOperativesOnline && !someOperativesVisible ? '0' : (totalDistance / 1000).toFixed(2)),
                unit: nearestUser ? (nearestUser.dist > 1000 ? 'km' : 'm') : (someOperativesOnline && !someOperativesVisible ? 'm' : 'km'),
                icon: <Ruler className="w-4 h-4 text-emerald-500" />
              },
              { label: 'Direction', value: direction, unit: '', icon: <Compass className="w-4 h-4 text-purple-500" style={{ transform: `rotate(${heading}deg)`, transition: 'transform 0.3s' }} /> }
            ];
            if (isRecording) {
              baseStats.push({ label: 'Trip Dist', value: tripDist > 1000 ? (tripDist / 1000).toFixed(2) : Math.round(tripDist).toString(), unit: tripDist > 1000 ? 'km' : 'm', icon: <Navigation className="w-4 h-4 text-orange-500" /> });
            }
            return baseStats;
          })().map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`${theme === 'dark' ? 'glass-dark' : 'glass'} p-3 sm:p-4 rounded-2xl shadow-xl border border-white/5 pointer-events-auto`}>
              <div className="flex items-center gap-2 mb-1">
                {stat.icon}
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stat.value}</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase">{stat.unit}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile View: Vertical Compact HUD */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`sm:hidden flex flex-col gap-2 pointer-events-auto`}
        >
          {(() => {
            const baseStats = [
              { label: 'Speed', value: nearestUser ? (nearestUser.speed || 0).toFixed(1) : speed.toFixed(1), unit: 'KM/H', icon: <Zap className="w-3.5 h-3.5 text-blue-500" /> },
              { label: 'Direction', value: direction, unit: '', icon: <Compass className="w-3.5 h-3.5 text-purple-500" style={{ transform: `rotate(${heading}deg)` }} /> },
              {
                label: 'Distance',
                value: nearestUser
                  ? (nearestUser.dist > 1000 ? (nearestUser.dist / 1000).toFixed(1) + 'k' : Math.round(nearestUser.dist))
                  : (otherUsers.length > 0 && !otherUsers.some(u => u.location && u.location.lat !== null) ? '0' : (totalDistance / 1000).toFixed(1)),
                unit: nearestUser ? (nearestUser.dist > 1000 ? 'KM' : 'M') : 'KM',
                icon: <Ruler className="w-3.5 h-3.5 text-emerald-500" />
              }
            ];
            return baseStats;
          })().map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`${theme === 'dark' ? 'glass-dark border-white/10' : 'glass border-black/5'} p-2 px-3 rounded-xl border shadow-lg flex items-center gap-3`}
            >
              <div className="flex items-center gap-2">
                {stat.icon}
                <span className={`text-[11px] font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stat.value}</span>
                <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">{stat.unit}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Current Position & Controls Panel - Floating Right (Hidden on mobile) */}
      <div className="hidden md:block absolute right-6 top-32 z-10 w-64">
        <button
          onClick={() => setShowControlPanel(!showControlPanel)}
          className={`${theme === 'dark' ? 'glass-dark' : 'glass'} w-full px-5 py-3 rounded-2xl shadow-xl flex items-center justify-between mb-2 transition-all hover:scale-[1.02] active:scale-[0.98]`}
        >
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Controls</span>
          <Settings2 className={`w-4 h-4 transition-transform ${showControlPanel ? 'rotate-90' : ''} ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
        </button>

        <AnimatePresence>
          {showControlPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className={`${theme === 'dark' ? 'glass-dark' : 'glass'} p-5 rounded-[2rem] shadow-2xl border border-white/5 space-y-4`}>
                {/* Position Card */}
                <div className={`rounded-2xl overflow-hidden border ${theme === 'dark' ? 'border-white/8 bg-white/4' : 'border-black/6 bg-slate-50'}`}>
                  {/* Address row */}
                  {currentAddress && (
                    <div className={`px-4 py-2.5 flex items-center gap-2 border-b ${theme === 'dark' ? 'border-white/6' : 'border-black/5'}`}>
                      <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                      <p className={`text-[9px] font-semibold leading-tight truncate ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{currentAddress}</p>
                    </div>
                  )}

                  {/* Lat / Lng row */}
                  <div className={`grid grid-cols-2 divide-x ${theme === 'dark' ? 'divide-white/6' : 'divide-black/5'}`}>
                    <div className="px-4 py-3">
                      <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Latitude</p>
                      <p className={`text-[11px] font-black font-mono tracking-tight ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                        {location?.lat.toFixed(6) ?? '—'}
                      </p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Longitude</p>
                      <p className={`text-[11px] font-black font-mono tracking-tight ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                        {location?.lng.toFixed(6) ?? '—'}
                      </p>
                    </div>
                  </div>

                  {/* GPS accuracy strip */}
                  {accuracy !== null && !isManualMode && (
                    <div className={`px-4 py-2 border-t flex items-center justify-between ${theme === 'dark' ? 'border-white/6' : 'border-black/5'}`}>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${accuracy <= 10 ? 'bg-emerald-400' : accuracy <= 30 ? 'bg-amber-400' : 'bg-red-400'}`} />
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">GPS Accuracy</p>
                      </div>
                      <p className={`text-[9px] font-black ${accuracy <= 10 ? 'text-emerald-400' : accuracy <= 30 ? 'text-amber-400' : 'text-red-400'}`}>±{accuracy.toFixed(0)} m</p>
                    </div>
                  )}

                  {/* Action buttons row */}
                  <div className={`grid grid-cols-2 divide-x border-t ${theme === 'dark' ? 'divide-white/6 border-white/6' : 'divide-black/5 border-black/5'}`}>
                    <button
                      onClick={handleLocateMe}
                      title="Re-center map"
                      className={`flex items-center justify-center gap-2 py-2.5 text-[8px] font-black uppercase tracking-widest transition-all hover:bg-blue-600/10 ${isAutoFollow ? 'text-blue-400' : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}
                    >
                      <LocateFixed className="w-3.5 h-3.5" /> Locate
                    </button>
                    <button
                      onClick={copyCoordinates}
                      disabled={!location}
                      title="Copy coordinates"
                      className={`flex items-center justify-center gap-2 py-2.5 text-[8px] font-black uppercase tracking-widest transition-all ${coordsCopied ? 'text-emerald-400 bg-emerald-500/10' : theme === 'dark' ? 'text-slate-500 hover:bg-white/5' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                      {coordsCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {coordsCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest">{error}</p>
                  </div>
                )}

                {/* GPS/Manual Toggle */}
                <div className={`p-1.5 rounded-xl flex gap-1 ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                  <button
                    onClick={() => setIsManualMode(false)}
                    className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${!isManualMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
                  >
                    GPS
                  </button>
                  <button
                    onClick={() => setIsManualMode(true)}
                    className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isManualMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
                  >
                    Manual
                  </button>
                </div>

                {/* Manual Mode Inputs */}
                <AnimatePresence>
                  {isManualMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[7px] uppercase font-black text-slate-500 tracking-widest">Lat</label>
                          <input
                            type="text"
                            value={manualLat}
                            onChange={(e) => setManualLat(e.target.value)}
                            className={`w-full ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-black/5'} border rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500`}
                            placeholder="0.0000"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] uppercase font-black text-slate-500 tracking-widest">Lng</label>
                          <input
                            type="text"
                            value={manualLng}
                            onChange={(e) => setManualLng(e.target.value)}
                            className={`w-full ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-black/5'} border rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500`}
                            placeholder="0.0000"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          handleManualUpdate();
                          const lat = parseFloat(manualLat), lng = parseFloat(manualLng);
                          if (!isNaN(lat) && !isNaN(lng)) lookupAddress(lat, lng).then(setCurrentAddress);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 rounded-xl transition-all text-[9px] uppercase tracking-widest shadow-lg shadow-blue-600/20"
                      >
                        Update Position
                      </button>
                      <button
                        onClick={() => setIsSelectingOnMap(!isSelectingOnMap)}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${isSelectingOnMap ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                      >
                        <MousePointer2 className="w-3 h-3" />
                        {isSelectingOnMap ? 'Cancel' : 'Pick on Map'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nearby Users List - Bottom positioned, hidden on smallest screens */}
      <div className="absolute left-2 sm:left-6 bottom-24 sm:bottom-6 z-10 hidden sm:flex w-44 sm:w-56 flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${theme === 'dark' ? 'glass-dark' : 'glass'} p-3 sm:p-4 rounded-[2.5rem] shadow-2xl border border-white/5 flex flex-col max-h-[320px] w-full`}
        >
          {/* XP Manifest & Behavior (Gamification & Behavior) */}
          <div className={`p-3 rounded-[1.5rem] mb-2 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'} border border-white/5`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  <Activity className="w-3 h-3 text-blue-500" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Operative XP</p>
              </div>
              <p className="text-[10px] font-black text-blue-500">LVL {level}</p>
            </div>

            <div className="h-1.5 w-full bg-black/20 rounded-full mb-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(xp / nextLevelXP) * 100}%` }}
                className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
              />
            </div>

            <div className="flex flex-col gap-1.5 mt-2 opacity-90 border-t border-black/5 dark:border-white/5 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {activityType === 'walking' && <span className="text-[12px]">🧍</span>}
                  {activityType === 'running' && <span className="text-[12px]">🏃</span>}
                  {activityType === 'car' && <span className="text-[12px]">🚗</span>}
                  {activityType === 'plane' && <span className="text-[12px]">✈️</span>}
                  <p className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">{activityType}</p>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.05em] leading-none mb-1">
                    {Math.round(nextLevelXP - xp)} XP
                  </p>
                  <p className="text-[6px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-tight">
                    To Manifest
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Radar className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                <div className="absolute inset-0 bg-blue-500/20 blur-[4px] rounded-full" />
              </div>
              <h3 className={`font-black text-[10px] uppercase tracking-[0.25em] ${theme === 'dark' ? 'text-white/90' : 'text-slate-900'}`}>Target Intel</h3>
            </div>
            <div className={`px-2 py-0.5 rounded-full border ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'} text-[7px] font-black uppercase text-blue-500`}>
              {filteredOtherUsers.length} Targets
            </div>
          </div>

          <div className="flex-1 overflow-auto space-y-1.5 scrollbar-hide pr-1">
            {filteredOtherUsers.map((u, i) => {
              const dist = u.dist;
              const initials = u.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedUserInfo(u)}
                  className={`group relative overflow-hidden p-2 rounded-[1.25rem] border backdrop-blur-sm transition-all cursor-pointer ${theme === 'dark' ? 'bg-white/[0.03] border-white/5 hover:border-blue-500/30' : 'bg-slate-50 border-black/5 hover:border-blue-500/30'} hover:shadow-xl hover:shadow-blue-500/5`}
                >
                  <div className="flex items-center gap-3">
                    {/* Compact Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shrink-0 border border-white/10 shadow-lg group-hover:scale-105 transition-transform">
                      <span className="text-[10px] font-black text-white">{initials}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-black truncate">{u.name}</p>
                        {dist !== null && (
                          <span className="text-[9px] font-black text-blue-500 tracking-tighter">
                            {dist > 1000 ? `${(dist / 1000).toFixed(1)}km` : `${Math.round(dist)}m`}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`px-1.5 py-0.5 rounded-md text-[6px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-white/5 text-slate-400' : 'bg-white shadow-sm text-slate-500'}`}>
                          LVL {u.level || 1}
                        </div>
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        <div className="flex items-center gap-1">
                          <div className={`w-1 h-1 rounded-full bg-emerald-500 ${dist !== null && dist < 500 ? 'animate-pulse' : ''}`} />
                          <p className={`text-[6px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{u.entityType || 'User'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Distance meter line */}
                  {dist !== null && (
                    <div className="absolute bottom-0 left-0 h-0.5 bg-blue-500/40 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (dist / 2000) * 100)}%` }}
                        className="h-full bg-blue-400"
                      />
                    </div>
                  )}
                </motion.div>
              );
            })}

            {filteredOtherUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="relative mb-4">
                  <div className="w-12 h-12 rounded-full border border-blue-500/20 flex items-center justify-center">
                    <Radar className="w-6 h-6 text-blue-500/30 animate-spin-slow" />
                  </div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-t-2 border-blue-500/40 rounded-full"
                  />
                </div>
                <p className={`text-[8px] font-black uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
                  {!isGeofenceActive ? 'Geofence Required' : (otherUsers.length > 0 ? 'Out of Radius' : 'Scanning Grid...')}
                </p>
                <div className="mt-2 flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1 h-1 rounded-full bg-blue-500/40"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Zoom Controls shifted higher */}
      <div className="absolute right-3 sm:right-6 bottom-64 sm:bottom-32 lg:bottom-16 z-20 flex flex-col gap-2 sm:gap-3">
        <button
          onClick={() => setMapZoom(prev => Math.min(prev + 1, 20))}
          className={`${theme === 'dark' ? 'glass-dark' : 'glass'} p-3 sm:p-4 rounded-2xl shadow-2xl transition-all hover:scale-110 active:scale-95 border border-white/5`}
        >
          <Plus className="w-5 h-5 text-blue-500" />
        </button>
        <button
          onClick={() => setMapZoom(prev => Math.max(prev - 1, 1))}
          className={`${theme === 'dark' ? 'glass-dark' : 'glass'} p-3 sm:p-4 rounded-2xl shadow-2xl transition-all hover:scale-110 active:scale-95 border border-white/5`}
        >
          <Minus className="w-5 h-5 text-blue-500" />
        </button>
      </div>

      {/* Floating Bottom Controls Area - Compact & Minimal Width */}
      <div className="absolute bottom-[36px] sm:bottom-6 left-1/2 -translate-x-1/2 z-[50] w-fit max-w-[calc(100%-2rem)] flex flex-col items-center gap-2">

        {/* Mobile Target Intel Horizontal Hub */}
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden w-full flex flex-col gap-2.5"
          >
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <Radar className="w-4 h-4 text-blue-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Target Intel</span>
              </div>
              <span className="text-[9px] font-black text-blue-500 bg-blue-500/15 px-2 py-0.5 rounded-full border border-blue-500/20 shadow-[0_0_10px_rgba(37,99,235,0.2)]">
                {filteredOtherUsers.length} Targets
              </span>
            </div>

            <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
              {filteredOtherUsers.length > 0 ? (
                filteredOtherUsers.map((u, i) => {
                  const dist = u.dist;
                  const initials = u.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
                  return (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => setSelectedUserInfo(u)}
                      className={`min-w-[160px] p-4 rounded-[1.75rem] ${theme === 'dark' ? 'glass-dark border-white/10' : 'glass border-black/5'} flex flex-col gap-3 active:scale-95 transition-transform shadow-2xl`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-xs font-black text-white shrink-0 shadow-lg border border-white/10">
                          {initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="text-[11px] font-black text-white truncate leading-tight">{u.name}</p>
                          <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mt-0.5">LVL {u.level || 1}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{u.entityType || 'User'}</p>
                        </div>
                        <p className="text-[10px] font-black text-blue-400 tracking-tight">
                          {dist !== null ? (dist > 1000 ? `${(dist / 1000).toFixed(1)}km` : `${Math.round(dist)}m`) : '—'}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className={`w-full py-6 flex flex-col items-center justify-center border ${theme === 'dark' ? 'border-white/5 bg-white/5' : 'bg-white border-black/5 shadow-lg'} rounded-[2rem] backdrop-blur-md`}>
                  <div className="w-2 h-2 rounded-full bg-blue-500/40 animate-ping mb-2" />
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600">
                    {!isGeofenceActive ? 'GEOFENCE REQUIRED' : (otherUsers.length > 0 ? 'NO TARGETS IN RADIUS' : 'SCANNING MANIFEST...')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`${theme === 'dark' ? 'glass-dark border-white/10' : 'glass border-black/5'} p-2 sm:p-2.5 rounded-[3rem] shadow-[0_25px_70px_rgba(0,0,0,0.3)] flex items-center gap-2 sm:gap-4`}
        >
          {/* Status and Manual Toggle (Left) */}
          <div className="flex items-center gap-2 sm:gap-4 pl-1">
            <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 ${!isManualMode ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
              <Activity className={`w-5 h-5 sm:w-7 sm:h-7 ${!isManualMode ? 'text-emerald-500 animate-pulse' : 'text-blue-500'}`} />
            </div>

            <div className="flex flex-col min-w-0 mr-1 sm:mr-2">
              <p className={`text-[9px] sm:text-[11px] font-black uppercase tracking-widest leading-none mb-1 sm:mb-1.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Status</p>
              <p className={`text-xs sm:text-sm font-black truncate max-w-[80px] sm:max-w-none ${!isManualMode ? 'text-emerald-500' : 'text-blue-500'}`}>{!isManualMode ? 'LIVE' : 'MANUAL'}</p>
            </div>

            <button
              onClick={() => setIsManualMode(!isManualMode)}
              className={`relative w-14 h-8 sm:w-18 sm:h-10 rounded-full transition-all duration-500 p-1 ${!isManualMode ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.3)]'}`}
              title={!isManualMode ? 'Switch to Manual Mode' : 'Switch to Live GPS'}
            >
              <div className={`absolute top-1 bottom-1 w-6 sm:w-8 rounded-full bg-white shadow-xl transition-all duration-500 ${!isManualMode ? 'left-7 sm:left-9' : 'left-1'}`}></div>
            </button>
          </div>

          {/* Timer (Middle) */}
          {isRecording && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 shrink-0">
              <Clock className="w-4 h-4 text-blue-400 animate-pulse" />
              <span className="text-sm sm:text-base font-black font-mono text-blue-400 tracking-wider">
                {startTime ? formatDuration(Date.now() - startTime) : '00:00'}
              </span>
            </div>
          )}

          {/* Compass and Recording (Right) */}
          <div className="flex items-center gap-1.5 sm:gap-2 pr-0.5">
            <button
              onClick={toggleCompass}
              className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 active:scale-90 relative ${isCompassEnabled && compassPermission === 'granted'
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/40 shadow-lg shadow-blue-500/10'
                : theme === 'dark'
                  ? 'bg-white/5 text-slate-500 border border-white/8 hover:bg-white/10 hover:text-slate-300'
                  : 'bg-black/5 text-slate-400 border border-black/10 hover:bg-black/10 hover:text-slate-600'
                }`}
              title={isCompassEnabled && compassPermission === 'granted' ? 'Disable Compass' : 'Enable Compass'}
            >
              <Compass className={`w-5 h-5 sm:w-7 sm:h-7 transition-transform ${isCompassEnabled && compassPermission === 'granted' ? 'animate-spin-slow' : ''}`} />
              {compassPermission === 'prompt' && (
                <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
              )}
            </button>

            {isRecording ? (
              <button
                onClick={stopRecording}
                className="bg-red-500 hover:bg-red-600 text-white h-10 sm:h-12 px-4 sm:px-6 rounded-2xl flex items-center gap-2 shadow-2xl transition-all font-black text-[10px] sm:text-xs uppercase tracking-widest active:scale-95"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="bg-blue-600 hover:bg-blue-500 text-white h-10 sm:h-12 px-4 sm:px-6 rounded-2xl flex items-center gap-2 shadow-2xl transition-all font-black text-[10px] sm:text-xs uppercase tracking-widest active:scale-95"
              >
                <Navigation className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Start</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Save Trip Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`${theme === 'dark' ? 'bg-[#111111] border-white/10' : 'bg-white border-black/10'} border w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl`}
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black tracking-tight">Save Your Trip</h3>
                <button onClick={() => setShowSaveModal(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              {/* Trip Summary Stats */}
              {startTime && (() => {
                const tripDist = totalDistance - tripDistanceAtStart;
                const durationMs = Date.now() - startTime;
                const avgSpeed = tripDist > 0 ? (tripDist / (durationMs / 1000)) * 3.6 : 0;
                return (
                  <div className={`grid grid-cols-3 gap-3 mb-6 p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <div className="text-center">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Distance</p>
                      <p className="text-lg font-black tracking-tighter">
                        {tripDist > 1000 ? (tripDist / 1000).toFixed(2) : Math.round(tripDist)}
                        <span className="text-[8px] font-bold text-slate-500 ml-1">{tripDist > 1000 ? 'km' : 'm'}</span>
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Duration</p>
                      <p className="text-lg font-black tracking-tighter">{formatDuration(durationMs)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Avg Speed</p>
                      <p className="text-lg font-black tracking-tighter">
                        {avgSpeed.toFixed(1)}
                        <span className="text-[8px] font-bold text-slate-500 ml-1">km/h</span>
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trip Name</label>
                  <input
                    type="text"
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    className={`w-full ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-black/5'} border rounded-2xl px-5 py-4 font-bold focus:outline-none focus:border-blue-500`}
                    placeholder="Morning Run, Commute, etc."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Location/Place</label>
                  <input
                    type="text"
                    value={tripLocationName}
                    onChange={(e) => setTripLocationName(e.target.value)}
                    className={`w-full ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-black/5'} border rounded-2xl px-5 py-4 font-bold focus:outline-none focus:border-blue-500`}
                    placeholder="Central Park, Downtown, etc."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Activity Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ACTIVITY_TYPES.map(type => (
                      <button
                        key={type.id}
                        onClick={() => setActivityType(type.id)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${activityType === type.id ? 'bg-blue-600 border-blue-500 text-white' : (theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 border-black/5 text-slate-500 hover:bg-slate-200')}`}
                      >
                        {type.icon}
                        <span className="text-[8px] font-black uppercase tracking-widest">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => {
                      setShowSaveModal(false);
                      setIsRecording(false);
                      setStartTime(null);
                      showToast('error', 'Trip Cancelled', 'Your activity was discarded.');
                    }}
                    className={`flex-1 font-black py-5 rounded-2xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20`}
                  >
                    <X className="w-5 h-5" />
                    Cancel
                  </button>
                  <button
                    onClick={saveTrip}
                    className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl transition-all text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
                  >
                    <Save className="w-5 h-5" />
                    Save Trip
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Time Travel Engine Panel */}
      <AnimatePresence>
        {!isReplayClosed && (
          <div className="absolute top-28 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 z-[65] sm:w-[540px]">
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className={`${theme === 'dark' ? 'bg-[#111111]/95 border-white/10' : 'bg-white border-black/10'} p-5 sm:p-6 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border backdrop-blur-xl`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500 animate-spin-slow" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Time Travel Engine</h3>
                  {isReplaying && <span className="text-[7px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 uppercase tracking-widest animate-pulse">Historical View</span>}
                </div>
                <button onClick={() => { setIsReplayClosed(true); stopAutoReplay(); if (isReplaying) { setReplayIndex(null); setIsReplaying(false); setLocation(replayHistory[replayHistory.length - 1]?.location || null); } }}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-all">
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>

              {replayHistory.length < 2 ? (
                <div className="text-center py-4">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Collecting location data...</p>
                  <p className="text-[8px] text-slate-600 mt-1">Move around to build history buffer ({replayHistory.length}/2 min)</p>
                </div>
              ) : (
                <>
                  {/* Timestamp & Speed Row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`px-3 py-1.5 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'} flex items-center gap-2`}>
                      <Clock className="w-3 h-3 text-blue-400" />
                      <p className="text-[10px] font-black font-mono text-blue-400">
                        {replayIndex !== null ? new Date(replayHistory[replayIndex].timestamp).toLocaleTimeString() : new Date(replayHistory[replayHistory.length - 1].timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    {/* Speed selector */}
                    <div className={`flex items-center gap-1 p-1 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`}>
                      {[0.5, 1, 2, 4].map(s => (
                        <button key={s} onClick={() => setReplaySpeed(s)}
                          className={`px-2 py-1 rounded-lg text-[8px] font-black transition-all ${replaySpeed === s ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-white/10'}`}>
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Timeline scrubber */}
                  <div className="relative h-2 w-full bg-slate-200 dark:bg-white/5 rounded-full mb-3">
                    <input
                      type="range" min="0" max={replayHistory.length - 1}
                      value={replayIndex === null ? replayHistory.length - 1 : replayIndex}
                      onChange={(e) => {
                        stopAutoReplay();
                        const idx = parseInt(e.target.value);
                        setReplayIndex(idx);
                        setIsReplaying(idx < replayHistory.length - 1);
                        setLocation(replayHistory[idx].location);
                      }}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer z-10 h-full"
                    />
                    <div className="absolute h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-150"
                      style={{ width: `${((replayIndex === null ? replayHistory.length - 1 : replayIndex) / Math.max(1, replayHistory.length - 1)) * 100}%` }} />
                    <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(37,99,235,0.8)] transition-all duration-150 pointer-events-none border-2 border-blue-500"
                      style={{ left: `calc(${((replayIndex === null ? replayHistory.length - 1 : replayIndex) / Math.max(1, replayHistory.length - 1)) * 100}% - 8px)` }} />
                    {/* Tick marks for recorded points */}
                    {replayHistory.filter((_, i) => i % Math.max(1, Math.floor(replayHistory.length / 10)) === 0).map((_, ti) => {
                      const pct = (ti * Math.max(1, Math.floor(replayHistory.length / 10)) / Math.max(1, replayHistory.length - 1)) * 100;
                      return <div key={ti} className="absolute top-1/2 -translate-y-1/2 w-1 h-1 bg-blue-300/40 rounded-full pointer-events-none" style={{ left: `${pct}%` }} />;
                    })}
                  </div>

                  {/* Timeline labels */}
                  <div className="flex justify-between mb-4 px-1">
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">
                      {new Date(replayHistory[0].timestamp).toLocaleTimeString()}
                    </p>
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">
                      {replayHistory.length} pts · {((replayHistory[replayHistory.length - 1].timestamp - replayHistory[0].timestamp) / 60000).toFixed(1)}m recorded
                    </p>
                    <p className="text-[7px] font-black text-blue-500 uppercase tracking-widest">LIVE</p>
                  </div>

                  {/* Playback controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => stepReplay(-5)}
                        className={`p-2 rounded-xl transition-all hover:scale-110 ${theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        <SkipBack className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => stepReplay(-1)}
                        className={`p-2 rounded-xl transition-all hover:scale-110 ${theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                      </button>
                      <button
                        onClick={() => isAutoPlaying ? stopAutoReplay() : startAutoReplay()}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg ${isAutoPlaying ? 'bg-amber-500 text-white shadow-amber-500/30' : 'bg-blue-600 text-white shadow-blue-600/30'}`}>
                        {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>
                      <button onClick={() => stepReplay(1)}
                        className={`p-2 rounded-xl transition-all hover:scale-110 ${theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => stepReplay(5)}
                        className={`p-2 rounded-xl transition-all hover:scale-110 ${theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Jump to live */}
                    <button
                      onClick={() => { stopAutoReplay(); setReplayIndex(null); setIsReplaying(false); if (replayHistory.length > 0) setLocation(replayHistory[replayHistory.length - 1].location); }}
                      className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${replayIndex === null ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20' : `border-blue-500/30 text-blue-400 hover:bg-blue-600/10 ${theme === 'dark' ? 'bg-blue-600/5' : 'bg-blue-50'}`}`}>
                      {replayIndex === null ? '● LIVE' : 'Return Live'}
                    </button>
                  </div>

                  {/* Current point info */}
                  {replayIndex !== null && replayHistory[replayIndex] && (
                    <div className={`mt-4 p-3 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-black/5'} border flex items-center justify-between`}>
                      <div>
                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Historical Position</p>
                        <p className="text-[9px] font-black font-mono text-blue-400">
                          {replayHistory[replayIndex].location.lat.toFixed(5)}, {replayHistory[replayIndex].location.lng.toFixed(5)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Speed at Point</p>
                        <p className="text-[10px] font-black">{replayHistory[replayIndex].speed.toFixed(1)} <span className="text-[7px] opacity-50">km/h</span></p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Event Timeline Sidebar */}
      <AnimatePresence>
        {showTimeline && (
          <div className="absolute inset-y-0 right-0 z-[110] w-72 sm:w-88 flex items-stretch p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className={`h-full w-full ${theme === 'dark' ? 'glass-dark' : 'glass'} rounded-[2.5rem] border border-white/5 shadow-2xl p-6 flex flex-col pointer-events-auto overflow-hidden`}
            >
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-blue-500" />
                  <h3 className="font-black text-xs uppercase tracking-widest">Location Timeline</h3>
                </div>
                <button onClick={() => setShowTimeline(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* Tab selector */}
              <>
                <div className={`flex gap-1 p-1 rounded-xl mb-5 shrink-0 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`}>
                  {(['locations', 'events'] as const).map(tab => (
                    <button key={tab} onClick={() => setTimelineTab(tab)}
                      className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${timelineTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>
                      {tab === 'locations' ? '📍 Positions' : '⚡ Events'}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-auto space-y-4 scrollbar-hide min-h-0">
                  {timelineTab === 'locations' ? (
                    locationHistory.length > 0 ? locationHistory.map((loc, i) => (
                      <div key={loc.timestamp} className="relative pl-7 group">
                        {i < locationHistory.length - 1 && (
                          <div className="absolute left-[10px] top-6 bottom-[-16px] w-0.5 bg-slate-800/50 group-hover:bg-blue-600/30 transition-all" />
                        )}
                        <div className={`absolute left-0 top-1 w-5 h-5 rounded-lg flex items-center justify-center transition-all ${i === 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-blue-500/10 text-blue-400'}`}>
                          {i === 0 ? <Navigation2 className="w-2.5 h-2.5" /> : <MapPin className="w-2.5 h-2.5" />}
                        </div>
                        <div className={`p-3 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-white/3 border-white/5 hover:border-blue-500/20' : 'bg-slate-50 border-black/5 hover:border-blue-200'} ${i === 0 ? 'border-emerald-500/20' : ''}`}>
                          {loc.address && (
                            <p className={`text-[9px] font-black mb-1 truncate ${i === 0 ? 'text-emerald-400' : theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{loc.address}</p>
                          )}
                          <p className="text-[8px] font-bold font-mono text-slate-500">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <p className="text-[7px] font-black text-slate-600 uppercase tracking-wider">{new Date(loc.timestamp).toLocaleTimeString()}</p>
                            {loc.speed > 0 && <p className="text-[7px] font-black text-blue-400">{loc.speed.toFixed(1)} km/h</p>}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <Target className="w-10 h-10 text-slate-700 mb-4" />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No Positions Recorded</p>
                        <p className="text-[8px] text-slate-600 mt-1 uppercase font-bold">GPS must be active to record</p>
                      </div>
                    )
                  ) : (
                    activities.length > 0 ? activities.map((act, i) => (
                      <div key={act.id} className="relative pl-7 group">
                        {i < activities.length - 1 && (
                          <div className="absolute left-[10px] top-6 bottom-[-16px] w-0.5 bg-slate-800/50 group-hover:bg-blue-600/30 transition-all" />
                        )}
                        <div className={`absolute left-0 top-1 w-5 h-5 rounded-lg flex items-center justify-center transition-all ${act.type === 'movement' ? 'bg-emerald-500/20 text-emerald-500' : act.type === 'power' ? 'bg-amber-500/20 text-amber-400' : act.type === 'success' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>
                          {act.type === 'movement' ? <Activity className="w-2.5 h-2.5" /> : act.type === 'power' ? <Zap className="w-2.5 h-2.5" /> : <MapPin className="w-2.5 h-2.5" />}
                        </div>
                        <div>
                          <p className={`text-[10px] font-black truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{act.message}</p>
                          <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{act.time}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <Activity className="w-10 h-10 text-slate-700 mb-4" />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No Events Yet</p>
                        <p className="text-[8px] text-slate-600 mt-1 uppercase font-bold">Move to initiate timeline</p>
                      </div>
                    )
                  )}
                </div>
              </>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Toast Notifications */}
      <div className="absolute bottom-44 sm:bottom-36 left-1/2 -translate-x-1/2 z-[80] flex flex-col items-center gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={`pointer-events-auto flex items-center gap-4 px-6 py-4 rounded-[2rem] shadow-2xl backdrop-blur-xl border min-w-[280px] ${toast.type === 'success'
                ? 'bg-[#111]/90 border-white/10'
                : 'bg-red-950/90 border-red-500/20'
                }`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${toast.type === 'success' ? 'bg-blue-600/20' : 'bg-red-500/20'}`}>
                {toast.type === 'success'
                  ? <CheckCircle2 className="w-5 h-5 text-blue-400" />
                  : <AlertCircle className="w-5 h-5 text-red-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-black truncate ${toast.type === 'success' ? 'text-white' : 'text-red-300'}`}>
                  {toast.type === 'success' ? '🗺️ ' : (toast.title.includes('Cancelled') ? '🗑️ ' : '❌ ')}{toast.title}
                </p>
                {toast.subtitle && (
                  <p className={`text-[11px] font-bold mt-0.5 ${toast.type === 'success' ? 'text-slate-400' : 'text-red-400'}`}>
                    {toast.subtitle}
                  </p>
                )}
              </div>
              <div className={`w-1.5 h-8 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-blue-500/40' : 'bg-red-500/40'}`}>
                <motion.div
                  className={`w-full rounded-full origin-top ${toast.type === 'success' ? 'bg-blue-500' : 'bg-red-500'}`}
                  initial={{ scaleY: 1 }}
                  animate={{ scaleY: 0 }}
                  transition={{ duration: 4, ease: 'linear' }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* User Intelligence Modal */}
      <AnimatePresence>
        {selectedUserInfo && (
          <div className="absolute inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className={`relative overflow-hidden ${theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-black/10'} border w-full max-w-sm rounded-[3rem] p-10 shadow-[0_50px_100px_rgba(0,0,0,0.6)] group`}
            >
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full group-hover:bg-blue-600/30 transition-all duration-700" />
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-20 h-20 rounded-[2.5rem] bg-blue-600/20 flex items-center justify-center mb-6 shadow-2xl relative">
                  <div className="absolute inset-0 rounded-[2.5rem] border-2 border-blue-500/20 animate-pulse" />
                  <Users className="w-10 h-10 text-blue-500" />
                </div>
                <h3 className="text-3xl font-black tracking-tighter mb-1">{selectedUserInfo.name}</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8">{selectedUserInfo.entityType || 'User Manifest'}</p>
                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                  <div className={`p-4 rounded-3xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-black/5'} border`}>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 text-left">Real-Time Velocity</p>
                    <p className="text-xl font-black tracking-tighter text-left">{(selectedUserInfo.speed || 0).toFixed(1)} <span className="text-[10px] opacity-60">km/h</span></p>
                  </div>
                  <div className={`p-4 rounded-3xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-black/5'} border`}>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 text-left">Entity Range</p>
                    <p className="text-xl font-black tracking-tighter text-left">
                      {location && selectedUserInfo.location
                        ? (getDistance(location.lat, location.lng, selectedUserInfo.location.lat, selectedUserInfo.location.lng)).toFixed(0)
                        : '---'}
                      <span className="text-[10px] opacity-60"> m</span>
                    </p>
                  </div>
                </div>
                {predictions[selectedUserInfo.id] && (
                  <div className={`w-full p-5 rounded-3xl mb-8 border border-blue-500/30 bg-blue-600/5 relative overflow-hidden group/intel`}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 blur-[40px] rounded-full" />
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="w-4 h-4 text-blue-400 animate-pulse" />
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">Projective Destination</p>
                    </div>
                    <p className="text-lg font-black tracking-tight text-left text-blue-400">{predictions[selectedUserInfo.id].place}</p>
                    <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest text-left mt-1 opacity-60">Estimated arrival in 5 minutes</p>
                  </div>
                )}
                <div className="flex gap-4 w-full">
                  <button onClick={() => setSelectedUserInfo(null)} className={`flex-1 font-black py-5 rounded-[2rem] transition-all text-[10px] uppercase tracking-widest border ${theme === 'dark' ? 'border-white/10 text-slate-400 hover:bg-white/5' : 'border-black/10 text-slate-500 hover:bg-slate-50'}`}>Close</button>
                  <button onClick={() => { getRouteToMe(selectedUserInfo); setSelectedUserInfo(null); }} className="flex-[1.5] bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-[2rem] transition-all text-[10px] uppercase tracking-widest shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-3 active:scale-95"><Navigation className="w-4 h-4" />Intercept</button>
                </div>
              </div>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-30">
                <p className="text-[8px] font-black font-mono tracking-widest uppercase">LAT: {selectedUserInfo.location?.lat.toFixed(6) || '---'}</p>
                <div className="w-1 h-1 rounded-full bg-slate-500" />
                <p className="text-[8px] font-black font-mono tracking-widest uppercase">LNG: {selectedUserInfo.location?.lng.toFixed(6) || '---'}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
