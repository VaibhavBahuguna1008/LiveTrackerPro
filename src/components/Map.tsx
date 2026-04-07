import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Loader2, Shield } from 'lucide-react';

// Fix Leaflet default icon issues
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Location {
  lat: number;
  lng: number;
}

interface User {
  id: string;
  name: string;
  location?: Location;
  role: string;
  entityType?: string;
  lastUpdate?: Date;
  speed?: number;
  heading?: number;
  xp?: number;
  level?: number;
}

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

interface MapProps {
  users: User[];
  center?: Location;
  zoom?: number;
  geofence?: { center: Location; radius: number };
  currentUserLocation?: Location;
  onMapClick?: (lat: number, lng: number) => void;
  followUserId?: string | null;
  theme?: 'dark' | 'light';
  predictions?: Record<string, { lat: number, lng: number, place: string }>;
  replayPath?: { lat: number; lng: number }[];
  accuracy?: number | null;
  isReplaying?: boolean;
}

// Component to handle map clicks and manual interactions
function MapEvents({ onClick, onUserInteraction }: { onClick?: (lat: number, lng: number) => void, onUserInteraction?: () => void }) {
  const map = useMap();
  useEffect(() => {
    const handleInteraction = () => {
      if (onUserInteraction) onUserInteraction();
    };

    map.on('click', (e: any) => {
      if (onClick) onClick(e.latlng.lat, e.latlng.lng);
    });

    map.on('dragstart', handleInteraction);
    map.on('zoomstart', handleInteraction);

    return () => {
      map.off('click');
      map.off('dragstart', handleInteraction);
      map.off('zoomstart', handleInteraction);
    };
  }, [onClick, onUserInteraction, map]);
  return null;
}

// Helper to calculate bearing between two points
const calculateBearing = (startLat: number, startLng: number, endLat: number, endLng: number) => {
  const startLatRad = (startLat * Math.PI) / 180;
  const startLngRad = (startLng * Math.PI) / 180;
  const endLatRad = (endLat * Math.PI) / 180;
  const endLngRad = (endLng * Math.PI) / 180;

  const y = Math.sin(endLngRad - startLngRad) * Math.cos(endLatRad);
  const x =
    Math.cos(startLatRad) * Math.sin(endLatRad) -
    Math.sin(startLatRad) * Math.cos(endLatRad) * Math.cos(endLngRad - startLngRad);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
};

// Helper to check if moving towards
const isMovingTowards = (
  entityPos: Location,
  entityPrevPos: Location | undefined,
  targetPos: Location | undefined
) => {
  if (!entityPos || !entityPrevPos || !targetPos || entityPos.lat === null || entityPrevPos.lat === null || targetPos.lat === null) return false;
  
  try {
    // 1. Calculate current distance
    const currentDist = L.latLng(entityPos.lat, entityPos.lng).distanceTo(L.latLng(targetPos.lat, targetPos.lng));

    // 2. Calculate previous distance
    const prevDist = L.latLng(entityPrevPos.lat, entityPrevPos.lng).distanceTo(L.latLng(targetPos.lat, targetPos.lng));

    // 3. If distance is decreasing, it's moving towards
    return currentDist < prevDist;
  } catch {
    return false;
  }
};

// Handles zoom only — never re-centers the map
function ZoomController({ zoom }: { zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setZoom(zoom);
  }, [zoom, map]);
  return null;
}

// Handles centering only when follow mode is explicitly active
function FollowController({ center, zoom, active }: { center: [number, number]; zoom: number; active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (active) {
      map.setView(center, zoom, { animate: true, duration: 0.5 });
    }
  }, [center, active, zoom, map]);
  return null;
}

