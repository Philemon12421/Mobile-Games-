import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Play, Trophy, ChevronUp, PartyPopper } from 'lucide-react';

interface EndlessRunnerProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

interface Obstacle {
  id: number;
  x: number;
  height: number;
  isTop: boolean;
}

interface Particle {
  id: number;
  angle: number;
  dist: number;
}

const MAX_LEVEL = 100;
const LEVEL_KEY = 'ocean_runner_level';

// Score needed (within the current level) to advance to the next one — grows each level
const pointsNeededForLevel = (lvl: number) => 30 + lvl * 8;

export default function EndlessRunner({ onBack, userProgress, onAddCoins }: EndlessRunnerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [playerY, setPlayerY] = useState(50);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [hitFlash, setHitFlash] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [levelUpToast, setLevelUpToast] = useState<number | null>(null);

  const playerYRef = useRef(50);
  const velocityRef = useRef(0);
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const levelStartScoreRef = useRef(0);
  const particleIdCounter = useRef(0);
  const frameIdRef = useRef<number | null>(null);
  const obstacleIdCounter = useRef(0);

  useEffect(() => { playerYRef.current = playerY; }, [playerY]);
  useEffect(() => { levelRef.current = level; }, [level]);

  useEffect(() => {
    const saved = localStorage.getItem('ocean_runner_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
    const savedLevel = localStorage.getItem(LEVEL_KEY);
    if (savedLevel) setLevel(Math.min(MAX_LEVEL, Math.max(1, parseInt(savedLevel, 10))));
  }, []);

  const getDifficulty = (lvl: number) => Math.min(10000, (lvl - 1) * 100);
  const getScrollSpeed = (lvl: number) => 1.2 + (getDifficulty(lvl) * 3.8) / 10000;
  const getSpawnRate = (lvl: number) => Math.max(30, 95 - Math.floor(getDifficulty(lvl) / 110));

  const spawnCrashParticles = () => {
    const newOnes: Particle[] = Array.from({ length: 10 }, () => ({
      id: particleIdCounter.current++,
      angle: Math.random() * Math.PI * 2,
      dist: 8 + Math.random() * 16,
    }));
    setParticles(newOnes);
    setTimeout(() => setParticles([]), 500);
  };

  const handleCrash = () => {
    setGameOver(true);
    setIsPlaying(false);
    setHitFlash(true);
    setShakeKey((k) => k + 1);
    spawnCrashParticles();
    playSound('lose', userProgress.soundEnabled);
    triggerHaptic(50, userProgress.hapticEnabled);
  };

  const handleJump = () => {
    if (gameOver) return;
    if (!isPlaying) setIsPlaying(true);
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(12, userProgress.hapticEnabled);
    velocityRef.current = -2.8;
  };

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') handleJump();
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, gameOver]);

  const checkLevelUp = () => {
    const lvl = levelRef.current;
    if (lvl >= MAX_LEVEL) return;
    const progressInLevel = scoreRef.current - levelStartScoreRef.current;
    if (progressInLevel >= pointsNeededForLevel(lvl)) {
      const nextLevel = lvl + 1;
      levelRef.current = nextLevel;
      setLevel(nextLevel);
      localStorage.setItem(LEVEL_KEY, nextLevel.toString());
      levelStartScoreRef.current = scoreRef.current;
      setLevelUpToast(nextLevel);
      playSound('win', userProgress.soundEnabled);
      triggerHaptic(30, userProgress.hapticEnabled);
      setTimeout(() => setLevelUpToast(null), 2200);
    }
  };

  useEffect(() => {
    if (!isPlaying || gameOver) return;
    let ticksSinceLastObstacle = 0;

    const tick = () => {
      const g = 0.12;
      let nextY = playerYRef.current + velocityRef.current;
      velocityRef.current += g;

      if (nextY <= 0 || nextY >= 95) {
        nextY = nextY <= 0 ? 0 : 95;
        playerYRef.current = nextY;
        setPlayerY(nextY);
        handleCrash();
        return;
      }

      playerYRef.current = nextY;
      setPlayerY(nextY);

      const lvl = levelRef.current;
      const speed = getScrollSpeed(lvl);

      setObstacles((prev) => {
        const updated = prev.map((o) => ({ ...o, x: o.x - speed }));
        const passed = updated.filter((o) => o.x <= -10);

        if (passed.length > 0) {
          const added = passed.length * (5 + Math.floor(getDifficulty(lvl) / 1200));
          scoreRef.current += added;
          setScore(scoreRef.current);
          if (scoreRef.current > highScore) {
            setHighScore(scoreRef.current);
            localStorage.setItem('ocean_runner_highscore', scoreRef.current.toString());
          }
          const coins = passed.length * (1 + Math.floor(getDifficulty(lvl) / 3000));
          setEarnedCoins((c) => c + coins);
          onAddCoins(coins);
          checkLevelUp();
        }

        const stillOnScreen = updated.filter((o) => o.x > -10);
        stillOnScreen.forEach((obs) => {
          const dx = Math.abs(obs.x - 25);
          if (dx < 7) {
            const crashed = obs.isTop ? nextY < obs.height : nextY > 100 - obs.height;
            if (crashed) handleCrash();
          }
        });

        return stillOnScreen;
      });

      if (ticksSinceLastObstacle >= getSpawnRate(lvl)) {
        ticksSinceLastObstacle = 0;
        const isTop = Math.random() > 0.5;
        const height = 15 + Math.random() * 25;
        setObstacles((prev) => [...prev, { id: obstacleIdCounter.current++, x: 100, height, isTop }]);
      }
      ticksSinceLastObstacle += 1;

      frameIdRef.current = requestAnimationFrame(tick);
    };

    frameIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, gameOver]);

  useEffect(() => {
    if (hitFlash) {
      const t = setTimeout(() => setHitFlash(false), 220);
      return () => clearTimeout(t);
    }
  }, [hitFlash]);

  const resetGame = () => {
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);
    setObstacles([]);
    setPlayerY(50);
    playerYRef.current = 50;
    velocityRef.current = 0;
    setScore(0);
    scoreRef.current = 0;
    levelStartScoreRef.current = 0;
    setGameOver(false);
    setIsPlaying(false);
    setEarnedCoins(0);
  };

  const lvl = level;
  const progressInLevel = Math.min(1, (score - levelStartScoreRef.current) / pointsNeededForLevel(lvl));

  return (
    <div className="h-full flex flex-col p-4 bg-[#FBF6F1] text-[#2B1F2E] overflow-y-auto" id="runner_game_wrapper">
      <div className="flex items-center justify-between mb-3 shrink-0" id="runner_header">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display font-extrabold text-base tracking-tight text-[#FF6B5D]">Endless Runner</h2>
          <p className="text-[9px] font-bold text-neutral-500 uppercase">Swim & Dodge Nets</p>
        </div>
        <button onClick={resetGame} className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Level progression card — replaces the old free-drag slider */}
      <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3.5 mb-3 shrink-0 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B5D]/10 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-[#FF6B5D]" />
            </div>
            <div>
              <p className="text-[8px] font-black uppercase text-neutral-400 tracking-wider">Current Level</p>
              <p className="text-sm font-black text-[#FF6B5D] leading-tight">
                Level {level} <span className="text-neutral-400 font-bold">/ {MAX_LEVEL}</span>
              </p>
            </div>
          </div>
          <span className="text-[9px] font-black text-neutral-400">
            {level >= MAX_LEVEL ? 'MAX' : `${Math.floor(progressInLevel * 100)}%`}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div className="h-full bg-[#FF6B5D] rounded-full transition-all" style={{ width: `${progressInLevel * 100}%` }} />
        </div>
        <p className="text-[8px] font-bold text-center text-neutral-400 mt-1.5">
          Keep dodging to reach the score target and level up mid-run
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 shrink-0 text-center">
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[8px] font-black uppercase text-neutral-400">Dodge Score</p>
          <p className="text-sm font-black text-[#FF6B5D]">{score}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[8px] font-black uppercase text-neutral-400">High</p>
          <p className="text-sm font-black text-[#6B4E9E]">{highScore}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[8px] font-black uppercase text-neutral-400">Coins</p>
          <p className="text-sm font-black text-[#F5A623]">🪙 {earnedCoins}</p>
        </div>
      </div>

      <motion.div
        key={shakeKey}
        animate={hitFlash ? { x: [0, -6, 6, -4, 4, 0] } : {}}
        transition={{ duration: 0.22 }}
        onClick={handleJump}
        className="flex-1 min-h-[200px] bg-sky-950 border border-neutral-800 rounded-3xl overflow-hidden relative shadow-inner cursor-pointer"
        id="runner_arena"
      >
        {/* Mid-run level up toast */}
        <AnimatePresence>
          {levelUpToast !== null && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.9 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border-2 border-amber/40 rounded-2xl px-4 py-2.5 shadow-lg flex items-center gap-2"
            >
              <PartyPopper className="w-4 h-4 text-amber" />
              <span className="text-xs font-black text-white">Level Up! Now Level {levelUpToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {hitFlash && (
            <motion.div
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0 bg-rose-600 z-30 pointer-events-none"
            />
          )}
        </AnimatePresence>

        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]" />

        {obstacles.map((o) => (
          <div
            key={o.id}
            className="absolute w-8 bg-gradient-to-b from-orange-400 to-orange-600 rounded-xl border border-white/20"
            style={{ left: `${o.x}%`, height: `${o.height}%`, top: o.isTop ? 0 : 'auto', bottom: o.isTop ? 'auto' : 0 }}
          >
            <div className="absolute inset-0 bg-orange-950/20 flex items-center justify-center font-bold text-xs text-white">🐚</div>
          </div>
        ))}

        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              animate={{ opacity: 0, x: Math.cos(p.angle) * p.dist * 3, y: Math.sin(p.angle) * p.dist * 3, scale: 0.3 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute w-2 h-2 rounded-full bg-orange-300 pointer-events-none"
              style={{ left: '25%', top: `${playerY}%` }}
            />
          ))}
        </AnimatePresence>

        <div
          className="absolute w-10 h-8 rounded-full bg-[#FF6B5D] border border-white/40 flex items-center justify-center text-lg shadow-md transition-all duration-75"
          style={{
            left: '25%',
            top: `${playerY}%`,
            transform: `translate(-50%, -50%) rotate(${Math.min(30, Math.max(-30, velocityRef.current * 12))}deg)`,
          }}
        >
          🐋
        </div>

        <AnimatePresence>
          {!isPlaying && !gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#FBF6F1]/95 flex flex-col items-center justify-center p-4 text-center z-20"
            >
              <span className="text-4xl mb-1.5 animate-bounce">🐋</span>
              <h3 className="font-display font-black text-sm text-[#2B1F2E] mb-1">Deep Sea Endless Swimmer</h3>
              <p className="text-[10px] text-neutral-500 max-w-[200px] leading-snug mb-3">
                Tap anywhere inside the screen frame to swim upwards. Hit the score target to level up as you go!
              </p>
              <button
                onClick={handleJump}
                className="px-5 py-2.5 bg-[#FF6B5D] text-white font-display font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Start Swimming
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
              <span className="text-4xl mb-1">💥</span>
              <h3 className="font-display font-black text-sm text-[#C94A3D] mb-1">Crashed into Coral!</h3>
              <p className="text-[10px] text-neutral-600 mb-1">
                Final Swam distance: <strong className="text-lg font-black">{score}</strong> meters
              </p>
              <p className="text-[9px] text-neutral-400 mb-3">Reached Level {level}</p>
              <div className="flex gap-2">
                <button
                  onClick={resetGame}
                  className="px-4 py-2 bg-[#FF6B5D] text-white font-display font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Swim Again
                </button>
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-white border border-[#EDE4DC] text-neutral-600 font-display font-black text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {isPlaying && (
        <button
          onClick={handleJump}
          className="mt-3 py-3.5 bg-[#FF6B5D] text-white text-xs font-black uppercase rounded-2xl shadow-md cursor-pointer flex items-center justify-center gap-1 active:scale-98 transition-transform"
          id="runner_manual_jump_btn"
        >
          <ChevronUp className="w-4 h-4 animate-bounce" /> SWIM UPWARDS
        </button>
      )}

      <div className="mt-3 text-center text-[10px] text-neutral-400 font-bold">
        ℹ️ Your level carries over between runs — pick up right where you left off!
      </div>
    </div>
  );
}
