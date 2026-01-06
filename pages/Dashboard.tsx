
import React, { useMemo, useState, useRef } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { 
  Calendar, 
  Zap, 
  Activity, 
  Target, 
  Droplets, 
  Dumbbell, 
  Radio, 
  Volume2, 
  Loader2,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Meal, UserProfile, ScheduleItem, WorkoutSession, WaterLog, WeightEntry } from '../types.ts';
import { generateAudioBriefing } from '../services/geminiService.ts';

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const Dashboard: React.FC<{
  meals: Meal[];
  profile: UserProfile;
  schedule: ScheduleItem[];
  workouts: WorkoutSession[];
  water: WaterLog[];
  setWater: React.Dispatch<React.SetStateAction<WaterLog[]>>;
  weightHistory: WeightEntry[];
  setWeightHistory: React.Dispatch<React.SetStateAction<WeightEntry[]>>;
}> = ({ 
  meals, 
  profile, 
  workouts, 
  water, 
  setWater,
}) => {
  const [isBriefing, setIsBriefing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  
  const dailyWater = useMemo(() => {
    return water
      .filter(w => new Date(w.timestamp).toISOString().split('T')[0] === todayStr)
      .reduce((s, w) => s + w.amount, 0);
  }, [water, todayStr]);

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein, 0);
  const totalCarbs = meals.reduce((sum, m) => sum + m.carbs, 0);
  const totalFats = meals.reduce((sum, m) => sum + m.fats, 0);

  const macroData = [
    { name: 'PROTEIN', value: totalProtein || 1, color: '#a3e635' },
    { name: 'CARBS', value: totalCarbs || 1, color: '#06b6d4' },
    { name: 'FATS', value: totalFats || 1, color: '#71717a' },
  ];

  const handleBriefing = async () => {
    setIsBriefing(true);
    try {
      const base64Audio = await generateAudioBriefing(profile, meals, workouts);
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();

        const audioBytes = decodeBase64(base64Audio);
        const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
        source.onended = () => setIsBriefing(false);
      } else {
        setIsBriefing(false);
      }
    } catch (err) {
      console.error("Briefing failed", err);
      setIsBriefing(false);
    }
  };

  const volumeHistoryData = useMemo(() => {
    return workouts
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-7)
      .map(w => {
        const sessionVolume = w.exercises.reduce((sum, ex) => {
          const weight = parseFloat(ex.weight) || 0;
          const repsArr = ex.reps.split('-').map(r => parseInt(r));
          const avgReps = repsArr.length > 1 ? (repsArr[0] + repsArr[1]) / 2 : repsArr[0] || 0;
          return sum + (weight * avgReps * (Number(ex.sets) || 1));
        }, 0);
        return { 
          date: new Date(w.timestamp).toLocaleDateString('en-US', { weekday: 'short' }), 
          volume: sessionVolume 
        };
      });
  }, [workouts]);

  const calorieHistory = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(dateStr => {
      const dayCalories = meals
        .filter(m => new Date(m.timestamp).toISOString().split('T')[0] === dateStr)
        .reduce((sum, m) => sum + m.calories, 0);
      
      return {
        day: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
        kcal: dayCalories
      };
    });
  }, [meals]);

  const addWater = (amount: number) => {
    setWater(prev => [...prev, { amount, timestamp: Date.now() }]);
  };

  const waterProgress = profile.waterGoal ? Math.min((dailyWater / profile.waterGoal) * 100, 100) : 0;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-zinc-900 pb-8 relative overflow-hidden">
        <div className="scanline"></div>
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-lime-400 text-black text-[9px] font-black rounded tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(163,230,53,0.3)]">Active Duty</span>
            <div className="flex items-center gap-2 text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">
              <ShieldCheck size={14} className="text-zinc-700" />
              Pilot: <span className="text-zinc-400">{profile.displayName}</span>
            </div>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none italic uppercase">
            COMMAND <span className="text-zinc-800">CENTER</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBriefing}
            disabled={isBriefing}
            className="group flex items-center gap-4 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl pr-6 hover:border-lime-400/50 transition-tactical disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-lime-400 group-hover:bg-lime-400 group-hover:text-black transition-tactical">
              {isBriefing ? <Loader2 size={20} className="animate-spin" /> : <Radio size={20} />}
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Neural Link</p>
              <p className="text-xs font-black text-white uppercase tracking-tight">{isBriefing ? 'SYNTHESIZING' : 'DEPLOY BRIEFING'}</p>
            </div>
          </button>
          
          <div className="flex items-center gap-4 bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
            <Calendar size={18} className="text-zinc-600" />
            <span className="text-[11px] font-black text-zinc-300 tracking-[0.2em] uppercase mono">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Fuel" value={totalCalories.toLocaleString()} unit="KCAL" goal={profile.dailyCalorieGoal} icon={<Zap size={20} />} variant="lime" />
        <StatCard title="Bio-Load" value={`${totalProtein}`} unit="GRAMS" goal={profile.proteinGoal} icon={<Activity size={20} />} variant="cyan" />
        <StatCard title="Fluid Sat." value={`${dailyWater}`} unit="ML" goal={profile.waterGoal || 3000} icon={<Droplets size={20} />} variant="blue" />
        <StatCard title="Deployments" value={workouts.length.toString().padStart(2, '0')} unit="OPS" goal={30} icon={<Dumbbell size={20} />} variant="zinc" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 glass-panel rounded-[2.5rem] p-10 hud-border">
           <div className="flex items-center justify-between mb-12">
             <div className="space-y-1">
                <h3 className="text-[11px] font-black text-zinc-500 tracking-[0.4em] uppercase">Mechanical Tension Graph</h3>
                <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">Aggregate Hypertrophy Stimulus (KG)</p>
             </div>
             <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-lime-400 shadow-[0_0_10px_#a3e635]"></div>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mono">Status: Progressive Overload</span>
             </div>
           </div>
           
           <div className="h-[300px] w-full">
              {volumeHistoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeHistoryData}>
                    <defs>
                      <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a3e635" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#a3e635" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#18181b" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#3f3f46', fontSize: 10, fontWeight: 900 }} />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip 
                      cursor={{ stroke: '#a3e635', strokeWidth: 1 }}
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }} 
                    />
                    <Area type="monotone" dataKey="volume" stroke="#a3e635" fillOpacity={1} fill="url(#volGradient)" strokeWidth={4} animationDuration={2000} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-900 rounded-[2rem] p-10">
                   <Activity size={48} className="text-zinc-900 mb-4" />
                   <p className="text-zinc-700 font-black text-[10px] tracking-widest uppercase">No Combat Data Detected</p>
                </div>
              )}
           </div>
        </div>

        <div className="lg:col-span-4 glass-panel rounded-[2.5rem] p-10 flex flex-col justify-between relative overflow-hidden hud-border">
           <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
              <Droplets size={200} />
           </div>
           <div>
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-[11px] font-black text-zinc-500 tracking-[0.4em] uppercase">Hydration HUD</h3>
                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${waterProgress > 80 ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                   {waterProgress > 80 ? 'Optimal' : 'Replenish Required'}
                </div>
              </div>
              
              <div className="flex flex-col items-center mb-12">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="absolute w-full h-full -rotate-90">
                    <circle cx="80" cy="80" r="75" fill="none" stroke="#09090b" strokeWidth="10" />
                    <circle cx="80" cy="80" r="75" fill="none" stroke="#3b82f6" strokeWidth="10" strokeDasharray="471" strokeDashoffset={471 - (471 * waterProgress / 100)} className="transition-all duration-1000 ease-out" strokeLinecap="round" />
                  </svg>
                  <div className="flex flex-col items-center">
                    <span className="text-4xl font-black text-white tracking-tighter mono">{Math.round(waterProgress)}%</span>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Saturation</span>
                  </div>
                </div>
                <div className="mt-8 text-center space-y-1">
                   <p className="text-5xl font-black text-white tracking-tighter mono">{dailyWater}<span className="text-xs text-zinc-700 ml-2">ML</span></p>
                   <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Target Threshold: {profile.waterGoal || 3000} ML</p>
                </div>
              </div>
           </div>

           <div className="grid grid-cols-3 gap-3">
              <WaterBtn amount={250} onClick={() => addWater(250)} label="Shot" />
              <WaterBtn amount={500} onClick={() => addWater(500)} label="Bottle" />
              <WaterBtn amount={1000} onClick={() => addWater(1000)} label="Shaker" />
           </div>
        </div>
      </div>
    </div>
  );
};

