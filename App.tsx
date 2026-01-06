
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Utensils, 
  Dumbbell, 
  CalendarClock, 
  Settings, 
  Menu, 
  Zap,
  Trophy,
  ShieldCheck,
  History,
  X,
  Navigation
} from 'lucide-react';
import Dashboard from './pages/Dashboard.tsx';
import MealsPage from './pages/MealsPage.tsx';
import WorkoutPage from './pages/WorkoutPage.tsx';
import SchedulePage from './pages/SchedulePage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import ReviewPage from './pages/ReviewPage.tsx';
import ActivityPage from './pages/ActivityPage.tsx';
import { Meal, WorkoutSession, ScheduleItem, UserProfile, WaterLog, WeightEntry, ActivityRecord } from './types.ts';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [meals, setMeals] = useState<Meal[]>(() => {
    const saved = localStorage.getItem('hb_meals');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [workouts, setWorkouts] = useState<WorkoutSession[]>(() => {
    const saved = localStorage.getItem('hb_workouts');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem('hb_schedule');
    return saved ? JSON.parse(saved) : [];
  });

  const [water, setWater] = useState<WaterLog[]>(() => {
    const saved = localStorage.getItem('hb_water');
    return saved ? JSON.parse(saved) : [];
  });

  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>(() => {
    const saved = localStorage.getItem('hb_weight_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [activities, setActivities] = useState<ActivityRecord[]>(() => {
    const saved = localStorage.getItem('hb_activities');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('hb_profile');
    return saved ? JSON.parse(saved) : {
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
      preferredGym: ''
    };
  });

  useEffect(() => { localStorage.setItem('hb_meals', JSON.stringify(meals)); }, [meals]);
  useEffect(() => { localStorage.setItem('hb_workouts', JSON.stringify(workouts)); }, [workouts]);
  useEffect(() => { localStorage.setItem('hb_schedule', JSON.stringify(schedule)); }, [schedule]);
  useEffect(() => { localStorage.setItem('hb_profile', JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem('hb_water', JSON.stringify(water)); }, [water]);
  useEffect(() => { localStorage.setItem('hb_weight_history', JSON.stringify(weightHistory)); }, [weightHistory]);
  useEffect(() => { localStorage.setItem('hb_activities', JSON.stringify(activities)); }, [activities]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const todayStr = new Date().toISOString().split('T')[0];
  const dailyCalories = meals.filter(m => {
    const d = new Date(m.timestamp).toISOString().split('T')[0];
    return d === todayStr && !m.isPlanned;
  }).reduce((sum, m) => sum + m.calories, 0);

  const progressPercent = profile.dailyCalorieGoal > 0 
    ? Math.min((dailyCalories / profile.dailyCalorieGoal) * 100, 100)
    : 0;

  return (
    <HashRouter>
      <div className="flex h-screen bg-[#020203] overflow-hidden text-zinc-100">
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
                   <h1 className="text-2xl font-black text-white tracking-widest italic leading-none">
                     HYPER<span className="text-lime-400">BULK</span>
                   </h1>
                   <p className="text-[8px] font-black text-zinc-600 tracking-[0.4em] mt-1 uppercase">Tactical AI Engine</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-6 space-y-3">
              <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Command Center" onClick={() => setIsSidebarOpen(false)} />
              <NavItem to="/meals" icon={<Utensils size={20} />} label="Fuel Log" onClick={() => setIsSidebarOpen(false)} />
              <NavItem to="/activity" icon={<Navigation size={20} />} label="Field Ops" onClick={() => setIsSidebarOpen(false)} />
              <NavItem to="/workouts" icon={<Dumbbell size={20} />} label="Battle Plan" onClick={() => setIsSidebarOpen(false)} />
              <NavItem to="/schedule" icon={<CalendarClock size={20} />} label="Chronos" onClick={() => setIsSidebarOpen(false)} />
              <NavItem to="/review" icon={<History size={20} />} label="Tactical Review" onClick={() => setIsSidebarOpen(false)} />
              <NavItem to="/settings" icon={<Settings size={20} />} label="Core Config" onClick={() => setIsSidebarOpen(false)} />
            </nav>

            <div className="p-8">
              <div className="glass-panel p-6 rounded-3xl border-zinc-800/50 relative overflow-hidden group">
                <div className="absolute inset-0 bg-lime-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Energy Node</span>
                  <Trophy size={14} className="text-lime-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white tracking-tighter mono">{dailyCalories}</span>
                  <span className="text-[10px] text-zinc-600 font-black uppercase mono">/ {profile.dailyCalorieGoal}</span>
                </div>
                <div className="mt-5 w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden p-[1px]">
                  <div 
                    className="bg-lime-400 h-full transition-all duration-1000 shadow-[0_0_15px_rgba(163,230,53,0.4)] rounded-full" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <header className="h-24 flex items-center justify-between px-10 bg-zinc-950/50 backdrop-blur-xl border-b border-zinc-900 sticky top-0 z-50">
            <button 
              className="lg:hidden p-3 text-zinc-400 hover:text-white bg-zinc-900 rounded-xl"
              onClick={toggleSidebar}
            >
              <Menu size={24} />
            </button>
            
            <div className="flex-1 flex justify-end items-center gap-8">
              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-zinc-900/40 border border-zinc-800 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"></div>
                <span className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase">Security Protocol: Local</span>
              </div>

              <div className="flex items-center gap-6 group cursor-default">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-zinc-600 tracking-[0.3em] uppercase mb-1">Status: Online</p>
                  <p className="text-sm font-black text-white group-hover:text-lime-400 transition-tactical uppercase tracking-tight">{profile.displayName}</p>
                </div>
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lime-400 font-black relative overflow-hidden group-hover:border-lime-400/50 transition-tactical shadow-2xl">
                    <span className="relative z-10 text-xs mono">P01</span>
                    <div className="absolute inset-0 bg-lime-400/10 scale-0 group-hover:scale-100 transition-transform duration-500 rounded-full"></div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-lime-400 border-4 border-zinc-950 rounded-full"></div>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 lg:p-12 scroll-smooth">
            <div className="max-w-7xl mx-auto h-full">
              <Routes>
                <Route path="/" element={<Dashboard meals={meals} profile={profile} schedule={schedule} workouts={workouts} water={water} setWater={setWater} weightHistory={weightHistory} setWeightHistory={setWeightHistory} />} />
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
        flex items-center gap-5 px-6 py-4 rounded-2xl transition-tactical group relative
        ${isActive 
          ? 'bg-zinc-900 text-white shadow-2xl' 
          : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/30'}
      `}
    >
      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-lime-400 rounded-r-full shadow-[0_0_15px_#a3e635]"></div>}
      <span className={`${isActive ? 'text-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.5)]' : 'group-hover:text-white transition-tactical'}`}>
        {icon}
      </span>
      <span className={`text-[11px] tracking-[0.2em] uppercase font-black ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
        {label}
      </span>
    </Link>
  );
};

export default App;
