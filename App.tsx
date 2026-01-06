
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Utensils, 
  Dumbbell, 
  CalendarClock, 
  Settings, 
  Menu, 
  Zap,
  ShieldCheck,
  History,
  X,
  Navigation,
  Flame,
  Radio,
  Lock
} from 'lucide-react';
import Dashboard from './pages/Dashboard.tsx';
import MealsPage from './pages/MealsPage.tsx';
import WorkoutPage from './pages/WorkoutPage.tsx';
import SchedulePage from './pages/SchedulePage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import ReviewPage from './pages/ReviewPage.tsx';
import ActivityPage from './pages/ActivityPage.tsx';
import NeuralLink from './components/NeuralLink.tsx';
import LockScreen from './components/LockScreen.tsx';
import { vault } from './services/secureVault.ts';
import { Meal, WorkoutSession, ScheduleItem, UserProfile, WaterLog, WeightEntry, ActivityRecord } from './types.ts';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNeuralLinkOpen, setIsNeuralLinkOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // SECURE INITIALIZATION
  const [meals, setMeals] = useState<Meal[]>(() => vault.load('hb_meals') || []);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>(() => vault.load('hb_workouts') || []);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => vault.load('hb_schedule') || []);
  const [water, setWater] = useState<WaterLog[]>(() => vault.load('hb_water') || []);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>(() => vault.load('hb_weight_history') || []);
  const [activities, setActivities] = useState<ActivityRecord[]>(() => vault.load('hb_activities') || []);
  const [profile, setProfile] = useState<UserProfile>(() => vault.load('hb_profile') || {
    displayName: 'PILOT_01',
    weight: 75,
    height: 180,
    age: 25,
    activityLevel: 'moderate',
    dailyCalorieGoal: 3000,
    proteinGoal: 180,
    goalType: 'bulk',
    waterGoal: 3000,
    availableEquipment: [],
    preferredGym: '',
    pin: null
  });

  // PERSISTENCE SYNC
  useEffect(() => { vault.save('hb_meals', meals); }, [meals]);
  useEffect(() => { vault.save('hb_workouts', workouts); }, [workouts]);
  useEffect(() => { vault.save('hb_schedule', schedule); }, [schedule]);
  useEffect(() => { vault.save('hb_profile', profile); }, [profile]);
  useEffect(() => { vault.save('hb_water', water); }, [water]);
  useEffect(() => { vault.save('hb_weight_history', weightHistory); }, [weightHistory]);
  useEffect(() => { vault.save('hb_activities', activities); }, [activities]);

  // INITIAL LOCK CHECK
  useEffect(() => {
    if (profile.pin) setIsLocked(true);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const streak = useMemo(() => {
    const dates = new Set(meals.filter(m => !m.isPlanned).map(m => new Date(m.timestamp).toISOString().split('T')[0]));
    return dates.size;
  }, [meals]);

  if (isLocked) {
    return <LockScreen storedPin={profile.pin} onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <HashRouter>
      <div className="flex h-screen bg-[#020203] overflow-hidden text-zinc-100">
        <NeuralLink 
          isOpen={isNeuralLinkOpen} 
          onClose={() => setIsNeuralLinkOpen(false)} 
          profile={profile} 
          meals={meals} 
          workouts={workouts}
          water={water}
        />

        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/90 z-[60] lg:hidden backdrop-blur-xl animate-in fade-in duration-300" 
            onClick={toggleSidebar}
          />
        )}

        <aside className={`
          fixed inset-y-0 left-0 z-[70] w-72 bg-zinc-950 border-r border-zinc-900 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:static lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex flex-col h-full relative">
            <div className="absolute top-0 right-0 p-6 lg:hidden">
              <button onClick={toggleSidebar} className="text-zinc-500 hover:text-white"><X size={24}/></button>
            </div>

            <div className="p-10">
              <div className="flex items-center gap-3">
                <div className="bg-lime-400 p-2 rounded shadow-[0_0_20px_rgba(163,230,53,0.3)]">
                  <Zap className="text-black w-6 h-6 fill-black" />
                </div>
                <div>
                   <h1 className="text-2xl font-black text-white tracking-widest italic leading-none uppercase">
                     HYPER<span className="text-lime-400">BULK</span>
                   </h1>
                   <p className="text-[8px] font-black text-zinc-600 tracking-[0.4em] mt-1 uppercase">Mission Ready v1.0</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-6 space-y-2">
              <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Command Center" onClick={() => setIsSidebarOpen(false)} />
              <NavItem to="/meals" icon={<Utensils size={18} />} label="Fuel Log" onClick={() => setIsSidebarOpen(false)} />
              <NavItem to="/activity" icon={<Navigation size={18} />} label="Field Ops" onClick={() => setIsSidebarOpen(false)} />
              <NavItem to="/workouts" icon={<Dumbbell size={18} />} label="Battle Plan" onClick={() => setIsSidebarOpen(false)} />
              <NavItem to="/schedule" icon={<CalendarClock size={18} />} label="Chronos" onClick={() => setIsSidebarOpen(false)} />
              <NavItem to="/review" icon={<History size={18} />} label="Tactical Review" onClick={() => setIsSidebarOpen(false)} />
              <NavItem to="/settings" icon={<Settings size={18} />} label="Core Config" onClick={() => setIsSidebarOpen(false)} />
            </nav>

            <div className="p-8 space-y-4">
              <button 
                onClick={() => setIsNeuralLinkOpen(true)}
                className="w-full flex items-center justify-between p-6 bg-lime-400/5 border border-lime-400/20 rounded-3xl group hover:bg-lime-400/10 transition-tactical"
              >
                <div className="flex items-center gap-4">
                   <Radio size={20} className="text-lime-400 animate-pulse" />
                   <span className="text-[10px] font-black text-white uppercase tracking-widest">Neural Link</span>
                </div>
                <div className="w-6 h-6 bg-zinc-900 rounded-lg flex items-center justify-center text-lime-400 text-[10px] font-black group-hover:bg-lime-400 group-hover:text-black transition-tactical">AI</div>
              </button>

              <div className="glass-panel p-6 rounded-3xl border border-zinc-900 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Growth Streak</span>
                  <Flame size={14} className="text-orange-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white mono">{streak}</span>
                  <span className="text-[10px] text-zinc-600 font-black uppercase">ACTIVE_DAYS</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <header className="h-20 flex items-center justify-between px-10 bg-zinc-950/50 backdrop-blur-xl border-b border-zinc-900 sticky top-0 z-50">
            <button 
              className="lg:hidden p-2.5 text-zinc-400 hover:text-white bg-zinc-900 rounded-xl"
              onClick={toggleSidebar}
            >
              <Menu size={20} />
            </button>
            
            <div className="flex-1 flex justify-end items-center gap-8">
              {profile.pin && (
                <button 
                  onClick={() => setIsLocked(true)}
                  className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-lime-400 transition-all"
                  title="Lock Tactical Interface"
                >
                  <Lock size={18} />
                </button>
              )}
              
              <button 
                onClick={() => setIsNeuralLinkOpen(true)}
                className="hidden md:flex items-center gap-3 px-4 py-2 bg-zinc-900/40 border border-zinc-800 rounded-full hover:border-lime-400/50 transition-tactical group"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"></div>
                <span className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase group-hover:text-lime-400">NEURAL_LINK_READY</span>
              </button>

              <div className="flex items-center gap-5 group cursor-default">
                <div className="text-right hidden sm:block">
                  <p className="text-[9px] font-black text-zinc-600 tracking-[0.3em] uppercase mb-0.5">PILOT_ID</p>
                  <p className="text-sm font-black text-white group-hover:text-lime-400 transition-colors uppercase tracking-tight">{profile.displayName}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lime-400 font-black shadow-lg">
                  <ShieldCheck size={20} />
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 lg:p-12 scroll-smooth">
            <div className="max-w-7xl mx-auto">
              <Routes>
                <Route path="/" element={<Dashboard meals={meals} profile={profile} schedule={schedule} workouts={workouts} water={water} setWater={setWater} weightHistory={weightHistory} setWeightHistory={setWeightHistory} onOpenNeuralLink={() => setIsNeuralLinkOpen(true)} />} />
                <Route path="/meals" element={<MealsPage meals={meals} setMeals={setMeals} profile={profile} setProfile={setProfile} />} />
                <Route path="/activity" element={<ActivityPage activities={activities} setActivities={setActivities} profile={profile} />} />
                <Route path="/workouts" element={<WorkoutPage workouts={workouts} setWorkouts={setWorkouts} profile={profile} setProfile={setProfile} />} />
                <Route path="/schedule" element={<SchedulePage schedule={schedule} setSchedule={setSchedule} />} />
                <Route path="/review" element={<ReviewPage meals={meals} workouts={workouts} profile={profile} />} />
                <Route path="/settings" element={<SettingsPage profile={profile} setProfile={setProfile} />} />
              </Routes>
            </div>
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

const NavItem: React.FC<{ to: string, icon: React.ReactNode, label: string, onClick: () => void }> = ({ to, icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`
        flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all group relative
        ${isActive 
          ? 'bg-zinc-900 text-white shadow-xl border border-zinc-800' 
          : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/40'}
      `}
    >
      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-lime-400 rounded-r-full shadow-[0_0_10px_#a3e635]"></div>}
      <span className={`${isActive ? 'text-lime-400' : 'group-hover:text-white transition-colors'}`}>
        {icon}
      </span>
      <span className={`text-[10px] tracking-[0.2em] uppercase font-black ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
        {label}
      </span>
    </Link>
  );
};

export default App;