const WaterBtn: React.FC<{ amount: number, onClick: () => void, label: string }> = ({ amount, onClick, label }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-2 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-blue-400 transition-tactical hover:bg-blue-500/5 group">
     <span className="text-xs font-black text-white mono group-hover:text-blue-400">{amount}</span>
     <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{label}</span>
  </button>
);

const StatCard: React.FC<{ title: string, value: string, unit: string, goal: number, icon: React.ReactNode, variant: 'lime' | 'cyan' | 'zinc' | 'blue' }> = ({ title, value, unit, goal, icon, variant }) => {
  const valNum = parseFloat(value.replace(/,/g, ''));
  const progress = goal > 0 ? Math.min((valNum / goal) * 100, 100) : 0;
  
  const colors = {
    lime: { text: 'text-lime-400', bg: 'bg-lime-400', glow: 'shadow-[0_0_15px_rgba(163,230,53,0.3)]' },
    cyan: { text: 'text-cyan-400', bg: 'bg-cyan-400', glow: 'shadow-[0_0_15px_rgba(34,211,238,0.3)]' },
    zinc: { text: 'text-zinc-400', bg: 'bg-zinc-600', glow: '' },
    blue: { text: 'text-blue-400', bg: 'bg-blue-500', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]' },
  }[variant];

  return (
    <div className="glass-panel p-8 rounded-[2.5rem] hover:scale-[1.03] transition-tactical relative overflow-hidden group hud-border">
      <div className="flex items-center justify-between mb-8">
        <span className="text-[10px] font-black text-zinc-600 tracking-[0.3em] uppercase">{title}</span>
        <div className={`p-3 bg-zinc-900 rounded-xl ${colors.text} group-hover:scale-110 transition-tactical`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-5xl font-black text-white tracking-tighter leading-none mono">{value}</span>
        <span className="text-[10px] font-black text-zinc-700 tracking-widest uppercase">{unit}</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-900/50 rounded-full overflow-hidden p-[1px]">
        <div className={`${colors.bg} h-full transition-all duration-1000 ease-out rounded-full ${colors.glow}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

export default Dashboard;
