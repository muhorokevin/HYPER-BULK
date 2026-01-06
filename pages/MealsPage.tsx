
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
import { Link } from 'react-router-dom';
import { Meal, MealSlot, UserProfile } from '../types';
import { estimateMealMacros, analyzeFuelVariance } from '../services/geminiService';

interface MealsPageProps {
  meals: Meal[];
  setMeals: React.Dispatch<React.SetStateAction<Meal[]>>;
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}

const STRATEGIC_SLOTS: MealSlot[] = ['BREAKFAST', '10AM SNACK', 'LUNCH', '4PM SNACK', 'SUPPER', 'OTHER'];

const MealsPage: React.FC<MealsPageProps> = ({ meals, setMeals, profile }) => {
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
      // Find today's plan from yesterday's planning
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
    cal: currentMeals.reduce((s, m) => s + (typeof m.calories === 'number' ? m.calories : 0), 0),
    prot: currentMeals.reduce((s, m) => s + (typeof m.protein === 'number' ? m.protein : 0), 0)
  }), [currentMeals]);

  const calProgress = Math.min((totals.cal / profile.dailyCalorieGoal) * 100, 100);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24">
      {/* HUD Header */}
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

      {viewMode === 'LOG' && (
        <div className="flex justify-end px-4">
           <button 
             onClick={runVarianceAnalysis} 
             disabled={isAnalyzing}
             className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-2xl text-[10px] font-black text-zinc-400 tracking-widest uppercase hover:text-lime-400 hover:border-lime-400/30 transition-tactical"
           >
             {isAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <Scale size={14} />}
             Analyze Variance (Plan vs Actual)
           </button>
        </div>
      )}

      {varianceReport && (
        <div className="glass-panel p-8 rounded-[2rem] border-lime-400/20 animate-in slide-in-from-top-4 duration-500 hud-border">
           <div className="flex items-center justify-between mb-6">
              <h4 className="text-[11px] font-black text-lime-400 uppercase tracking-[0.4em]">Tactical Variance Report</h4>
              <button onClick={() => setVarianceReport(null)} className="text-zinc-600 hover:text-white"><Plus size={18} className="rotate-45" /></button>
           </div>
           <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="text-center md:text-left space-y-1">
                 <p className="text-4xl font-black text-white tracking-tighter">{typeof varianceReport.adherenceScore === 'object' ? '0' : varianceReport.adherenceScore}%</p>
                 <p className="text-[10px] font-black text-zinc-600 tracking-widest uppercase">Adherence Score</p>
              </div>
              <div className="md:col-span-2 space-y-4">
                 <p className="text-sm text-zinc-300 font-bold italic leading-relaxed">"{typeof varianceReport.verdict === 'object' ? JSON.stringify(varianceReport.verdict) : varianceReport.verdict}"</p>
                 <div className="p-4 bg-lime-400/10 rounded-xl border border-lime-400/20 flex items-start gap-4">
                    <ShieldCheck className="text-lime-400 shrink-0" size={20} />
                    <div>
                       <p className="text-[9px] font-black text-lime-400 uppercase tracking-widest mb-1">Corrective Action</p>
                       <p className="text-xs text-zinc-400 font-bold">{typeof varianceReport.correctiveAction === 'object' ? JSON.stringify(varianceReport.correctiveAction) : varianceReport.correctiveAction}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Entry Interface */}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-10">
          <div className="grid gap-6">
            {STRATEGIC_SLOTS.map(slot => {
              const slotMeals = currentMeals.filter(m => m.slot === slot);
              return (
                <div key={slot} className={`glass-panel rounded-[2rem] overflow-hidden transition-tactical ${slotMeals.length > 0 ? 'border-l-4 border-l-lime-400 shadow-xl' : 'border-zinc-900 opacity-40'}`}>
                  <div className="px-10 py-5 bg-zinc-950/40 flex items-center justify-between border-b border-zinc-900/50">
                    <span className="text-[10px] font-black text-zinc-500 tracking-[0.4em] uppercase">{slot}</span>
                  </div>
                  {slotMeals.length > 0 ? (
                    <div className="p-10 space-y-8">
                      {slotMeals.map(meal => (
                        <div key={meal.id} className="flex items-center justify-between gap-8 group/row border-b border-zinc-900/30 pb-8 last:pb-0 last:border-0">
                          <div className="flex-1 space-y-4">
                             <h4 className="text-2xl font-black text-white capitalize tracking-tighter">{meal.name}</h4>
                             <div className="flex gap-4">
                                <RecordBadge label="Energy" value={meal.calories} unit="Kcal" />
                                <RecordBadge label="Protein" value={meal.protein} unit="g" />
                             </div>
                          </div>
                          <button 
                            onClick={() => setMeals(meals.filter(m => m.id !== meal.id))} 
                            className="p-4 text-zinc-800 hover:text-red-500 transition-tactical opacity-0 group-hover/row:opacity-100"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center flex flex-col items-center justify-center gap-4">
                       <Activity size={32} className="text-zinc-900" />
                       <span className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.5em] italic">No {viewMode === 'PLAN' ? 'Plan' : 'Data'} Node</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const RecordBadge: React.FC<{ label: string, value: number, unit: string }> = ({ label, value, unit }) => (
  <div className="px-3 py-1.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg flex items-center gap-3">
    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{label}</span>
    <span className="text-xs font-black text-zinc-300 mono">{value}{unit}</span>
  </div>
);

export default MealsPage;
