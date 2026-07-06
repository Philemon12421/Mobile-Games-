import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Play, Pause, Shield, Zap, Swords, Flame, Trophy, PartyPopper } from 'lucide-react';

interface AirplaneShooterProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  double: boolean;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  size: number;
  emoji: string;
  points: number;
  boss?: boolean;
}

interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: 'double' | 'shield' | 'nuke';
  emoji: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  dist: number;
  color: string;
}

const ENEMY_TIERS = [
  { emoji: '🛩️', hp: 1, speed: 20, size: 22, points: 10 },
  { emoji: '🚁', hp: 2, speed: 25, size: 24, points: 20 },
  { emoji: '🛸', hp: 3, speed: 32, size: 28, points: 30 },
  { emoji: '👾', hp: 4, speed: 18, size: 34, points: 50 },
];

const PARTICLE_COLORS = ['#facc15', '#fb923c', '#f87171', '#fde047'];

export default function AirplaneShooter({ onBack, userProgress, onAddCoins }: AirplaneShooterProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [playerX, setPlayerX] = useState(50);
  const [hasShield, setHasShield] = useState(false);
  const [doubleShotActive, setDoubleShotActive] = useState(false);
  const [doubleShotTimer, setDoubleShotTimer] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [hitFlash, setHitFlash] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [levelUpToast, setLevelUpToast] = useState<number | null>(null);

  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [powerups, setPowerups] = useState<PowerUp[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Refs mirror fast-changing state so the game loop never needs to restart.
  const playerXRef = useRef(50);
  const hasShieldRef = useRef(false);
  const doubleShotActiveRef = useRef(false);
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const pausedRef = useRef(false);
  const bossSpawnedForLevelRef = useRef(0);
  const comboResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const frameIdRef = useRef<number | null>(null);
  const bulletIdCounter = useRef(0);
  const enemyIdCounter = useRef(0);
  const powerupIdCounter = useRef(0);
  const particleIdCounter = useRef(0);
  const lastSpawnTimeRef = useRef(0);
  const lastPowerupSpawnTimeRef = useRef(0);
  const arenaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { playerXRef.current = playerX; }, [playerX]);
  useEffect(() => { hasShieldRef.current = hasShield; }, [hasShield]);
  useEffect(() => { doubleShotActiveRef.current = doubleShotActive; }, [doubleShotActive]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);

  useEffect(() => {
    const saved = localStorage.getItem('ocean_air_shooter_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const spawnParticles = useCallback((x: number, y: number, count = 8) => {
    const newOnes: Particle[] = Array.from({ length: count }, () => ({
      id: particleIdCounter.current++,
      x,
      y,
      angle: Math.random() * Math.PI * 2,
      dist: 6 + Math.random() * 14,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    }));
    setParticles((prev) => [...prev, ...newOnes]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newOnes.find((n) => n.id === p.id)));
    }, 500);
  }, []);

  const registerHit = useCallback(() => {
    if (hasShieldRef.current) {
      setHasShield(false);
      hasShieldRef.current = false;
      playSound('tap', userProgress.soundEnabled);
      return;
    }
    playSound('lose', userProgress.soundEnabled);
    triggerHaptic(45, userProgress.hapticEnabled);
    setHitFlash(true);
    setShakeKey((k) => k + 1);
    setCombo(0);
    setTimeout(() => setHitFlash(false), 220);
    setLives((l) => {
      const next = l - 1;
      if (next <= 0) {
        setGameOver(true);
        setIsPlaying(false);
      }
      return Math.max(0, next);
    });
  }, [userProgress.soundEnabled, userProgress.hapticEnabled]);

  const registerKill = useCallback((enemy: Enemy) => {
    playSound('win', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);
    spawnParticles(enemy.x, enemy.y, enemy.boss ? 16 : 8);

    setCombo((c) => {
      const nextCombo = c + 1;
      setBestCombo((b) => Math.max(b, nextCombo));
      if (comboResetTimeoutRef.current) clearTimeout(comboResetTimeoutRef.current);
      comboResetTimeoutRef.current = setTimeout(() => setCombo(0), 2500);

      const comboMultiplier = 1 + Math.floor(nextCombo / 5) * 0.5;
      const pointsWon = Math.round(enemy.points * comboMultiplier);
      const coinsWon = Math.max(1, Math.ceil(pointsWon / 10));

      scoreRef.current += pointsWon;
      setScore(scoreRef.current);
      if (scoreRef.current > highScore) {
        setHighScore(scoreRef.current);
        localStorage.setItem('ocean_air_shooter_highscore', scoreRef.current.toString());
      }

      const newLevel = Math.min(15, Math.floor(scoreRef.current / 200) + 1);
      setLevel((l) => {
        if (newLevel > l) {
          setLevelUpToast(newLevel);
          setTimeout(() => setLevelUpToast(null), 2200);
          return newLevel;
        }
        return l;
      });

      setEarnedCoins((c2) => c2 + coinsWon);
      onAddCoins(coinsWon);

      return nextCombo;
    });
  }, [highScore, onAddCoins, spawnParticles, userProgress.soundEnabled, userProgress.hapticEnabled]);

  const movePlayer = (direction: 'LEFT' | 'RIGHT') => {
    if (!isPlaying || gameOver || isPaused) return;
    triggerHaptic(5, userProgress.hapticEnabled);
    setPlayerX((x) => {
      const step = 8;
      const nextX = direction === 'LEFT' ? x - step : x + step;
      return Math.max(5, Math.min(95, nextX));
    });
  };

  const handleArenaPointer = (clientX: number) => {
    if (!isPlaying || gameOver || isPaused || !arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPlayerX(Math.max(5, Math.min(95, pct)));
  };

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') movePlayer('LEFT');
      else if (e.key === 'ArrowRight' || e.key === 'd') movePlayer('RIGHT');
      else if (e.key === 'p' || e.key === 'P') setIsPaused((p) => (isPlaying && !gameOver ? !p : p));
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isPlaying, gameOver, isPaused]);

  // Double-shot countdown
  useEffect(() => {
    if (!isPlaying || gameOver || isPaused) return;
    if (doubleShotTimer > 0) {
      const interval = setInterval(() => {
        setDoubleShotTimer((t) => {
          if (t <= 1) {
            setDoubleShotActive(false);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, gameOver, isPaused, doubleShotTimer]);

  // Auto-fire loop — reads refs, so it never needs to restart on player movement
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const fireInterval = setInterval(() => {
      if (pausedRef.current) return;
      playSound('tap', userProgress.soundEnabled);
      triggerHaptic(6, userProgress.hapticEnabled);
      const x = playerXRef.current;

      if (doubleShotActiveRef.current) {
        setBullets((prev) => [
          ...prev,
          { id: bulletIdCounter.current++, x: x - 3, y: 80, double: true },
          { id: bulletIdCounter.current++, x: x + 3, y: 80, double: true },
        ]);
      } else {
        setBullets((prev) => [...prev, { id: bulletIdCounter.current++, x, y: 80, double: false }]);
      }
    }, 280);

    return () => clearInterval(fireInterval);
  }, [isPlaying, gameOver, userProgress.soundEnabled, userProgress.hapticEnabled]);

  // Core game loop — starts once per play session, stops on game over
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    let lastTick = Date.now();

    const tick = () => {
      const now = Date.now();
      const delta = Math.min(0.05, (now - lastTick) / 1000);
      lastTick = now;

      if (pausedRef.current) {
        frameIdRef.current = requestAnimationFrame(tick);
        return;
      }

      const px = playerXRef.current;

      setBullets((prev) => prev.map((b) => ({ ...b, y: b.y - 120 * delta })).filter((b) => b.y > 0));

      setPowerups((prev) => {
        let updated = prev.map((pu) => ({ ...pu, y: pu.y + 25 * delta }));
        const pickedUp = updated.filter((pu) => Math.hypot(px - pu.x, 85 - pu.y) < 8);

        if (pickedUp.length > 0) {
          playSound('win', userProgress.soundEnabled);
          triggerHaptic(25, userProgress.hapticEnabled);
          pickedUp.forEach((pu) => {
            if (pu.type === 'double') {
              setDoubleShotActive(true);
              doubleShotActiveRef.current = true;
              setDoubleShotTimer(10);
            } else if (pu.type === 'shield') {
              setHasShield(true);
              hasShieldRef.current = true;
            } else if (pu.type === 'nuke') {
              setEnemies((currentEnemies) => {
                currentEnemies.forEach((e) => spawnParticles(e.x, e.y, 6));
                const bounty = currentEnemies.length * 10;
                scoreRef.current += bounty;
                setScore(scoreRef.current);
                if (scoreRef.current > highScore) {
                  setHighScore(scoreRef.current);
                  localStorage.setItem('ocean_air_shooter_highscore', scoreRef.current.toString());
                }
                const bonusCoins = Math.ceil(currentEnemies.length / 2);
                if (bonusCoins > 0) {
                  setEarnedCoins((c) => c + bonusCoins);
                  onAddCoins(bonusCoins);
                }
                return [];
              });
            }
          });
          updated = updated.filter((pu) => Math.hypot(px - pu.x, 85 - pu.y) >= 8);
        }

        return updated.filter((pu) => pu.y < 100);
      });

      setEnemies((prevEnemies) => {
        let updated = prevEnemies.map((e) => ({ ...e, y: e.y + e.speed * delta }));

        const collidingWithPlayer = updated.filter((e) => Math.hypot(px - e.x, 85 - e.y) < 8);
        if (collidingWithPlayer.length > 0) {
          registerHit();
          updated = updated.filter((e) => Math.hypot(px - e.x, 85 - e.y) >= 8);
        }

        const hitBottom = updated.filter((e) => e.y >= 92);
        if (hitBottom.length > 0) {
          registerHit();
          updated = updated.filter((e) => e.y < 92);
        }

        return updated;
      });

      // Spawn enemies — faster and tougher as level climbs, with a boss every 5 levels
      const lvl = levelRef.current;
      if (now - lastSpawnTimeRef.current > Math.max(550, 1800 - lvl * 60)) {
        lastSpawnTimeRef.current = now;

        const isBossLevel = lvl % 5 === 0 && bossSpawnedForLevelRef.current !== lvl;
        if (isBossLevel) {
          bossSpawnedForLevelRef.current = lvl;
          setEnemies((prev) => [
            ...prev,
            {
              id: enemyIdCounter.current++,
              x: 50,
              y: -8,
              hp: 8 + lvl,
              maxHp: 8 + lvl,
              speed: 10,
              size: 52,
              emoji: '🐙',
              points: 150,
              boss: true,
            },
          ]);
        } else {
          const speedMultiplier = 1 + lvl * 0.05;
          const tierIndex = Math.min(ENEMY_TIERS.length - 1, Math.floor(Math.random() * (1 + lvl * 0.3)));
          const spec = ENEMY_TIERS[tierIndex];
          setEnemies((prev) => [
            ...prev,
            {
              id: enemyIdCounter.current++,
              x: 10 + Math.random() * 80,
              y: -5,
              hp: spec.hp,
              maxHp: spec.hp,
              speed: spec.speed * speedMultiplier,
              size: spec.size,
              emoji: spec.emoji,
              points: spec.points,
            },
          ]);
        }
      }

      if (now - lastPowerupSpawnTimeRef.current > 10000) {
        lastPowerupSpawnTimeRef.current = now;
        const powerTypes: ('double' | 'shield' | 'nuke')[] = ['double', 'shield', 'nuke'];
        const typeSelected = powerTypes[Math.floor(Math.random() * powerTypes.length)];
        const emojis = { double: '⚡', shield: '🛡️', nuke: '💣' };
        setPowerups((prev) => [
          ...prev,
          { id: powerupIdCounter.current++, x: 15 + Math.random() * 70, y: -5, type: typeSelected, emoji: emojis[typeSelected] },
        ]);
      }

      // Bullet vs enemy collisions
      setBullets((prevBullets) => {
        let remainingBullets = [...prevBullets];
        setEnemies((prevEnemies) => {
          let updatedEnemies = [...prevEnemies];
          prevBullets.forEach((bullet) => {
            updatedEnemies.forEach((enemy, idx) => {
              if (!updatedEnemies[idx]) return;
              const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
              if (dist < (enemy.boss ? 14 : 7)) {
                remainingBullets = remainingBullets.filter((b) => b.id !== bullet.id);
                const nextHp = enemy.hp - 1;
                if (nextHp <= 0) {
                  registerKill(enemy);
                  updatedEnemies = updatedEnemies.filter((e) => e.id !== enemy.id);
                } else {
                  updatedEnemies[idx] = { ...enemy, hp: nextHp };
                }
              }
            });
          });
          return updatedEnemies;
        });
        return remainingBullets;
      });

      frameIdRef.current = requestAnimationFrame(tick);
    };

    frameIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    };
    // Intentionally depends only on session start/stop — all fast-changing values are read via refs.
  }, [isPlaying, gameOver]);

  const resetGame = () => {
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);
    setBullets([]);
    setEnemies([]);
    setPowerups([]);
    setParticles([]);
    setLives(3);
    setScore(0);
    scoreRef.current = 0;
    setLevel(1);
    levelRef.current = 1;
    setHasShield(false);
    hasShieldRef.current = false;
    setDoubleShotActive(false);
    doubleShotActiveRef.current = false;
    setDoubleShotTimer(0);
    setCombo(0);
    setBestCombo(0);
    setIsNewHighScore(false);
    setIsPaused(false);
    setGameOver(false);
    setIsPlaying(false);
    setEarnedCoins(0);
    setPlayerX(50);
    playerXRef.current = 50;
    bossSpawnedForLevelRef.current = 0;
    lastSpawnTimeRef.current = 0;
    lastPowerupSpawnTimeRef.current = Date.now();
  };

  useEffect(() => {
    if (gameOver && score > 0 && score === highScore) setIsNewHighScore(true);
  }, [gameOver, score, highScore]);

  return (
    <div className="h-full flex flex-col p-4 bg-[#0a1128] text-white overflow-y-auto" id="airplane_shooter_wrapper">

      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 shrink-0" id="airplane_header">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center cursor-pointer hover:bg-slate-800 shadow-xs text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display font-extrabold text-base tracking-tight text-amber flex items-center gap-1 justify-center">
            <Swords className="w-4 h-4 text-amber" /> Air Strike 1945
          </h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cloud Defense Squadron</p>
        </div>
        <div className="flex gap-1.5">
          {isPlaying && !gameOver && (
            <button
              onClick={() => {
                playSound('tap', userProgress.soundEnabled);
                setIsPaused((p) => !p);
              }}
              className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center cursor-pointer hover:bg-slate-800 shadow-xs text-white"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={resetGame}
            className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center cursor-pointer hover:bg-slate-800 shadow-xs text-white"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-4 gap-1.5 mb-3 shrink-0 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 col-span-1">
          <p className="text-[8px] font-black uppercase text-slate-400">Lives</p>
          <p className="text-xs font-black text-rose-500 flex items-center justify-center gap-0.5">
            {'❤️'.repeat(Math.max(0, lives)) || '—'}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 col-span-1">
          <p className="text-[8px] font-black uppercase text-slate-400">Score</p>
          <p className="text-sm font-black text-amber">{score}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 col-span-1">
          <p className="text-[8px] font-black uppercase text-slate-400">Squad Lvl</p>
          <p className="text-sm font-black text-cyan-400">{level}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 col-span-1">
          <p className="text-[8px] font-black uppercase text-slate-400">Bounty</p>
          <p className="text-xs font-black text-emerald-400">🪙 {earnedCoins}</p>
        </div>
      </div>

      {/* Active Powerups + Combo bar */}
      <div className="flex gap-2 mb-3 shrink-0 justify-center flex-wrap min-h-[20px]">
        <AnimatePresence>
          {combo >= 3 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-[9px] font-black px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300 flex items-center gap-1"
            >
              <Flame className="w-3 h-3 fill-current" /> {combo}x COMBO
            </motion.span>
          )}
        </AnimatePresence>
        {doubleShotActive && (
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber/20 border border-amber/40 text-amber flex items-center gap-1 animate-pulse">
            <Zap className="w-3 h-3 text-amber fill-current" /> DOUBLE SHOT ({doubleShotTimer}s)
          </span>
        )}
        {hasShield && (
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center gap-1">
            <Shield className="w-3 h-3 text-cyan-400 fill-current" /> SHIELD ACTIVE
          </span>
        )}
      </div>

      {/* Screen Arena Space */}
      <motion.div
        key={shakeKey}
        animate={hitFlash ? { x: [0, -6, 6, -4, 4, 0] } : {}}
        transition={{ duration: 0.22 }}
        ref={arenaRef}
        onPointerDown={(e) => handleArenaPointer(e.clientX)}
        onPointerMove={(e) => { if (e.buttons === 1) handleArenaPointer(e.clientX); }}
        onTouchStart={(e) => handleArenaPointer(e.touches[0].clientX)}
        onTouchMove={(e) => handleArenaPointer(e.touches[0].clientX)}
        className="flex-1 min-h-[220px] bg-[#0c1a40] border border-slate-900 rounded-3xl overflow-hidden relative shadow-inner p-1 touch-none cursor-pointer"
        id="airplane_arena"
      >
        {/* Level up toast */}
        <AnimatePresence>
          {levelUpToast !== null && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.9 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border-2 border-amber/40 rounded-2xl px-4 py-2.5 shadow-lg flex items-center gap-2"
            >
              <PartyPopper className="w-4 h-4 text-amber" />
              <span className="text-xs font-black text-white">Level Up! Squad Lvl {levelUpToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hit flash overlay */}
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

        {/* Sky/Clouds Background */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute top-0 bottom-0 left-0 right-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ x: [0, 30, 0] }}
            transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut' }}
            className="absolute top-4 left-[10%] w-16 h-8 bg-white/5 rounded-full blur-md"
          />
          <motion.div
            animate={{ x: [0, -24, 0] }}
            transition={{ repeat: Infinity, duration: 12, ease: 'easeInOut' }}
            className="absolute top-32 right-[15%] w-24 h-12 bg-white/5 rounded-full blur-md"
          />
          <motion.div
            animate={{ x: [0, 20, 0] }}
            transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
            className="absolute bottom-20 left-[25%] w-20 h-10 bg-white/5 rounded-full blur-md"
          />
        </div>

        {/* Bullets */}
        {bullets.map((b) => (
          <div
            key={b.id}
            className={`absolute rounded-full ${b.double ? 'w-1.5 h-4 bg-cyan-300 shadow-[0_0_8px_#67e8f9]' : 'w-1.5 h-3.5 bg-yellow-400 border border-orange-500 shadow-[0_0_6px_#facc15]'}`}
            style={{ left: `${b.x}%`, top: `${b.y}%`, transform: 'translate(-50%, -50%)' }}
          />
        ))}

        {/* Powerups */}
        {powerups.map((pu) => (
          <motion.div
            key={pu.id}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute select-none text-xl bg-slate-900/80 border border-cyan-400/50 rounded-full w-8 h-8 flex items-center justify-center shadow-lg"
            style={{ left: `${pu.x}%`, top: `${pu.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            {pu.emoji}
          </motion.div>
        ))}

        {/* Explosion particles */}
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              animate={{
                opacity: 0,
                x: Math.cos(p.angle) * p.dist * 3,
                y: Math.sin(p.angle) * p.dist * 3,
                scale: 0.3,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute w-2 h-2 rounded-full pointer-events-none"
              style={{ left: `${p.x}%`, top: `${p.y}%`, backgroundColor: p.color }}
            />
          ))}
        </AnimatePresence>

        {/* Enemies */}
        {enemies.map((e) => {
          const hpPercentage = (e.hp / e.maxHp) * 100;
          return (
            <div
              key={e.id}
              className="absolute select-none flex flex-col items-center justify-center transition-all duration-75"
              style={{ left: `${e.x}%`, top: `${e.y}%`, transform: 'translate(-50%, -50%)', fontSize: `${e.size}px` }}
            >
              {e.boss && (
                <span className="absolute -top-4 text-[8px] font-black text-purple-300 uppercase tracking-wider bg-purple-950/70 px-1.5 py-0.5 rounded-full border border-purple-500/40">
                  Boss
                </span>
              )}
              <span className={`drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${e.boss ? 'drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]' : ''}`}>
                {e.emoji}
              </span>
              {e.maxHp > 1 && (
                <div className={`h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mt-1 ${e.boss ? 'w-14' : 'w-6'}`}>
                  <div className={`h-full ${e.boss ? 'bg-purple-500' : 'bg-rose-500'}`} style={{ width: `${hpPercentage}%` }} />
                </div>
              )}
            </div>
          );
        })}

        {/* Player Fighter */}
        <div
          className="absolute w-12 h-12 rounded-full bg-cyan-600/25 border-2 border-cyan-400/40 flex items-center justify-center text-2xl shadow-lg z-10 transition-all duration-100"
          style={{ left: `${playerX}%`, top: '82%', transform: 'translateX(-50%)' }}
        >
          🛩️
          {hasShield && <div className="absolute inset-0 rounded-full border-2 border-cyan-300 animate-ping opacity-60" />}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-4 bg-cyan-950/25 border-t border-cyan-900/30" />

        {/* Pause overlay */}
        <AnimatePresence>
          {isPlaying && isPaused && !gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0a1128]/90 flex flex-col items-center justify-center z-20"
            >
              <Pause className="w-10 h-10 text-white mb-3" />
              <button
                onClick={() => {
                  playSound('tap', userProgress.soundEnabled);
                  setIsPaused(false);
                }}
                className="px-6 py-3 bg-amber text-slate-950 font-display font-black text-xs rounded-xl shadow-lg flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" /> Resume
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start / Game over overlays */}
        <AnimatePresence>
          {!isPlaying && !gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0a1128]/95 flex flex-col items-center justify-center p-4 text-center z-20"
            >
              <span className="text-5xl mb-2 animate-bounce">🛩️</span>
              <h3 className="font-display font-black text-base text-white mb-1">Air Strike 1945</h3>
              <p className="text-[10px] text-slate-400 max-w-[220px] leading-relaxed mb-4">
                Drag anywhere in the arena or use the buttons below to dodge and line up your shots. Every 5th level brings a boss.
              </p>

              <div className="space-y-2 text-[9px] text-slate-400 font-semibold mb-4 bg-slate-950/50 p-3 rounded-xl border border-slate-900">
                <p className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-amber fill-current" /> ⚡ grants double-shot fire for 10s</p>
                <p className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-cyan-400 fill-current" /> 🛡️ blocks one hit</p>
                <p className="flex items-center gap-1.5">💣 clears every enemy on screen</p>
                <p className="flex items-center gap-1.5"><Flame className="w-3 h-3 text-orange-400 fill-current" /> Chain kills for a combo multiplier</p>
              </div>

              <button
                onClick={() => {
                  playSound('tap', userProgress.soundEnabled);
                  setIsPlaying(true);
                }}
                className="px-6 py-3 bg-gradient-to-r from-amber to-amber/90 text-slate-950 font-display font-black text-xs rounded-xl shadow-lg flex items-center gap-1 cursor-pointer hover:brightness-110 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-current" /> Launch Fighter Jet
              </button>
            </motion.div>
          )}

          {gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#2b0c16]/95 flex flex-col items-center justify-center p-4 text-center z-20"
            >
              <span className="text-4xl mb-2">🔥💥</span>
              <h3 className="font-display font-black text-base text-rose-400 mb-1">Fighter Jet Destroyed!</h3>
              {isNewHighScore && (
                <p className="text-[10px] font-black text-amber flex items-center gap-1 mb-1">
                  <Trophy className="w-3.5 h-3.5" /> NEW HIGH SCORE
                </p>
              )}
              <p className="text-[10px] text-slate-300 mb-1 leading-normal">
                Combat score <strong className="text-lg font-black text-rose-500">{score}</strong>
              </p>
              <p className="text-[9px] text-slate-400 mb-4">Best combo: {bestCombo}x &nbsp;•&nbsp; Level reached: {level}</p>
              <div className="flex gap-2.5">
                <button
                  onClick={resetGame}
                  className="px-4 py-2 bg-rose-600 text-white font-display font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1 hover:bg-rose-500"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Deploy Jet
                </button>
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 font-display font-black text-xs rounded-xl shadow-md cursor-pointer hover:bg-slate-850"
                >
                  Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Manual direction buttons for mobile */}
      <div className="mt-3.5 flex gap-4 shrink-0" id="airplane_controls_row">
        <button
          onClick={() => movePlayer('LEFT')}
          className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl flex items-center justify-center shadow-xs cursor-pointer font-black text-xs text-white"
        >
          ◀️ MOVE LEFT
        </button>
        <button
          onClick={() => movePlayer('RIGHT')}
          className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl flex items-center justify-center shadow-xs cursor-pointer font-black text-xs text-white"
        >
          MOVE RIGHT ▶️
        </button>
      </div>

      <div className="mt-2.5 text-center text-[10px] text-slate-500 font-bold">
        ℹ️ Tip: drag directly in the sky to steer, or use the buttons. Press P to pause.
      </div>
    </div>
  );
}
