
import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
  Line
} from 'recharts';
import { 
  History, 
  BrainCircuit, 
  Target, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  ShieldCheck,
  TrendingUp,
  Activity,
  // Added ChevronRight to imports
  ChevronRight
} from 'lucide-react';
import { Meal, UserProfile, WorkoutSession } from '../types';
import { generatePeriodReview } from '../services/geminiService';

interface ReviewPageProps {
  meals: Meal[];
  workouts: WorkoutSession[];
  profile: UserProfile;
}

const ReviewPage: React.FC<ReviewPageProps> = ({ meals, workouts, profile }) => {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reviewData, setReviewData] = useState<any | null>(null);

  const filterPeriod = (items: any[]) => {
    const now = Date.now();
    const range = period === 'week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    return items.filter(item => (now - item.timestamp) <= range);
  };

  const currentMeals = useMemo(() => filterPeriod(meals), [meals, period]);
  const currentWorkouts = useMemo(() => filterPeriod(workouts), [workouts, period]);

  const stats = useMemo(() => {
    const totalCals = currentMeals.reduce((s, m) => s + m.calories, 0);
    const avgCals = currentMeals.length > 0 ? totalCals / (period === 'week' ? 7 : 30) : 0;
    const consistencyScore = Math.min(100, (currentMeals.length / (period === 'week' ? 21 : 90)) * 100);
    return { avgCals, consistencyScore, totalWorkouts: currentWorkouts.length };
  }, [currentMeals, currentWorkouts, period]);

  const chartData = useMemo(() => {
    const days = period === 'week' ? 7 : 30;
    return Array.from({ length: days }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dailyKcal = currentMeals
        .filter(m => new Date(m.timestamp).toISOString().split('T')[0] === dateStr)
        .reduce((s, m) => s + m.calories, 0);
      return { date: dateStr, kcal: dailyKcal, target: profile.dailyCalorieGoal };
    });
  }, [currentMeals, period, profile]);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await generatePeriodReview(profile, currentMeals, currentWorkouts, period);
      setReviewData(result);
    } catch (err) {
      console.error(err);
      alert("Analysis engine failure. Check connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-zinc-900 pb-8 relative">
        <div className="scanline opacity-10"></div>
        <div>
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none italic uppercase">
            TACTICAL <span className="text-zinc-800">REVIEW</span>
          </h2>
          <p className="mt-4 text-zinc-600 font-black uppercase text-[10px] tracking-[0.4em] mono">History Matrix Analyzer v1.2</p>
        </div>
        <div className="flex bg-zinc-900/50 border border-zinc-800 p-2 rounded-2xl gap-2">
          <PeriodBtn active={period === 'week'} onClick={() => {setPeriod('week'); setReviewData(null);}} label="Weekly" />
          <PeriodBtn active={period === 'month'} onClick={() => {setPeriod('month'); setReviewData(null);}} label="Monthly" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Stats Column */}
        <div className="lg:col-span-4 space-y-8">
          <div className="glass-panel p-10 rounded-[2.5rem] space-y-10 relative overflow-hidden hud-border">
            <h3 className="text-[11px] font-black text-zinc-600 tracking-[0.4em] uppercase">Temporal Stats</h3>
            
            <div className="space-y-8">
              <MetricRow label="Avg Consumption" value={`${Math.round(stats.avgCals)}`} unit="KCAL" color="lime" />
              <MetricRow label="Target Adherence" value={`${Math.round(stats.consistencyScore)}%`} unit="SCORE" color="cyan" />
              <MetricRow label="Combat Logs" value={`${stats.totalWorkouts}`} unit="OPS" color="white" />
            </div>

            <button 
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || currentMeals.length === 0}
              className="w-full py-6 bg-zinc-900 hover:bg-zinc-800 text-lime-400 rounded-3xl font-black text-[11px] tracking-[0.2em] uppercase flex items-center justify-center gap-4 transition-tactical border border-lime-400/20 active:scale-95 disabled:opacity-50 group"
            >
              {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <BrainCircuit size={20} className="group-hover:rotate-12 transition-tactical" />}
              Synthesize Mission Critique
            </button>
          </div>

          <div className="bg-zinc-950/50 border border-zinc-900 p-8 rounded-[2rem] flex items-start gap-6">
             <ShieldCheck size={24} className="text-zinc-700 mt-1" />
             <div>
                <h4 className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mb-2">Data Veracity</h4>
                <p className="text-[11px] text-zinc-600 leading-relaxed font-bold uppercase italic">
                   {currentMeals.length} fuel logs and {currentWorkouts.length} deployments archived in this temporal node.
                </p>
             </div>
          </div>
        </div>

        {/* Chart Column */}
        <div className="lg:col-span-8 glass-panel p-10 rounded-[2.5rem] hud-border">
          <div className="flex items-center justify-between mb-12">
            <div className="space-y-1">
              <h3 className="text-[11px] font-black text-zinc-500 tracking-[0.4em] uppercase">Macro Precision Grid</h3>
              <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">Actual Intake Variance vs Daily Threshold</p>
            </div>
            <div className="flex items-center gap-6">
              <LegendItem color="#a3e635" label="Actual" />
              <LegendItem color="#27272a" label="Target" />
            </div>
          </div>
          
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="reviewGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a3e635" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a3e635" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="#18181b" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#3f3f46', fontSize: 10, fontWeight: 900 }} 
                  tickFormatter={(val) => val.split('-')[2]}
                />
                <YAxis hide domain={[0, profile.dailyCalorieGoal + 1000]} />
                <Tooltip 
                  cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '16px', fontSize: '11px', color: '#fff' }}
                />
                <Area type="stepAfter" dataKey="kcal" stroke="#a3e635" fillOpacity={1} fill="url(#reviewGradient)" strokeWidth={4} animationDuration={2500} />
                <Line type="monotone" dataKey="target" stroke="#27272a" strokeDasharray="5 5" dot={false} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Review Results */}
      {reviewData && (
        <div className="animate-in slide-in-from-bottom-12 duration-1000 space-y-8">
          <div className="flex items-center gap-6 px-4">
            <div className="h-px flex-1 bg-zinc-900"></div>
            <h3 className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.5em] flex items-center gap-4">
              <Zap size={18} className="text-lime-400" /> Neural Mission Critique
            </h3>
            <div className="h-px flex-1 bg-zinc-900"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-8 glass-panel rounded-[3rem] p-12 space-y-12 border-lime-400/10 relative overflow-hidden hud-border">
               <div className="absolute -top-10 -right-10 text-[20rem] font-black text-white/[0.02] tracking-tighter select-none leading-none">
                  {reviewData.grade}
               </div>
               
               <div className="flex items-center gap-12 relative z-10">
                  <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center text-6xl font-black shadow-2xl transition-tactical duration-1000 group hover:rotate-6 ${getGradeStyle(reviewData.grade)}`}>
                    {reviewData.grade}
                  </div>
                  <div className="flex-1 space-y-4">
                    <h4 className="text-3xl font-black text-white tracking-tight uppercase italic leading-none">Mission Performance Index: <span className="text-zinc-600">{reviewData.grade}</span></h4>
                    <p className="text-zinc-400 font-bold leading-relaxed italic border-l-4 border-lime-400/20 pl-8 py-2 text-lg">
                      "{reviewData.periodSummary}"
                    </p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-16 pt-12 border-t border-zinc-900 relative z-10">
                  <div className="space-y-6">
                    <span className="text-[11px] font-black text-lime-400 uppercase tracking-[0.3em] flex items-center gap-3">
                      <CheckCircle2 size={18} /> Operational Successes
                    </span>
                    <ul className="space-y-4">
                      {reviewData.strengths.map((s: string, i: number) => (
                        <li key={i} className="text-xs text-zinc-300 font-black flex items-start gap-4 uppercase tracking-tight">
                          <span className="w-1.5 h-1.5 rounded-full bg-lime-400 mt-1.5 shrink-0 shadow-[0_0_8px_#a3e635]"></span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-6">
                    <span className="text-[11px] font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-3">
                      <AlertTriangle size={18} /> Protocol Gaps
                    </span>
                    <ul className="space-y-4">
                      {reviewData.weaknesses.map((w: string, i: number) => (
                        <li key={i} className="text-xs text-zinc-300 font-black flex items-start gap-4 uppercase tracking-tight">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0 shadow-[0_0_8px_#dc2626]"></span> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
               </div>
            </div>

            <div className="md:col-span-4 space-y-8">
               <div className="bg-lime-400 p-10 rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(163,230,53,0.3)] space-y-10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 group-hover:rotate-45 transition-tactical duration-1000">
                    <Target size={120} className="text-black" />
                  </div>
                  <h4 className="text-[11px] font-black text-black tracking-[0.4em] uppercase flex items-center gap-4 relative z-10">
                    <Target size={20} /> Deployment Tactics
                  </h4>
                  <div className="space-y-5 relative z-10">
                     {reviewData.tacticalImprovements.map((tip: string, i: number) => (
                       <div key={i} className="p-5 bg-black/10 rounded-2xl flex items-start gap-5 hover:bg-black/20 transition-tactical">
                          <div className="w-8 h-8 rounded-xl bg-black text-white text-[12px] font-black flex items-center justify-center shrink-0 shadow-lg">{i+1}</div>
                          <p className="text-[12px] font-black text-black leading-tight uppercase tracking-tight">{tip}</p>
                       </div>
                     ))}
                  </div>
                  <p className="text-[10px] font-black text-black/40 uppercase tracking-[0.2em] text-center pt-6 mono relative z-10">
                    Final Directive: {reviewData.closingDirective}
                  </p>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Archives */}
      <div className="space-y-8">
        <div className="flex items-center justify-between px-6">
          <h3 className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.4em] flex items-center gap-4">
            <History size={16} /> Chronos Archives
          </h3>
          <span className="text-[10px] font-black text-zinc-800 uppercase tracking-widest mono">Node Count: {currentMeals.length + currentWorkouts.length}</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-2">
           {currentWorkouts.sort((a,b) => b.timestamp - a.timestamp).map(w => (
             <ArchiveCard key={w.id} title={w.title} type="WORKOUT" date={new Date(w.timestamp).toLocaleDateString()} icon={<Zap size={14}/>} />
           ))}
           {currentMeals.sort((a,b) => b.timestamp - a.timestamp).slice(0, 15).map(m => (
             <ArchiveCard key={m.id} title={m.name} type="FUEL" date={new Date(m.timestamp).toLocaleDateString()} kcal={m.calories} />
           ))}
        </div>
      </div>
    </div>
  );
};

const PeriodBtn: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
  <button 
    onClick={onClick} 
    className={`px-8 py-3 rounded-xl text-[11px] font-black tracking-[0.2em] uppercase transition-tactical ${active ? 'bg-lime-400 text-black shadow-[0_0_20px_rgba(163,230,53,0.3)] scale-105' : 'text-zinc-600 hover:text-white hover:bg-zinc-800/50'}`}
  >
    {label}
  </button>
);

const LegendItem: React.FC<{ color: string, label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-3">
    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mono">{label}</span>
  </div>
);

const MetricRow: React.FC<{ label: string, value: string, unit: string, color: string }> = ({ label, value, unit, color }) => (
  <div className="flex items-end justify-between border-b border-zinc-900 pb-6 group">
    <div className="space-y-2">
      <span className="text-[10px] font-black text-zinc-600 tracking-[0.3em] uppercase group-hover:text-zinc-400 transition-tactical">{label}</span>
      <div className="flex items-baseline gap-3">
        <span className={`text-5xl font-black tracking-tighter mono ${color === 'lime' ? 'text-lime-400 drop-shadow-[0_0_10px_rgba(163,230,53,0.3)]' : color === 'cyan' ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'text-white'}`}>{value}</span>
        <span className="text-[11px] font-black text-zinc-700 uppercase tracking-widest">{unit}</span>
      </div>
    </div>
    <ChevronRight size={16} className="text-zinc-800 group-hover:text-lime-400 group-hover:translate-x-1 transition-tactical" />
  </div>
);

const ArchiveCard: React.FC<{ title: string, type: 'WORKOUT' | 'FUEL', date: string, icon?: React.ReactNode, kcal?: number }> = ({ title, type, date, icon, kcal }) => (
  <div className="bg-zinc-950/50 border border-zinc-900 p-5 rounded-2xl flex items-center justify-between hover:bg-zinc-900 transition-tactical group cursor-default">
    <div className="flex items-center gap-5">
      <div className={`p-3 rounded-xl ${type === 'WORKOUT' ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' : 'bg-lime-400/10 text-lime-400 border border-lime-400/20'}`}>
        {icon || <Activity size={16} />}
      </div>
      <div className="max-w-[120px]">
        <p className="text-[11px] font-black text-zinc-300 group-hover:text-white truncate uppercase tracking-tight">{title}</p>
        <p className="text-[9px] font-bold text-zinc-700 uppercase mono">{date}</p>
      </div>
    </div>
    {kcal && <span className="text-[10px] font-black text-zinc-600 mono">{kcal}K</span>}
  </div>
);

const getGradeStyle = (grade: string) => {
  switch (grade[0]) {
    case 'A': return 'bg-lime-400 text-black shadow-[0_0_40px_rgba(163,230,53,0.4)]';
    case 'B': return 'bg-cyan-400 text-black shadow-[0_0_40px_rgba(34,211,238,0.4)]';
    case 'C': return 'bg-yellow-400 text-black shadow-[0_0_40px_rgba(250,204,21,0.4)]';
    case 'D': return 'bg-orange-500 text-black shadow-[0_0_40px_rgba(249,115,22,0.4)]';
    default: return 'bg-red-600 text-white shadow-[0_0_40px_rgba(220,38,38,0.4)]';
  }
};

export default ReviewPage;
