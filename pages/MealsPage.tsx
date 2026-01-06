
import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Loader2, 
  Trash2, 
  Clock, 
  Zap, 
  BrainCircuit, 
  Star,
  Settings2,
  ChevronRight,
  Target,
  ShieldCheck,
  Flame,
  Activity,
  CalendarDays,
  Scale
} from 'lucide-react';
import { Meal, MealSlot, UserProfile } from '../types.ts';
import { estimateMealMacros, analyzeFuelVariance } from '../services/geminiService.ts';

const STRATEGIC_SLOTS: MealSlot[] = ['BREAKFAST', '10AM SNACK', 'LUNCH', '4PM SNACK', 'SUPPER', 'OTHER'];

const MealsPage: React.FC<{
  meals: Meal[];
  setMeals: React.Dispatch<React.SetStateAction<Meal[]>>;
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}> = ({ meals, setMeals, profile }) => {
  const [description, setDescription] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('BREAKFAST');
  const [isEstimating, setIsEstimating] = useState(false);
  const [viewMode, setViewMode] = useState<'LOG' | 'PLAN'>('LOG');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [varianceReport, setVarianceReport] = useState<any>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const currentMeals = meals.filter(m => {
    const d = new Date(m.timestamp).toISOString().split('T')[0];
    return viewMode === 'LOG' ? d === todayStr && !m.isPlanned : d === tomorrowStr && m.isPlanned;
  });

  const handleAddFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setIsEstimating(true);
    try {
      const estimated = await estimateMealMacros(description);
      const newMeal: Meal = { 
        ...estimated, 
        slot: selectedSlot, 
        id: Math.random().toString(36).substr(2, 9), 
        timestamp: viewMode === 'PLAN' ? Date.now() + 86400000 : Date.now(),
        isPlanned: viewMode === 'PLAN'
      };
      setMeals([newMeal, ...meals]);
      setDescription('');
    } catch (error) {
      console.error(error);
      alert("Neural analyzer failed to identify fuel source.");
    } finally {
      setIsEstimating(false);
    }
  };

  const runVarianceAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const todayPlan = meals.filter(m => {
        const d = new Date(m.timestamp).toISOString().split('T')[0];
        return d === todayStr && m.isPlanned;
      });
      const todayActual = meals.filter(m => {
        const d = new Date(m.timestamp).toISOString().split('T')[0];
        return d === todayStr && !m.isPlanned;
      });
      const report = await analyzeFuelVariance(todayPlan, todayActual, profile);
      setVarianceReport(report);
    } catch (e) {
      console.error(e);
      alert("Variance analysis synchronization failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const totals = useMemo(() => ({
    cal: currentMeals.reduce((s, m) => s + (Number(m.calories) || 0), 0),
    prot: currentMeals.reduce((s, m) => s + (Number(m.protein) || 0), 0)
  }), [currentMeals]);

  const calProgress = Math.min((totals.cal / profile.dailyCalorieGoal) * 100, 100);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-zinc-900 pb-8 relative overflow-hidden">
        <div className="scanline"></div>
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-lime-400 text-black text-[9px] font-black rounded tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(163,230,53,0.3)]">Strategic Fueling</span>
            <div className="flex items-center bg-zinc-900 p-1 px-3 rounded-full gap-4">
               <button onClick={() => { setViewMode('LOG'); setVarianceReport(null); }} className={`text-[10px] font-black tracking-widest uppercase py-1 ${viewMode === 'LOG' ? 'text-lime-400' : 'text-zinc-600'}`}>TODAY_ACTUAL</button>
               <button onClick={() => { setViewMode('PLAN'); setVarianceReport(null); }} className={`text-[10px] font-black tracking-widest uppercase py-1 ${viewMode === 'PLAN' ? 'text-lime-400' : 'text-zinc-600'}`}>TOMORROW_PLAN</button>
            </div>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none italic uppercase">
            {viewMode === 'LOG' ? 'FUEL' : 'MISSION'} <span className="text-zinc-800">{viewMode === 'LOG' ? 'LOG' : 'PLAN'}</span>
          </h2>
        </div>
        
        <div className="flex gap-4">
           <div className="glass-panel p-6 rounded-3xl border-l-4 border-lime-400 min-w-[180px] shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{viewMode === 'PLAN' ? 'PLAN_LOAD' : 'ENERGY_SAT'}</span>
                <Flame size={14} className="text-lime-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white tracking-tighter mono">{totals.cal.toLocaleString()}</span>
                <span className="text-[10px] font-black text-zinc-700 uppercase">Kcal</span>
              </div>
              <div className="mt-4 h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-lime-400 transition-all duration-1000" style={{ width: `${calProgress}%` }} />
              </div>
           </div>
        </div>
      </div>

      <div className="glass-panel rounded-[2.5rem] p-4 relative group hud-border">
        <form onSubmit={handleAddFuel} className="relative flex flex-col md:flex-row items-stretch gap-4">
          <div className="relative flex-1">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700">
              <BrainCircuit size={24} className={isEstimating ? "text-lime-400 animate-pulse" : ""} />
            </div>
            <input 
              type="text" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder={viewMode === 'PLAN' ? `Plan fuel for tomorrow's ${selectedSlot}` : `Log intake for ${selectedSlot}`} 
              className="w-full bg-zinc-950 border-2 border-zinc-900 rounded-3xl py-7 pl-16 pr-6 text-white font-bold placeholder-zinc-800 focus:outline-none focus:border-lime-400/50 transition-tactical text-lg uppercase tracking-tight" 
              disabled={isEstimating} 
            />
          </div>
          <button 
            type="submit" 
            disabled={isEstimating || !description} 
            className="bg-lime-400 hover:bg-lime-300 disabled:bg-zinc-900 disabled:text-zinc-800 text-black font-black py-6 px-12 rounded-3xl transition-tactical flex items-center justify-center gap-4 active:scale-95 shadow-2xl shadow-lime-400/20"
          >
            {isEstimating ? <Loader2 className="animate-spin" size={24} /> : (viewMode === 'PLAN' ? <CalendarDays size={24} /> : <Plus size={24} />)} 
            <span className="tracking-[0.2em] uppercase text-xs">{viewMode === 'PLAN' ? 'Commit Plan' : 'Log Fuel'}</span>
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {STRATEGIC_SLOTS.map(slot => (
          <button 
            key={slot} 
            onClick={() => setSelectedSlot(slot)} 
            className={`px-4 py-5 rounded-2xl font-black text-[9px] tracking-[0.2em] transition-tactical border ${selectedSlot === slot ? 'bg-lime-400 text-black border-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.3)] scale-105' : 'bg-zinc-900/50 text-zinc-600 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'}`}
          >
            {slot}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MealsPage;