export default function Map({
  users,
  center,
  zoom = 15,
  geofence,
  currentUserLocation,
  onMapClick,
  followUserId,
  theme = 'dark',
  predictions = {},
  replayPath = [],
  accuracy = null,
  isReplaying = false,
}: MapProps) {
  const [loading, setLoading] = useState(true);
  const [userPaths, setUserPaths] = useState<{ [key: string]: [number, number][] }>({});

  useEffect(() => {
    setLoading(false);
  }, []);

  // Update user paths for polylines
  useEffect(() => {
    const newPaths = { ...userPaths };
    let changed = false;

    // Remove paths for users who are no longer present
    const currentIds = new Set(users.map(u => u.id));
    Object.keys(newPaths).forEach(id => {
      if (!currentIds.has(id)) {
        delete newPaths[id];
        changed = true;
      }
    });

    users.forEach(user => {
      if (user.location && user.location.lat !== null) {
        const currentPath = newPaths[user.id] || [];
        const lastPoint = currentPath[currentPath.length - 1];

        if (!lastPoint || lastPoint[0] !== user.location.lat || lastPoint[1] !== user.location.lng) {
          // Keep only last 50 points for performance and "fading" effect
          const updatedPath = [...currentPath, [user.location.lat, user.location.lng]].slice(-50);
          newPaths[user.id] = updatedPath as [number, number][];
          changed = true;
        }
      }
    });

    if (changed) {
      setUserPaths(newPaths);
    }
  }, [users]);

  const mapCenter: [number, number] = useMemo(() => {
    if (followUserId) {
      const followedUser = users.find(u => u.id === followUserId);
      if (followedUser?.location && followedUser.location.lat !== null) return [followedUser.location.lat, followedUser.location.lng];
    }
    if (center && center.lat !== null) return [center.lat, center.lng];
    if (users.length > 0 && users[0].location && users[0].location.lat !== null) return [users[0].location.lat, users[0].location.lng];
    return [0, 0];
  }, [center, users, followUserId]);

  const getIconColor = (type?: string) => {
    switch (type) {
      case 'bike': return '#f59e0b'; // Amber
      case 'car': return '#ef4444'; // Red
      case 'bus': return '#8b5cf6'; // Purple
      default: return '#3b82f6'; // Blue
    }
  };

  if (loading) {
    return (
      <div className={`relative w-full h-full rounded-3xl overflow-hidden border ${theme === 'dark' ? 'border-slate-800 bg-[#0f0f0f]' : 'border-black/5 bg-white'} flex flex-col items-center justify-center`}>
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-black text-[10px] uppercase tracking-widest`}>Initializing Strategic Map...</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full rounded-3xl overflow-hidden border border-slate-800 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f4f7f2]'}`}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        zoomControl={false}
        style={{
          height: '100%',
          width: '100%',
          background: 'transparent'
        }}
      >
        {/* Only pan to user when follow mode is active */}
        <FollowController center={mapCenter} zoom={zoom} active={!!followUserId} />
        {/* Zoom changes always apply regardless of follow mode */}
        <ZoomController zoom={zoom} />
        <MapEvents onClick={onMapClick} onUserInteraction={() => {
          window.dispatchEvent(new CustomEvent('map-interaction'));
        }} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* GPS Accuracy Circle around current user location */}
        {currentUserLocation && accuracy !== null && !isReplaying && (
          <Circle
            center={[currentUserLocation.lat, currentUserLocation.lng]}
            radius={accuracy}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.08,
              weight: 1,
              dashArray: '5, 8'
            }}
          />
        )}

        {/* Geofence Circle */}
        {geofence && (
          <Circle
            center={[geofence.center.lat, geofence.center.lng]}
            radius={geofence.radius}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.08,
              weight: 2,
              dashArray: '8, 12'
            }}
          />
        )}

        {/* Replay Historical Path */}
        {isReplaying && replayPath.length > 1 && (
          <>
            {/* Full recorded path (faded) */}
            <Polyline
              positions={replayPath.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{
                color: '#06b6d4',
                weight: 2,
                opacity: 0.25,
                dashArray: '4, 8',
                lineCap: 'round'
              }}
            />
            {/* Start point marker */}
            <Marker
              position={[replayPath[0].lat, replayPath[0].lng]}
              icon={L.divIcon({
                className: 'replay-start-marker',
                html: `<div style="width:10px;height:10px;border-radius:50%;background:#06b6d4;border:2px solid white;box-shadow:0 0 8px rgba(6,182,212,0.6);"></div>`,
                iconAnchor: [5, 5]
              })}
            />
          </>
        )}

        {/* User Paths (Polylines) with fading effect */}
        {Object.entries(userPaths).map(([userId, path]) => {
          const user = users.find(u => u.id === userId);
          const color = getIconColor(user?.entityType);

          return (
            <Polyline
              key={`path-${userId}`}
              positions={path}
              pathOptions={{
                color: color,
                weight: 3,
                opacity: 0.4,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          );
        })}

        {/* AI Predictive Vectors and Destinations */}
        {Object.entries(predictions).map(([userId, pred]) => {
          const user = users.find(u => u.id === userId);
          const userLoc = user?.location;
          if (!userLoc || userLoc.lat === null) return null;

          return (
            <div key={`pred-group-${userId}`}>
              <Polyline
                positions={[[userLoc.lat, userLoc.lng], [pred.lat, pred.lng]]}
                pathOptions={{
                  color: '#3b82f6',
                  weight: 2,
                  dashArray: '10, 15',
                  opacity: 0.6
                }}
              />
              <Circle
                center={[pred.lat, pred.lng]}
                radius={20}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.2,
                  weight: 1
                }}
              />
              <Marker
                position={[pred.lat, pred.lng]}
                icon={L.divIcon({
                  className: 'predictive-marker',
                  html: `
                    <div style="position: relative;">
                      <div style="background: rgba(37,99,235,0.1); border: 2px dashed #3b82f6; width: 32px; height: 32px; border-radius: 50%; display: flex; items-center; justify-center; opacity: 0.6;">
                        <span style="font-size: 8px; font-weight: 900; color: #3b82f6;">5m</span>
                      </div>
                      <div style="position: absolute; top: -35px; left: 50%; transform: translateX(-50%); background: ${theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}; backdrop-blur: 10px; border: 1px solid rgba(255,255,255,0.1); padding: 5px 10px; border-radius: 12px; white-space: nowrap; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
                        <p style="margin: 0; font-size: 8px; font-weight: 900; text-transform: uppercase; color: #3b82f6; letter-spacing: 0.1em;">Heading to</p>
                        <p style="margin: 0; font-size: 10px; font-weight: 900; color: ${theme === 'dark' ? 'white' : 'black'};">${pred.place}</p>
                      </div>
                    </div>
                  `,
                  iconAnchor: [16, 16]
                })}
              />
            </div>
          );
        })}

        {/* User Markers */}
        {users.map((user) => {
          if (!user.location || user.location.lat === null) return null;

          const currentUser = users.find(u => u.location && u.location.lat !== null && u.location.lat === currentUserLocation?.lat && u.location.lng === currentUserLocation?.lng);
          const path = userPaths[user.id] || [];
          const prevPos = path.length > 1 ? { lat: path[path.length - 2][0], lng: path[path.length - 2][1] } : undefined;

          const movingTowardsMe = currentUserLocation && currentUser && user.id !== currentUser.id
            ? isMovingTowards(user.location, prevPos, currentUserLocation)
            : false;

          // Check if I am moving towards them
          const myPath = currentUser ? userPaths[currentUser.id] || [] : [];
          const myPrevPos = myPath.length > 1 ? { lat: myPath[myPath.length - 2][0], lng: myPath[myPath.length - 2][1] } : undefined;
          const iAmMovingTowardsThem = currentUser && currentUserLocation && user.id !== currentUser.id
            ? isMovingTowards(currentUserLocation, myPrevPos, user.location)
            : false;

          const isMutual = movingTowardsMe && iAmMovingTowardsThem;

          const getIconColor = (type?: string) => {
            switch (type) {
              case 'scooter': return '#3b82f6'; // Blue
              case 'car': return '#10b981';     // Emerald
              case 'bus': return '#f59e0b';     // Amber
              case 'person': return '#8b5cf6';  // Violet
              case 'ghost': return '#06b6d4';   // Cyan (Temporal)
              default: return '#6366f1';        // Indigo
            }
          };

          const getEntitySVG = (type: string) => {
            switch (type) {
              case 'scooter':
                return '<path d="M18 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM6 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM12 17H7M12 17l-1-8h-3l-2 8M14 9h5v8h-5M20 17h2v-3l-2-1h-2"></path>';
              case 'ghost':
                return '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>';
              case 'car':
                return '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><circle cx="17" cy="17" r="2"></circle>';
              case 'bus':
                return '<path d="M2 13v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3ZM2 11h20M7 8v5M17 8v5M11 8v5M14 8v5"></path><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>';
              case 'person':
                return '<path d="M18 20a6 6 0 0 0-12 0L6 20M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8"></path>';
              default:
                return '<path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"></path>';
            }
          };

          const movementBearing = prevPos ? calculateBearing(prevPos.lat, prevPos.lng, user.location.lat, user.location.lng) : 0;
          const displayBearing = user.heading !== undefined ? user.heading : movementBearing;
          const color = getIconColor(user.entityType);

          const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `
              <div class="relative flex items-center justify-center" style="width: 48px; height: 48px;">
                <!-- Shadow/Glow -->
                <div class="absolute w-10 h-10 rounded-full blur-[4px] opacity-40" style="background-color: ${color}; top: 6px;"></div>
                
                <!-- Main Circle Container -->
                <div class="relative w-10 h-10 rounded-full border-[3px] border-white flex items-center justify-center transition-all duration-300" 
                     style="background-color: ${color}; box-shadow: 0 8px 20px rgba(0,0,0,0.3); transform: rotate(${user.entityType === 'person' ? 0 : displayBearing}deg);">
                  
                  <div style="transform: rotate(${user.entityType === 'person' ? 0 : -displayBearing}deg); transition: transform 0.5s ease-out;">
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                      ${getEntitySVG(user.entityType || 'person')}
                    </svg>
                  </div>
                </div>

                <!-- Labels -->
                <div class="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
                  ${isMutual ? `
                    <div class="bg-blue-600 text-white text-[8px] font-black px-2.5 py-1 rounded-lg border-2 border-white shadow-xl animate-bounce whitespace-nowrap">
                      SYNC
                    </div>
                  ` : ''}
                </div>
              </div>
            `,
            iconSize: [48, 48],
            iconAnchor: [24, 24],
          });

          return (
            <Marker
              key={user.id}
              position={[user.location.lat, user.location.lng]}
              icon={customIcon}
            >
              <Popup>
                <div className={`p-0 min-w-[240px] border-none overflow-hidden rounded-2xl ${theme === 'dark' ? 'bg-[#0a0a0a] text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : 'bg-white text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.1)]'}`}>
                  {/* Global Operative Header */}
                  <div className={`px-4 py-3.5 border-b ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-black/5'} flex items-center justify-between`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(user.lastUpdate)} shadow-[0_0_12px_rgba(59,130,246,0.4)]`}></div>
                      <div>
                         <h4 className="text-[11px] font-black uppercase tracking-tighter leading-none">{user.name}</h4>
                         <p className="text-[7px] font-black text-blue-500 uppercase tracking-widest mt-1.5">Level {user.level || 1} Operative</p>
                      </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'} text-[7px] font-black uppercase tracking-widest text-blue-500`}>
                       {user.entityType || 'User'}
                    </div>
                  </div>

                  <div className="p-4 space-y-5">
                    {/* Progression Manifestation */}
                    <div className={`p-4 rounded-3xl ${theme === 'dark' ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50 border-blue-100'} border`}>
                       <div className="flex items-center justify-between mb-2">
                          <p className="text-[7px] font-black uppercase tracking-widest text-blue-500/70 leading-none">Global Progression</p>
                          <p className="text-[7px] font-black text-blue-500 uppercase tracking-widest leading-none">{(user.xp || 0).toFixed(0)} / {(user.level || 1) * 1000} XP</p>
                       </div>
                       <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{ width: `${((user.xp || 0) / ((user.level || 1) * 1000) * 100)}%` }} />
                       </div>
                    </div>

                    {/* Uniform Telemetry Manifest */}
                    <div className="space-y-2.5">
                       <p className="text-[7px] font-black uppercase tracking-[0.3em] opacity-30 px-1">Telemetry Live</p>
                       <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-black/5'} border space-y-3`}>
                          <div className="flex justify-between items-center">
                            <span className="text-[7px] font-black uppercase tracking-widest opacity-40">Current Velocity</span>
                            <span className="text-[10px] font-black tracking-tight">{user.speed?.toFixed(1) || '0.0'} <span className="opacity-30 ml-0.5 text-[8px]">KM/H</span></span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[7px] font-black uppercase tracking-widest opacity-40">Alt / Elevation</span>
                            <span className="text-[10px] font-black tracking-tight">142<span className="opacity-30 ml-0.5 text-[8px]">M MSL</span></span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[7px] font-black uppercase tracking-widest opacity-40">Last Signal</span>
                            <span className="text-[9px] font-black uppercase tracking-tighter opacity-80">{getLastSeenText(user.lastUpdate)}</span>
                          </div>
                       </div>
                    </div>

                    {/* Situational Analysis */}
                    {(isMutual || movingTowardsMe) && (
                      <div className="pt-1">
                        {isMutual ? (
                          <div className="p-3 bg-red-600 text-white rounded-2xl text-[8px] font-black text-center uppercase tracking-[0.15em] shadow-xl shadow-red-600/30 animate-pulse">
                            Autonomous Convergence Detected
                          </div>
                        ) : (
                          <div className={`p-3 ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'} border rounded-2xl text-blue-500 font-black text-[8px] text-center uppercase tracking-[0.15em]`}>
                            Incoming Trajectory Verified
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Replay status badge — only shown during time travel */}
      {isReplaying && (
        <div className="absolute top-4 left-4 z-1000 pointer-events-none">
          <div className="bg-cyan-950/90 border border-cyan-500/30 backdrop-blur-md p-3 rounded-xl shadow-2xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Historical Replay</span>
          </div>
        </div>
      )}
    </div>
  );
}
