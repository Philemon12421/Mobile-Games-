import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Star, Compass, Trophy, Lock, Sparkles, Coins } from 'lucide-react';

interface PocketPoolProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

interface Ball {
  id: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  vx: number;
  vy: number;
  color: string;
  isCue: boolean;
  pocketed: boolean;
  emoji?: string;
}

interface Obstacle {
  x: number;
  y: number;
  r: number;
}

const LEVEL_CONFIGS: Record<number, {
  name: string;
  desc: string;
  friction: number;
  shots: number;
  obstacles: Obstacle[];
  baseCoins: number;
  balls: { id: string; x: number; y: number; color: string; isCue: boolean; emoji?: string }[];
}> = {
  0: {
    name: "Shallow Reef",
    desc: "Single oyster shell target. Learn the angle of attacks.",
    friction: 0.976,
    shots: 6,
    obstacles: [],
    baseCoins: 40,
    balls: [
      { id: 'cue', x: 25, y: 50, color: '#FFFFFF', isCue: true },
      { id: 'b1', x: 75, y: 50, color: '#FF6B5D', isCue: false, emoji: '🐚' },
    ]
  },
  1: {
    name: "Clam Cascade",
    desc: "Three target shells. Physics felt has become slightly slicker.",
    friction: 0.98,
    shots: 6,
    obstacles: [],
    baseCoins: 80,
    balls: [
      { id: 'cue', x: 25, y: 50, color: '#FFFFFF', isCue: true },
      { id: 'b1', x: 70, y: 50, color: '#FF6B5D', isCue: false, emoji: '🐚' },
      { id: 'b2', x: 76, y: 44, color: '#F5A623', isCue: false, emoji: '🐚' },
      { id: 'b3', x: 76, y: 56, color: '#6B4E9E', isCue: false, emoji: '🐚' },
    ]
  },
  2: {
    name: "Coral Barrier",
    desc: "A massive solid coral obstacle blocks the center shot.",
    friction: 0.982,
    shots: 6,
    obstacles: [{ x: 50, y: 50, r: 8 }],
    baseCoins: 120,
    balls: [
      { id: 'cue', x: 20, y: 50, color: '#FFFFFF', isCue: true },
      { id: 'b1', x: 75, y: 50, color: '#FF6B5D', isCue: false, emoji: '🐚' },
      { id: 'b2', x: 81, y: 43, color: '#F5A623', isCue: false, emoji: '🐚' },
      { id: 'b3', x: 81, y: 57, color: '#6B4E9E', isCue: false, emoji: '🐚' },
    ]
  },
  3: {
    name: "Lagoon Swirl",
    desc: "Two spinning whirlpool currents deflect your trajectory.",
    friction: 0.984,
    shots: 6,
    obstacles: [{ x: 50, y: 30, r: 6 }, { x: 50, y: 70, r: 6 }],
    baseCoins: 180,
    balls: [
      { id: 'cue', x: 20, y: 50, color: '#FFFFFF', isCue: true },
      { id: 'b1', x: 72, y: 50, color: '#FF6B5D', isCue: false, emoji: '🐚' },
      { id: 'b2', x: 78, y: 44, color: '#F5A623', isCue: false, emoji: '🐚' },
      { id: 'b3', x: 78, y: 56, color: '#6B4E9E', isCue: false, emoji: '🐚' },
      { id: 'b4', x: 84, y: 38, color: '#3D9BE9', isCue: false, emoji: '🐚' },
      { id: 'b5', x: 84, y: 62, color: '#2ECC71', isCue: false, emoji: '🐚' },
    ]
  },
  4: {
    name: "Bermuda Vortex",
    desc: "Slick underwater ice felt and three gravitational whirlpools.",
    friction: 0.987,
    shots: 5,
    obstacles: [{ x: 40, y: 50, r: 7 }, { x: 65, y: 25, r: 5 }, { x: 65, y: 75, r: 5 }],
    baseCoins: 280,
    balls: [
      { id: 'cue', x: 20, y: 50, color: '#FFFFFF', isCue: true },
      { id: 'b1', x: 75, y: 50, color: '#FF6B5D', isCue: false, emoji: '🐚' },
      { id: 'b2', x: 81, y: 44, color: '#F5A623', isCue: false, emoji: '🐚' },
      { id: 'b3', x: 81, y: 56, color: '#6B4E9E', isCue: false, emoji: '🐚' },
      { id: 'b4', x: 87, y: 38, color: '#3D9BE9', isCue: false, emoji: '🐚' },
      { id: 'b5', x: 87, y: 62, color: '#2ECC71', isCue: false, emoji: '🐚' },
    ]
  },
  5: {
    name: "Neptune's Scepter",
    desc: "The ultimate 3D layout. 7 diamond rack target shells.",
    friction: 0.99,
    shots: 5,
    obstacles: [{ x: 50, y: 50, r: 8 }, { x: 35, y: 25, r: 5 }, { x: 35, y: 75, r: 5 }, { x: 70, y: 50, r: 5 }],
    baseCoins: 450,
    balls: [
      { id: 'cue', x: 15, y: 50, color: '#FFFFFF', isCue: true },
      { id: 'b1', x: 74, y: 50, color: '#FF6B5D', isCue: false, emoji: '🐚' },
      { id: 'b2', x: 79, y: 45, color: '#F5A623', isCue: false, emoji: '🐚' },
      { id: 'b3', x: 79, y: 55, color: '#6B4E9E', isCue: false, emoji: '🐚' },
      { id: 'b4', x: 84, y: 40, color: '#3D9BE9', isCue: false, emoji: '🐚' },
      { id: 'b5', x: 84, y: 60, color: '#2ECC71', isCue: false, emoji: '🐚' },
      { id: 'b6', x: 89, y: 50, color: '#E74C3C', isCue: false, emoji: '🐚' },
    ]
  }
};

