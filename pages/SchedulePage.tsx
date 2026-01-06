
import React, { useState, useMemo } from 'react';
import { 
  CalendarClock, 
  Sparkles, 
  Plus, 
  Loader2, 
  MoreVertical, 
  Zap, 
  Moon, 
  Utensils, 
  Activity, 
  Trash2, 
  Save, 
  Clock,
  TrendingUp,
  Brain,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ScheduleItem } from '../types';
import { suggestSchedule } from '../services/geminiService';

interface SchedulePageProps {
  schedule: ScheduleItem[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
}

const DEFAULT_SCHEDULE: ScheduleItem[] = [
  { id: '1', time: '07:00 AM', activity: 'Wake up & System Hydration', type: 'other' },
  { id: '2', time: '08:00 AM', activity: 'High-Mass Protein Breakfast', type: 'meal' },
  { id: '3', time: '11:00 AM', activity: 'Anabolic Pre-workout Fuel', type: 'meal' },
  { id: '4', time: '01:00 PM', activity: 'Hypertrophy Deployment Session', type: 'workout' },
  { id: '5', time: '03:00 PM', activity: 'Recovery Macro Flush', type: 'meal' },
  { id: '6', time: '10:30 PM', activity: 'Neural & Tissue Repair', type: 'sleep' },
];

const SchedulePage: React.FC<SchedulePageProps> = ({ schedule, setSchedule }) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const displaySchedule = schedule.length > 0 ? schedule : DEFAULT_SCHEDULE;

  // Forecast data based on schedule types (Visual representation of energy)
  const forecastData = useMemo(() => {
    return displaySchedule.map((item, idx) => {
      let energy = 50;
      if (item.type === 'meal') energy = 80;
      if (item.type === 'workout') energy = 30;
      if (item.type === 'sleep') energy = 100;
      if (item.type === 'other') energy = 60;
      return { time: item.time, energy };
    }).sort((a, b) => {
      const timeA = new Date(`1970/01/01 ${a.time}`).getTime();
      const timeB = new Date(`1970/01/01 ${b.time}`).getTime();
      return timeA - timeB;
    });
  }, [displaySchedule]);

