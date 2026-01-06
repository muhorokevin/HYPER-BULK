
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Fingerprint, Delete, AlertCircle, Lock } from 'lucide-react';

interface LockScreenProps {
  storedPin: string | null;
  onUnlock: () => void;
}

const LockScreen: React.FC<LockScreenProps> = ({ storedPin, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === storedPin) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 800);
      }
    }
  }, [pin, storedPin, onUnlock]);

  const handlePress = (num: string) => {
    if (pin.length < 4) setPin(prev => prev + num);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020203] flex flex-col items-center justify-center p-8">
      <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
         <div className="w-full h-full" style={{backgroundImage: 'radial-gradient(circle, #a3e635 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
      </div>

      <div className="space-y-12 w-full max-w-xs text-center relative z-10">
        <div className="flex flex-col items-center gap-4">
          <div className={`p-6 rounded-[2.5rem] border-2 transition-all duration-500 ${error ? 'bg-red-500/20 border-red-500 scale-110 shadow-[0_0_30px_#ef4444]' : 'bg-lime-400/5 border-lime-400 shadow-[0_0_30px_rgba(163,230,53,0.1)]'}`}>
            <Lock className={error ? 'text-red-500' : 'text-lime-400'} size={40} />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-black text-white tracking-[0.4em] uppercase">Security Lockdown</h1>
            <p className={`text-[10px] font-black uppercase tracking-widest ${error ? 'text-red-500 animate-pulse' : 'text-zinc-600'}`}>
              {error ? 'Invalid Authorization Key' : 'Enter Pilot Access PIN'}
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${pin.length > i ? 'bg-lime-400 border-lime-400 shadow-[0_0_10px_#a3e635]' : 'border-zinc-800'}`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'].map((btn, i) => {
            if (btn === '') return <div key={i} />;
            if (btn === 'delete') return (
              <button 
                key={i} 
                onClick={() => setPin(prev => prev.slice(0, -1))}
                className="w-full aspect-square flex items-center justify-center rounded-2xl bg-zinc-900/50 text-zinc-500 hover:text-white transition-all"
              >
                <Delete size={20} />
              </button>
            );
            return (
              <button 
                key={i} 
                onClick={() => handlePress(btn)}
                className="w-full aspect-square flex items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-xl font-black text-white hover:bg-lime-400 hover:text-black hover:border-lime-400 transition-all active:scale-90"
              >
                {btn}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-12 flex items-center gap-3 text-zinc-700">
        <ShieldCheck size={14} />
        <span className="text-[9px] font-black uppercase tracking-[0.3em]">End-to-End Encrypted Node</span>
      </div>
    </div>
  );
};

export default LockScreen;
