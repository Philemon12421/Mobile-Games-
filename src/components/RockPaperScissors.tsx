import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Award, Sparkles } from 'lucide-react';

interface RPSProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

type Choice = 'rock' | 'paper' | 'scissors';
const CHOICES: { id: Choice; emoji: string; label: string; color: string }[] = [
  { id: 'rock', emoji: '✊', label: 'Rock', color: 'bg-coral/10 border-coral hover:bg-coral/25' },
  { id: 'paper', emoji: '✋', label: 'Paper', color: 'bg-amber/10 border-amber hover:bg-amber/25' },
  { id: 'scissors', emoji: '✌️', label: 'Scissors', color: 'bg-purple/10 border-purple hover:bg-purple/25' },
];

export default function RockPaperScissors({ onBack, userProgress, onAddCoins }: RPSProps) {
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [cpuChoice, setCpuChoice] = useState<Choice | null>(null);
  const [result, setResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0, streak: 0 });
  const [isSpinning, setIsSpinning] = useState(false);

  const determineWinner = (player: Choice, cpu: Choice) => {
    if (player === cpu) return 'draw';
    if (
      (player === 'rock' && cpu === 'scissors') ||
      (player === 'scissors' && cpu === 'paper') ||
      (player === 'paper' && cpu === 'rock')
    ) {
      return 'win';
    }
    return 'lose';
  };

  const playRound = (choice: Choice) => {
    if (isSpinning) return;
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);

    setPlayerChoice(choice);
    setIsSpinning(true);
    setResult(null);
    setCpuChoice(null);

    // Simulate thinking/rolling suspense
    let count = 0;
    const interval = setInterval(() => {
      const tempOptions: Choice[] = ['rock', 'paper', 'scissors'];
      setCpuChoice(tempOptions[Math.floor(Math.random() * 3)]);
      playSound('slide', userProgress.soundEnabled);
      count++;
      if (count > 6) {
        clearInterval(interval);
        
        // Final choice calculation
        const options: Choice[] = ['rock', 'paper', 'scissors'];
        const finalCpuChoice = options[Math.floor(Math.random() * 3)];
        setCpuChoice(finalCpuChoice);

        const outcome = determineWinner(choice, finalCpuChoice);
        setResult(outcome);
        setIsSpinning(false);

        if (outcome === 'win') {
          playSound('win', userProgress.soundEnabled);
          triggerHaptic(40, userProgress.hapticEnabled);
          onAddCoins(10);
          setStats((prev) => ({
            ...prev,
            wins: prev.wins + 1,
            streak: prev.streak + 1,
          }));
        } else if (outcome === 'lose') {
          playSound('lose', userProgress.soundEnabled);
          triggerHaptic(30, userProgress.hapticEnabled);
          setStats((prev) => ({
            ...prev,
            losses: prev.losses + 1,
            streak: 0,
          }));
        } else {
          playSound('tap', userProgress.soundEnabled);
          onAddCoins(3);
          setStats((prev) => ({
            ...prev,
            draws: prev.draws + 1,
          }));
        }
      }
    }, 120);
  };

  const resetStats = () => {
    playSound('tap', userProgress.soundEnabled);
    setStats({ wins: 0, losses: 0, draws: 0, streak: 0 });
    setPlayerChoice(null);
    setCpuChoice(null);
    setResult(null);
  };

  return (
    <div className="flex flex-col h-full bg-bg text-ink rounded-3xl p-5 overflow-y-auto" id="rps_game_wrapper">
      {/* Header */}
      <div className="flex justify-between items-center mb-4" id="rps_header">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-ink hover:bg-line/40 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-display font-black text-xl tracking-tight text-ink">
          Rock Paper Scissors
        </span>
        <button
          onClick={resetStats}
          className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-ink hover:bg-line/40 transition-colors cursor-pointer"
          title="Reset Scoreboard"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Mini Scoreboard */}
      <div className="grid grid-cols-4 gap-2 mb-4 text-center" id="rps_stats_row">
        <div className="bg-surface border border-line rounded-xl p-2">
          <p className="text-[9px] font-bold text-ink-soft uppercase leading-none">Wins</p>
          <p className="font-display font-black text-sm text-coral mt-1">{stats.wins}</p>
        </div>
        <div className="bg-surface border border-line rounded-xl p-2">
          <p className="text-[9px] font-bold text-ink-soft uppercase leading-none">Losses</p>
          <p className="font-display font-black text-sm text-purple mt-1">{stats.losses}</p>
        </div>
        <div className="bg-surface border border-line rounded-xl p-2">
          <p className="text-[9px] font-bold text-ink-soft uppercase leading-none">Draws</p>
          <p className="font-display font-black text-sm text-ink-soft mt-1">{stats.draws}</p>
        </div>
        <div className="bg-surface border border-line rounded-xl p-2">
          <p className="text-[9px] font-bold text-ink-soft uppercase leading-none">Streak</p>
          <p className="font-display font-black text-sm text-amber mt-1">🔥 {stats.streak}</p>
        </div>
      </div>

      {/* Main Arena */}
      <div className="flex-1 flex flex-col justify-center items-center py-4" id="rps_arena">
        <div className="w-full bg-surface border border-line rounded-3xl p-6 shadow-sm flex justify-around items-center relative min-h-48 overflow-hidden">
          {/* Player side */}
          <div className="text-center flex flex-col items-center gap-2">
            <span className="text-3xl filter drop-shadow-xs">{userProgress.avatar}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">You</span>
            <div className="w-16 h-16 bg-bg border-2 border-line rounded-2xl flex items-center justify-center text-3xl shadow-inner mt-1">
              <AnimatePresence mode="wait">
                {playerChoice ? (
                  <motion.span
                    key={playerChoice}
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                  >
                    {CHOICES.find((c) => c.id === playerChoice)?.emoji}
                  </motion.span>
                ) : (
                  <span className="text-ink-soft/20 font-display">?</span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="font-display font-black text-xl text-line select-none">VS</div>

          {/* CPU side */}
          <div className="text-center flex flex-col items-center gap-2">
            <span className="text-3xl filter drop-shadow-xs">🐙</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">CPU Rival</span>
            <div className="w-16 h-16 bg-bg border-2 border-line rounded-2xl flex items-center justify-center text-3xl shadow-inner mt-1">
              <AnimatePresence mode="wait">
                {cpuChoice ? (
                  <motion.span
                    key={cpuChoice}
                    initial={{ scale: 0, rotate: 45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                  >
                    {CHOICES.find((c) => c.id === cpuChoice)?.emoji}
                  </motion.span>
                ) : (
                  <span className="text-ink-soft/20 font-display">?</span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Action result banner */}
        <div className="mt-4 min-h-12 flex items-center justify-center w-full" id="rps_result_banner">
          <AnimatePresence mode="wait">
            {isSpinning && (
              <motion.div
                key="thinking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs font-bold text-amber flex items-center gap-2"
              >
                <div className="w-4 h-4 rounded-full border-2 border-amber border-t-transparent animate-spin" />
                Sizing up opponent...
              </motion.div>
            )}

            {!isSpinning && result === 'win' && (
              <motion.div
                key="win"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-success/10 border border-success text-success rounded-xl py-2 px-5 font-extrabold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Award className="w-3.5 h-3.5 animate-pulse" /> Win! +10 Gold Coins 🪙
              </motion.div>
            )}

            {!isSpinning && result === 'lose' && (
              <motion.div
                key="lose"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-coral/10 border border-coral text-coral rounded-xl py-2 px-5 font-bold text-xs"
              >
                Rival takes the point! Try again.
              </motion.div>
            )}

            {!isSpinning && result === 'draw' && (
              <motion.div
                key="draw"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-line/80 text-ink-soft rounded-xl py-2 px-5 font-bold text-xs flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber" /> Stand-off! +3 Gold Coins 🪙
              </motion.div>
            )}

            {!isSpinning && !result && (
              <motion.p
                key="prompt"
                className="text-xs text-ink-soft font-semibold text-center"
              >
                Make a selection below to begin the challenge!
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Choice Buttons */}
      <div className="grid grid-cols-3 gap-2.5" id="rps_buttons">
        {CHOICES.map((choice) => (
          <button
            key={choice.id}
            disabled={isSpinning}
            onClick={() => playRound(choice.id)}
            className={`border-2 p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 outline-none ${choice.color} ${
              isSpinning ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <span className="text-3xl filter drop-shadow-xs">{choice.emoji}</span>
            <span className="text-[10px] font-extrabold text-ink tracking-wider uppercase">{choice.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
