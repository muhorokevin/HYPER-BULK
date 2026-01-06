
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
  Loader2, 
  BrainCircuit, 
  Play, 
  RotateCcw,
  Home,
  MapPin,
  Info,
  ExternalLink,
  Radar,
  Check,
  StickyNote,
  Scale,
  Hash,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react';
import { WorkoutSession, WorkoutExercise, EnvironmentType, UserProfile, WorkoutSet } from '../types';
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
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

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
        exercises: result.exercises.map((ex: any) => {
          const setsCount = Number(ex.sets) || 3;
          const initialSets: WorkoutSet[] = Array.from({ length: setsCount }).map((_, i) => ({
            id: Math.random().toString(36).substr(2, 9),
            reps: ex.reps,
            weight: ex.weight,
            note: '',
            completed: false
          }));

          return {
            ...ex,
            id: Math.random().toString(36).substr(2, 9),
            completed: false,
            restTime: 60,
            setDetails: initialSets
          };
        })
      };
      setWorkouts([newSession, ...workouts]);
      setShowOnboarding(false);
      setTempPrompt('');
    } catch (error) {
      console.error(error);
      alert("Neural mission generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateSet = (sessionId: string, exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => {
    setWorkouts(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        exercises: s.exercises.map(e => {
          if (e.id !== exerciseId) return e;
          const newSets = (e.setDetails || []).map(set => set.id === setId ? { ...set, ...updates } : set);
          const allCompleted = newSets.length > 0 && newSets.every(set => set.completed);
          return { ...e, setDetails: newSets, completed: allCompleted };
        })
      };
    }));
  };

  const addSet = (sessionId: string, exerciseId: string) => {
    setWorkouts(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        exercises: s.exercises.map(e => {
          if (e.id !== exerciseId) return e;
          const lastSet = e.setDetails ? e.setDetails[e.setDetails.length - 1] : null;
          const newSet: WorkoutSet = {
            id: Math.random().toString(36).substr(2, 9),
            reps: lastSet?.reps || e.reps,
            weight: lastSet?.weight || e.weight,
            note: '',
            completed: false
          };
          return { 
            ...e, 
            setDetails: [...(e.setDetails || []), newSet], 
            sets: (e.setDetails?.length || 0) + 1,
            completed: false 
          };
        })
      };
    }));
  };

  const removeSet = (sessionId: string, exerciseId: string, setId: string) => {
    setWorkouts(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        exercises: s.exercises.map(e => {
          if (e.id !== exerciseId) return e;
          const newSets = (e.setDetails || []).filter(st => st.id !== setId);
          const allCompleted = newSets.length > 0 && newSets.every(set => set.completed);
          return { ...e, setDetails: newSets, sets: newSets.length, completed: allCompleted };
        })
      };
    }));
  };

  const getGymRecon = () => {
    if (!navigator.geolocation) {
      alert("Geolocation required.");
      return;
    }
    setIsFindingGyms(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const data = await findLocalGyms(pos.coords.latitude, pos.coords.longitude);
        setGymSuggestions(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsFindingGyms(false);
      }
    }, () => setIsFindingGyms(false));
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
    setWorkouts(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        exercises: s.exercises.map(e => {
          if (e.id !== exerciseId) return e;
          const newStatus = !e.completed;
          const newSets = (e.setDetails || []).map(set => ({ ...set, completed: newStatus }));
          return { ...e, completed: newStatus, setDetails: newSets };
        })
      };
    }));
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
                    <div key={ex.id} className={`flex flex-col transition-all duration-500 ${ex.completed ? 'opacity-40 grayscale-[0.5]' : 'hover:bg-lime-400/[0.01]'}`}>
                      <div className="p-8 flex flex-col md:flex-row md:items-center gap-8 group/row">
                        {/* THE MASTER TOGGLE */}
                        <button 
                          onClick={() => toggleComplete(session.id, ex.id)} 
                          className={`transition-tactical transform active:scale-90 shrink-0 ${ex.completed ? 'text-lime-400 drop-shadow-[0_0_15px_#a3e635]' : 'text-zinc-800 hover:text-zinc-600'}`}
                          title="Toggle Exercise Completion"
                        >
                          {ex.completed ? <CheckCircle2 size={40} /> : <Circle size={40} />}
                        </button>

                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                          <div className="lg:col-span-4 cursor-pointer" onClick={() => setExpandedExercise(expandedExercise === ex.id ? null : ex.id)}>
                             <div className="flex items-center gap-4">
                               <h4 className={`text-2xl font-black tracking-tight uppercase transition-tactical ${ex.completed ? 'line-through text-zinc-700 italic' : 'text-white'}`}>
                                 {ex.name}
                               </h4>
                               {ex.completed && (
                                 <div className="flex items-center gap-1 px-2 py-0.5 bg-lime-400/10 rounded border border-lime-400/20">
                                   <ShieldCheck size={10} className="text-lime-400" />
                                   <span className="text-[8px] font-black text-lime-400 uppercase tracking-widest">MISSION_COMPLETE</span>
                                 </div>
                               )}
                             </div>
                             <div className="flex items-center gap-2 mt-1">
                                <Info size={10} className="text-zinc-700" />
                                <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Toggle telemetry details</span>
                             </div>
                          </div>
                          <div className="lg:col-span-8 flex flex-wrap gap-8 items-center justify-between">
                             <div className="flex gap-8">
                               <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Sets</span>
                                    <span className={`text-sm font-black mono ${ex.completed ? 'text-zinc-700' : 'text-zinc-300'}`}>{ex.setDetails?.length || ex.sets}</span>
                               </div>
                               <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Reps</span>
                                    <span className={`text-sm font-black mono ${ex.completed ? 'text-zinc-700' : 'text-zinc-300'}`}>{ex.reps}</span>
                               </div>
                             </div>
                             
                             <div className="flex items-center gap-4">
                               {ex.restTime && !ex.completed && <RestTimer duration={ex.restTime} exerciseName={ex.name} />}
                               <button 
                                onClick={() => setExpandedExercise(expandedExercise === ex.id ? null : ex.id)}
                                className={`p-3 bg-zinc-900 border rounded-xl transition-tactical ${expandedExercise === ex.id ? 'border-lime-400 text-lime-400' : 'border-zinc-800 text-zinc-500 hover:text-white'}`}
                               >
                                {expandedExercise === ex.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                               </button>
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Set Logging Detail Table */}
                      {expandedExercise === ex.id && (
                        <div className="px-8 pb-8 space-y-4 animate-in slide-in-from-top-4 duration-300">
                           <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-zinc-900/30 rounded-t-xl text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">
                              <div className="col-span-1 text-center">Set</div>
                              <div className="col-span-2">Weight</div>
                              <div className="col-span-2">Reps</div>
                              <div className="col-span-5">Tactical Notes</div>
                              <div className="col-span-2 text-right">Status</div>
                           </div>
                           <div className="space-y-2">
                              {(ex.setDetails || []).map((set, idx) => (
                                 <div key={set.id} className={`grid grid-cols-12 gap-4 items-center p-3 rounded-xl border transition-tactical ${set.completed ? 'bg-zinc-900/50 border-lime-400/20 opacity-60' : 'bg-zinc-950 border-zinc-900'}`}>
                                    <div className="col-span-1 text-center font-black text-zinc-700 mono">{idx + 1}</div>
                                    <div className="col-span-2 relative group">
                                       <Scale size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-700" />
                                       <input 
                                          type="text" 
                                          value={set.weight} 
                                          onChange={(e) => updateSet(session.id, ex.id, set.id, { weight: e.target.value })}
                                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-6 pr-2 py-1.5 text-xs font-black text-white focus:outline-none focus:border-lime-400/50 uppercase"
                                       />
                                    </div>
                                    <div className="col-span-2 relative group">
                                       <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-700" />
                                       <input 
                                          type="text" 
                                          value={set.reps} 
                                          onChange={(e) => updateSet(session.id, ex.id, set.id, { reps: e.target.value })}
                                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-6 pr-2 py-1.5 text-xs font-black text-white focus:outline-none focus:border-lime-400/50 uppercase"
                                       />
                                    </div>
                                    <div className="col-span-5 relative group">
                                       <StickyNote size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-700" />
                                       <input 
                                          type="text" 
                                          value={set.note} 
                                          placeholder="Tactical performance note..."
                                          onChange={(e) => updateSet(session.id, ex.id, set.id, { note: e.target.value })}
                                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-zinc-300 focus:outline-none focus:border-lime-400/50 uppercase placeholder:text-zinc-800"
                                       />
                                    </div>
                                    <div className="col-span-2 flex items-center justify-end gap-3">
                                       <button 
                                          onClick={() => removeSet(session.id, ex.id, set.id)}
                                          className="p-1.5 text-zinc-800 hover:text-red-500 transition-colors"
                                       >
                                          <Trash2 size={14} />
                                       </button>
                                       <button 
                                          onClick={() => updateSet(session.id, ex.id, set.id, { completed: !set.completed })}
                                          className={`p-1.5 rounded-lg border transition-tactical ${set.completed ? 'bg-lime-400 border-lime-400 text-black' : 'border-zinc-800 text-zinc-700 hover:border-zinc-600'}`}
                                       >
                                          <Check size={14} />
                                       </button>
                                    </div>
                                 </div>
                              ))}
                              <button 
                                 onClick={() => addSet(session.id, ex.id)}
                                 className="w-full py-3 border-2 border-dashed border-zinc-900 rounded-xl text-[9px] font-black text-zinc-700 hover:text-lime-400 hover:border-lime-400/20 hover:bg-lime-400/5 transition-tactical uppercase tracking-widest flex items-center justify-center gap-2"
                              >
                                 <Plus size={14} /> Add Hypertrophy Set
                              </button>
                           </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkoutPage;