  const handleOptimize = async (preset?: string) => {
    setIsOptimizing(true);
    const context = preset || "Elite male physique development";
    try {
      const suggested = await suggestSchedule(context, "3200 calories, 90 min gym, 8h sleep");
      setSchedule(suggested.map((s: any, i: number) => ({ ...s, id: Math.random().toString(36).substr(2, 9) })));
    } catch (err) {
      console.error(err);
      alert("AI optimization failed.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const addItem = () => {
    const newItem: ScheduleItem = {
      id: Math.random().toString(36).substr(2, 9),
      time: '12:00 PM',
      activity: 'NEW TEMPORAL NODE',
      type: 'other'
    };
    setSchedule([...displaySchedule, newItem]);
    setEditingId(newItem.id);
  };

  const removeItem = (id: string) => {
    setSchedule(displaySchedule.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<ScheduleItem>) => {
    setSchedule(displaySchedule.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700 pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-lime-400 text-black text-[10px] font-black rounded-sm uppercase tracking-widest">Temporal Core v4.0</span>
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Chronos Optimizer</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">
            CHRONOS <span className="text-zinc-700">OPTIMIZER</span>
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <PresetButton label="DEEP BULK" onClick={() => handleOptimize("High intensity hypertrophy focus")} />
          <PresetButton label="RECOVERY" onClick={() => handleOptimize("Active recovery and tissue repair")} />
          <button 
            onClick={() => handleOptimize()}
            disabled={isOptimizing}
            className="bg-lime-400 hover:bg-lime-300 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black py-4 px-8 rounded-2xl shadow-xl shadow-lime-400/20 active:scale-95 transition-all flex items-center gap-3 group"
          >
            {isOptimizing ? <Loader2 size={20} className="animate-spin" /> : <Brain size={20} className="group-hover:rotate-12 transition-transform" />}
            <span className="text-xs tracking-widest uppercase">AI SYNAPSE OPTIMIZE</span>
          </button>
        </div>
      </div>

      {/* Energy Forecast Visualization */}
      <div className="glass-panel rounded-[2rem] p-8 border-lime-400/10 overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-8 opacity-5">
            <TrendingUp size={120} className="text-lime-400" />
        </div>
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-lg text-lime-400">
                    <TrendingUp size={18} />
                </div>
                <div>
                    <h3 className="text-xs font-black text-zinc-500 tracking-[0.3em] uppercase">Energy Capacity Forecast</h3>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase mt-1">Predicted Bio-Load Intensity</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-lime-400 shadow-[0_0_5px_#a3e635]"></div>
                    <span className="text-[10px] font-black text-zinc-400 tracking-widest">ANABOLIC WINDOW</span>
                </div>
            </div>
        </div>
        <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData}>
                    <defs>
                        <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a3e635" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#a3e635" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                    <XAxis 
                        dataKey="time" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#52525b', fontSize: 9, fontWeight: 900 }} 
                    />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px', color: '#fff' }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="energy" 
                        stroke="#a3e635" 
                        fillOpacity={1} 
                        fill="url(#colorEnergy)" 
                        strokeWidth={3}
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Main Timeline Content */}
      <div className="relative pl-4 md:pl-0 pt-10">
        {/* Timeline Core Axis */}
        <div className="absolute left-[24px] md:left-[112px] top-0 bottom-0 w-1 bg-gradient-to-b from-lime-400 via-zinc-800/50 to-zinc-950 rounded-full" />
        
        <div className="space-y-12">
          {displaySchedule.map((item) => (
            <div key={item.id} className="flex flex-col md:flex-row gap-6 md:gap-12 relative group/item animate-in slide-in-from-left-4 duration-500">
              {/* Time Input/Display */}
              <div className="w-full md:w-28 pt-3 text-left md:text-right md:pl-0 pl-12 shrink-0">
                {editingId === item.id ? (
                    <input 
                        autoFocus
                        type="text"
                        value={item.time}
                        onChange={(e) => updateItem(item.id, { time: e.target.value.toUpperCase() })}
                        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs font-black text-lime-400 w-full text-center focus:outline-none focus:border-lime-400"
                    />
                ) : (
                    <span 
                        onClick={() => setEditingId(item.id)}
                        className="text-sm font-black text-zinc-500 tracking-tighter group-hover/item:text-lime-400 cursor-pointer transition-colors"
                    >
                        {item.time}
                    </span>
                )}
              </div>
              
              {/* Tactical Icon Node */}
              <div className={`
                absolute left-0 md:left-[96px] z-10 w-10 h-10 rounded-[1.2rem] mt-0.5 ring-[12px] ring-zinc-950 flex items-center justify-center
                ${getTypeColors(item.type).dot} transition-all duration-300 group-hover/item:scale-110 group-hover/item:shadow-[0_0_20px_rgba(163,230,53,0.3)]
              `}>
                {getTypeIcon(item.type)}
              </div>

              {/* Task Content Card */}
              <div className={`
                flex-1 ml-10 md:ml-0 glass-panel border-l-4 p-7 rounded-[2rem] transition-all duration-500 flex items-center justify-between
                ${editingId === item.id ? 'border-lime-400 bg-zinc-900/60' : 'border-transparent hover:border-lime-400/40 hover:bg-zinc-900/40'}
              `}>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <select 
                        value={item.type}
                        onChange={(e) => updateItem(item.id, { type: e.target.value as any })}
                        className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-sm tracking-[0.2em] bg-transparent border-none focus:ring-0 cursor-pointer ${getTypeColors(item.type).badge}`}
                    >
                        <option value="meal">MEAL</option>
                        <option value="workout">WORKOUT</option>
                        <option value="sleep">SLEEP</option>
                        <option value="other">OTHER</option>
                    </select>
                    {item.type === 'workout' && <span className="text-[8px] font-black text-lime-400 flex items-center gap-1"><CheckCircle2 size={10} /> CRITICAL PATH</span>}
                  </div>
                  
                  {editingId === item.id ? (
                      <div className="flex items-center gap-4">
                        <input 
                            type="text"
                            value={item.activity}
                            onChange={(e) => updateItem(item.id, { activity: e.target.value })}
                            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-2 text-white font-bold focus:outline-none focus:border-lime-400 transition-all"
                            placeholder="Activity description..."
                        />
                        <button 
                            onClick={() => setEditingId(null)}
                            className="bg-lime-400 text-black p-2 rounded-lg hover:bg-lime-300 transition-colors"
                        >
                            <Save size={18} />
                        </button>
                      </div>
                  ) : (
                      <h4 
                        onClick={() => setEditingId(item.id)}
                        className="text-xl font-black text-white tracking-tight leading-none cursor-text hover:text-lime-400 transition-colors"
                      >
                        {item.activity}
                      </h4>
                  )}
                </div>
                
                <div className="flex items-center gap-3 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <button 
                        onClick={() => removeItem(item.id)}
                        className="p-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button className="p-3 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-xl transition-all">
                        <MoreVertical size={18} />
                    </button>
                </div>
              </div>
            </div>
          ))}
          
          <div className="flex gap-8 items-center pl-12 md:pl-44 pt-4">
            <button 
                onClick={addItem}
                className="flex items-center gap-3 text-lime-400 hover:text-white font-black text-[10px] tracking-widest uppercase py-4 px-8 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-lime-400/30 hover:bg-lime-400/5 transition-all group"
            >
              <Plus size={16} className="group-hover:rotate-90 transition-transform" /> 
              Synchronize New Node
            </button>
          </div>
        </div>
      </div>

      {/* Circadian Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-10">
        <div className="glass-panel p-8 rounded-[2rem] border-cyan-400/10 flex items-start gap-6 relative overflow-hidden">
            <div className="p-3 bg-cyan-400/10 text-cyan-400 rounded-2xl border border-cyan-400/20">
                <AlertCircle size={24} />
            </div>
            <div>
                <h4 className="text-sm font-black text-cyan-400 tracking-widest uppercase mb-1">CORTISOL PEAK ANALYSIS</h4>
                <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                    Morning window identified. Prioritize heavy mechanical tension during 11:00 AM - 01:00 PM for optimal hormonal response.
                </p>
            </div>
        </div>
        <div className="glass-panel p-8 rounded-[2rem] border-lime-400/10 flex items-start gap-6 relative overflow-hidden">
            <div className="p-3 bg-lime-400/10 text-lime-400 rounded-2xl border border-lime-400/20">
                <Zap size={24} />
            </div>
            <div>
                <h4 className="text-sm font-black text-lime-400 tracking-widest uppercase mb-1">PROTEIN SATURATION</h4>
                <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                    Meal spacing protocol: 3-4 hours apart to maximize Muscle Protein Synthesis (MPS) across the entire 24-hour cycle.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

const PresetButton: React.FC<{ label: string, onClick: () => void }> = ({ label, onClick }) => (
    <button 
        onClick={onClick}
        className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-[9px] font-black text-zinc-500 tracking-[0.2em] rounded-xl hover:text-lime-400 hover:border-lime-400/30 transition-all uppercase"
    >
        {label}
    </button>
);

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'meal': return <Utensils size={16} />;
    case 'workout': return <Activity size={16} />;
    case 'sleep': return <Moon size={16} />;
    default: return <Zap size={16} />;
  }
};

const getTypeColors = (type: string) => {
  switch (type) {
    case 'meal': return { 
      dot: 'bg-lime-400 text-black shadow-[0_0_15px_rgba(163,230,53,0.4)]', 
      badge: 'bg-lime-400/10 text-lime-400 border border-lime-400/20' 
    };
    case 'workout': return { 
      dot: 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]', 
      badge: 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' 
    };
    case 'sleep': return { 
      dot: 'bg-zinc-800 text-zinc-400 shadow-[0_0_10px_rgba(0,0,0,0.5)]', 
      badge: 'bg-zinc-800 text-zinc-400 border border-zinc-700' 
    };
    default: return { 
      dot: 'bg-zinc-700 text-zinc-300 shadow-[0_0_10px_rgba(113,113,122,0.2)]', 
      badge: 'bg-zinc-900 text-zinc-600' 
    };
  }
};

export default SchedulePage;
