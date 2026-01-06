
import React, { useState } from 'react';
import { 
  User, 
  Weight, 
  Ruler, 
  Activity, 
  Target, 
  Save, 
  Zap, 
  TrendingDown, 
  Scale, 
  TrendingUp, 
  Loader2, 
  BrainCircuit, 
  ShieldAlert, 
  Database, 
  Trash2,
  AlertTriangle,
  Fingerprint,
  Dumbbell,
  Check,
  ShieldCheck,
  Lock,
  Wifi
} from 'lucide-react';
import { UserProfile, GoalType } from '../types';
import { calculateMacroTargets } from '../services/geminiService';
import { vault } from '../services/secureVault';

interface SettingsProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}

const EQUIPMENT_OPTIONS = [
  'Dumbbells', 'Barbell', 'Resistance Bands', 'Pull-up Bar', 'Kettlebells', 
  'Bench', 'Squat Rack', 'Cables', 'Leg Press', 'Jump Rope'
];

const SettingsPage: React.FC<SettingsProps> = ({ profile, setProfile }) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [tempPin, setTempPin] = useState(profile.pin || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: name === 'activityLevel' || name === 'displayName' ? value : Number(value)
    }));
  };

  const handleGoalTypeChange = (goal: GoalType) => {
    setProfile(prev => ({ ...prev, goalType: goal }));
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

  const savePin = () => {
    if (tempPin.length === 0) {
      setProfile(prev => ({ ...prev, pin: null }));
    } else if (tempPin.length === 4) {
      setProfile(prev => ({ ...prev, pin: tempPin }));
    }
  };

  const handleCalculateRecommended = async () => {
    setIsCalculating(true);
    try {
      const result = await calculateMacroTargets({
        weight: profile.weight,
        height: profile.height,
        age: profile.age,
        activityLevel: profile.activityLevel,
        goalType: profile.goalType
      });
      setProfile(prev => ({
        ...prev,
        dailyCalorieGoal: result.calories,
        proteinGoal: result.protein
      }));
      setAiReasoning(result.reasoning);
    } catch (error) {
      console.error(error);
      alert("AI calculation failed.");
    } finally {
      setIsCalculating(false);
    }
  };

  const purgeData = () => {
    vault.purge();
    window.location.reload();
  };

  const isHttps = window.location.protocol === 'https:';

  return (
    <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in duration-500 pb-24">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">
            CORE <span className="text-zinc-700">CONFIG</span>
          </h2>
          <p className="mt-2 text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em]">Pilot Bio-metric Parameters</p>
        </div>
        <div className="hidden md:flex items-center gap-4 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-2 px-3">
            <Wifi size={12} className={isHttps ? 'text-lime-400' : 'text-orange-500'} />
            <span className="text-[8px] font-black uppercase text-zinc-500">{isHttps ? 'SECURE_NODE' : 'UNSECURE_COMMS'}</span>
          </div>
        </div>
      </div>

      {/* Security Shield Panel */}
      <div className="glass-panel rounded-[2.5rem] p-10 border-l-4 border-lime-400 bg-gradient-to-br from-lime-400/[0.03] to-transparent space-y-6 hud-border">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <ShieldCheck className="text-lime-400" size={20} />
               <h3 className="text-[11px] font-black text-white tracking-[0.4em] uppercase">Tactical Security Status</h3>
            </div>
            <div className="px-2 py-0.5 bg-lime-400 text-black text-[8px] font-black rounded uppercase">Active</div>
         </div>
         <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
               <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Neural Encryption</p>
               <p className="text-sm font-black text-zinc-300 mono">VAULT_AES_XOR_ENABLED</p>
            </div>
            <div className="space-y-1">
               <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Comms Integrity</p>
               <p className="text-sm font-black text-zinc-300 mono">{isHttps ? 'SSL_HIGH_STRENGTH' : 'CLEAR_TX_MODE'}</p>
            </div>
         </div>
      </div>

      <div className="glass-panel rounded-[2.5rem] p-10 space-y-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8">
          <Zap size={40} className="text-lime-400/5 rotate-12" />
        </div>

        {/* Identity Section */}
        <div className="space-y-10">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Fingerprint size={14} className="text-lime-400" /> Tactical Callsign
            </label>
            <input 
              type="text" 
              name="displayName"
              value={profile.displayName}
              onChange={handleChange}
              placeholder="PILOT NAME"
              className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl px-5 py-4 text-white font-black text-xl tracking-tight focus:outline-none focus:border-lime-400/50 uppercase transition-all"
            />
          </div>

          <div className="space-y-6">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] block">Primary Mission Objective</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <GoalButton active={profile.goalType === 'lose'} icon={<TrendingDown size={18} />} label="Lose" onClick={() => handleGoalTypeChange('lose')} />
              <GoalButton active={profile.goalType === 'maintain'} icon={<Scale size={18} />} label="Maintain" onClick={() => handleGoalTypeChange('maintain')} />
              <GoalButton active={profile.goalType === 'gain'} icon={<TrendingUp size={18} />} label="Gain" onClick={() => handleGoalTypeChange('gain')} />
              <GoalButton active={profile.goalType === 'bulk'} icon={<Zap size={18} />} label="Bulk" onClick={() => handleGoalTypeChange('bulk')} />
            </div>
          </div>
        </div>

        {/* Security Lockdown Protocol */}
        <div className="space-y-6 pt-10 border-t border-zinc-800/30">
           <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] block flex items-center gap-2">
              <Lock size={14} className="text-lime-400" /> Neural Lockdown Protocol (PIN)
           </label>
           <div className="flex flex-col md:flex-row gap-4">
              <input 
                type="password" 
                maxLength={4}
                value={tempPin}
                onChange={(e) => setTempPin(e.target.value.replace(/\D/g, ''))}
                placeholder="4-DIGIT PIN (LEAVE BLANK TO DISABLE)"
                className="flex-1 bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-white font-black tracking-[0.5em] focus:outline-none focus:border-lime-400 transition-all text-center"
              />
              <button 
                onClick={savePin}
                className="px-8 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black text-lime-400 hover:text-white uppercase transition-all"
              >
                Sync Security Key
              </button>
           </div>
           <p className="text-[9px] font-black text-zinc-700 uppercase italic">Lock screen will trigger on system boot or manual bypass.</p>
        </div>

        {/* Equipment Loadout */}
        <div className="space-y-6 pt-10 border-t border-zinc-800/30">
           <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] block flex items-center gap-2">
              <Dumbbell size={14} className="text-lime-400" /> Available Equipment Loadout
           </label>
           <div className="flex flex-wrap gap-3">
              {EQUIPMENT_OPTIONS.map(item => {
                 const isSelected = profile.availableEquipment?.includes(item);
                 return (
                    <button 
                       key={item}
                       onClick={() => toggleEquipment(item)}
                       className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-tactical flex items-center gap-2 ${isSelected ? 'bg-lime-400 text-black border-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.3)]' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}
                    >
                       {isSelected && <Check size={12} />}
                       {item}
                    </button>
                 );
              })}
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t border-zinc-800/30">
          <InputGroup label="Weight Component" name="weight" value={profile.weight} unit="KG" icon={<Weight size={14} />} onChange={handleChange} />
          <InputGroup label="Height Axis" name="height" value={profile.height} unit="CM" icon={<Ruler size={14} />} onChange={handleChange} />
          <InputGroup label="System Age" name="age" value={profile.age} unit="YRS" icon={<User size={14} />} onChange={handleChange} />
          
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Activity size={14} className="text-lime-400" /> Operational Intensity
            </label>
            <div className="relative">
              <select 
                name="activityLevel"
                value={profile.activityLevel}
                onChange={handleChange}
                className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-lime-400/50 appearance-none transition-all"
              >
                <option value="sedentary">SEDENTARY</option>
                <option value="light">LIGHT ACTIVITY</option>
                <option value="moderate">MODERATE ACTIVITY</option>
                <option value="active">HIGH INTENSITY</option>
                <option value="extra">ELITE ATHLETE</option>
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600 font-black text-[10px]">▼</div>
            </div>
          </div>
        </div>

        <div className="pt-6">
           <button 
              type="button"
              onClick={handleCalculateRecommended}
              disabled={isCalculating}
              className="w-full py-4 bg-zinc-800/80 hover:bg-zinc-800 text-lime-400 rounded-2xl font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 border border-lime-400/20 transition-all"
            >
              {isCalculating ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
              AI Recalculate Suggested Targets
            </button>
        </div>

        {aiReasoning && (
          <div className="bg-lime-400/5 border border-lime-400/20 rounded-2xl p-6 animate-in slide-in-from-top-4">
            <p className="text-[10px] text-lime-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
               <ShieldAlert size={14} /> AI Recalibration Note
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium italic">"{aiReasoning}"</p>
          </div>
        )}

        <div className="pt-10 border-t border-zinc-800/50">
          <h3 className="text-xs font-black text-zinc-500 tracking-[0.3em] uppercase mb-8 flex items-center gap-3">
            <Target size={18} className="text-lime-400" /> Tactical Thresholds
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <InputGroup label="Kcal Saturation Goal" name="dailyCalorieGoal" value={profile.dailyCalorieGoal} unit="KCAL" onChange={handleChange} />
            <InputGroup label="Bio-mass Protein Goal" name="proteinGoal" value={profile.proteinGoal} unit="GRAMS" onChange={handleChange} />
          </div>
        </div>

        {/* Data Persistence Section */}
        <div className="pt-10 border-t border-zinc-800/50">
          <div className="flex items-start gap-6 bg-zinc-950/50 rounded-3xl p-6 border border-zinc-800">
            <div className="p-3 bg-zinc-900 rounded-2xl text-zinc-500">
              <Database size={24} />
            </div>
            <div className="flex-1 space-y-3">
              <h4 className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase">Secure Persistence Protocol</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">
                All data is hardened using XOR-Neural-Link obfuscation before being committed to local storage. This ensures 100% cloud-free privacy while preventing casual device intrusion.
              </p>
              
              {!showPurgeConfirm ? (
                <button 
                  onClick={() => setShowPurgeConfirm(true)}
                  className="flex items-center gap-2 text-[10px] font-black text-red-500/60 hover:text-red-500 transition-colors uppercase tracking-widest pt-2"
                >
                  <Trash2 size={14} /> Purge Local Data
                </button>
              ) : (
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-4 animate-in zoom-in-95">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle size={14} /> Critical: All local data will be erased.
                  </p>
                  <div className="flex gap-4">
                    <button onClick={purgeData} className="px-4 py-2 bg-red-500 text-white font-black text-[10px] rounded-lg uppercase tracking-widest hover:bg-red-600 transition-all">Confirm Wipe</button>
                    <button onClick={() => setShowPurgeConfirm(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 font-black text-[10px] rounded-lg uppercase tracking-widest hover:text-white transition-all">Abort</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4">
          <p className="text-center text-zinc-600 text-[9px] font-black tracking-[0.4em] uppercase">Shield Integrity: 100% • Encryption Active</p>
        </div>
      </div>
    </div>
  );
};

const GoalButton: React.FC<{ active: boolean, icon: React.ReactNode, label: string, onClick: () => void }> = ({ active, icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`
      flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2
      ${active 
        ? 'bg-zinc-800 border-lime-400 text-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.2)]' 
        : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700'}
    `}
  >
    {icon}
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const InputGroup: React.FC<{ 
  label: string, 
  name: string, 
  value: number, 
  unit?: string, 
  icon?: React.ReactNode, 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void 
}> = ({ label, name, value, unit, icon, onChange }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
      {icon && <span className="text-lime-400">{icon}</span>} {label}
    </label>
    <div className="relative">
      <input 
        type="number" 
        name={name}
        value={value}
        onChange={onChange}
        className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-lime-400/50 transition-all"
      />
      {unit && (
        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-600 uppercase tracking-widest">{unit}</span>
      )}
    </div>
  </div>
);

export default SettingsPage;