const getLevelConfig = (lvl: number) => {
  if (LEVEL_CONFIGS[lvl]) return LEVEL_CONFIGS[lvl];
  // Procedural levels
  const baseCoins = 450 + (lvl - 5) * 60;
  const shots = lvl % 2 === 0 ? 5 : 6;
  const friction = Math.min(0.994, 0.99 + (lvl - 5) * 0.0004);
  const obstacles: Obstacle[] = [];
  const obstacleCount = Math.min(5, 3 + (lvl % 3));
  for (let i = 0; i < obstacleCount; i++) {
    obstacles.push({
      x: 38 + Math.sin(i * 1.6) * 16,
      y: 25 + (i * 18) % 55,
      r: 4.5 + (i % 2)
    });
  }
  const balls: { id: string; x: number; y: number; color: string; isCue: boolean; emoji?: string }[] = [
    { id: 'cue', x: 15, y: 50, color: '#FFFFFF', isCue: true },
  ];
  const ballCount = Math.min(8, 4 + (lvl % 5));
  for (let i = 0; i < ballCount; i++) {
    balls.push({
      id: `b${i}`,
      x: 70 + Math.floor(i / 3) * 6,
      y: 40 + (i % 3) * 8,
      color: ['#FF6B5D', '#F5A623', '#6B4E9E', '#3D9BE9', '#2ECC71', '#E74C3C', '#9B59B6', '#1ABC9C'][i % 8],
      isCue: false,
      emoji: '🐚'
    });
  }
  return {
    name: `Deep Trench ${lvl}`,
    desc: `Abyssal ocean challenge Level ${lvl} with zero friction currents.`,
    friction,
    shots,
    obstacles,
    baseCoins,
    balls
  };
};

function CelebrationParticles({ level }: { level: number }) {
  const count = level >= 5 ? 65 : level >= 3 ? 35 : level >= 1 ? 20 : 10;
  const items = ['✨', '🪙', '🐚', '🫧', '💎', '🎉', '🌟'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(count)].map((_, i) => {
        const size = Math.random() * 16 + 10;
        const left = Math.random() * 100;
        const delay = Math.random() * 2.5;
        const duration = Math.random() * 2.5 + 2;
        const emoji = items[i % (level >= 5 ? items.length : level >= 3 ? 5 : 3)];
        return (
          <motion.div
            key={i}
            initial={{ y: '110%', opacity: 0, scale: 0.3 }}
            animate={{
              y: '-15%',
              opacity: [0, 1, 1, 0],
              scale: [0.3, 1.3, 1, 0.7],
              rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)]
            }}
            transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
            className="absolute flex items-center justify-center filter drop-shadow-md text-sm"
            style={{ left: `${left}%`, bottom: '0%', fontSize: `${size}px` }}
          >
            {emoji}
          </motion.div>
        );
      })}
    </div>
  );
}

