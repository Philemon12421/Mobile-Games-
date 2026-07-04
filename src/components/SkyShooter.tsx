import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Play, Star, Shield, Zap } from 'lucide-react';

interface SkyShooterProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

interface Bullet {
  id: number;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  size: number;
  emoji: string;
}

export default function SkyShooter({ onBack, userProgress, onAddCoins }: SkyShooterProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [playerX, setPlayerX] = useState(50); // centered (0 - 100)
  const [earnedCoins, setEarnedCoins] = useState(0);

  // Lists of active entities
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);

  const frameIdRef = useRef<number | null>(null);
  const bulletIdCounter = useRef(0);
  const enemyIdCounter = useRef(0);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('ocean_shooter_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Level speed configurations (Level 0 - 10000)
  const getEnemySpeed = () => {
    return 0.35 + (level * 2.15) / 10000;
  };

  const getSpawnRate = () => {
    return Math.max(25, 90 - Math.floor(level / 120)); // frame frequency
  };

  // Move player helper
  const movePlayer = (direction: 'LEFT' | 'RIGHT') => {
    if (!isPlaying || gameOver) return;
    triggerHaptic(8, userProgress.hapticEnabled);
    setPlayerX((x) => {
      const step = 8;
      const nextX = direction === 'LEFT' ? x - step : x + step;
      return Math.max(5, Math.min(95, nextX));
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        movePlayer('LEFT');
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        movePlayer('RIGHT');
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isPlaying, gameOver]);

  // Projectile auto firing loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const fireRate = Math.max(180, 450 - Math.floor(level / 40)); // speed up torpedo fire at extreme levels
    const fireInterval = setInterval(() => {
      playSound('tap', userProgress.soundEnabled);
      triggerHaptic(10, userProgress.hapticEnabled);
      
      setBullets((prev) => [
        ...prev,
        {
          id: bulletIdCounter.current++,
          x: playerX,
          y: 85
        }
      ]);
    }, fireRate);

    return () => clearInterval(fireInterval);
  }, [isPlaying, gameOver, playerX, level]);

  // Game Engine Frame Loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    let ticksSinceLastEnemy = 0;

    const tick = () => {
      // 1. Move Projectiles Upwards
      setBullets((prev) => 
        prev
          .map((b) => ({ ...b, y: b.y - 3.5 }))
          .filter((b) => b.y > 0)
      );

      // 2. Move Enemies Downwards
      setEnemies((prevEnemies) => {
        let updated = prevEnemies.map((e) => ({
          ...e,
          y: e.y + getEnemySpeed()
        }));

        // Check if hit base (life loss)
        const hitBase = updated.filter((e) => e.y >= 92);
        if (hitBase.length > 0) {
          setLives((prevLives) => {
            const next = prevLives - hitBase.length;
            playSound('lose', userProgress.soundEnabled);
            triggerHaptic(40, userProgress.hapticEnabled);
            if (next <= 0) {
              setGameOver(true);
              setIsPlaying(false);
            }
            return Math.max(0, next);
          });
          updated = updated.filter((e) => e.y < 92);
        }

        return updated;
      });

      // 3. Spawning Mobs
      ticksSinceLastEnemy += 1;
      if (ticksSinceLastEnemy >= getSpawnRate()) {
        ticksSinceLastEnemy = 0;
        const enemyTypes = [
          { emoji: '🦑', hp: 1, size: 24 },
          { emoji: '🐡', hp: 1, size: 20 },
          { emoji: '🐙', hp: 2, size: 28 },
          { emoji: '👾', hp: 3, size: 32 }
        ];
        // higher level spawns tougher emojis
        const index = Math.min(enemyTypes.length - 1, Math.floor((level * Math.random()) / 2500));
        const selected = enemyTypes[index];

        setEnemies((prev) => [
          ...prev,
          {
            id: enemyIdCounter.current++,
            x: 10 + Math.random() * 80,
            y: 0,
            hp: selected.hp,
            size: selected.size,
            emoji: selected.emoji
          }
        ]);
      }

      // 4. Hit Calculations / Damage
      setBullets((prevBullets) => {
        let remainingBullets = [...prevBullets];

        setEnemies((prevEnemies) => {
          let nextEnemies = [...prevEnemies];

          // Check hit intersections
          prevBullets.forEach((bullet) => {
            nextEnemies.forEach((enemy, eIdx) => {
              // bullet radius approx 3%, enemy radius approx size/6
              const dx = bullet.x - enemy.x;
              const dy = bullet.y - enemy.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < 8) { // Collision radius
                // Remove bullet
                remainingBullets = remainingBullets.filter((b) => b.id !== bullet.id);
                // Reduce HP
                nextEnemies[eIdx] = { ...enemy, hp: enemy.hp - 1 };
              }
            });
          });

          // Handle killed enemies
          const killed = nextEnemies.filter((e) => e.hp <= 0);
          if (killed.length > 0) {
            playSound('win', userProgress.soundEnabled);
            triggerHaptic(20, userProgress.hapticEnabled);
            
            setScore((prevScore) => {
              const gained = killed.length * (5 + Math.floor(level / 1000));
              const next = prevScore + gained;
              if (next > highScore) {
                setHighScore(next);
                localStorage.setItem('ocean_shooter_highscore', next.toString());
              }
              return next;
            });

            // Reward coins
            const coins = killed.length * (1 + Math.floor(level / 3000));
            setEarnedCoins(c => c + coins);
            onAddCoins(coins);

            // Auto level up slightly
            if (level < 10000) {
              setLevel(l => Math.min(10000, l + 40));
            }
          }

          return nextEnemies.filter((e) => e.hp > 0);
        });

        return remainingBullets;
      });

      frameIdRef.current = requestAnimationFrame(tick);
    };

    frameIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    };
  }, [isPlaying, gameOver, level]);

  const resetGame = () => {
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);
    setBullets([]);
    setEnemies([]);
    setLives(3);
    setScore(0);
    setGameOver(false);
    setIsPlaying(false);
    setEarnedCoins(0);
    setPlayerX(50);
  };

  const handleLevelSlider = (val: number) => {
    playSound('tap', userProgress.soundEnabled);
    setLevel(Math.max(0, Math.min(10000, val)));
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[#FBF6F1] text-[#2B1F2E] overflow-y-auto" id="shooter_game_wrapper">
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 shrink-0" id="shooter_header">
        <button 
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display font-extrabold text-base tracking-tight text-[#FF6B5D]">Sky Shooter</h2>
          <p className="text-[9px] font-bold text-neutral-500 uppercase">Torpedo Defense</p>
        </div>
        <button 
          onClick={resetGame}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-4 gap-1.5 mb-3 shrink-0 text-center">
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2 col-span-1">
          <p className="text-[8px] font-black uppercase text-neutral-400">Shields</p>
          <p className="text-xs font-black text-emerald-500 flex items-center justify-center gap-0.5">
            <Shield className="w-3.5 h-3.5 fill-emerald-100" /> {lives}
          </p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2 col-span-1">
          <p className="text-[8px] font-black uppercase text-neutral-400">Score</p>
          <p className="text-sm font-black text-[#FF6B5D]">{score}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2 col-span-1">
          <p className="text-[8px] font-black uppercase text-neutral-400">High Score</p>
          <p className="text-sm font-black text-[#6B4E9E]">{highScore}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2 col-span-1">
          <p className="text-[8px] font-black uppercase text-neutral-400">Coins</p>
          <p className="text-xs font-black text-[#F5A623]">🪙 {earnedCoins}</p>
        </div>
      </div>

      {/* Speed Slider */}
      <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3 mb-3 shrink-0 shadow-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-black uppercase text-[#6E6270] flex items-center gap-1">
            <Star className="w-3 h-3 text-[#FF6B5D] fill-current" /> Invasion Level (0-10000)
          </span>
          <span className="text-xs font-black text-[#FF6B5D]">Lvl {level}</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="10000" 
          step="100"
          value={level} 
          disabled={isPlaying}
          onChange={(e) => handleLevelSlider(parseInt(e.target.value, 10))}
          className="w-full accent-[#FF6B5D] h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between mt-1.5 gap-1">
          <button onClick={() => handleLevelSlider(level - 1000)} disabled={isPlaying} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">-1000</button>
          <button onClick={() => handleLevelSlider(level - 100)} disabled={isPlaying} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">-100</button>
          <button onClick={() => handleLevelSlider(level + 100)} disabled={isPlaying} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">+100</button>
          <button onClick={() => handleLevelSlider(level + 1000)} disabled={isPlaying} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">+1000</button>
        </div>
      </div>

      {/* Screen Arena Space */}
      <div className="flex-1 min-h-[220px] bg-[#2B1F2E] border border-black/30 rounded-3xl overflow-hidden relative shadow-inner p-1" id="shooter_arena">
        
        {/* Starfields background */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Projectile Bullets */}
        {bullets.map((b) => (
          <div 
            key={b.id}
            className="absolute w-2.5 h-2.5 bg-cyan-400 rounded-full border border-white shadow-[0_0_8px_#22d3ee] animate-ping"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}

        {/* Enemies falling */}
        {enemies.map((e) => (
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
            <span>{e.emoji}</span>
            {e.hp > 1 && (
              <span className="text-[7px] font-black bg-black/60 text-white px-1 rounded-sm leading-none mt-1">
                HP: {e.hp}
              </span>
            )}
          </div>
        ))}

        {/* Player Submarine / Ship */}
        <div 
          className="absolute w-10 h-10 rounded-full bg-[#FF6B5D] border border-white/40 flex items-center justify-center text-xl shadow-lg z-10 transition-all duration-100"
          style={{
            left: `${playerX}%`,
            top: '85%',
            transform: 'translateX(-50%)'
          }}
        >
          🚢
        </div>

        {/* Sea Bed Ground visual */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-orange-950/40 border-t border-orange-900/30" />

        {/* Overlays */}
        <AnimatePresence>
          {!isPlaying && !gameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#FBF6F1]/95 flex flex-col items-center justify-center p-4 text-center z-20"
            >
              <span className="text-4xl mb-1.5 animate-bounce">👾</span>
              <h3 className="font-display font-black text-sm text-[#2B1F2E] mb-1">Deep Sky Shooter</h3>
              <p className="text-[10px] text-neutral-500 max-w-[200px] leading-snug mb-3">
                Invasion Level scales from 0 to 10000. Use keyboard Left/Right arrows or on-screen slider pads.
              </p>
              <button
                onClick={() => {
                  playSound('tap', userProgress.soundEnabled);
                  setIsPlaying(true);
                }}
                className="px-5 py-2.5 bg-[#FF6B5D] text-white font-display font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Battle Stations
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
              <span className="text-4xl mb-1">🛸</span>
              <h3 className="font-display font-black text-sm text-[#C94A3D] mb-1">Defeated by Aliens!</h3>
              <p className="text-[10px] text-neutral-600 mb-3">
                Final defensive score: <strong className="text-lg font-black">{score}</strong>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={resetGame}
                  className="px-4 py-2 bg-[#FF6B5D] text-white font-display font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Re-Deploy
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
      </div>

      {/* Manual direction buttons for mobile */}
      <div className="mt-3 flex gap-4 shrink-0" id="shooter_controls_row">
        <button 
          onClick={() => movePlayer('LEFT')}
          className="flex-1 py-3 bg-[#FFFFFF] hover:bg-[#FFEFEC] border border-[#EDE4DC] rounded-xl flex items-center justify-center shadow-xs cursor-pointer font-black text-xs text-[#6E6270]"
        >
          ◀️ MOVE LEFT
        </button>
        <button 
          onClick={() => movePlayer('RIGHT')}
          className="flex-1 py-3 bg-[#FFFFFF] hover:bg-[#FFEFEC] border border-[#EDE4DC] rounded-xl flex items-center justify-center shadow-xs cursor-pointer font-black text-xs text-[#6E6270]"
        >
          MOVE RIGHT ▶️
        </button>
      </div>

      <div className="mt-2 text-center text-[10px] text-neutral-400 font-bold">
        ℹ️ Tip: Bullet fire is fully automatic! Keep moving to aim at dropping squids.
      </div>
    </div>
  );
}
