import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Play, Star, Sparkles } from 'lucide-react';

interface WhackAMoleProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

type HoleState = 'empty' | 'mole' | 'golden' | 'bomb' | 'whacked';

export default function WhackAMole({ onBack, userProgress, onAddCoins }: WhackAMoleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds game round
  const [grid, setGrid] = useState<HoleState[]>(Array(9).fill('empty'));
  const [earnedCoins, setEarnedCoins] = useState(0);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('ocean_whack_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Calculate mole show duration based on Level (0 to 10000)
  // Level 0 = 1000ms, Level 10000 = 150ms
  const getMoleDuration = () => {
    return Math.max(150, 1000 - Math.floor((level * 850) / 10000));
  };

  // Main game timer
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    if (timeLeft <= 0) {
      setGameOver(true);
      setIsPlaying(false);
      playSound('win', userProgress.soundEnabled);
      triggerHaptic(50, userProgress.hapticEnabled);
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [isPlaying, gameOver, timeLeft]);

  // Mole pop-up spawning loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const spawnMole = () => {
      // Pick random hole
      const randomIndex = Math.floor(Math.random() * 9);
      
      // Determine what pops up: 10% golden mole, 15% bomb, 75% normal mole
      const rand = Math.random();
      let type: HoleState = 'mole';
      if (rand < 0.12) {
        type = 'golden';
      } else if (rand < 0.28) {
        type = 'bomb';
      }

      setGrid((prev) => {
        const next = [...prev];
        if (next[randomIndex] === 'empty') {
          next[randomIndex] = type;
        }
        return next;
      });

      // Hide mole after duration
      setTimeout(() => {
        setGrid((prev) => {
          const next = [...prev];
          if (next[randomIndex] === 'mole' || next[randomIndex] === 'golden' || next[randomIndex] === 'bomb') {
            next[randomIndex] = 'empty';
          }
          return next;
        });
      }, getMoleDuration());
    };

    // Spawn tick rate based on level
    const spawnRate = Math.max(250, 950 - Math.floor((level * 700) / 10000));
    const intervalId = setInterval(spawnMole, spawnRate);

    return () => clearInterval(intervalId);
  }, [isPlaying, gameOver, level]);

  const resetGame = () => {
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);
    setGrid(Array(9).fill('empty'));
    setGameOver(false);
    setIsPlaying(false);
    setScore(0);
    setTimeLeft(30);
    setEarnedCoins(0);
  };

  const handleWhack = (index: number) => {
    if (!isPlaying || gameOver) return;
    const cell = grid[index];

    if (cell === 'empty' || cell === 'whacked') return;

    triggerHaptic(20, userProgress.hapticEnabled);

    if (cell === 'mole') {
      playSound('tap', userProgress.soundEnabled);
      setScore((s) => {
        const next = s + 10;
        if (next > highScore) {
          setHighScore(next);
          localStorage.setItem('ocean_whack_highscore', next.toString());
        }
        return next;
      });
      // award coins
      const coins = 1 + Math.floor(level / 2000);
      setEarnedCoins(c => c + coins);
      onAddCoins(coins);

      setGrid((prev) => {
        const next = [...prev];
        next[index] = 'whacked';
        return next;
      });
    } else if (cell === 'golden') {
      playSound('win', userProgress.soundEnabled);
      setScore((s) => {
        const next = s + 30; // Golden mole is worth 30!
        if (next > highScore) {
          setHighScore(next);
          localStorage.setItem('ocean_whack_highscore', next.toString());
        }
        return next;
      });
      const coins = 5 + Math.floor(level / 1000);
      setEarnedCoins(c => c + coins);
      onAddCoins(coins);

      setGrid((prev) => {
        const next = [...prev];
        next[index] = 'whacked';
        return next;
      });
    } else if (cell === 'bomb') {
      playSound('lose', userProgress.soundEnabled);
      // Whacking puffer bomb loses points!
      setScore((s) => Math.max(0, s - 15));
      setGrid((prev) => {
        const next = [...prev];
        next[index] = 'empty';
        return next;
      });
    }

    // Auto level up slightly
    if (level < 10000) {
      setLevel((prev) => Math.min(10000, prev + 120));
    }
  };

  const handleLevelChange = (val: number) => {
    playSound('tap', userProgress.soundEnabled);
    setLevel(Math.max(0, Math.min(10000, val)));
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[#FBF6F1] text-[#2B1F2E] overflow-y-auto" id="whack_game_wrapper">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 shrink-0" id="whack_header">
        <button 
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display font-extrabold text-base tracking-tight text-[#6B4E9E]">Whack-a-Mole</h2>
          <p className="text-[9px] font-bold text-neutral-500 uppercase">Tap Moles, Avoid Crabs</p>
        </div>
        <button 
          onClick={resetGame}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Dashboard bar */}
      <div className="grid grid-cols-4 gap-1.5 mb-3 shrink-0 text-center">
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2 col-span-1">
          <p className="text-[7px] font-black uppercase text-neutral-400">Timer</p>
          <p className="text-sm font-black text-[#FF6B5D]">{timeLeft}s</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2 col-span-1">
          <p className="text-[7px] font-black uppercase text-neutral-400">Score</p>
          <p className="text-sm font-black text-[#6B4E9E]">{score}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2 col-span-1">
          <p className="text-[7px] font-black uppercase text-neutral-400">High</p>
          <p className="text-sm font-black text-neutral-600">{highScore}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2 col-span-1">
          <p className="text-[7px] font-black uppercase text-neutral-400">Coins</p>
          <p className="text-xs font-black text-[#F5A623]">🪙 {earnedCoins}</p>
        </div>
      </div>

      {/* Speed Slider */}
      <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3 mb-3 shrink-0 shadow-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-black uppercase text-[#6E6270] flex items-center gap-1">
            <Star className="w-3 h-3 text-[#6B4E9E] fill-current" /> Whack Speed Level (0-10000)
          </span>
          <span className="text-xs font-black text-[#6B4E9E]">Lvl {level}</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="10000" 
          step="100"
          value={level} 
          disabled={isPlaying}
          onChange={(e) => handleLevelChange(parseInt(e.target.value, 10))}
          className="w-full accent-[#6B4E9E] h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between mt-1.5 gap-1">
          <button onClick={() => handleLevelChange(level - 1000)} disabled={isPlaying} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">-1000</button>
          <button onClick={() => handleLevelChange(level - 100)} disabled={isPlaying} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">-100</button>
          <button onClick={() => handleLevelChange(level + 100)} disabled={isPlaying} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">+100</button>
          <button onClick={() => handleLevelChange(level + 1000)} disabled={isPlaying} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">+1000</button>
        </div>
      </div>

      {/* Grid Game Zone */}
      <div className="flex-1 flex items-center justify-center bg-white border border-[#EDE4DC] rounded-3xl p-4 relative shadow-inner min-h-[220px]" id="whack_grid_container">
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] aspect-square">
          {grid.map((cell, index) => (
            <div 
              key={index}
              onClick={() => handleWhack(index)}
              className="bg-neutral-100 rounded-2xl border-2 border-dashed border-[#EDE4DC] flex items-center justify-center relative cursor-pointer overflow-hidden aspect-square hover:bg-neutral-200/50 transition-colors"
            >
              {/* Hole shadow */}
              <div className="absolute bottom-1 w-12 h-3 bg-neutral-300 rounded-full blur-xs opacity-60" />

              {/* Mole Animation */}
              <AnimatePresence>
                {cell === 'mole' && (
                  <motion.button
                    initial={{ y: 35, scale: 0.6 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: 35, scale: 0.6 }}
                    className="absolute inset-0 flex items-center justify-center text-3xl select-none"
                  >
                    🦦
                  </motion.button>
                )}

                {cell === 'golden' && (
                  <motion.button
                    initial={{ y: 35, scale: 0.6 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: 35, scale: 0.6 }}
                    className="absolute inset-0 flex items-center justify-center text-3xl select-none filter drop-shadow-[0_0_8px_rgba(245,166,35,0.8)]"
                  >
                    👑
                  </motion.button>
                )}

                {cell === 'bomb' && (
                  <motion.button
                    initial={{ y: 35, scale: 0.6 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: 35, scale: 0.6 }}
                    className="absolute inset-0 flex items-center justify-center text-3xl select-none"
                  >
                    🐡
                  </motion.button>
                )}

                {cell === 'whacked' && (
                  <motion.div
                    initial={{ scale: 0.7, rotate: -20 }}
                    animate={{ scale: [1.2, 1], rotate: 0 }}
                    exit={{ scale: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center select-none"
                  >
                    <span className="text-2xl">💫</span>
                    <span className="text-[8px] font-black text-[#6B4E9E] uppercase tracking-widest leading-none">HIT!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Overlays */}
        <AnimatePresence>
          {!isPlaying && !gameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#FBF6F1]/90 flex flex-col items-center justify-center p-4 text-center z-20"
            >
              <span className="text-4xl mb-1.5 animate-bounce">🦦</span>
              <h3 className="font-display font-black text-sm text-[#2B1F2E] mb-1">Interactive Whacker</h3>
              <p className="text-[10px] text-neutral-500 max-w-[200px] leading-snug mb-3">
                Tap moles (🦦) and golden kings (👑) for mega-scores. Avoid tapping puffers (🐡) or you'll lose points!
              </p>
              <button
                onClick={() => {
                  playSound('tap', userProgress.soundEnabled);
                  setIsPlaying(true);
                }}
                className="px-5 py-2.5 bg-[#6B4E9E] text-white font-display font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Start Whacking
              </button>
            </motion.div>
          )}

          {gameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#FFEFEC]/95 flex flex-col items-center justify-center p-4 text-center z-20"
            >
              <span className="text-4xl mb-1">🎉</span>
              <h3 className="font-display font-black text-sm text-[#C94A3D] mb-1">Round Completed!</h3>
              <p className="text-[10px] text-neutral-600 mb-3">
                Whacked score: <strong className="text-lg font-black">{score}</strong> points
              </p>
              <div className="flex gap-2">
                <button
                  onClick={resetGame}
                  className="px-4 py-2 bg-[#6B4E9E] text-white font-display font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retry Session
                </button>
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-white border border-[#EDE4DC] text-neutral-600 font-display font-black text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Leave App
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 text-center text-[10px] text-neutral-400 font-bold">
        ℹ️ Gold moles spawn occasionally and yield 3x points + coin bonuses!
      </div>
    </div>
  );
}