export default function PocketPool({ onBack, userProgress, onAddCoins }: PocketPoolProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [unlockedLevel, setUnlockedLevel] = useState(0);
  const [shotsLeft, setShotsLeft] = useState(6);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [victoryLevelCleared, setVictoryLevelCleared] = useState<number | null>(null);

  // Shoot controls
  const [aimAngle, setAimAngle] = useState(0);
  const [strikePower, setStrikePower] = useState(50);

  // Simulation state
  const [balls, setBalls] = useState<Ball[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  const frameIdRef = useRef<number | null>(null);

  const pockets = [
    { x: 5, y: 5 },
    { x: 95, y: 5 },
    { x: 5, y: 95 },
    { x: 95, y: 95 },
    { x: 50, y: 4 },
    { x: 50, y: 96 },
  ];

  // Load level and highscore from cache
  useEffect(() => {
    const savedUnlocked = localStorage.getItem('ocean_pool_unlocked_level');
    const parsed = savedUnlocked ? parseInt(savedUnlocked, 10) : 0;
    setUnlockedLevel(parsed);
    setCurrentLevel(parsed);

    const savedHigh = localStorage.getItem('ocean_pool_highscore');
    if (savedHigh) setHighScore(parseInt(savedHigh, 10));
  }, []);

  const initTable = (selectedLvl = currentLevel) => {
    const config = getLevelConfig(selectedLvl);
    const list: Ball[] = config.balls.map((b) => ({
      ...b,
      vx: 0,
      vy: 0,
      pocketed: false
    }));

    setBalls(list);
    setObstacles(config.obstacles);
    setShotsLeft(config.shots);
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
    setEarnedCoins(0);
    setVictoryLevelCleared(null);
  };

  useEffect(() => {
    if (currentLevel !== undefined) {
      initTable(currentLevel);
    }
  }, [currentLevel]);

  const handleStrike = () => {
    if (shotsLeft <= 0 || gameOver) return;
    const moving = balls.some((b) => Math.abs(b.vx) > 0.05 || Math.abs(b.vy) > 0.05);
    if (moving) return;

    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(35, userProgress.hapticEnabled);
    setShotsLeft((s) => s - 1);

    const radians = (aimAngle * Math.PI) / 180;
    const speedMultiplier = strikePower / 15;
    const vx = Math.cos(radians) * speedMultiplier;
    const vy = Math.sin(radians) * speedMultiplier;

    setBalls((prev) =>
      prev.map((b) => (b.isCue ? { ...b, vx, vy } : b))
    );
  };

  // Main simulation physics loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const tick = () => {
      setBalls((prevBalls) => {
        const config = getLevelConfig(currentLevel);
        const f = config.friction;

        let updated = prevBalls.map((b) => {
          if (b.pocketed) return b;

          let nvx = b.vx * f;
          let nvy = b.vy * f;
          if (Math.abs(nvx) < 0.012) nvx = 0;
          if (Math.abs(nvy) < 0.012) nvy = 0;

          let nx = b.x + nvx;
          let ny = b.y + nvy;

          const r = 3; // ball boundary offset %
          if (nx <= r || nx >= 100 - r) {
            nvx = -nvx * 0.88;
            nx = nx <= r ? r : 100 - r;
            playSound('tap', userProgress.soundEnabled);
          }
          if (ny <= r || ny >= 100 - r) {
            nvy = -nvy * 0.88;
            ny = ny <= r ? r : 100 - r;
            playSound('tap', userProgress.soundEnabled);
          }

          return { ...b, x: nx, y: ny, vx: nvx, vy: nvy };
        });

        // Ball collisions
        for (let i = 0; i < updated.length; i++) {
          for (let j = i + 1; j < updated.length; j++) {
            const b1 = updated[i];
            const b2 = updated[j];
            if (b1.pocketed || b2.pocketed) continue;

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 5.8) {
              playSound('slide', userProgress.soundEnabled);
              triggerHaptic(15, userProgress.hapticEnabled);

              const nx = dx / dist;
              const ny = dy / dist;
              const kx = b1.vx - b2.vx;
              const ky = b1.vy - b2.vy;
              const p = (kx * nx + ky * ny);

              updated[i] = {
                ...b1,
                vx: b1.vx - p * nx,
                vy: b1.vy - p * ny,
                x: b1.x - nx * 0.25,
                y: b1.y - ny * 0.25
              };
              updated[j] = {
                ...b2,
                vx: b2.vx + p * nx,
                vy: b2.vy + p * ny,
                x: b2.x + nx * 0.25,
                y: b2.y + ny * 0.25
              };
            }
          }
        }

        // Obstacles collisions (whirlpools)
        obstacles.forEach((obs) => {
          updated = updated.map((b) => {
            if (b.pocketed) return b;
            const dx = b.x - obs.x;
            const dy = b.y - obs.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < obs.r + 3) {
              playSound('lose', userProgress.soundEnabled);
              const nx = dx / dist;
              const ny = dy / dist;
              return {
                ...b,
                vx: -b.vx * 0.85,
                vy: -b.vy * 0.85,
                x: obs.x + nx * (obs.r + 3.1),
                y: obs.y + ny * (obs.r + 3.1)
              };
            }
            return b;
          });
        });

        // Check pockets
        updated = updated.map((b) => {
          if (b.pocketed) return b;
          const isNearPocket = pockets.some((p) => {
            const dx = b.x - p.x;
            const dy = b.y - p.y;
            return Math.sqrt(dx * dx + dy * dy) < 5.8;
          });

          if (isNearPocket) {
            playSound('win', userProgress.soundEnabled);
            triggerHaptic(30, userProgress.hapticEnabled);

            if (b.isCue) {
              // Scratch -> respawn on starting spot
              return { ...b, x: 25, y: 50, vx: 0, vy: 0, pocketed: false };
            } else {
              setScore((s) => {
                const added = 100 + currentLevel * 10;
                const next = s + added;
                if (next > highScore) {
                  setHighScore(next);
                  localStorage.setItem('ocean_pool_highscore', next.toString());
                }
                return next;
              });

              // Pocket score coins
              const pocketCoins = 10 + currentLevel * 2;
              setEarnedCoins((c) => c + pocketCoins);
              onAddCoins(pocketCoins);

              return { ...b, pocketed: true, vx: 0, vy: 0 };
            }
          }
          return b;
        });

        // Check Victory
        const allTargetsPocketed = updated.filter((b) => !b.isCue).every((b) => b.pocketed);
        if (allTargetsPocketed && !gameOver) {
          setGameOver(true);
          setIsPlaying(false);
          playSound('win', userProgress.soundEnabled);

          // Massive celebration rewards scale based on level
          const config = getLevelConfig(currentLevel);
          const completionBonus = config.baseCoins + shotsLeft * 15 * (currentLevel + 1);

          setEarnedCoins((prev) => prev + completionBonus);
          onAddCoins(completionBonus);
          setVictoryLevelCleared(currentLevel);

          if (currentLevel === unlockedLevel) {
            const nextLvl = currentLevel + 1;
            setUnlockedLevel(nextLvl);
            localStorage.setItem('ocean_pool_unlocked_level', nextLvl.toString());
          }
        }

        return updated;
      });

      frameIdRef.current = requestAnimationFrame(tick);
    };

    frameIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    };
  }, [isPlaying, gameOver, currentLevel, obstacles, shotsLeft]);

  // Handle lose condition
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    const moving = balls.some((b) => Math.abs(b.vx) > 0.05 || Math.abs(b.vy) > 0.05);
    const targetLeft = balls.filter((b) => !b.isCue && !b.pocketed).length;

    if (shotsLeft === 0 && !moving && targetLeft > 0) {
      setGameOver(true);
      setIsPlaying(false);
      playSound('lose', userProgress.soundEnabled);
    }
  }, [shotsLeft, balls, isPlaying]);

  const isMoving = balls.some((b) => Math.abs(b.vx) > 0.05 || Math.abs(b.vy) > 0.05);
  const cueBall = balls.find((b) => b.isCue && !b.pocketed);

  return (
    <div className="h-full flex flex-col p-4 bg-[#0a1128] text-white overflow-y-auto" id="pool_game_wrapper">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 shrink-0" id="pool_header">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors shadow"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-300" />
        </button>
        <div className="text-center">
          <h2 className="font-display font-extrabold text-base tracking-tight text-amber-400">Pocket Pool 3D</h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Natural Physics Campaign</p>
        </div>
        <button
          onClick={() => initTable(currentLevel)}
          className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors shadow"
        >
          <RotateCcw className="w-4 h-4 text-neutral-300" />
        </button>
      </div>

      {/* Levels Timeline Map */}
      <div className="mb-3 bg-slate-900/60 border border-slate-800 rounded-xl p-2 shrink-0">
        <div className="flex justify-between items-center px-1 mb-1.5">
          <span className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> Campaign Path
          </span>
          <span className="text-[9px] font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full">
            Unlocked: Level {unlockedLevel}
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-slate-700/50" id="level_timeline">
          {Array.from({ length: Math.max(6, unlockedLevel + 2) }).map((_, idx) => {
            const isUnlocked = idx <= unlockedLevel;
            const isActive = idx === currentLevel;
            const config = getLevelConfig(idx);
            return (
              <button
                key={idx}
                disabled={!isUnlocked}
                onClick={() => {
                  playSound('tap', userProgress.soundEnabled);
                  setCurrentLevel(idx);
                }}
                className={`flex-shrink-0 flex flex-col items-center justify-between p-2 rounded-xl border transition-all duration-200 min-w-[76px] h-[72px] text-center shadow-sm ${
                  isActive
                    ? 'bg-amber-400/20 border-amber-400 text-white scale-102 ring-2 ring-amber-400/30'
                    : isUnlocked
                    ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
                    : 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="text-[8px] font-black uppercase tracking-wider">Lvl {idx}</div>
                <div className="text-xs">
                  {isUnlocked ? (
                    idx < unlockedLevel ? (
                      <span className="text-emerald-400">🏆</span>
                    ) : (
                      <span className="text-amber-400">⭐</span>
                    )
                  ) : (
                    <span className="text-slate-500"><Lock className="w-3 h-3 mx-auto" /></span>
                  )}
                </div>
                <div className="text-[8px] font-bold truncate w-14 text-slate-300">{config.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-4 gap-2 mb-3 shrink-0 text-center">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2">
          <p className="text-[8px] font-bold uppercase text-slate-400">Shots Left</p>
          <p className="text-sm font-black text-rose-400">{shotsLeft}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2">
          <p className="text-[8px] font-bold uppercase text-slate-400">Score</p>
          <p className="text-sm font-black text-amber-400">{score}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2">
          <p className="text-[8px] font-bold uppercase text-slate-400">High Score</p>
          <p className="text-sm font-black text-slate-300">{highScore}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2">
          <p className="text-[8px] font-bold uppercase text-slate-400">Gained Coins</p>
          <p className="text-sm font-black text-yellow-400">🪙 {earnedCoins}</p>
        </div>
      </div>

      {/* 3D Pool Table Frame */}
      <div className="flex-1 min-h-[220px] bg-slate-900 border-4 border-slate-800 rounded-3xl relative p-3 shadow-2xl flex items-center justify-center">
        {/* Felt layout */}
        <div
          className="relative w-full aspect-[2/1] rounded-2xl relative overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(circle at center, #075e41 0%, #033c2a 100%)',
            boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.95), 0 20px 40px rgba(0,0,0,0.75)',
            border: '14px solid #3c1e10',
          }}
          id="pool_felt_table"
        >
          {/* Subtle wooden frame diamond sights */}
          <div className="absolute top-1 left-[25%] w-1 h-1 bg-amber-100 rounded-full opacity-50 pointer-events-none" />
          <div className="absolute top-1 left-[50%] w-1 h-1 bg-amber-100 rounded-full opacity-50 pointer-events-none" />
          <div className="absolute top-1 left-[75%] w-1 h-1 bg-amber-100 rounded-full opacity-50 pointer-events-none" />
          <div className="absolute bottom-1 left-[25%] w-1 h-1 bg-amber-100 rounded-full opacity-50 pointer-events-none" />
          <div className="absolute bottom-1 left-[50%] w-1 h-1 bg-amber-100 rounded-full opacity-50 pointer-events-none" />
          <div className="absolute bottom-1 left-[75%] w-1 h-1 bg-amber-100 rounded-full opacity-50 pointer-events-none" />

          {/* Corner and Side Pockets */}
          {pockets.map((p, idx) => (
            <div
              key={idx}
              className="absolute w-7 h-7 bg-black rounded-full border-2 border-[#502e1a] shadow-[inset_0_4px_8px_rgba(0,0,0,0.9)] z-10"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}

          {/* Level Whirlpools */}
          {obstacles.map((obs, idx) => (
            <div
              key={idx}
              className="absolute bg-sky-950/40 rounded-full border border-dashed border-sky-400 flex items-center justify-center animate-spin pointer-events-none"
              style={{
                left: `${obs.x}%`,
                top: `${obs.y}%`,
                width: `${obs.r * 2}%`,
                height: `${obs.r * 2}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <span className="text-[10px] text-sky-300 opacity-70">🌀</span>
            </div>
          ))}

          {/* Aim Guide Line */}
          {!isMoving && cueBall && (
            <div
              className="absolute origin-left border-t border-dashed border-white/60 pointer-events-none h-0 z-10"
              style={{
                left: `${cueBall.x}%`,
                top: `${cueBall.y}%`,
                width: '180px',
                transform: `rotate(${aimAngle}deg)`,
                filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.7))'
              }}
            />
          )}

          {/* 3D Render Balls */}
          {balls.map((b) => {
            if (b.pocketed) return null;
            return (
              <div
                key={b.id}
                className="absolute w-5.5 h-5.5 rounded-full flex items-center justify-center font-bold text-white z-20"
                style={{
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  width: '22px',
                  height: '22px',
                  background: b.isCue
                    ? 'radial-gradient(circle at 35% 35%, #ffffff 0%, #e1e1e1 60%, #999999 100%)'
                    : `radial-gradient(circle at 35% 35%, #ffffff 0%, ${b.color} 50%, rgba(0,0,0,0.95) 100%)`,
                  boxShadow: '1.5px 3px 5px rgba(0,0,0,0.65)',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {b.emoji ? (
                  <span className="text-xs filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">{b.emoji}</span>
                ) : (
                  !b.isCue && (
                    <span className="opacity-80 font-mono text-[7px] text-center">
                      {b.id.replace('b', '')}
                    </span>
                  )
                )}
              </div>
            );
          })}

          {/* Animated physical wooden Cue Stick */}
          {!isMoving && cueBall && (
            <div
              className="absolute pointer-events-none z-30"
              style={{
                left: `${cueBall.x}%`,
                top: `${cueBall.y}%`,
                transform: `rotate(${aimAngle}deg)`,
                width: '100%',
                height: '100%',
              }}
            >
              <div
                className="absolute rounded shadow-lg transition-all duration-100"
                style={{
                  left: `-${24 + strikePower * 0.28}px`,
                  top: '-4px',
                  width: '140px',
                  height: '8px',
                  transform: 'scaleX(-1)',
                  transformOrigin: 'right center',
                  background: 'linear-gradient(to right, #fef3c7 0%, #b45309 30%, #78350f 70%, #411d08 100%)',
                  borderLeft: '4px solid #ffffff',
                  borderRight: '12px solid #eab308',
                  boxShadow: '0 3px 6px rgba(0,0,0,0.5)',
                }}
              />
            </div>
          )}

          {/* Defeat Screen (Out of Shots) */}
          <AnimatePresence>
            {gameOver && victoryLevelCleared === null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center z-40 rounded-xl"
              >
                <span className="text-3xl mb-1.5 animate-bounce">🌊</span>
                <h3 className="font-display font-black text-sm text-rose-400 uppercase tracking-wide">
                  Out of Shots!
                </h3>
                <p className="text-[10px] text-slate-400 mb-3 max-w-[200px]">
                  Failed to sink all oyster shells. Try studying your angles!
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => initTable(currentLevel)}
                    className="px-4 py-2 bg-amber-500 text-slate-950 font-display font-black text-xs rounded-xl shadow cursor-pointer hover:bg-amber-400 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={onBack}
                    className="px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 font-display font-bold text-xs rounded-xl cursor-pointer hover:bg-slate-700"
                  >
                    Exit
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Celebration Level Cleared Screen */}
          <AnimatePresence>
            {victoryLevelCleared !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center z-40 rounded-xl overflow-hidden"
              >
                <CelebrationParticles level={victoryLevelCleared} />

                <motion.div
                  initial={{ scale: 0.85, y: 30 }}
                  animate={{ scale: 1, y: 0 }}
                  className={`max-w-[240px] w-full p-4 bg-gradient-to-b ${
                    victoryLevelCleared >= 5
                      ? 'from-amber-950 to-slate-950 border-amber-400 shadow-amber-500/20'
                      : victoryLevelCleared >= 3
                      ? 'from-purple-950 to-slate-950 border-purple-500 shadow-purple-500/20'
                      : 'from-emerald-950 to-slate-950 border-emerald-500'
                  } border rounded-2xl shadow-xl relative z-10`}
                >
                  <span className="text-4xl mb-1.5 block animate-bounce">
                    {victoryLevelCleared >= 5 ? '👑' : victoryLevelCleared >= 3 ? '🏆' : '✨'}
                  </span>

                  <h3 className={`font-display font-black text-sm uppercase tracking-wider ${
                    victoryLevelCleared >= 5 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {victoryLevelCleared >= 5 ? "Neptune Clear!" : "Level Clear!"}
                  </h3>

                  <p className="text-[9px] text-slate-300 font-bold mb-3 italic">
                    "{getLevelConfig(victoryLevelCleared).name}"
                  </p>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 mb-4 text-[9px] text-slate-300 space-y-1 text-left">
                    <div className="flex justify-between">
                      <span>Clear Base:</span>
                      <span className="text-amber-400 font-bold">🪙 {getLevelConfig(victoryLevelCleared).baseCoins}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shots Rem. Bonus:</span>
                      <span className="text-emerald-400 font-bold">+{shotsLeft * 15 * (victoryLevelCleared + 1)}</span>
                    </div>
                    <div className="h-px bg-slate-800 my-1" />
                    <div className="flex justify-between font-black text-white text-xs">
                      <span>Total Reward:</span>
                      <span className="text-amber-300">🪙 {earnedCoins}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => {
                        playSound('tap', userProgress.soundEnabled);
                        const next = victoryLevelCleared + 1;
                        setCurrentLevel(next);
                      }}
                      className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-display font-black text-[10px] uppercase rounded-xl hover:scale-102 transition-transform cursor-pointer"
                    >
                      Next Level {victoryLevelCleared + 1} ➔
                    </button>
                    <button
                      onClick={() => {
                        playSound('tap', userProgress.soundEnabled);
                        initTable(victoryLevelCleared);
                      }}
                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 font-display font-bold text-[9px] rounded-xl"
                    >
                      Replay Level
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Aim & Striking Panel */}
      <div className="mt-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-3 shadow space-y-3 shrink-0">
        <div>
          <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-slate-300">
            <span className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-amber-400" /> Cue Stick Angle
            </span>
            <span className="text-amber-400 font-mono">{aimAngle}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={aimAngle}
            onChange={(e) => setAimAngle(parseInt(e.target.value, 10))}
            className="w-full accent-amber-400 h-1.5 bg-slate-850 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-slate-300">
            <span>⚡ Strike Power</span>
            <span className="text-rose-400 font-mono">{strikePower}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={strikePower}
            onChange={(e) => setStrikePower(parseInt(e.target.value, 10))}
            className="w-full accent-rose-400 h-1.5 bg-slate-850 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <button
          onClick={handleStrike}
          disabled={isMoving}
          className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-xs font-black uppercase rounded-xl shadow-md cursor-pointer hover:opacity-90 active:scale-98 transition-transform disabled:opacity-40"
        >
          {isMoving ? "BALLS IN MOTION..." : "STRIKE CUE BALL 🎱"}
        </button>
      </div>
    </div>
  );
}
