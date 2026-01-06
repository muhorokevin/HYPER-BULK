
import React, { useState, useRef, useEffect } from 'react';
import { 
  Dumbbell, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Target, 
  Zap, 
  X, 
  Sparkles, 
  Loader2, 
  BrainCircuit, 
  Play, 
  RotateCcw,
  Activity,
  ShieldAlert,
  Home,
  MapPin,
  ChevronRight,
  Info,
  ExternalLink,
  Radar,
  Check,
  Settings
} from 'lucide-react';
import { WorkoutSession, WorkoutExercise, EnvironmentType, UserProfile } from '../types';
import { generatePersonalizedWorkout, findLocalGyms } from '../services/geminiService';

interface WorkoutPageProps {
  workouts: WorkoutSession[];
  setWorkouts: React.Dispatch<React.SetStateAction<WorkoutSession[]>>;
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}

const EQUIPMENT_OPTIONS = [
  'Dumbbells', 'Barbell', 'Resistance Bands', 'Pull-up Bar', 'Kettlebells', 
  'Bench', 'Squat Rack', 'Cables', 'Leg Press'
];

const RestTimer: React.FC<{ 
  duration: number, 
  exerciseName: string 
}> = ({ duration, exerciseName }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playBeep = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch(e) {}
  };

  useEffect(() => {
    let interval: number | undefined;
    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      playBeep();
      setIsActive(false);
    }
    return () => window.clearInterval(interval);
  }, [isActive, timeLeft]);

  const reset = () => {
    setTimeLeft(duration);
    setIsActive(false);
  };

  const toggle = () => {
    if (timeLeft === 0) setTimeLeft(duration);
    setIsActive(!isActive);
  };

  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <div className={`flex items-center gap-4 bg-zinc-950 border p-3 rounded-2xl transition-tactical ${isActive ? 'border-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.1)]' : 'border-zinc-800'}`}>
      <div className="relative w-10 h-10 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle cx="20" cy="20" r="18" fill="none" stroke="#09090b" strokeWidth="3" />
          <circle cx="20" cy="20" r="18" fill="none" stroke="#a3e635" strokeWidth="3" strokeDasharray="113" strokeDashoffset={113 - (113 * progress) / 100} className="transition-tactical duration-1000" />
        </svg>
        <span className="text-[10px] font-black text-white mono tabular-nums">{timeLeft}</span>
      </div>
      
      <div className="flex gap-2">
        <button onClick={toggle} className={`p-2 rounded-xl transition-tactical ${isActive ? 'bg-red-500/10 text-red-500' : 'bg-lime-400/10 text-lime-400'}`}>
          {isActive ? <X size={14} /> : <Play size={14} fill="currentColor" />}
        </button>
        <button onClick={reset} className="p-2 bg-zinc-800 text-zinc-500 hover:text-white rounded-xl">
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};

