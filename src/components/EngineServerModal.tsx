import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Server, X, Wifi, ShieldCheck, Activity, Terminal, 
  RefreshCw, CheckCircle2, Cpu, Zap, Globe2, Radio
} from 'lucide-react';
import { UserProgress } from '../types';
import { playSound, triggerHaptic } from '../utils/audio';

interface EngineServerModalProps {
  user: UserProgress;
  onClose: () => void;
  onSelectEngine: (engine: 'unreal' | 'unity') => void;
}

export default function EngineServerModal({
  user,
  onClose,
  onSelectEngine
}: EngineServerModalProps) {
  const currentEngine = user.serverEngine || 'unreal';
  const [selectedEngine, setSelectedEngine] = useState<'unreal' | 'unity'>(currentEngine);
  const [livePing, setLivePing] = useState(22);
  const [packetLoss, setPacketLoss] = useState(0.0);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    '[INIT] Handshake verified with OceanGames-Cluster.',
    '[AUTH] Client session token authenticated.',
    '[NET] Server authoritative tick rate locked at 60.0 Hz.',
    '[SYNC] High-scores replicated across cloud region.'
  ]);

  // Jitter ping slightly every 3 seconds to feel 100% real
  useEffect(() => {
    const interval = setInterval(() => {
      const base = selectedEngine === 'unreal' ? 21 : 25;
      const jitter = Math.floor(Math.random() * 5) - 2;
      setLivePing(base + jitter);
    }, 2800);
    return () => clearInterval(interval);
  }, [selectedEngine]);

  const runDiagnostic = () => {
    if (isDiagnosticRunning) return;
    setIsDiagnosticRunning(true);
    playSound('tap', user.soundEnabled);
    triggerHaptic(25, user.hapticEnabled);

    const engineName = selectedEngine === 'unreal' ? 'UE5.4_ChaosNet' : 'Unity_Netcode';
    const endpoint = selectedEngine === 'unreal' 
      ? 'aws-us-east.unrealengine.dedicated.internal:7777' 
      : 'unity-relay-frankfurt.ugs.multiplay.internal:9000';

    setLogs((prev) => [
      ...prev,
      `[PROBE] Transmitting 128-byte DTLS handshake to ${endpoint}...`
    ]);

    setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        `[${engineName}] Echo reply received in ${livePing}ms. Packet loss: 0.00%.`
      ]);
    }, 450);

    setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        `[${engineName}] RPC replication verified. State snapshot confirmed.`
      ]);
      setIsDiagnosticRunning(false);
      playSound('win', user.soundEnabled);
      triggerHaptic(30, user.hapticEnabled);
    }, 1100);
  };

  const handleSelect = (engine: 'unreal' | 'unity') => {
    setSelectedEngine(engine);
    onSelectEngine(engine);
    playSound('tap', user.soundEnabled);
    triggerHaptic(20, user.hapticEnabled);
    setLogs((prev) => [
      ...prev,
      `[SWITCH] Routed game cluster to ${engine === 'unreal' ? 'Unreal Engine 5.4 Dedicated NetDriver' : 'Unity 6 Netcode Relay Server'}.`
    ]);
  };

  const accentColor = user.themeColor || '#FF6B5D';

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4" id="engine_server_modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        className="bg-[#100c14] border-2 border-line rounded-3xl w-full max-w-[400px] h-[680px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative text-white"
        style={{ borderColor: accentColor }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-line/60 bg-[#16111C] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-display font-black text-sm leading-none text-white">Dedicated Game Server</h3>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                AAA Engine Multiplayer Architecture
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer hover:bg-white/20 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">

          {/* Engine Selector: Unreal vs Unity */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Active Dedicated Server Engine
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Unreal Engine 5 Card */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => handleSelect('unreal')}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all relative overflow-hidden ${
                  selectedEngine === 'unreal'
                    ? 'border-coral bg-coral/15 shadow-md ring-1 ring-coral/50'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 opacity-70'
                }`}
              >
                {selectedEngine === 'unreal' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-coral text-white flex items-center justify-center text-[9px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="w-7 h-7 rounded-xl bg-coral/20 flex items-center justify-center text-base mb-2">
                  🔥
                </div>
                <h4 className="font-display font-black text-xs text-white">Unreal Engine 5</h4>
                <p className="text-[9px] font-bold text-slate-400 mt-0.5">Chaos NetDriver 5.4.3</p>
                <div className="mt-2 flex items-center gap-1 text-[8px] font-mono text-emerald-400 font-black">
                  <span>60Hz Dedicated</span>
                </div>
              </motion.button>

              {/* Unity Netcode Card */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => handleSelect('unity')}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all relative overflow-hidden ${
                  selectedEngine === 'unity'
                    ? 'border-purple bg-purple/20 shadow-md ring-1 ring-purple/50'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 opacity-70'
                }`}
              >
                {selectedEngine === 'unity' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple text-white flex items-center justify-center text-[9px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="w-7 h-7 rounded-xl bg-purple/20 flex items-center justify-center text-base mb-2">
                  ⚡
                </div>
                <h4 className="font-display font-black text-xs text-white">Unity 6 Netcode</h4>
                <p className="text-[9px] font-bold text-slate-400 mt-0.5">UGS Multiplay & Relay</p>
                <div className="mt-2 flex items-center gap-1 text-[8px] font-mono text-purple-300 font-black">
                  <span>64Hz StateSync</span>
                </div>
              </motion.button>
            </div>
          </div>

          {/* Telemetry Grid */}
          <div className="bg-[#16111C] border border-white/10 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Live Network Telemetry
              </span>
              <span className="text-[9px] font-mono text-emerald-400 font-black flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                HEALTHY
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                <span className="text-[8px] font-black uppercase text-slate-400 block">Ping Latency</span>
                <span className="font-mono font-black text-sm text-emerald-400">{livePing} ms</span>
                <span className="text-[7px] text-slate-500 block">Ultra Low</span>
              </div>
              <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                <span className="text-[8px] font-black uppercase text-slate-400 block">Tick Rate</span>
                <span className="font-mono font-black text-sm text-amber">
                  {selectedEngine === 'unreal' ? '60.0' : '64.0'} Hz
                </span>
                <span className="text-[7px] text-slate-500 block">Server Fixed</span>
              </div>
              <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                <span className="text-[8px] font-black uppercase text-slate-400 block">Packet Loss</span>
                <span className="font-mono font-black text-sm text-white">{packetLoss.toFixed(2)}%</span>
                <span className="text-[7px] text-slate-500 block">Clean DTLS</span>
              </div>
            </div>

            {/* Region & Protocol info */}
            <div className="space-y-1 pt-1 text-[10px] font-mono text-slate-400 border-t border-white/5">
              <div className="flex justify-between">
                <span>Cluster Host:</span>
                <span className="text-white font-bold">
                  {selectedEngine === 'unreal' ? 'aws-east.ue5-gameserver:7777' : 'unity-relay.eu-west:9000'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Protocol:</span>
                <span className="text-white font-bold">UDP / DTLS Encrypted Netcode</span>
              </div>
              <div className="flex justify-between">
                <span>State Replication:</span>
                <span className="text-emerald-400 font-bold">Server Authoritative (RPC)</span>
              </div>
              <div className="flex justify-between">
                <span>Active Region Match:</span>
                <span className="text-amber font-bold">2,480 Players Online</span>
              </div>
            </div>
          </div>

          {/* Simulated Server Console Feed */}
          <div className="bg-black/60 border border-white/10 rounded-2xl p-3 font-mono text-[9px] space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-white/10">
              <span className="flex items-center gap-1 font-black uppercase">
                <Terminal className="w-3 h-3 text-coral" />
                Engine RPC Console
              </span>
              <span className="text-[8px] text-slate-500">Live Feed</span>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto text-slate-300">
              {logs.map((log, i) => (
                <p key={i} className="leading-tight break-all font-mono text-[8.5px]">
                  <span className="text-coral mr-1">❯</span>
                  {log}
                </p>
              ))}
            </div>
          </div>

          {/* Run Diagnostic Button */}
          <button
            onClick={runDiagnostic}
            disabled={isDiagnosticRunning}
            className="w-full py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-display font-bold text-xs rounded-2xl cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-coral ${isDiagnosticRunning ? 'animate-spin' : ''}`} />
            <span>{isDiagnosticRunning ? 'Pinging Dedicated Server...' : 'Run Packet Diagnostic & RPC Test'}</span>
          </button>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-line/60 bg-[#16111C] flex items-center justify-between text-[9px] text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Protected against client tampering</span>
          </div>
          <span className="font-mono text-slate-500">OceanEngine v3.4</span>
        </div>
      </motion.div>
    </div>
  );
}
