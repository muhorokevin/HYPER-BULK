
import React, { useMemo } from 'react';
import { 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp,
  Zap, 
  Activity, 
  Droplets, 
  Dumbbell, 
  Radio, 
  Scale
} from 'lucide-react';
import { Meal, UserProfile, ScheduleItem, WorkoutSession, WaterLog, WeightEntry } from '../types.ts';

const Dashboard: React.FC<{
  meals: Meal[];
  profile: UserProfile;
  schedule: ScheduleItem[];
  workouts: WorkoutSession[];
  water: WaterLog[];
  setWater: React.Dispatch<React.SetStateAction<WaterLog[]>>;
  weightHistory: WeightEntry[];
  setWeightHistory: React.Dispatch<React.SetStateAction<WeightEntry[]>>;
  onOpenNeuralLink?: () => void;
}> = ({ 
  meals, 
  profile, 
  workouts, 
  water, 
  setWater,
  onOpenNeuralLink
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  
  const todayMeals = useMemo(() => {
    return meals.filter(m => new Date(m.timestamp).toISOString().split('T')[0] === todayStr && !m.isPlanned);
  }, [meals, todayStr]);

  const dailyWater = useMemo(() => {
    return water
      .filter(w => new Date(w.timestamp).toISOString().split('T')[0] === todayStr)
      .reduce((s, w) => s + w.amount, 0);
  }, [water, todayStr]);

  const totals = useMemo(() => ({
    cal: todayMeals.reduce((s, m) => s + (Number(m.calories) || 0), 0),
    prot: todayMeals.reduce((s, m) => s + (Number(m.protein) || 0), 0),
  }), [todayMeals]);

  const surplus = totals.cal - profile.dailyCalorieGoal;
  const isAnabolic = surplus >= 0;

  const volumeHistoryData = useMemo(() => {
    return workouts
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-7)
      .map(w => {
        const sessionVolume = w.exercises.reduce((sum, ex) => {
          const weight = parseFloat(ex.weight) || 0;
          const repsArr = (ex.reps || "0").split('-').map(r => parseInt(r));
          const avgReps = repsArr.length > 1 ? (repsArr[0] + repsArr[1]) / 2 : repsArr[0] || 0;
          return sum + (weight * avgReps * (Number(ex.sets) || 1));
        }, 0);
        return { 
          date: new Date(w.timestamp).toLocaleDateString('en-US', { weekday: 'short' }), 
          volume: sessionVolume 
        };
      });
  }, [workouts]);

  const addWater = (amount: number) => {
    setWater(prev => [...prev, { amount, timestamp: Date.now() }]);
  };

  const waterProgress = profile.waterGoal ? Math.min((dailyWater / profile.waterGoal) * 100, 100) : 0;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
      {/* Tactical Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-zinc-900 pb-8 relative overflow-hidden">
        <div className="scanline"></div>
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-lime-400 text-black text-[9px] font-black rounded tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(163,230,53,0.3)]">Operational Status</span>
            <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] ${isAnabolic ? 'text-lime-400' : 'text-orange-500'}`}>
              <Activity size={14} className={isAnabolic ? 'animate-pulse' : ''} />
              Condition: <span>{isAnabolic ? 'ANABOLIC_SURPLUS' : 'CALORIC_DEFICIT'}</span>
            </div>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none italic uppercase">
            COMMAND <span className="text-zinc-800">CENTER</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={onOpenNeuralLink}
            className="group flex items-center gap-4 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl pr-6 hover:border-lime-400/50 transition-tactical"
          >
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-lime-400 group-hover:bg-lime-400 group-hover:text-black transition-tactical">
              <Radio size={20} className="animate-pulse" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Neural Link</p>
              <p className="text-xs font-black text-white uppercase tracking-tight">ENGAGE COMMS</p>
            </div>
          </button>
        </div>
      </div>

      {/* Aggressive Surplus Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 glass-panel rounded-[3rem] p-10 border-l-4 border-lime-400 shadow-2xl relative overflow-hidden hud-border bg-gradient-to-br from-lime-400/[0.03] to-transparent">
           <div className="absolute top-0 right-0 p-8 opacity-[0.05]">
              <TrendingUp size={120} />
           </div>
           <div className="space-y-10 relative z-10">
              <div>
                <h3 className="text-[11px] font-black text-zinc-500 tracking-[0.4em] uppercase mb-2">Mass Gain Surplus</h3>
                <div className="flex items-baseline gap-3">
                   <span className={`text-6xl font-black tracking-tighter mono ${surplus >= 0 ? 'text-white' : 'text-orange-500'}`}>
                    {surplus > 0 ? '+' : ''}{surplus.toLocaleString()}
                   </span>
                   <span className="text-xs font-black text-zinc-700 uppercase">KCAL</span>
                </div>
              </div>
              
              <div className="space-y-4">
                 <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                    <span className="text-zinc-500">Maintenance Threshold</span>
                    <span className="text-white">{profile.dailyCalorieGoal} KCAL</span>
                 </div>
                 <div className="h-4 w-full bg-zinc-900/50 rounded-full overflow-hidden p-[2px] border border-zinc-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${isAnabolic ? 'bg-lime-400 shadow-[0_0_15px_#a3e635]' : 'bg-orange-500'}`}
                      style={{ width: `${Math.min((totals.cal / (profile.dailyCalorieGoal + 500)) * 100, 100)}%` }}
                    />
                 </div>
                 <p className="text-[10px] font-bold text-zinc-600 italic leading-relaxed uppercase">
                    {isAnabolic 
                      ? "System identifies positive caloric environment. Optimal for lean tissue synthesis." 
                      : "Fuel levels critical for mass gain. Increase intake immediately to avoid catabolism."}
                 </p>
              </div>
           </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Fuel" value={totals.cal.toLocaleString()} unit="KCAL" goal={profile.dailyCalorieGoal} icon={<Zap size={20} />} variant="lime" />
          <StatCard title="Bio-Load" value={`${totals.prot}`} unit="GRAMS" goal={profile.proteinGoal} icon={<Scale size={20} />} variant="cyan" />
          <StatCard title="Fluid Sat." value={`${dailyWater}`} unit="ML" goal={profile.waterGoal || 3000} icon={<Droplets size={20} />} variant="blue" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Training Progress Area */}
        <div className="lg:col-span-8 glass-panel rounded-[2.5rem] p-10 hud-border">
           <div className="flex items-center justify-between mb-12">
             <div className="space-y-1">
                <h3 className="text-[11px] font-black text-zinc-500 tracking-[0.4em] uppercase">Hypertrophy Stimulus Grid</h3>
                <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">Aggregate Volume (KG) Per Session</p>
             </div>
             <Dumbbell className="text-zinc-800" size={20} />
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
                   <p className="text-zinc-700 font-black text-[10px] tracking-widest uppercase">No Training Telemetry Detected</p>
                </div>
              )}
           </div>
        </div>

        {/* Quick Hydration */}
        <div className="lg:col-span-4 glass-panel rounded-[2.5rem] p-10 flex flex-col justify-between hud-border">
           <div>
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-[11px] font-black text-zinc-500 tracking-[0.4em] uppercase">Hydration</h3>
                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${waterProgress > 80 ? 'bg-blue-500 text-white shadow-[0_0_10px_#3b82f6]' : 'bg-zinc-800 text-zinc-500'}`}>
                   {waterProgress > 80 ? 'SATURATED' : 'LOW_LEVEL'}
                </div>
              </div>
              
              <div className="text-center mb-8">
                 <p className="text-6xl font-black text-white tracking-tighter mono">{dailyWater}<span className="text-xs text-zinc-700 ml-2">ML</span></p>
                 <div className="mt-6 h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${waterProgress}%` }} />
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-3">
              <button onClick={() => addWater(250)} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-blue-400 transition-tactical text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-blue-400">+250ML</button>
              <button onClick={() => addWater(500)} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-blue-400 transition-tactical text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-blue-400">+500ML</button>
           </div>
        </div>
      </div>
    </div>
  );
};

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
    <div className="glass-panel p-8 rounded-[2rem] hover:scale-[1.02] transition-tactical relative overflow-hidden group border border-zinc-800/50">
      <div className="flex items-center justify-between mb-8">
        <span className="text-[10px] font-black text-zinc-600 tracking-[0.3em] uppercase">{title}</span>
        <div className={`p-3 bg-zinc-900 rounded-xl ${colors.text}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-4xl font-black text-white tracking-tighter leading-none mono">{value}</span>
        <span className="text-[9px] font-black text-zinc-700 tracking-widest uppercase">{unit}</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-900/50 rounded-full overflow-hidden p-[1px]">
        <div className={`${colors.bg} h-full transition-all duration-1000 ease-out rounded-full ${colors.glow}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

export default Dashboard;