const WorkoutPage: React.FC<WorkoutPageProps> = ({ workouts, setWorkouts, profile, setProfile }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [environment, setEnvironment] = useState<EnvironmentType>('gym');
  const [tempPrompt, setTempPrompt] = useState('');
  const [gymSuggestions, setGymSuggestions] = useState<{text: string, sources: any[]} | null>(null);
  const [isFindingGyms, setIsFindingGyms] = useState(false);

  const startOnboarding = () => setShowOnboarding(true);

  const handlePersonalizedGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generatePersonalizedWorkout(profile, tempPrompt || "Full Body Power Surge", environment);
      const newSession: WorkoutSession = {
        id: Math.random().toString(36).substr(2, 9),
        title: result.title.toUpperCase(),
        date: `${environment.toUpperCase()} DEPLOYMENT`,
        timestamp: Date.now(),
        environment: environment,
        exercises: result.exercises.map((ex: any) => ({
          ...ex,
          id: Math.random().toString(36).substr(2, 9),
          completed: false,
          restTime: 60
        }))
      };
      setWorkouts([newSession, ...workouts]);
      setShowOnboarding(false);
      setTempPrompt('');
    } catch (error) {
      console.error(error);
      alert("Neural mission generation failed. Please check your connection or mission parameters.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getGymRecon = () => {
    if (!navigator.geolocation) {
      alert("Geolocation required for gym reconnaissance.");
      return;
    }
    setIsFindingGyms(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const data = await findLocalGyms(pos.coords.latitude, pos.coords.longitude);
        setGymSuggestions(data);
      } catch (err) {
        console.error(err);
        alert("Satellite link failed. Could not locate gyms.");
      } finally {
        setIsFindingGyms(false);
      }
    }, () => {
      alert("Position request denied by user or system.");
      setIsFindingGyms(false);
    });
  };

  const toggleEquipment = (item: string) => {
    setProfile(prev => {
      const current = prev.availableEquipment || [];
      const updated = current.includes(item) 
        ? current.filter(i => i !== item) 
        : [...current, item];
      return { ...prev, availableEquipment: updated };
    });
  };

  const removeSession = (sessionId: string) => setWorkouts(workouts.filter(s => s.id !== sessionId));
  const toggleComplete = (sessionId: string, exerciseId: string) => {
    setWorkouts(prev => prev.map(s => s.id === sessionId ? { ...s, exercises: s.exercises.map(e => e.id === exerciseId ? { ...e, completed: !e.completed } : e) } : s));
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-24">
      {/* HUD Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-zinc-900 pb-8 relative overflow-hidden">
        <div className="scanline"></div>
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-lime-400 text-black text-[9px] font-black rounded tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(163,230,53,0.3)]">Hypertrophy Engine</span>
            <div className="flex items-center gap-2 text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">
              <Dumbbell size={14} className="text-zinc-700" />
              Target: <span className="text-zinc-400">MUSCLE_SYNTHESIS</span>
            </div>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none italic uppercase">
            BATTLE <span className="text-zinc-800">PLAN</span>
          </h2>
        </div>
        
        <div className="flex gap-4">
           <button onClick={getGymRecon} disabled={isFindingGyms} className="bg-zinc-900 border border-zinc-800 hover:border-cyan-400/50 p-5 rounded-[1.5rem] transition-tactical group active:scale-95 text-cyan-400">
              {isFindingGyms ? <Loader2 size={24} className="animate-spin" /> : <Radar size={24} />}
           </button>
           <button onClick={startOnboarding} className="bg-lime-400 hover:bg-lime-300 text-black font-black px-10 py-5 rounded-[1.5rem] shadow-2xl shadow-lime-400/20 active:scale-95 transition-tactical uppercase text-xs tracking-widest flex items-center gap-3">
              <Plus size={20} /> Initialise Session
           </button>
        </div>
      </div>

      {gymSuggestions && (
        <div className="glass-panel p-10 rounded-[3rem] border-cyan-400/20 animate-in slide-in-from-top-6 duration-700 hud-border">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <MapPin className="text-cyan-400" size={20} />
                 <h3 className="text-[11px] font-black text-cyan-400 tracking-[0.4em] uppercase">Local Deployment Centers (Gyms)</h3>
              </div>
              <button onClick={() => setGymSuggestions(null)} className="text-zinc-700 hover:text-white"><X size={20}/></button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 text-xs text-zinc-400 leading-relaxed font-bold italic border-l-2 border-cyan-400/20 pl-6 py-4 uppercase">
                 {gymSuggestions.text}
              </div>
              <div className="space-y-4">
                 {gymSuggestions.sources.map((source: any, i: number) => (
                    <a key={i} href={source.maps?.uri || '#'} target="_blank" className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800 hover:border-cyan-400/20 transition-tactical group">
                       <span className="text-[10px] font-black text-zinc-400 group-hover:text-white uppercase truncate">{source.maps?.title || 'Unknown Center'}</span>
                       <ExternalLink size={12} className="text-zinc-800 group-hover:text-cyan-400" />
                    </a>
                 ))}
              </div>
           </div>
        </div>
      )}

      {showOnboarding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-500 overflow-y-auto">
           <div className="glass-panel max-w-2xl w-full rounded-[3rem] p-8 md:p-12 space-y-10 relative hud-border my-auto">
              <button onClick={() => setShowOnboarding(false)} className="absolute top-8 right-8 text-zinc-700 hover:text-white"><X size={24}/></button>
              
              <div className="space-y-2">
                 <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic">Pre-Deployment Brief</h3>
                 <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">Verify operational parameters.</p>
              </div>

              <div className="space-y-8">
                 <div className="grid grid-cols-2 gap-4">
                    <button 
                       onClick={() => setEnvironment('gym')}
                       className={`flex flex-col items-center gap-3 p-6 rounded-[1.5rem] border-2 transition-tactical ${environment === 'gym' ? 'bg-lime-400/10 border-lime-400 text-lime-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}
                    >
                       <Dumbbell size={24} />
                       <span className="text-[9px] font-black uppercase tracking-widest">Base Gym</span>
                    </button>
                    <button 
                       onClick={() => setEnvironment('home')}
                       className={`flex flex-col items-center gap-3 p-6 rounded-[1.5rem] border-2 transition-tactical ${environment === 'home' ? 'bg-cyan-400/10 border-cyan-400 text-cyan-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}
                    >
                       <Home size={24} />
                       <span className="text-[9px] font-black uppercase tracking-widest">Home Bunker</span>
                    </button>
                 </div>

                 {environment === 'gym' && (
                    <div className="space-y-4">
                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Attending Gym Name / Location</label>
                        <input 
                            type="text" 
                            value={profile.preferredGym || ''} 
                            onChange={(e) => setProfile(p => ({...p, preferredGym: e.target.value}))} 
                            placeholder="e.g. Gold's Gym Downtown" 
                            className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-xl px-6 py-4 text-white font-bold focus:outline-none focus:border-lime-400/50 uppercase text-sm"
                        />
                    </div>
                 )}

                 <div className="space-y-4">
                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex items-center justify-between">
                        <span>Equipment Verification</span>
                        <span className="text-zinc-800 lowercase font-mono">Check available gear</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {EQUIPMENT_OPTIONS.map(item => {
                            const isSelected = profile.availableEquipment?.includes(item);
                            return (
                                <button 
                                    key={item}
                                    onClick={() => toggleEquipment(item)}
                                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-tactical flex items-center gap-2 ${isSelected ? 'bg-lime-400/20 text-lime-400 border-lime-400' : 'bg-zinc-950 text-zinc-700 border-zinc-900'}`}
                                >
                                    {isSelected && <Check size={10} />}
                                    {item}
                                </button>
                            );
                        })}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Training Intent / Focus</label>
                    <div className="relative">
                       <input 
                          type="text" 
                          value={tempPrompt} 
                          onChange={(e) => setTempPrompt(e.target.value)} 
                          placeholder="e.g. 'Chest Hypertrophy', 'Leg Day Destroyer'" 
                          className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-xl px-6 py-5 text-white font-bold focus:outline-none focus:border-lime-400/50 uppercase text-sm"
                       />
                       <div className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-800">
                          <BrainCircuit size={18} />
                       </div>
                    </div>
                 </div>

                 <button 
                    onClick={handlePersonalizedGenerate}
                    disabled={isGenerating}
                    className="w-full py-6 bg-lime-400 hover:bg-lime-300 text-black font-black rounded-[1.5rem] flex items-center justify-center gap-4 transition-tactical shadow-2xl shadow-lime-400/20 active:scale-95 disabled:bg-zinc-800 disabled:text-zinc-700"
                 >
                    {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Zap size={24} />}
                    <span className="text-xs font-black uppercase tracking-widest">{isGenerating ? 'Compiling Mission...' : 'Deploy Battle Plan'}</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Sessions View */}
      <div className="grid gap-16">
        {workouts.length === 0 ? (
          <div className="text-center py-40 glass-panel rounded-[3rem] border-zinc-900/50 space-y-8">
             <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-zinc-800">
              <Dumbbell size={40} className="text-zinc-800" />
            </div>
            <p className="text-zinc-800 font-black tracking-[0.4em] uppercase text-xs">Awaiting Tactical Directives.</p>
          </div>
        ) : workouts.map((session) => {
          const completedCount = session.exercises.filter(e => e.completed).length;
          const totalCount = session.exercises.length;
          const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

          return (
            <div key={session.id} className="relative group/session animate-in slide-in-from-right-8 duration-700">
              <div className="flex items-center gap-8 mb-6 px-4">
                <div className="text-[10px] font-black text-lime-400 uppercase tracking-[0.3em] flex items-center gap-3">
                   <Target size={14} /> Mission node
                </div>
                <div className="h-px flex-1 bg-zinc-900"></div>
                <button onClick={() => removeSession(session.id)} className="opacity-0 group-hover/session:opacity-100 p-3 text-zinc-800 hover:text-red-500 transition-tactical"><Trash2 size={18}/></button>
              </div>

              <div className={`glass-panel rounded-[3rem] overflow-hidden border-l-8 transition-tactical hud-border ${completionRate === 100 ? 'border-l-cyan-400 shadow-cyan-400/5' : 'border-l-lime-400 shadow-lime-400/5'} shadow-2xl`}>
                <div className="p-12 border-b border-zinc-900/50 flex flex-col md:flex-row md:items-center justify-between gap-8 bg-gradient-to-br from-zinc-900/30 to-transparent">
                  <div className="flex-1 space-y-2">
                    <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic">{session.title}</h3>
                    <div className="flex items-center gap-6">
                       <span className="text-[10px] font-black text-zinc-600 tracking-widest uppercase flex items-center gap-2">
                          {session.environment === 'home' ? <Home size={10}/> : <Dumbbell size={10}/>}
                          {session.date}
                       </span>
                       <div className="flex items-center gap-3">
                          <div className="w-32 bg-zinc-950 h-1.5 rounded-full overflow-hidden p-[1px]">
                             <div className={`h-full transition-all duration-1000 ${completionRate === 100 ? 'bg-cyan-400' : 'bg-lime-400'}`} style={{ width: `${completionRate}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-zinc-500 mono">{Math.round(completionRate)}%</span>
                       </div>
                    </div>
                  </div>
                </div>
                
                <div className="divide-y divide-zinc-900/50">
                  {session.exercises.map((ex) => (
                    <div key={ex.id} className={`p-8 flex flex-col md:flex-row md:items-center gap-8 group/row transition-tactical ${ex.completed ? 'bg-zinc-950/40' : 'hover:bg-lime-400/[0.01]'}`}>
                      <button onClick={() => toggleComplete(session.id, ex.id)} className={`transition-tactical transform active:scale-90 shrink-0 ${ex.completed ? 'text-lime-400 drop-shadow-[0_0_8px_#a3e635]' : 'text-zinc-800 hover:text-zinc-600'}`}>
                        {ex.completed ? <CheckCircle2 size={40} /> : <Circle size={40} />}
                      </button>

                      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                        <div className="lg:col-span-4">
                           <h4 className={`text-2xl font-black tracking-tight uppercase transition-tactical ${ex.completed ? 'line-through text-zinc-700 italic' : 'text-white'}`}>{ex.name}</h4>
                           <div className="flex items-center gap-2 mt-1">
                              <Info size={10} className="text-zinc-700" />
                              <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Optimal Adaptation Method</span>
                           </div>
                        </div>
                        <div className="lg:col-span-8 flex flex-wrap gap-8 items-center">
                           <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Sets</span>
                                <span className="text-sm font-black text-zinc-300 mono">{ex.sets}</span>
                           </div>
                           <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Reps</span>
                                <span className="text-sm font-black text-zinc-300 mono">{ex.reps}</span>
                           </div>
                           <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Load</span>
                                <span className="text-sm font-black text-zinc-300 mono">{ex.weight}</span>
                           </div>
                           {ex.restTime && !ex.completed && <RestTimer duration={ex.restTime} exerciseName={ex.name} />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel p-10 rounded-[2.5rem] border-lime-400/10 flex items-start gap-8 relative overflow-hidden group hud-border">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-tactical duration-1000">
           <ShieldAlert size={120} />
        </div>
        <div className="w-16 h-16 bg-lime-400 text-black rounded-2xl flex items-center justify-center shadow-2xl shadow-lime-400/20 shrink-0">
          <Zap size={32} fill="currentColor" />
        </div>
        <div className="space-y-3">
          <h4 className="text-xl font-black text-lime-400 tracking-tighter uppercase italic">Anabolic Tactical Note</h4>
          <p className="text-zinc-500 font-bold leading-relaxed uppercase text-xs tracking-tight">
            Deploying with localized gym equipment provides superior isolation capabilities. If deploying from home bunker, focus on explosive mechanical tension to simulate high load volume. <span className="text-white">Neutralize every rep.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkoutPage;
