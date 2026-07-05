import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Play, Star, Shield, Zap, Swords } from 'lucide-react';

interface AirplaneShooterProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

interface Bullet {
  id: number;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  type: 'single' | 'double-left' | 'double-right';
}

interface Enemy {
  id: number;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  hp: number;
  maxHp: number;
  speed: number;
  size: number;
  emoji: string;
  points: number;
}

interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: 'double' | 'shield' | 'nuke';
  emoji: string;
}

export default function AirplaneShooter({ onBack, userProgress, onAddCoins }: AirplaneShooterProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [playerX, setPlayerX] = useState(50); // percentage (0 - 100)
  const [hasShield, setHasShield] = useState(false);
  const [doubleShotActive, setDoubleShotActive] = useState(false);
  const [doubleShotTimer, setDoubleShotTimer] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);

  // Entities lists
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [powerups, setPowerups] = useState<PowerUp[]>([]);

  // Refs for loop management
  const frameIdRef = useRef<number | null>(null);
  const bulletIdCounter = useRef(0);
  const enemyIdCounter = useRef(0);
  const powerupIdCounter = useRef(0);
  const lastSpawnTimeRef = useRef(0);
  const lastPowerupSpawnTimeRef = useRef(0);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('ocean_air_shooter_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Keyboard controls
  const movePlayer = (direction: 'LEFT' | 'RIGHT') => {
    if (!isPlaying || gameOver) return;
    triggerHaptic(5, userProgress.hapticEnabled);
    setPlayerX((x) => {
      const step = 8;
      const nextX = direction === 'LEFT' ? x - step : x + step;
      return Math.max(5, Math.min(95, nextX));
    });
  };

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        movePlayer('LEFT');
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        movePlayer('RIGHT');
      } else if (e.key === ' ' || e.key === 'Enter') {
        // Option to manually trigger start or action
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isPlaying, gameOver]);

  // Timers for Power-ups
  useEffect(() => {
    if (!isPlaying || gameOver) return;
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
  }, [isPlaying, gameOver, doubleShotTimer]);

  // Projectile Auto Firing Loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const fireInterval = setInterval(() => {
      playSound('tap', userProgress.soundEnabled);
      triggerHaptic(6, userProgress.hapticEnabled);

      if (doubleShotActive) {
        setBullets((prev) => [
          ...prev,
          { id: bulletIdCounter.current++, x: playerX - 3, y: 80, type: 'double-left' },
          { id: bulletIdCounter.current++, x: playerX + 3, y: 80, type: 'double-right' }
        ]);
      } else {
        setBullets((prev) => [
          ...prev,
          { id: bulletIdCounter.current++, x: playerX, y: 80, type: 'single' }
        ]);
      }
    }, 280);

    return () => clearInterval(fireInterval);
  }, [isPlaying, gameOver, playerX, doubleShotActive]);

  // Core Game Loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    let lastTick = Date.now();

    const tick = () => {
      const now = Date.now();
      const delta = (now - lastTick) / 1000;
      lastTick = now;

      // 1. Move bullets upwards
      setBullets((prev) =>
        prev
          .map((b) => ({ ...b, y: b.y - 120 * delta }))
          .filter((b) => b.y > 0)
      );

      // 2. Move powerups downwards
      setPowerups((prev) => {
        let updated = prev.map((pu) => ({ ...pu, y: pu.y + 25 * delta }));
        
        // Pick up power-ups collision check
        const pickedUp = updated.filter((pu) => {
          const dx = playerX - pu.x;
          const dy = 85 - pu.y;
          return Math.sqrt(dx * dx + dy * dy) < 8;
        });

        if (pickedUp.length > 0) {
          playSound('win', userProgress.soundEnabled);
          triggerHaptic(25, userProgress.hapticEnabled);

          pickedUp.forEach((pu) => {
            if (pu.type === 'double') {
              setDoubleShotActive(true);
              setDoubleShotTimer(10); // 10 seconds of double shot
            } else if (pu.type === 'shield') {
              setHasShield(true);
            } else if (pu.type === 'nuke') {
              // Destroy all current screen enemies
              setEnemies((currentEnemies) => {
                const bounty = currentEnemies.length * 10;
                setScore((s) => {
                  const next = s + bounty;
                  if (next > highScore) {
                    setHighScore(next);
                    localStorage.setItem('ocean_air_shooter_highscore', next.toString());
                  }
                  return next;
                });
                const bonusCoins = Math.ceil(currentEnemies.length / 2);
                setEarnedCoins((c) => c + bonusCoins);
                onAddCoins(bonusCoins);
                return [];
              });
            }
          });

          updated = updated.filter((pu) => {
            const dx = playerX - pu.x;
            const dy = 85 - pu.y;
            return Math.sqrt(dx * dx + dy * dy) >= 8;
          });
        }

        return updated.filter((pu) => pu.y < 100);
      });

      // 3. Move Enemies downwards
      setEnemies((prevEnemies) => {
        let updated = prevEnemies.map((e) => ({
          ...e,
          y: e.y + e.speed * delta
        }));

        // Collision check with player plane
        const collidingWithPlayer = updated.filter((e) => {
          const dx = playerX - e.x;
          const dy = 85 - e.y;
          return Math.sqrt(dx * dx + dy * dy) < 8;
        });

        if (collidingWithPlayer.length > 0) {
          playSound('lose', userProgress.soundEnabled);
          triggerHaptic(45, userProgress.hapticEnabled);

          if (hasShield) {
            setHasShield(false); // consume shield
          } else {
            setLives((l) => {
              const next = l - 1;
              if (next <= 0) {
                setGameOver(true);
                setIsPlaying(false);
              }
              return Math.max(0, next);
            });
          }

          // remove collided enemies
          updated = updated.filter((e) => {
            const dx = playerX - e.x;
            const dy = 85 - e.y;
            return Math.sqrt(dx * dx + dy * dy) >= 8;
          });
        }

        // Check if hit base/bottom screen
        const hitBottom = updated.filter((e) => e.y >= 92);
        if (hitBottom.length > 0) {
          playSound('lose', userProgress.soundEnabled);
          triggerHaptic(30, userProgress.hapticEnabled);
          
          if (hasShield) {
            setHasShield(false);
          } else {
            setLives((l) => {
              const next = l - 1;
              if (next <= 0) {
                setGameOver(true);
                setIsPlaying(false);
              }
              return Math.max(0, next);
            });
          }
          updated = updated.filter((e) => e.y < 92);
        }

        return updated;
      });

      // 4. Spawn enemies & powerups at intervals
      if (now - lastSpawnTimeRef.current > Math.max(600, 1800 - level * 8)) {
        lastSpawnTimeRef.current = now;
        const speedMultiplier = 1 + (level * 0.05);
        const enemyConfig = [
          { emoji: '🛩️', hp: 1, maxHp: 1, speed: 20 * speedMultiplier, size: 22, points: 10 },
          { emoji: '🚁', hp: 2, maxHp: 2, speed: 25 * speedMultiplier, size: 24, points: 20 },
          { emoji: '🛸', hp: 3, maxHp: 3, speed: 32 * speedMultiplier, size: 28, points: 30 },
          { emoji: '👾', hp: 4, maxHp: 4, speed: 18 * speedMultiplier, size: 34, points: 50 },
        ];

        // Randomly select based on level weight
        const index = Math.min(enemyConfig.length - 1, Math.floor(Math.random() * (1 + level * 0.4)));
        const spec = enemyConfig[index];

        setEnemies((prev) => [
          ...prev,
          {
            id: enemyIdCounter.current++,
            x: 10 + Math.random() * 80,
            y: -5,
            hp: spec.hp,
            maxHp: spec.maxHp,
            speed: spec.speed,
            size: spec.size,
            emoji: spec.emoji,
            points: spec.points
          }
        ]);
      }

      // Spawn powerups occasionally
      if (now - lastPowerupSpawnTimeRef.current > 12000) {
        lastPowerupSpawnTimeRef.current = now;
        const powerTypes: ('double' | 'shield' | 'nuke')[] = ['double', 'shield', 'nuke'];
        const typeSelected = powerTypes[Math.floor(Math.random() * powerTypes.length)];
        const emojis = { double: '⚡', shield: '🛡️', nuke: '💣' };

        setPowerups((prev) => [
          ...prev,
          {
            id: powerupIdCounter.current++,
            x: 15 + Math.random() * 70,
            y: -5,
            type: typeSelected,
            emoji: emojis[typeSelected]
          }
        ]);
      }

      // 5. Bullet & Enemy Collisions
      setBullets((prevBullets) => {
        let remainingBullets = [...prevBullets];

        setEnemies((prevEnemies) => {
          let updatedEnemies = [...prevEnemies];

          prevBullets.forEach((bullet) => {
            updatedEnemies.forEach((enemy, idx) => {
              const dx = bullet.x - enemy.x;
              const dy = bullet.y - enemy.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              // Collision hit threshold
              if (dist < 7) {
                remainingBullets = remainingBullets.filter((b) => b.id !== bullet.id);
                const nextHp = enemy.hp - 1;
                
                if (nextHp <= 0) {
                  // Killed!
                  playSound('win', userProgress.soundEnabled);
                  triggerHaptic(15, userProgress.hapticEnabled);
                  
                  // Score & Coin logic
                  setScore((s) => {
                    const next = s + enemy.points;
                    if (next > highScore) {
                      setHighScore(next);
                      localStorage.setItem('ocean_air_shooter_highscore', next.toString());
                    }
                    return next;
                  });

                  // Coin reward
                  const coinsWon = Math.ceil(enemy.points / 10);
                  setEarnedCoins((c) => c + coinsWon);
                  onAddCoins(coinsWon);

                  // Slowly level up on score thresholds
                  setLevel((l) => {
                    const nextLvl = Math.min(15, Math.floor(score / 200) + 1);
                    return nextLvl > l ? nextLvl : l;
                  });

                  // remove from active list
                  updatedEnemies = updatedEnemies.filter((e) => e.id !== enemy.id);
                } else {
                  // Damage target
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
  }, [isPlaying, gameOver, playerX, hasShield, doubleShotActive, score, level]);

  const resetGame = () => {
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);
    setBullets([]);
    setEnemies([]);
    setPowerups([]);
    setLives(3);
    setScore(0);
    setLevel(1);
    setHasShield(false);
    setDoubleShotActive(false);
    setDoubleShotTimer(0);
    setGameOver(false);
    setIsPlaying(false);
    setEarnedCoins(0);
    setPlayerX(50);
    lastSpawnTimeRef.current = 0;
    lastPowerupSpawnTimeRef.current = Date.now();
  };

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
        <button 
          onClick={resetGame}
          className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center cursor-pointer hover:bg-slate-800 shadow-xs text-white"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-4 gap-1.5 mb-3 shrink-0 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 col-span-1">
          <p className="text-[8px] font-black uppercase text-slate-400">Shields</p>
          <p className="text-xs font-black text-rose-500 flex items-center justify-center gap-0.5">
            <Shield className="w-3.5 h-3.5 fill-rose-900/40" /> {lives}
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

      {/* Active Powerups bar */}
      <div className="flex gap-2 mb-3 shrink-0 justify-center">
        {doubleShotActive && (
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber/20 border border-amber/40 text-amber flex items-center gap-1 animate-pulse">
            <Zap className="w-3 h-3 text-amber fill-current" /> DOUBLE SHOT ({doubleShotTimer}s)
          </span>
        )}
        {hasShield && (
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center gap-1">
            <Shield className="w-3 h-3 text-cyan-400 fill-current" /> ENERGY DEFLECTOR ACTIVE
          </span>
        )}
      </div>

      {/* Screen Arena Space */}
      <div className="flex-1 min-h-[220px] bg-[#0c1a40] border border-slate-900 rounded-3xl overflow-hidden relative shadow-inner p-1" id="airplane_arena">
        
        {/* Sky/Clouds Background Scroll Simulation */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute top-0 bottom-0 left-0 right-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-[10%] w-16 h-8 bg-white/5 rounded-full blur-md animate-pulse" />
          <div className="absolute top-32 right-[15%] w-24 h-12 bg-white/5 rounded-full blur-md" />
          <div className="absolute bottom-20 left-[25%] w-20 h-10 bg-white/5 rounded-full blur-md" />
        </div>

        {/* Projectile Bullets */}
        {bullets.map((b) => (
          <div 
            key={b.id}
            className="absolute w-1.5 h-3.5 bg-yellow-400 rounded-full border border-orange-500 shadow-[0_0_6px_#facc15]"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}

        {/* Powerups floating downwards */}
        {powerups.map((pu) => (
          <motion.div 
            key={pu.id}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute select-none text-xl bg-slate-900/80 border border-cyan-400/50 rounded-full w-8 h-8 flex items-center justify-center shadow-lg"
            style={{
              left: `${pu.x}%`,
              top: `${pu.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {pu.emoji}
          </motion.div>
        ))}

        {/* Enemies falling */}
        {enemies.map((e) => {
          const hpPercentage = (e.hp / e.maxHp) * 100;
          return (
            <div 
              key={e.id}
              className="absolute select-none flex flex-col items-center justify-center transition-all duration-75"
              style={{
                left: `${e.x}%`,
                top: `${e.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: `${e.size}px`
              }}
            >
              <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{e.emoji}</span>
              {e.maxHp > 1 && (
                <div className="w-6 h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mt-1">
                  <div className="h-full bg-rose-500" style={{ width: `${hpPercentage}%` }} />
                </div>
              )}
            </div>
          );
        })}

        {/* Player Airplane Fighter */}
        <div 
          className="absolute w-12 h-12 rounded-full bg-cyan-600/25 border-2 border-cyan-400/40 flex items-center justify-center text-2xl shadow-lg z-10 transition-all duration-100"
          style={{
            left: `${playerX}%`,
            top: '82%',
            transform: 'translateX(-50%)'
          }}
        >
          🛩️
          {/* Energy shield bubble wrapper effect */}
          {hasShield && (
            <div className="absolute inset-0 rounded-full border-2 border-cyan-300 animate-ping opacity-60" />
          )}
        </div>

        {/* Cloud floor / Bed Ground visual */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-cyan-950/25 border-t border-cyan-900/30" />

        {/* Play / Gameover Overlays */}
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
                Command your fighter jet to clear descending bombers and stealth jets. Tap left/right to position and dodge missiles.
              </p>
              
              <div className="space-y-2 text-[9px] text-slate-400 font-semibold mb-4 bg-slate-950/50 p-3 rounded-xl border border-slate-900">
                <p className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-amber fill-current" /> Collect ⚡ for double speed bullet fire</p>
                <p className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-cyan-400 fill-current" /> Collect 🛡️ for a shield bubble deflection</p>
                <p className="flex items-center gap-1.5">💣 Collect 💣 for screen-clearing megaton nuke</p>
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
              <p className="text-[10px] text-slate-300 mb-4 leading-normal">
                You defended the skyway with a combat score of <strong className="text-lg font-black text-rose-500">{score}</strong>
              </p>
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
      </div>

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
        ℹ️ Tip: Machine guns fire continuously! Keep moving and dodging the alien spacecrafts.
      </div>
    </div>
  );
}
