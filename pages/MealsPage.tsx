
import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, 
  Loader2, 
  Trash2, 
  Clock, 
  BrainCircuit, 
  Flame,
  History,
  Camera,
  PieChart as PieChartIcon,
  Zap,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Meal, MealSlot, UserProfile } from '../types.ts';
import { estimateMealMacros, analyzeFuelVariance, estimateMacrosFromImage } from '../services/geminiService.ts';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsEstimating(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const estimated = await estimateMacrosFromImage(base64, file.type);
        const newMeal: Meal = {
          ...estimated,
          slot: selectedSlot,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: viewMode === 'PLAN' ? Date.now() + 86400000 : Date.now(),
          isPlanned: viewMode === 'PLAN'
        };
        setMeals([newMeal, ...meals]);
      };
    } catch (error) {
      console.error(error);
      alert("Visual scan failed. System offline.");
    } finally {
      setIsEstimating(false);
    }
  };

  const handleRunVariance = async () => {
    setIsAnalyzing(true);
    try {
      const report = await analyzeFuelVariance([], currentMeals, profile);
      setVarianceReport(report);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteMeal = (id: string) => {
    setMeals(prev => prev.filter(m => m.id !== id));
  };

  const totals = useMemo(() => ({
    cal: currentMeals.reduce((s, m) => s + (Number(m.calories) || 0), 0),
    prot: currentMeals.reduce((s, m) => s + (Number(m.protein) || 0), 0),
    carbs: currentMeals.reduce((s, m) => s + (Number(m.carbs) || 0), 0),
    fats: currentMeals.reduce((s, m) => s + (Number(m.fats) || 0), 0)
  }), [currentMeals]);

  const macroData = [
    { name: 'PRO', value: totals.prot, color: '#a3e635' },
    { name: 'CARB', value: totals.carbs, color: '#06b6d4' },
    { name: 'FAT', value: totals.fats, color: '#f43f5e' }
  ];

  const calProgress = Math.min((totals.cal / profile.dailyCalorieGoal) * 100, 100);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-zinc-900 pb-8 relative overflow-hidden">
        <div className="scanline"></div>
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-lime-400 text-black text-[9px] font-black rounded tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(163,230,53,0.3)]">Strategic Fueling</span>
            <div className="flex items-center bg-zinc-900 p-1 px-3 rounded-full gap-4">
               <button onClick={() => { setViewMode('LOG'); setVarianceReport(null); }} className={`text-[10px] font-black tracking-widest uppercase py-1 px-4 rounded-full transition-all ${viewMode === 'LOG' ? 'bg-lime-400 text-black' : 'text-zinc-600 hover:text-white'}`}>TODAY_ACTUAL</button>
               <button onClick={() => { setViewMode('PLAN'); setVarianceReport(null); }} className={`text-[10px] font-black tracking-widest uppercase py-1 px-4 rounded-full transition-all ${viewMode === 'PLAN' ? 'bg-lime-400 text-black' : 'text-zinc-600 hover:text-white'}`}>TOMORROW_PLAN</button>
            </div>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none italic uppercase">
            {viewMode === 'LOG' ? 'FUEL' : 'MISSION'} <span className="text-zinc-800">{viewMode === 'LOG' ? 'LOG' : 'PLAN'}</span>
          </h2>
        </div>
        
        <div className="flex gap-4">
           <div className="glass-panel p-6 rounded-3xl border-l-4 border-lime-400 min-w-[220px] shadow-2xl hud-border">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{viewMode === 'PLAN' ? 'PLAN_LOAD' : 'ENERGY_SAT'}</span>
                <Flame size={14} className="text-lime-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white tracking-tighter mono">{totals.cal.toLocaleString()}</span>
                <span className="text-[10px] font-black text-zinc-700 uppercase">/ {profile.dailyCalorieGoal}</span>
              </div>
              <div className="mt-4 h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden p-[1px]">
                <div className="h-full bg-lime-400 transition-all duration-1000 shadow-[0_0_10px_#a3e635]" style={{ width: `${calProgress}%` }} />
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
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
                  placeholder={viewMode === 'PLAN' ? `Plan fuel for tomorrow's ${selectedSlot}` : `Log intake (e.g. "3 eggs and avocado")`} 
                  className="w-full bg-zinc-950 border-2 border-zinc-900 rounded-3xl py-7 pl-16 pr-6 text-white font-bold placeholder-zinc-800 focus:outline-none focus:border-lime-400/50 transition-tactical text-lg uppercase tracking-tight" 
                  disabled={isEstimating} 
                />
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-zinc-800 p-6 rounded-3xl transition-tactical active:scale-95"
                  title="Visual Fuel Scan"
                >
                  <Camera size={24} />
                </button>
                <button 
                  type="submit" 
                  disabled={isEstimating || !description} 
                  className="bg-lime-400 hover:bg-lime-300 disabled:bg-zinc-900 disabled:text-zinc-800 text-black font-black py-6 px-12 rounded-3xl transition-tactical flex items-center justify-center gap-4 active:scale-95 shadow-2xl shadow-lime-400/20"
                >
                  {isEstimating ? <Loader2 className="animate-spin" size={24} /> : (viewMode === 'PLAN' ? <Clock size={24} /> : <Plus size={24} />)} 
                  <span className="tracking-[0.2em] uppercase text-xs">{viewMode === 'PLAN' ? 'Commit Plan' : 'Log Fuel'}</span>
                </button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            </form>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {STRATEGIC_SLOTS.map(slot => (
              <button 
                key={slot} 
                onClick={() => setSelectedSlot(slot)} 
                className={`px-4 py-5 rounded-2xl font-black text-[9px] tracking-[0.2em] transition-tactical border ${selectedSlot === slot ? 'bg-lime-400 text-black border-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.3)] scale-105' : 'bg-zinc-900/50 text-zinc-600 border-zinc-800 hover:text-zinc-300'}`}
              >
                {slot}
              </button>
            ))}
          </div>

          {/* Meals List */}
          <div className="space-y-6">
            <div className="flex items-center gap-4 px-4">
               <History size={16} className="text-zinc-700" />
               <h3 className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.4em]">Chronological Logs</h3>
               <div className="h-px flex-1 bg-zinc-900"></div>
            </div>

            {currentMeals.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-zinc-900 rounded-[3rem] text-zinc-800 font-black uppercase text-[10px] tracking-widest">
                 No intake records found for this node.
              </div>
            ) : (
              <div className="grid gap-4">
                {currentMeals.sort((a,b) => b.timestamp - a.timestamp).map(meal => (
                  <div key={meal.id} className="glass-panel p-6 rounded-3xl border border-zinc-800 hover:border-lime-400/20 transition-tactical group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                       <div className="flex items-start gap-6">
                          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lime-400 font-black text-xs mono shrink-0">
                             {meal.slot?.substring(0, 3)}
                          </div>
                          <div className="space-y-1">
                             <h4 className="text-xl font-black text-white uppercase tracking-tight">{meal.name}</h4>
                             <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12} /> {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </p>
                             {meal.bulkingNote && (
                               <div className="mt-2 text-[10px] text-lime-400/80 italic font-bold border-l-2 border-lime-400/20 pl-3">
                                  {meal.bulkingNote}
                                </div>
                             )}
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-8">
                          <div className="flex gap-6">
                             <MacroBadge label="PRO" value={meal.protein} color="lime" />
                             <MacroBadge label="CAL" value={meal.calories} color="white" />
                          </div>
                          <button onClick={() => deleteMeal(meal.id)} className="p-3 text-zinc-800 hover:text-red-500 transition-colors">
                             <Trash2 size={18} />
                          </button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Analytics Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <div className="glass-panel p-10 rounded-[3rem] hud-border sticky top-32">
              <h3 className="text-[11px] font-black text-zinc-500 tracking-[0.4em] uppercase mb-10 flex items-center gap-2">
                <PieChartIcon size={14} /> Macro Saturation
              </h3>
              <div className="h-[200px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie
                          data={macroData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={8}
                          dataKey="value"
                       >
                          {macroData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                          ))}
                       </Pie>
                       <Tooltip 
                          contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }}
                       />
                    </PieChart>
                 </ResponsiveContainer>
              </div>

              <div className="space-y-6 mt-8">
                 {macroData.map(item => (
                    <div key={item.name} className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{item.name}</span>
                       </div>
                       <span className="text-sm font-black text-white mono">{item.value}g</span>
                    </div>
                 ))}
              </div>

              <div className="mt-10 pt-10 border-t border-zinc-900 space-y-6">
                 <button 
                  onClick={handleRunVariance}
                  disabled={isAnalyzing || currentMeals.length === 0}
                  className="w-full py-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center gap-3 text-lime-400 font-black text-[10px] tracking-widest uppercase transition-all hover:bg-lime-400/5 disabled:opacity-50"
                 >
                   {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                   Tactical Fuel Verdict
                 </button>

                 {varianceReport && (
                   <div className="p-5 bg-zinc-950 rounded-2xl border border-lime-400/20 space-y-3 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-lime-400 uppercase tracking-widest">AI Verdict</span>
                        <div className="flex items-center gap-1">
                          <ShieldCheck size={12} className="text-lime-400" />
                          <span className="text-[10px] font-black text-white">{varianceReport.adherenceScore}%</span>
                        </div>
                      </div>
                      <p className="text-[11px] font-bold text-zinc-300 leading-relaxed italic uppercase">"{varianceReport.verdict}"</p>
                      <div className="flex items-start gap-2 pt-2 border-t border-zinc-900">
                        <AlertTriangle size={14} className="text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-[9px] font-black text-orange-500 uppercase leading-tight">{varianceReport.correctiveAction}</p>
                      </div>
                   </div>
                 )}
                 
                 {!varianceReport && (
                    <p className="text-[11px] text-zinc-500 font-bold leading-relaxed italic uppercase">
                      Mass gain requires a consistent caloric surplus. Aim for <span className="text-lime-400">2.2g of protein per kg</span> for optimal muscle repair.
                    </p>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const MacroBadge: React.FC<{ label: string, value: number, color: string }> = ({ label, value, color }) => (
  <div className="flex flex-col items-center">
     <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">{label}</span>
     <span className={`text-sm font-black mono ${color === 'lime' ? 'text-lime-400' : 'text-white'}`}>{value}</span>
  </div>
);

export default MealsPage;
