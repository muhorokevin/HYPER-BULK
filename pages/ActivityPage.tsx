
import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, 
  MapPin, 
  Zap, 
  Clock, 
  Trash2, 
  Play, 
  Square, 
  Loader2, 
  Activity, 
  Flame,
  History,
  Radar,
  TrendingUp,
  ExternalLink,
  ChevronRight,
  Route
} from 'lucide-react';
import { ActivityRecord, UserProfile } from '../types';
import { estimateActivityBurn, suggestRoutes } from '../services/geminiService';

interface ActivityPageProps {
  activities: ActivityRecord[];
  setActivities: React.Dispatch<React.SetStateAction<ActivityRecord[]>>;
  profile: UserProfile;
}

const ActivityPage: React.FC<ActivityPageProps> = ({ activities, setActivities, profile }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentDistance, setCurrentDistance] = useState(0);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [isEstimating, setIsEstimating] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [suggestedRoutesData, setSuggestedRoutesData] = useState<{text: string, sources: any[]} | null>(null);
  const [isFindingRoutes, setIsFindingRoutes] = useState(false);
  
  const pathRef = useRef<{ lat: number, lng: number }[]>([]);
  const timerRef = useRef<number | null>(null);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; 
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

  const startTracking = () => {
    if (!navigator.geolocation) {
      alert("Field sensors not available (Geolocation denied).");
      return;
    }

    setIsTracking(true);
    setCurrentDistance(0);
    setCurrentDuration(0);
    pathRef.current = [];

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (pathRef.current.length > 0) {
          const last = pathRef.current[pathRef.current.length - 1];
          const dist = calculateDistance(last.lat, last.lng, latitude, longitude);
          if (dist > 0.5) { 
            setCurrentDistance(prev => prev + dist);
          }
        }
        pathRef.current.push({ lat: latitude, lng: longitude });
      },
      (err) => console.error(err),
      // Fix: Removed non-standard distanceFilter property from PositionOptions
      { enableHighAccuracy: true }
    );
    setWatchId(id);

    timerRef.current = window.setInterval(() => {
      setCurrentDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTracking = async () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    if (timerRef.current !== null) clearInterval(timerRef.current);
    
    setIsTracking(false);
    setIsEstimating(true);

    try {
      const burn = await estimateActivityBurn('run', currentDistance, currentDuration, profile);
      const newActivity: ActivityRecord = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'run',
        distance: currentDistance,
        duration: currentDuration,
        caloriesBurned: burn.calories,
        timestamp: Date.now(),
        path: [...pathRef.current],
        steps: Math.floor(currentDistance * 1.31)
      };
      setActivities([newActivity, ...activities]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsEstimating(false);
    }
  };

  const getSuggestedRoutes = () => {
    if (!navigator.geolocation) return;
    setIsFindingRoutes(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const data = await suggestRoutes(pos.coords.latitude, pos.coords.longitude);
        setSuggestedRoutesData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsFindingRoutes(false);
      }
    });
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentPace = currentDistance > 0 ? (currentDuration / (currentDistance / 1000) / 60).toFixed(2) : "0.00";

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24">
      {/* HUD Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-zinc-900 pb-8 relative overflow-hidden">
        <div className="scanline"></div>
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-lime-400 text-black text-[9px] font-black rounded tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(163,230,53,0.3)]">Field Operations</span>
            <div className="flex items-center gap-2 text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">
              <Radar size={14} className="text-zinc-700 animate-pulse" />
              Sensor: <span className="text-zinc-400">GPS_TRACKING_ACTIVE</span>
            </div>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none italic uppercase">
            TACTICAL <span className="text-zinc-800">DEPLOY</span>
          </h2>
        </div>
        
        <div className="flex gap-4">
           {!isTracking ? (
             <button onClick={startTracking} className="bg-lime-400 hover:bg-lime-300 text-black font-black px-12 py-5 rounded-[1.5rem] shadow-2xl shadow-lime-400/20 active:scale-95 transition-tactical uppercase text-xs tracking-widest flex items-center gap-3">
                <Play size={20} fill="currentColor" /> Begin Mission
             </button>
           ) : (
             <button onClick={stopTracking} className="bg-red-500 hover:bg-red-400 text-white font-black px-12 py-5 rounded-[1.5rem] shadow-2xl shadow-red-500/20 active:scale-95 transition-tactical uppercase text-xs tracking-widest flex items-center gap-3">
                <Square size={20} fill="currentColor" /> Finalize Node
             </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Telemetry & Map */}
        <div className="lg:col-span-8 space-y-8">
           {/* Stylized Radar Map View */}
           <div className="glass-panel rounded-[3rem] aspect-video relative overflow-hidden hud-border flex items-center justify-center bg-black">
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                 <div className="absolute inset-0 border border-zinc-800 rounded-full scale-[0.2]"></div>
                 <div className="absolute inset-0 border border-zinc-800 rounded-full scale-[0.4]"></div>
                 <div className="absolute inset-0 border border-zinc-800 rounded-full scale-[0.6]"></div>
                 <div className="absolute inset-0 border border-zinc-800 rounded-full scale-[0.8]"></div>
                 <div className="absolute top-1/2 w-full h-px bg-zinc-800"></div>
                 <div className="absolute left-1/2 h-full w-px bg-zinc-800"></div>
              </div>

              {/* Path Visualization */}
              <svg viewBox="0 0 400 300" className="w-full h-full p-10 z-10">
                {pathRef.current.length > 1 && (
                  <path
                    d={`M ${pathRef.current.map((p, i) => {
                      const scale = 20000;
                      const x = 200 + (p.lng - pathRef.current[0].lng) * scale;
                      const y = 150 - (p.lat - pathRef.current[0].lat) * scale;
                      return `${x},${y}`;
                    }).join(' L ')}`}
                    fill="none"
                    stroke="#a3e635"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-[0_0_8px_#a3e635]"
                  />
                )}
                {/* User Current Position Dot */}
                {pathRef.current.length > 0 && (
                  <circle 
                    cx={200 + (pathRef.current[pathRef.current.length - 1].lng - pathRef.current[0].lng) * 20000}
                    cy={150 - (pathRef.current[pathRef.current.length - 1].lat - pathRef.current[0].lat) * 20000}
                    r="6"
                    fill="#a3e635"
                    className="animate-pulse shadow-[0_0_15px_#a3e635]"
                  />
                )}
              </svg>

              <div className="absolute top-8 left-8 p-4 bg-black/60 backdrop-blur rounded-2xl border border-zinc-800">
                 <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Signal Status</p>
                 <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-lime-400 shadow-[0_0_8px_#a3e635]' : 'bg-red-500'}`}></div>
                    <span className="text-[10px] font-black text-white mono">{isTracking ? 'LOCKED' : 'AWAITING_SAT'}</span>
                 </div>
              </div>

              <div className="absolute bottom-8 right-8 flex gap-4">
                 <div className="p-4 bg-black/60 backdrop-blur rounded-2xl border border-zinc-800">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Pace</p>
                    <p className="text-xl font-black text-white mono">{currentPace}<span className="text-[10px] ml-1">M/K</span></p>
                 </div>
                 <div className="p-4 bg-black/60 backdrop-blur rounded-2xl border border-zinc-800">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Heart Est.</p>
                    <p className="text-xl font-black text-white mono">{isTracking ? Math.floor(120 + currentDistance/50) : '--'}<span className="text-[10px] ml-1">BPM</span></p>
                 </div>
              </div>
           </div>

           {/* Metrics Grid */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FieldMetric label="Distance" value={(currentDistance / 1000).toFixed(2)} unit="KM" icon={<Navigation size={20} />} color="lime" />
              <FieldMetric label="Time Active" value={formatTime(currentDuration)} unit="MIN" icon={<Clock size={20} />} color="white" />
              <FieldMetric label="Burn Energy" value={Math.floor(currentDistance * 0.065).toString()} unit="KCAL" icon={<Flame size={20} />} color="cyan" />
           </div>
        </div>

        {/* Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <div className="glass-panel p-10 rounded-[3rem] space-y-8 hud-border">
              <h3 className="text-[11px] font-black text-zinc-500 tracking-[0.4em] uppercase">Intelligence Node</h3>
              
              {!suggestedRoutesData ? (
                 <div className="space-y-6">
                    <p className="text-xs text-zinc-500 font-bold leading-relaxed uppercase italic">Scan the current vicinity for optimal combat routes and trails based on global telemetry.</p>
                    <button 
                       onClick={getSuggestedRoutes}
                       disabled={isFindingRoutes}
                       className="w-full py-5 bg-zinc-900 border border-zinc-800 rounded-[1.5rem] flex items-center justify-center gap-3 text-zinc-400 hover:text-lime-400 hover:border-lime-400/30 transition-tactical group"
                    >
                       {isFindingRoutes ? <Loader2 size={18} className="animate-spin" /> : <Radar size={18} className="group-hover:rotate-180 transition-all duration-1000" />}
                       <span className="text-[10px] font-black uppercase tracking-widest">Scan For Routes</span>
                    </button>
                 </div>
              ) : (
                 <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="flex items-center justify-between">
                       <span className="text-[9px] font-black text-lime-400 uppercase tracking-widest">Recommended Paths</span>
                       <button onClick={() => setSuggestedRoutesData(null)} className="text-zinc-700 hover:text-white"><Trash2 size={14}/></button>
                    </div>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                       <div className="text-xs text-zinc-400 leading-relaxed font-bold italic border-l-2 border-lime-400/20 pl-4 py-2 uppercase">
                          {suggestedRoutesData.text}
                       </div>
                       {suggestedRoutesData.sources.map((source: any, i: number) => (
                          <a key={i} href={source.web?.uri} target="_blank" className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 hover:border-lime-400/20 transition-tactical group">
                             <div className="flex items-center gap-3">
                                <Route size={14} className="text-zinc-600 group-hover:text-lime-400" />
                                <span className="text-[10px] font-black text-zinc-400 group-hover:text-white truncate max-w-[150px] uppercase">{source.web?.title || 'External Source'}</span>
                             </div>
                             <ExternalLink size={12} className="text-zinc-800 group-hover:text-lime-400" />
                          </a>
                       ))}
                    </div>
                 </div>
              )}
           </div>

           <div className="bg-lime-400 p-8 rounded-[3rem] shadow-[0_20px_40px_-10px_rgba(163,230,53,0.3)] space-y-6 group">
              <h4 className="text-[11px] font-black text-black tracking-[0.4em] uppercase flex items-center gap-3">
                 <TrendingUp size={16} /> Operational Tip
              </h4>
              <p className="text-xs font-black text-black leading-tight uppercase italic group-hover:translate-x-1 transition-tactical">
                 "Maintaining a pace below 5:30/km will optimize cardiovascular adaptation without causing excessive catabolism for your bulk."
              </p>
           </div>
        </div>
      </div>

      {/* History Node */}
      <div className="space-y-8">
        <div className="flex items-center gap-6 px-4">
          <h3 className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.4em] flex items-center gap-4">
            <History size={16} /> Operational Logs
          </h3>
          <div className="h-px flex-1 bg-zinc-900"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-2">
           {activities.map(act => (
             <div key={act.id} className="glass-panel p-6 rounded-[2rem] border-zinc-800/50 space-y-4 hover:border-lime-400/30 transition-tactical group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-lime-400 opacity-0 group-hover:opacity-100 transition-all"></div>
                <div className="flex items-center justify-between relative z-10">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-900 rounded-lg text-lime-400">
                         <MapPin size={16} />
                      </div>
                      <span className="text-[10px] font-black text-white tracking-widest uppercase">{new Date(act.timestamp).toLocaleDateString()}</span>
                   </div>
                   <button onClick={() => setActivities(activities.filter(a => a.id !== act.id))} className="text-zinc-800 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                   </button>
                </div>
                <div className="grid grid-cols-2 gap-y-4 relative z-10">
                   <div>
                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Dist.</p>
                      <p className="text-xl font-black text-white mono">{(act.distance / 1000).toFixed(2)}K</p>
                   </div>
                   <div>
                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Dur.</p>
                      <p className="text-xl font-black text-white mono">{formatTime(act.duration)}</p>
                   </div>
                   <div>
                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Burn</p>
                      <p className="text-xl font-black text-cyan-400 mono">{act.caloriesBurned}K</p>
                   </div>
                   <div className="flex items-center justify-end">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-700 hover:text-lime-400 transition-colors">
                         <ChevronRight size={16} />
                      </div>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

const FieldMetric: React.FC<{ label: string, value: string, unit: string, icon: React.ReactNode, color: string }> = ({ label, value, unit, icon, color }) => (
  <div className="glass-panel p-8 rounded-[2.5rem] border-zinc-800/50 flex flex-col justify-between hud-border relative overflow-hidden group">
     <div className={`absolute top-0 right-0 p-8 opacity-5 text-${color}-400 group-hover:scale-125 transition-transform duration-1000`}>
        {icon}
     </div>
     <span className="text-[10px] font-black text-zinc-600 tracking-[0.3em] uppercase">{label}</span>
     <div className="mt-8 flex items-baseline gap-2">
        <span className={`text-5xl font-black tracking-tighter mono ${color === 'lime' ? 'text-lime-400' : color === 'cyan' ? 'text-cyan-400' : 'text-white'}`}>{value}</span>
        <span className="text-[10px] font-black text-zinc-700 uppercase">{unit}</span>
     </div>
  </div>
);

export default ActivityPage;
