import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Play, Star, Sparkles, Compass } from 'lucide-react';

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

export default function PocketPool({ onBack, userProgress, onAddCoins }: PocketPoolProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [shotsLeft, setShotsLeft] = useState(6);
  const [earnedCoins, setEarnedCoins] = useState(0);

  // Shoot settings
  const [aimAngle, setAimAngle] = useState(0); // 0 to 360 degrees
  const [strikePower, setStrikePower] = useState(50); // 10 to 100

  // Pool simulation states
  const [balls, setBalls] = useState<Ball[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  const frameIdRef = useRef<number | null>(null);

  // Corner pockets coordinates
  const pockets = [
    { x: 5, y: 5 },
    { x: 95, y: 5 },
    { x: 5, y: 95 },
    { x: 95, y: 95 },
    { x: 50, y: 5 },
    { x: 50, y: 95 },
  ];

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('ocean_pool_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Level characteristics (0 to 10000)
  const getFriction = () => {
    // Normal is 0.98, at level 10000 friction is 0.994 (super slick!)
    return 0.975 + (level * 0.019) / 10000;
  };

  const initTable = () => {
    // Spawn cue ball + 5 target shell balls
    const list: Ball[] = [
      { id: 'cue', x: 25, y: 50, vx: 0, vy: 0, color: '#FFFFFF', isCue: true, pocketed: false },
      { id: 'b1', x: 70, y: 50, vx: 0, vy: 0, color: '#FF6B5D', isCue: false, pocketed: false, emoji: '🐚' },
      { id: 'b2', x: 75, y: 45, vx: 0, vy: 0, color: '#F5A623', isCue: false, pocketed: false, emoji: '🐚' },
      { id: 'b3', x: 75, y: 55, vx: 0, vy: 0, color: '#6B4E9E', isCue: false, pocketed: false, emoji: '🐚' },
      { id: 'b4', x: 80, y: 40, vx: 0, vy: 0, color: '#3D9BE9', isCue: false, pocketed: false, emoji: '🐚' },
      { id: 'b5', x: 80, y: 60, vx: 0, vy: 0, color: '#2ECC71', isCue: false, pocketed: false, emoji: '🐚' },
    ];
    setBalls(list);

    // Spawn obstacles at high level
    const obs: Obstacle[] = [];
    if (level >= 1000) {
      obs.push({ x: 50, y: 50, r: 8 });
    }
    if (level >= 5000) {
      obs.push({ x: 50, y: 25, r: 6 });
      obs.push({ x: 50, y: 75, r: 6 });
    }
    setObstacles(obs);

    setShotsLeft(6);
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
    setEarnedCoins(0);
  };

  useEffect(() => {
    initTable();
  }, [level]);

  // Strike trigger
  const handleStrike = () => {
    if (shotsLeft <= 0 || gameOver) return;

    // Check if any balls are still moving
    const moving = balls.some((b) => Math.abs(b.vx) > 0.05 || Math.abs(b.vy) > 0.05);
    if (moving) return;

    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(30, userProgress.hapticEnabled);

    setShotsLeft((s) => s - 1);

    // Calculate velocity vectors based on aim angle and strike power
    const radians = (aimAngle * Math.PI) / 180;
    const speedMultiplier = strikePower / 16;
    const vx = Math.cos(radians) * speedMultiplier;
    const vy = Math.sin(radians) * speedMultiplier;

    setBalls((prev) => 
      prev.map((b) => {
        if (b.isCue) {
          return { ...b, vx, vy };
        }
        return b;
      })
    );
  };

  // Simulation physics frame loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const tick = () => {
      setBalls((prevBalls) => {
        let updated = prevBalls.map((b) => {
          if (b.pocketed) return b;

          // 1. Apply friction deceleration
          const f = getFriction();
          let nvx = b.vx * f;
          let nvy = b.vy * f;

          // Stop if ultra slow
          if (Math.abs(nvx) < 0.01) nvx = 0;
          if (Math.abs(nvy) < 0.01) nvy = 0;

          // 2. Position updates
          let nx = b.x + nvx;
          let ny = b.y + nvy;

          // 3. Border bounce reflections
          const r = 3; // ball radius percent
          if (nx <= r || nx >= 100 - r) {
            nvx = -nvx * 0.85;
            nx = nx <= r ? r : 100 - r;
            playSound('tap', userProgress.soundEnabled);
          }
          if (ny <= r || ny >= 100 - r) {
            nvy = -nvy * 0.85;
            ny = ny <= r ? r : 100 - r;
            playSound('tap', userProgress.soundEnabled);
          }

          return {
            ...b,
            x: nx,
            y: ny,
            vx: nvx,
            vy: nvy
          };
        });

        // 4. Ball-to-Ball elastic collisions
        for (let i = 0; i < updated.length; i++) {
          for (let j = i + 1; j < updated.length; j++) {
            const b1 = updated[i];
            const b2 = updated[j];

            if (b1.pocketed || b2.pocketed) continue;

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Ball radius diameter roughly 6%
            if (dist < 6) {
              playSound('slide', userProgress.soundEnabled);
              triggerHaptic(12, userProgress.hapticEnabled);

              // Simple 2D elastic bounce calculations
              const nx = dx / dist;
              const ny = dy / dist;

              // Relative velocity
              const kx = b1.vx - b2.vx;
              const ky = b1.vy - b2.vy;
              const p = 2 * (kx * nx + ky * ny) / 2;

              updated[i] = {
                ...b1,
                vx: b1.vx - p * nx,
                vy: b1.vy - p * ny,
                x: b1.x - nx * 0.5,
                y: b1.y - ny * 0.5
              };

              updated[j] = {
                ...b2,
                vx: b2.vx + p * nx,
                vy: b2.vy + p * ny,
                x: b2.x + nx * 0.5,
                y: b2.y + ny * 0.5
              };
            }
          }
        }

        // 5. Obstacle collisions
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
                vx: -b.vx * 0.9,
                vy: -b.vy * 0.9,
                x: obs.x + nx * (obs.r + 3.1),
                y: obs.y + ny * (obs.r + 3.1)
              };
            }
            return b;
          });
        });

        // 6. Check pocketings (pockets are holes in corner and sides)
        updated = updated.map((b) => {
          if (b.pocketed) return b;

          const isNearPocket = pockets.some((p) => {
            const dx = b.x - p.x;
            const dy = b.y - p.y;
            return Math.sqrt(dx * dx + dy * dy) < 6; // Pocket radius
          });

          if (isNearPocket) {
            playSound('win', userProgress.soundEnabled);
            triggerHaptic(25, userProgress.hapticEnabled);

            if (b.isCue) {
              // Scratch! Cue ball pocketed -> respawn with penalty
              return { ...b, x: 25, y: 50, vx: 0, vy: 0, pocketed: false };
            } else {
              setScore((s) => {
                const added = 100 + Math.floor(level / 10);
                const next = s + added;
                if (next > highScore) {
                  setHighScore(next);
                  localStorage.setItem('ocean_pool_highscore', next.toString());
                }
                return next;
              });

              // Coins payout
              const coinsGained = 15 + Math.floor(level / 1000);
              setEarnedCoins(c => c + coinsGained);
              onAddCoins(coinsGained);

              return { ...b, pocketed: true, vx: 0, vy: 0 };
            }
          }

          return b;
        });

        // 7. Check Victory condition
        const allTargetBallsPocketed = updated.filter(b => !b.isCue).every(b => b.pocketed);
        if (allTargetBallsPocketed) {
          setGameOver(true);
          setIsPlaying(false);
          playSound('win', userProgress.soundEnabled);
        }

        return updated;
      });

      frameIdRef.current = requestAnimationFrame(tick);
    };

    frameIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    };
  }, [isPlaying, gameOver, level, obstacles]);

  // Turn ending Check: If shots = 0 and balls stopped moving, trigger loss
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    const moving = balls.some((b) => Math.abs(b.vx) > 0.05 || Math.abs(b.vy) > 0.05);
    const targetLeft = balls.filter(b => !b.isCue && !b.pocketed).length;

    if (shotsLeft === 0 && !moving && targetLeft > 0) {
      setGameOver(true);
      setIsPlaying(false);
      playSound('lose', userProgress.soundEnabled);
    }
  }, [shotsLeft, balls, isPlaying]);

  return (
    <div className="h-full flex flex-col p-4 bg-[#FBF6F1] text-[#2B1F2E] overflow-y-auto" id="pool_game_wrapper">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 shrink-0" id="pool_header">
        <button 
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display font-extrabold text-base tracking-tight text-[#6B4E9E]">Pocket Pool</h2>
          <p className="text-[9px] font-bold text-neutral-500 uppercase">Sink shell balls</p>
        </div>
        <button 
          onClick={initTable}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-1.5 mb-3 shrink-0 text-center">
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2 col-span-1">
          <p className="text-[7px] font-black uppercase text-neutral-400">Shots Left</p>
          <p className="text-sm font-black text-[#FF6B5D]">{shotsLeft}</p>
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

      {/* Friction Slider */}
      <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3 mb-3 shrink-0 shadow-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-black uppercase text-[#6E6270] flex items-center gap-1">
            <Star className="w-3 h-3 text-[#6B4E9E] fill-current" /> Slickness Level (0-10000)
          </span>
          <span className="text-xs font-black text-[#6B4E9E]">Lvl {level}</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="10000" 
          step="100"
          value={level} 
          disabled={isPlaying && balls.some(b => Math.abs(b.vx) > 0.05)}
          onChange={(e) => setLevel(parseInt(e.target.value, 10))}
          className="w-full accent-[#6B4E9E] h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
        />
        <p className="text-[8px] font-bold text-center text-neutral-400 mt-1">
          {level >= 5000 ? '🌪️ WHIRLPOOL OBSTACLES + ZERO FRICTION SLICK' : '🟢 STANDARD CASUAL FELT'}
        </p>
      </div>

      {/* Felt Pool Table simulation frame */}
      <div className="flex-1 min-h-[200px] bg-emerald-800 border-8 border-yellow-950 rounded-3xl relative shadow-2xl p-1" id="pool_felt_table">
        
        {/* Six corner pockets */}
        {pockets.map((p, idx) => (
          <div 
            key={idx}
            className="absolute w-7 h-7 bg-black rounded-full border-2 border-emerald-950 shadow-inner"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}

        {/* Level Whirlpools Obstacles */}
        {obstacles.map((obs, idx) => (
          <div 
            key={idx}
            className="absolute bg-sky-950/40 rounded-full border border-dashed border-sky-400 flex items-center justify-center animate-spin"
            style={{
              left: `${obs.x}%`,
              top: `${obs.y}%`,
              width: `${obs.r * 2}%`,
              height: `${obs.r * 2}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <span className="text-[9px] text-sky-300">🌀</span>
          </div>
        ))}

        {/* Aim guide line (only when balls stopped) */}
        {!balls.some(b => Math.abs(b.vx) > 0.05 || Math.abs(b.vy) > 0.05) && balls.find(b => b.isCue) && (
          <div 
            className="absolute origin-left border-t border-dashed border-white/50 pointer-events-none h-0 z-10"
            style={{
              left: `${balls.find(b => b.isCue)?.x}%`,
              top: `${balls.find(b => b.isCue)?.y}%`,
              width: '120px',
              transform: `rotate(${aimAngle}deg)`,
            }}
          />
        )}

        {/* Render Balls */}
        {balls.map((b) => {
          if (b.pocketed) return null;
          return (
            <div 
              key={b.id}
              className={`absolute w-5.5 h-5.5 rounded-full border flex items-center justify-center font-bold text-[8px] text-white shadow-md z-10`}
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                backgroundColor: b.color,
                borderColor: b.isCue ? '#EDE4DC' : 'transparent',
                transform: 'translate(-50%, -50%)'
              }}
            >
              {b.emoji || ''}
            </div>
          );
        })}

        {/* Start / Game Over screens */}
        <AnimatePresence>
          {gameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#FBF6F1]/95 flex flex-col items-center justify-center p-4 text-center z-20 rounded-xl"
            >
              <span className="text-4xl mb-1.5 animate-bounce">🎱</span>
              <h3 className="font-display font-black text-sm text-[#2B1F2E] mb-1">
                {balls.filter(b => !b.isCue).every(b => b.pocketed) ? 'Perfect Rack Cleared!' : 'Out of Shots!'}
              </h3>
              <p className="text-[10px] text-neutral-500 mb-3">
                Final Score: <strong className="text-[#6B4E9E]">{score}</strong>. Received <strong className="text-amber">🪙 {earnedCoins}</strong> coins!
              </p>
              <div className="flex gap-2">
                <button
                  onClick={initTable}
                  className="px-4 py-2 bg-[#6B4E9E] text-white font-display font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Start New Rack
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

      {/* Dynamic Aim Settings Keypad */}
      <div className="mt-3 bg-white border border-[#EDE4DC] rounded-2xl p-3 shadow-xs space-y-3 shrink-0">
        
        {/* Aim Dial Slider (0 to 360) */}
        <div>
          <div className="flex justify-between items-center mb-1 text-[10px] font-black text-[#6E6270]">
            <span className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-[#6B4E9E]" /> Cue Stick Aiming Direction
            </span>
            <span className="text-[#6B4E9E]">{aimAngle}°</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="360" 
            value={aimAngle} 
            onChange={(e) => setAimAngle(parseInt(e.target.value, 10))}
            className="w-full accent-[#6B4E9E] h-1.5 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Power Strike Slider (10 to 100) */}
        <div>
          <div className="flex justify-between items-center mb-1 text-[10px] font-black text-[#6E6270]">
            <span>⚡ Striking force</span>
            <span className="text-[#FF6B5D]">{strikePower}%</span>
          </div>
          <input 
            type="range" 
            min="10" 
            max="100" 
            value={strikePower} 
            onChange={(e) => setStrikePower(parseInt(e.target.value, 10))}
            className="w-full accent-[#FF6B5D] h-1.5 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Big Strike Button */}
        <button 
          onClick={handleStrike}
          disabled={balls.some(b => Math.abs(b.vx) > 0.05 || Math.abs(b.vy) > 0.05)}
          className="w-full py-3 bg-[#FF6B5D] text-white text-xs font-black uppercase rounded-xl shadow-md cursor-pointer hover:bg-[#E55A4C] active:scale-98 transition-transform disabled:opacity-40"
        >
          STRIKE CUE BALL 🎱
        </button>
      </div>
    </div>
  );
}
