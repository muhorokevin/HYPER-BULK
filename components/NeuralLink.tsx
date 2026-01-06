
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Radio, X, Volume2, Loader2, Zap, Terminal, AlertCircle, RefreshCcw } from 'lucide-react';
import { UserProfile, Meal, WorkoutSession, WaterLog } from '../types';

interface NeuralLinkProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  meals: Meal[];
  workouts: WorkoutSession[];
  water: WaterLog[];
}

// Helper functions for audio encoding/decoding as per Gemini API guidelines
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const NeuralLink: React.FC<NeuralLinkProps> = ({ isOpen, onClose, profile, meals, workouts, water }) => {
  const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  
  const sessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const startConnection = async () => {
    setStatus('CONNECTING');
    setErrorMessage(null);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("SECURE_CONTEXT_REQUIRED: Neural interface hardware requires a secure connection (HTTPS or localhost).");
      }

      let stream: MediaStream;
      try {
        // Attempt 1: Standard tactical constraints
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: { ideal: true },
            noiseSuppression: { ideal: true },
            autoGainControl: { ideal: true }
          } 
        });
      } catch (innerErr) {
        console.warn("Primary mic access failed, attempting emergency fallback...", innerErr);
        // Attempt 2: Minimalist fallback for older/restricted hardware
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (finalErr: any) {
          // Explicitly catch the failure to provide diagnostic info
          if (finalErr.name === 'NotFoundError' || finalErr.name === 'DevicesNotFoundError') {
            throw new Error("HARDWARE_NOT_FOUND: No audio input device detected. Verify microphone is active.");
          } else if (finalErr.name === 'NotAllowedError' || finalErr.name === 'PermissionDeniedError') {
            throw new Error("ACCESS_DENIED: Neural link requires microphone permissions. Check browser settings.");
          } else {
            throw finalErr;
          }
        }
      }
      
      streamRef.current = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextsRef.current = { input: inputCtx, output: outputCtx };

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const totalCals = meals.reduce((s, m) => s + (m.calories || 0), 0);
      const totalWater = water.reduce((s, w) => s + (w.amount || 0), 0);
      const todayWorkout = workouts.find(w => new Date(w.timestamp).toDateString() === new Date().toDateString());

      const systemInstruction = `You are the HyperBulk AI Tactical Assistant. Your tone is professional, encouraging, and slightly military-coded ("Pilot", "Operational", "Anabolic").
        PILOT STATUS:
        Name: ${profile.displayName}
        Goal: ${profile.goalType} (Bulk context)
        Daily Calorie Target: ${profile.dailyCalorieGoal} kcal
        Current Calories: ${totalCals} kcal
        Current Water: ${totalWater} ml
        Equipment Available: ${profile.availableEquipment?.join(', ') || 'Standard Gym'}
        
        ${todayWorkout ? `CURRENT MISSION: ${todayWorkout.title}. Help the pilot with set motivation, rest timing, and form tips.` : 'MISSION STATUS: Waiting for training deployment.'}
        
        OBJECTIVES:
        1. If they are behind on calories, remind them to eat.
        2. If water intake is low, issue a hydration directive.
        3. During workouts, give aggressive but safe tips for hypertrophy.
        4. Always talk back naturally when they ask questions about exercises or nutrition.
        KEEP RESPONSES CONCISE AND TACTICAL.`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setStatus('CONNECTED');
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              setTranscription(prev => [...prev.slice(-4), `PILOT: ${message.serverContent?.inputTranscription?.text}`]);
            }
            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => [...prev.slice(-4), `AI: ${message.serverContent?.outputTranscription?.text}`]);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextsRef.current) {
              setIsTalking(true);
              const ctx = audioContextsRef.current.output;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBytes = decode(base64Audio);
              const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsTalking(false);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsTalking(false);
            }
          },
          onerror: (e) => {
            console.error("Neural Link Comms Error:", e);
            setStatus('ERROR');
            setErrorMessage("SESSION_LOST: Signal lost to tactical satellite. Reconnecting...");
          },
          onclose: () => {
            setStatus('IDLE');
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error("Neural Link Failure:", err);
      setStatus('ERROR');
      
      // Map technical errors to user-friendly "Tactical" messages
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' || err.message?.includes('HARDWARE_NOT_FOUND')) {
        setErrorMessage("SENSOR_FAILURE: No microphone detected. Connect hardware and retry synchronization.");
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('ACCESS_DENIED')) {
        setErrorMessage("PROTOCOL_VIOLATION: Mic access blocked. Authorize sensors in browser to proceed.");
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorMessage("HARDWARE_LOCKED: Sensor currently in use by another directive or application.");
      } else {
        setErrorMessage(`COMMS_ERROR: ${err.message || 'Unknown signal interference'}`);
      }
    }
  };

  const stopConnection = () => {
    if (sessionRef.current) sessionRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextsRef.current) {
      audioContextsRef.current.input.close();
      audioContextsRef.current.output.close();
    }
    setStatus('IDLE');
    setTranscription([]);
    setErrorMessage(null);
  };

  useEffect(() => {
    if (isOpen && status === 'IDLE') {
      startConnection();
    }
    return () => {
      if (status !== 'IDLE') stopConnection();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-500">
      <div className="glass-panel w-full max-w-xl rounded-[3rem] p-10 border-lime-400/20 hud-border relative overflow-hidden">
        <div className="scanline"></div>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Radio size={120} className={status === 'CONNECTED' ? 'animate-pulse text-lime-400' : ''} />
        </div>

        <button onClick={onClose} className="absolute top-8 right-8 text-zinc-700 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="space-y-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${status === 'CONNECTED' ? 'bg-lime-400 text-black shadow-[0_0_20px_#a3e635]' : status === 'ERROR' ? 'bg-red-500 text-white shadow-[0_0_20px_#ef4444]' : 'bg-zinc-900 text-zinc-500'}`}>
              {status === 'ERROR' ? <AlertCircle size={24} /> : <Radio size={24} className={status === 'CONNECTED' ? 'animate-spin-slow' : ''} />}
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">Neural Link</h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${status === 'CONNECTED' ? 'bg-lime-400 animate-pulse' : status === 'ERROR' ? 'bg-red-500' : 'bg-zinc-800'}`}></div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${status === 'ERROR' ? 'text-red-500' : 'text-zinc-500'}`}>{status}</span>
              </div>
            </div>
          </div>

          {/* Audio Visualizer */}
          <div className="h-24 flex items-center justify-center gap-1.5 px-4 bg-zinc-950/50 rounded-3xl border border-zinc-900">
            {Array.from({ length: 24 }).map((_, i) => (
              <div 
                key={i} 
                className={`w-1 rounded-full transition-all duration-150 ${status === 'CONNECTED' ? 'bg-lime-400' : status === 'ERROR' ? 'bg-red-500/50' : 'bg-zinc-800'}`}
                style={{ 
                  height: status === 'CONNECTED' ? `${isTalking ? 20 + Math.random() * 60 : 5 + Math.random() * 15}%` : '5%',
                  opacity: status === 'CONNECTED' ? 0.3 + (i / 24) * 0.7 : 0.2
                }}
              />
            ))}
          </div>

          {/* Transcription Area */}
          <div className="space-y-3 bg-zinc-950/80 p-6 rounded-2xl border border-zinc-900 font-mono text-[11px] min-h-[140px]">
            <div className="flex items-center gap-2 text-zinc-600 mb-2">
              <Terminal size={12} />
              <span className="uppercase tracking-[0.2em] font-black">Tactical_Comms.log</span>
            </div>
            {status === 'ERROR' ? (
              <div className="space-y-2">
                <p className="text-red-500 font-bold uppercase tracking-tight italic flex items-center gap-2">
                  <AlertCircle size={14} /> Mission Abort Signal
                </p>
                <p className="text-zinc-500 font-black uppercase tracking-widest leading-relaxed">
                  {errorMessage || "Synchronization failure. Ensure microphone functionality and grant system permissions."}
                </p>
              </div>
            ) : transcription.length === 0 ? (
              <p className="text-zinc-800 animate-pulse uppercase">Scanning for pilot voice signal...</p>
            ) : (
              transcription.map((line, i) => (
                <div key={i} className={`flex gap-3 ${line.startsWith('AI') ? 'text-lime-400' : 'text-zinc-400'}`}>
                   <span className="shrink-0">{line.split(': ')[0]}:</span>
                   <span className="font-bold uppercase tracking-tight italic">{line.split(': ')[1]}</span>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-4">
             <div className="flex gap-4">
                <button 
                  onClick={status === 'CONNECTED' || status === 'ERROR' ? stopConnection : startConnection}
                  className={`flex-1 py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest transition-tactical flex items-center justify-center gap-3 ${status === 'CONNECTED' ? 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-red-500' : status === 'ERROR' ? 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20' : 'bg-lime-400 text-black shadow-2xl shadow-lime-400/20'}`}
                >
                  {status === 'CONNECTING' ? <Loader2 size={18} className="animate-spin" /> : status === 'CONNECTED' ? <MicOff size={18} /> : status === 'ERROR' ? <RefreshCcw size={18} /> : <Mic size={18} />}
                  {status === 'CONNECTED' ? 'Cut Signal' : status === 'ERROR' ? 'Retry Link-up' : 'Engage Neural Link'}
                </button>
             </div>
             
             <div className="flex items-center justify-center gap-6 pt-4 text-zinc-700">
                <div className="flex items-center gap-2">
                   <Zap size={12} />
                   <span className="text-[8px] font-black uppercase tracking-widest">Active Monitoring</span>
                </div>
                <div className="flex items-center gap-2">
                   <Volume2 size={12} />
                   <span className="text-[8px] font-black uppercase tracking-widest">Neural Feedback</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeuralLink;
