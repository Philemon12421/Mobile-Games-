import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Play, Star, Shield, Zap, Info, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface SnakeGameProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type FoodType = 'NORMAL' | 'GOLDEN' | 'SHIELD' | 'SLOW';

interface Position {
  x: number;
  y: number;
}

interface FoodItem {
  x: number;
  y: number;
  type: FoodType;
}

interface FloatingIcon {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

const PORTALS: Position[] = [
  { x: 2, y: 2 },
  { x: 12, y: 12 }
];

export default function SnakeGame({ onBack, userProgress, onAddCoins }: SnakeGameProps) {
  const GRID_SIZE = 15;
  const [snake, setSnake] = useState<Position[]>([
    { x: 7, y: 7 },
    { x: 7, y: 8 },
    { x: 7, y: 9 },
  ]);
  const [foodItem, setFoodItem] = useState<FoodItem>({ x: 3, y: 3, type: 'NORMAL' });
  const [obstacles, setObstacles] = useState<Position[]>([]);
  const [dir, setDir] = useState<Direction>('UP');
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // Power-up states
  const [hasShield, setHasShield] = useState(false);
  const [slowTicks, setSlowTicks] = useState(0); // number of ticks remaining under slow-mo
  const [floatingIcons, setFloatingIcons] = useState<FloatingIcon[]>([]);
  const [combo, setCombo] = useState(1);

  // Level system: 0 to 10000
  const [level, setLevel] = useState(1);
  const [earnedCoins, setEarnedCoins] = useState(0);

  const directionRef = useRef<Direction>('UP');
  const floatingIdCounter = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const ticksSinceLastEatRef = useRef(0);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('ocean_snake_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Calculate speed based on level and slow-mo power-up
  const getSpeed = () => {
    let baseSpeed = Math.max(45, 190 - Math.floor((level * 145) / 10000));
    if (slowTicks > 0) {
      baseSpeed += 75; // slow down significantly
    }
    return baseSpeed;
  };

  // Generate obstacles based on Level
  const spawnObstacles = (currentSnake: Position[], currentFood: Position, currentLevel: number) => {
    // 0 obstacles for level < 1500, up to 5 for level >= 7000
    const obstacleCount = currentLevel >= 7500 ? 5 : currentLevel >= 4500 ? 3 : currentLevel >= 2000 ? 1 : 0;
    const newObstacles: Position[] = [];
    
    while (newObstacles.length < obstacleCount) {
      const obs = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };

      // Rules: Avoid spawning close to initial snake head (7,7), on current snake, on current food, or duplicate locations, and avoid portals
      const isNearStart = Math.abs(obs.x - 7) <= 2 && Math.abs(obs.y - 7) <= 2;
      const isOnSnake = currentSnake.some((seg) => seg.x === obs.x && seg.y === obs.y);
      const isOnFood = obs.x === currentFood.x && obs.y === currentFood.y;
      const isDuplicate = newObstacles.some((o) => o.x === obs.x && o.y === obs.y);
      const isOnPortal = PORTALS.some((p) => p.x === obs.x && p.y === obs.y);

      if (!isNearStart && !isOnSnake && !isOnFood && !isDuplicate && !isOnPortal) {
        newObstacles.push(obs);
      }
    }
    setObstacles(newObstacles);
  };

  // Spawn food avoiding snake & obstacles & portals
  const spawnFoodItem = (currentSnake: Position[], currentObstacles: Position[]) => {
    let newFood: Position;
    let attempts = 0;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      attempts++;
    } while (
      attempts < 100 && (
        currentSnake.some((seg) => seg.x === newFood.x && seg.y === newFood.y) ||
        currentObstacles.some((obs) => obs.x === newFood.x && obs.y === newFood.y) ||
        PORTALS.some((p) => p.x === newFood.x && p.y === newFood.y)
      )
    );

    // Dynamic Food Probability:
    // 15% Golden Pearl, 12% Bubble Shield, 12% Speed Kelp (Slow Mo), 61% Normal Seaweed
    const rand = Math.random();
    let type: FoodType = 'NORMAL';
    if (rand < 0.15) {
      type = 'GOLDEN';
    } else if (rand < 0.27) {
      type = 'SHIELD';
    } else if (rand < 0.39) {
      type = 'SLOW';
    }

    setFoodItem({ ...newFood, type });
  };

  const spawnFloatingIcon = (x: number, y: number, text: string, color: string) => {
    const id = floatingIdCounter.current++;
    setFloatingIcons((prev) => [...prev, { id, x, y, text, color }]);
    setTimeout(() => {
      setFloatingIcons((prev) => prev.filter((item) => item.id !== id));
    }, 1200);
  };

  // Reset Game
  const resetGame = () => {
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);
    const initialSnake = [
      { x: 7, y: 7 },
      { x: 7, y: 8 },
      { x: 7, y: 9 },
    ];
    setSnake(initialSnake);
    setDir('UP');
    directionRef.current = 'UP';
    setGameOver(false);
    setIsPlaying(false);
    setScore(0);
    setEarnedCoins(0);
    setHasShield(false);
    setSlowTicks(0);
    setCombo(1);
    ticksSinceLastEatRef.current = 0;
    
    const tempFood = { x: 3, y: 3, type: 'NORMAL' as FoodType };
    setFoodItem(tempFood);
    spawnObstacles(initialSnake, tempFood, level);
  };

  // Swipe Gestures Support
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !isPlaying || gameOver) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const threshold = 25; // minimum swipe distance
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) handleMobileDir('RIGHT');
      else handleMobileDir('LEFT');
    } else {
      if (dy > 0) handleMobileDir('DOWN');
      else handleMobileDir('UP');
    }
  };

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) return;
      let newDir: Direction | null = null;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (dir !== 'DOWN') newDir = 'UP';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (dir !== 'UP') newDir = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (dir !== 'RIGHT') newDir = 'LEFT';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (dir !== 'LEFT') newDir = 'RIGHT';
          break;
      }
      if (newDir) {
        e.preventDefault();
        setDir(newDir);
        directionRef.current = newDir;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver, dir]);

  // Main game physics tick loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const gameTick = () => {
      // Increment ticks since last eaten
      ticksSinceLastEatRef.current += 1;
      if (ticksSinceLastEatRef.current > 25) {
        setCombo(1);
      }

      // decrement slowTicks count if active
      if (slowTicks > 0) {
        setSlowTicks((prev) => prev - 1);
      }

      setSnake((prevSnake) => {
        const head = prevSnake[0];
        const currentDir = directionRef.current;
        let newHead = { ...head };

        switch (currentDir) {
          case 'UP': newHead.y -= 1; break;
          case 'DOWN': newHead.y += 1; break;
          case 'LEFT': newHead.x -= 1; break;
          case 'RIGHT': newHead.x += 1; break;
        }

        // --- NEW UNDERSEA PORTALS (🌀) LOGIC ---
        let teleported = false;
        if (newHead.x === PORTALS[0].x && newHead.y === PORTALS[0].y) {
          newHead = { ...PORTALS[1] };
          teleported = true;
        } else if (newHead.x === PORTALS[1].x && newHead.y === PORTALS[1].y) {
          newHead = { ...PORTALS[0] };
          teleported = true;
        }
        if (teleported) {
          playSound('win', userProgress.soundEnabled);
          triggerHaptic(25, userProgress.hapticEnabled);
          spawnFloatingIcon(newHead.x, newHead.y, '🌀 Whirlpool Warp!', '#A855F7');
        }

        // Collision Checks: Wall, Self, or Obstacles
        const isBoundaryCollision = newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE;
        const isSelfCollision = prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y);
        const isObstacleCollision = obstacles.some((obs) => obs.x === newHead.x && obs.y === newHead.y);

        if (isBoundaryCollision || isSelfCollision || isObstacleCollision) {
          if (hasShield) {
            // Shield absorbs collision!
            setHasShield(false);
            playSound('lose', userProgress.soundEnabled); // Play deep pop sound
            triggerHaptic(40, userProgress.hapticEnabled);
            
            // Wall crash survival wraps snake onto opposite side
            if (isBoundaryCollision) {
              if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
              else if (newHead.x >= GRID_SIZE) newHead.x = 0;
              if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
              else if (newHead.y >= GRID_SIZE) newHead.y = 0;
              spawnFloatingIcon(head.x, head.y, '🫧 Shield Burst (Safe!)', '#22D3EE');
            } else {
              // Self or Obstacle survival flashes safe
              spawnFloatingIcon(head.x, head.y, '🛡️ Shield Deflected!', '#38BDF8');
              return prevSnake; // Ignore tick to let user turn away
            }
          } else {
            // No shield - game over
            setGameOver(true);
            setIsPlaying(false);
            playSound('lose', userProgress.soundEnabled);
            triggerHaptic(50, userProgress.hapticEnabled);
            return prevSnake;
          }
        }

        const newSnake = [newHead, ...prevSnake];

        // Eat food check
        if (newHead.x === foodItem.x && newHead.y === foodItem.y) {
          playSound('win', userProgress.soundEnabled);
          triggerHaptic(20, userProgress.hapticEnabled);

          // Calculate new combo
          let currentCombo = 1;
          if (ticksSinceLastEatRef.current <= 25) {
            currentCombo = Math.min(4, combo + 1);
          }
          setCombo(currentCombo);
          ticksSinceLastEatRef.current = 0;

          // Handle rewards based on eaten FoodType
          let scoreGain = 1;
          let coinGain = 2;
          let floatingText = '+1 Point';
          let floatingColor = '#F97316';

          if (foodItem.type === 'GOLDEN') {
            scoreGain = (1 + Math.floor(level / 100)) * 3;
            coinGain = (2 + Math.floor(level / 400)) * 4;
            floatingText = `✨ Golden Pearl! +${scoreGain}`;
            floatingColor = '#F5A623';
            spawnFloatingIcon(newHead.x, newHead.y, `🪙 +${coinGain} Coins`, '#F5A623');
          } else if (foodItem.type === 'SHIELD') {
            setHasShield(true);
            scoreGain = 1 + Math.floor(level / 150);
            coinGain = 2 + Math.floor(level / 500);
            floatingText = '🫧 Bubble Shield!';
            floatingColor = '#22D3EE';
          } else if (foodItem.type === 'SLOW') {
            setSlowTicks(12); // slow for 12 game ticks
            scoreGain = 1 + Math.floor(level / 150);
            coinGain = 2 + Math.floor(level / 500);
            floatingText = '🌿 Kelp Slow-mo!';
            floatingColor = '#10B981';
          } else {
            scoreGain = 1 + Math.floor(level / 150);
            coinGain = 2 + Math.floor(level / 500);
            floatingText = `🦐 Tasty! +${scoreGain}`;
            floatingColor = '#FF6B5D';
          }

          // Apply combo multiplier to score gain
          scoreGain = scoreGain * currentCombo;
          if (currentCombo > 1) {
            floatingText = `🔥 x${currentCombo} Combo! ${floatingText}`;
          }

          spawnFloatingIcon(newHead.x, newHead.y, floatingText, floatingColor);

          const nextScore = score + scoreGain;
          setScore(nextScore);

          if (nextScore > highScore) {
            setHighScore(nextScore);
            localStorage.setItem('ocean_snake_highscore', nextScore.toString());
          }

          setEarnedCoins((prev) => prev + coinGain);
          onAddCoins(coinGain);

          // Level up dynamically
          if (level < 10000 && nextScore % 2 === 0) {
            setLevel((prev) => Math.min(10000, prev + 120));
          }

          spawnFoodItem(newSnake, obstacles);
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const intervalId = setInterval(gameTick, getSpeed());
    return () => clearInterval(intervalId);
  }, [isPlaying, gameOver, foodItem, obstacles, level, score, highScore, hasShield, slowTicks, combo]);

  const handleMobileDir = (newDir: Direction) => {
    if (!isPlaying || gameOver) return;
    triggerHaptic(10, userProgress.hapticEnabled);
    const curDir = directionRef.current;
    if (newDir === 'UP' && curDir !== 'DOWN') { setDir('UP'); directionRef.current = 'UP'; }
    if (newDir === 'DOWN' && curDir !== 'UP') { setDir('DOWN'); directionRef.current = 'DOWN'; }
    if (newDir === 'LEFT' && curDir !== 'RIGHT') { setDir('LEFT'); directionRef.current = 'LEFT'; }
    if (newDir === 'RIGHT' && curDir !== 'LEFT') { setDir('RIGHT'); directionRef.current = 'RIGHT'; }
  };

  const handleLevelChange = (val: number) => {
    playSound('tap', userProgress.soundEnabled);
    const nextLevel = Math.max(0, Math.min(10000, val));
    setLevel(nextLevel);
    
    // update obstacles preview
    spawnObstacles(snake, foodItem, nextLevel);
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[#FBF6F1] text-[#2B1F2E] overflow-y-auto select-none" id="snake_game_wrapper">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0" id="snake_header">
        <button 
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display font-extrabold text-base tracking-tight text-[#FF6B5D]">Ocean Snake Advanced</h2>
          <p className="text-[9px] font-bold text-neutral-500 uppercase">Swim & Protect Your Tail</p>
        </div>
        <button 
          onClick={resetGame}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Score and Stats Bar */}
      <div className="grid grid-cols-3 gap-2 mb-3 shrink-0 text-center">
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[8px] font-black uppercase text-neutral-400">Score</p>
          <p className="text-sm font-black text-[#FF6B5D]">{score}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[8px] font-black uppercase text-neutral-400">High Score</p>
          <p className="text-sm font-black text-[#6B4E9E]">{highScore}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[8px] font-black uppercase text-neutral-400">Coins Won</p>
          <p className="text-sm font-black text-[#F5A623]">🪙 {earnedCoins}</p>
        </div>
      </div>

      {/* Buff / Effect Indicators */}
      <div className="flex gap-2 mb-2 shrink-0 justify-center">
        {combo > 1 && (
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-600 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wide animate-bounce">
            🔥 {combo}x Combo Active
          </div>
        )}
        {hasShield && (
          <div className="flex items-center gap-1 bg-cyan-50 border border-cyan-200 text-cyan-600 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wide animate-pulse">
            <Shield className="w-3 h-3 text-cyan-500" /> Bubble Shield active
          </div>
        )}
        {slowTicks > 0 && (
          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wide animate-pulse">
            <Zap className="w-3 h-3 text-emerald-500" /> Current slowed ({slowTicks})
          </div>
        )}
      </div>

      {/* Speed Level Tuning Slider (0 - 10000) */}
      <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3 mb-3 shrink-0 shadow-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-black uppercase text-[#6E6270] flex items-center gap-1">
            <Star className="w-3 h-3 text-[#F5A623] fill-current" /> Speed Level (0-10000)
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
          onChange={(e) => handleLevelChange(parseInt(e.target.value, 10))}
          className="w-full accent-[#FF6B5D] h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between mt-1.5 gap-1">
          <button 
            onClick={() => handleLevelChange(level - 1000)}
            disabled={isPlaying}
            className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] active:bg-[#FFEFEC] disabled:opacity-50 text-neutral-600 cursor-pointer"
          >
            -1000
          </button>
          <button 
            onClick={() => handleLevelChange(level - 100)}
            disabled={isPlaying}
            className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] active:bg-[#FFEFEC] disabled:opacity-50 text-neutral-600 cursor-pointer"
          >
            -100
          </button>
          <button 
            onClick={() => handleLevelChange(level + 100)}
            disabled={isPlaying}
            className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] active:bg-[#FFEFEC] disabled:opacity-50 text-neutral-600 cursor-pointer"
          >
            +100
          </button>
          <button 
            onClick={() => handleLevelChange(level + 1000)}
            disabled={isPlaying}
            className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] active:bg-[#FFEFEC] disabled:opacity-50 text-neutral-600 cursor-pointer"
          >
            +1000
          </button>
        </div>
        <p className="text-[8px] font-bold text-center text-neutral-400 mt-1 uppercase">
          {level >= 7500 ? '🔥 5 REEF OBSTACLES + HYPER CURRENT' : level >= 4500 ? '⚡ 3 REEF OBSTACLES + TURBO CURRENT' : level >= 2000 ? '🌴 1 REEF OBSTACLE + REEF CRUISE' : '🐢 CASUAL REEF CRUISE (0 REEFS)'}
        </p>
      </div>

      {/* Grid Canvas Zone */}
      <div 
        className="flex-1 flex items-center justify-center min-h-[200px] bg-sky-950 border-2 border-slate-700 rounded-3xl overflow-hidden relative shadow-inner p-1.5 touch-none" 
        id="snake_grid_canvas_container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Dynamic Coral Sea Grid Map */}
        <div className="grid grid-cols-15 gap-[1px] w-full max-w-[270px] aspect-square bg-[#101F33] rounded-2xl overflow-hidden relative">
          
          {/* Real-time Underwater floating text notifications */}
          <AnimatePresence>
            {floatingIcons.map((icon) => (
              <motion.div
                key={icon.id}
                initial={{ opacity: 1, scale: 0.8, x: `${icon.x * 6.66}%`, y: `${icon.y * 6.66}%` }}
                animate={{ opacity: 0, scale: 1.3, y: `${(icon.y - 1.8) * 6.66}%` }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="absolute z-30 font-display font-black text-[9px] px-1 py-0.5 rounded bg-slate-900/80 border border-white/10 select-none pointer-events-none drop-shadow-md flex items-center gap-0.5"
                style={{ color: icon.color }}
              >
                {icon.text}
              </motion.div>
            ))}
          </AnimatePresence>

          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
            const x = index % GRID_SIZE;
            const y = Math.floor(index / GRID_SIZE);

            const snakeSegmentIndex = snake.findIndex((segment) => segment.x === x && segment.y === y);
            const isSnake = snakeSegmentIndex !== -1;
            const isHead = snakeSegmentIndex === 0;
            const isFood = foodItem.x === x && foodItem.y === y;
            const isObstacle = obstacles.some((obs) => obs.x === x && obs.y === y);

            // Determine snake scale and opacity organic ribbons
            let segmentScale = 1;
            let segmentOpacity = 1;
            if (isSnake && !isHead) {
              const fraction = snakeSegmentIndex / snake.length;
              segmentScale = Math.max(0.45, 1 - fraction * 0.55);
              segmentOpacity = Math.max(0.35, 1 - fraction * 0.65);
            }

            // Direction rotation for Head emoji
            let rotation = 'rotate-0';
            if (isHead) {
              if (dir === 'RIGHT') rotation = 'rotate-90';
              if (dir === 'DOWN') rotation = 'rotate-180';
              if (dir === 'LEFT') rotation = '-rotate-90';
            }

            return (
              <div
                key={index}
                className="w-full aspect-square flex items-center justify-center relative bg-[#091524]/60"
              >
                {/* Undersea tile subtle texture */}
                <div className="absolute inset-[1px] rounded-xs bg-[#0F223D]/30" />

                {/* Render Portal Whirlpools */}
                {PORTALS.some((p) => p.x === x && p.y === y) && !isSnake && !isFood && !isObstacle && (
                  <motion.div
                    animate={{ rotate: 360, scale: [0.85, 1.1, 0.85] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    className="absolute inset-0.5 flex items-center justify-center text-sm z-5 select-none filter drop-shadow-[0_0_3px_#a855f7] opacity-80"
                  >
                    🌀
                  </motion.div>
                )}

                {/* Render Obstacle Corals */}
                {isObstacle && (
                  <div className="absolute inset-0.5 flex items-center justify-center text-sm z-10 select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    🪸
                  </div>
                )}

                {/* Render Food Items with customized models */}
                {isFood && (
                  <motion.div
                    animate={{ 
                      scale: [0.85, 1.15, 0.85],
                      rotate: [0, 15, -15, 0]
                    }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                    className="absolute inset-0.5 flex items-center justify-center text-sm z-10 select-none"
                  >
                    {foodItem.type === 'GOLDEN' ? (
                      <span className="filter drop-shadow-[0_0_6px_#EAB308]">✨🪙</span>
                    ) : foodItem.type === 'SHIELD' ? (
                      <span className="filter drop-shadow-[0_0_6px_#22D3EE] animate-pulse">🫧</span>
                    ) : foodItem.type === 'SLOW' ? (
                      <span className="filter drop-shadow-[0_0_6px_#10B981]">🌿</span>
                    ) : (
                      <span>🦐</span>
                    )}
                  </motion.div>
                )}

                {/* Render Snake Head and organic Tail Segments */}
                {isSnake && (
                  <motion.div
                    style={{ 
                      scale: segmentScale,
                      opacity: segmentOpacity
                    }}
                    className={`absolute inset-0.5 rounded-full flex items-center justify-center z-10 select-none shadow-xs ${
                      isHead 
                        ? 'bg-gradient-to-br from-[#FF6B5D] to-[#E14D3F] border border-white/20' 
                        : 'bg-gradient-to-br from-[#FF9B91] to-[#E15A4D]'
                    } ${isHead && hasShield ? 'ring-4 ring-cyan-400 ring-offset-1 ring-offset-sky-950 animate-pulse' : ''}`}
                  >
                    {isHead ? (
                      <span className={`text-sm transform transition-transform duration-75 ${rotation}`}>
                        {userProgress.avatar || '🐢'}
                      </span>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    )}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Start Game & Game Over overlays */}
        <AnimatePresence>
          {!isPlaying && !gameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-sky-950/95 flex flex-col items-center justify-center p-5 text-center z-20"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF6B5D] to-[#6B4E9E] flex items-center justify-center text-3xl mb-3 shadow-lg animate-bounce">
                {userProgress.avatar || '🐠'}
              </div>
              <h3 className="font-display font-black text-sm text-white mb-1">Ocean Snake Advanced</h3>
              <p className="text-[10px] text-slate-300 max-w-[210px] leading-relaxed mb-4">
                Swim through safe slots. Dodge <strong className="text-orange-400">coral reefs (🪸)</strong> which grow as you increase Speed level. Swipe directly inside the ocean grid, or use keyboard arrows!
              </p>
              
              <div className="grid grid-cols-3 gap-2 bg-slate-900/60 border border-white/10 rounded-xl p-2 mb-4 w-full max-w-[260px] text-center">
                <div className="flex flex-col items-center">
                  <span className="text-sm">🪙</span>
                  <span className="text-[8px] text-amber-400 font-bold">Golden Pearl (4x)</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm">🫧</span>
                  <span className="text-[8px] text-cyan-400 font-bold">Shield Aura</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm">🌿</span>
                  <span className="text-[8px] text-emerald-400 font-bold">Kelp Slow-mo</span>
                </div>
              </div>

              <button
                onClick={() => {
                  playSound('tap', userProgress.soundEnabled);
                  setIsPlaying(true);
                }}
                className="px-6 py-3 bg-[#FF6B5D] hover:bg-[#E55A4C] text-white font-display font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-current" /> Start Deep Swim
              </button>
            </motion.div>
          )}

          {gameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-rose-950/95 flex flex-col items-center justify-center p-5 text-center z-20"
            >
              <span className="text-4xl mb-2 animate-pulse">💥</span>
              <h3 className="font-display font-black text-base text-[#FF8B80] mb-1">Crashed into Coral Reef!</h3>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                Outstanding attempt! Your final score is <strong className="text-white text-sm bg-rose-900/50 px-2 py-0.5 rounded font-black">{score}</strong>.
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={resetGame}
                  className="px-4 py-2.5 bg-[#FF6B5D] hover:bg-[#E55A4C] text-white font-display font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Swim Again
                </button>
                <button
                  onClick={onBack}
                  className="px-4 py-2.5 bg-white text-slate-700 font-display font-black text-xs rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all border border-slate-300"
                >
                  Go Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Manual / Fallback D-Pad Controls for layout symmetry */}
      <div className="mt-3 bg-white border border-[#EDE4DC] rounded-2xl p-2.5 shadow-xs flex flex-col items-center gap-1 shrink-0" id="dpad_controller">
        <div className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
          <Info className="w-3 h-3 text-neutral-400" /> Swipe grid area to navigate directly!
        </div>
        
        <button 
          onClick={() => handleMobileDir('UP')}
          className="w-10 h-10 bg-[#FBF6F1] active:bg-[#FFEFEC] border border-[#EDE4DC] rounded-xl flex items-center justify-center shadow-xs cursor-pointer"
        >
          <ChevronUp className="w-5 h-5 text-neutral-600" />
        </button>
        <div className="flex gap-6">
          <button 
            onClick={() => handleMobileDir('LEFT')}
            className="w-10 h-10 bg-[#FBF6F1] active:bg-[#FFEFEC] border border-[#EDE4DC] rounded-xl flex items-center justify-center shadow-xs cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <div className="w-10 h-10 bg-neutral-50 rounded-full flex items-center justify-center text-[9px] font-black text-neutral-400 uppercase tracking-widest">
            {dir}
          </div>
          <button 
            onClick={() => handleMobileDir('RIGHT')}
            className="w-10 h-10 bg-[#FBF6F1] active:bg-[#FFEFEC] border border-[#EDE4DC] rounded-xl flex items-center justify-center shadow-xs cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 text-neutral-600" />
          </button>
        </div>
        <button 
          onClick={() => handleMobileDir('DOWN')}
          className="w-10 h-10 bg-[#FBF6F1] active:bg-[#FFEFEC] border border-[#EDE4DC] rounded-xl flex items-center justify-center shadow-xs cursor-pointer"
        >
          <ChevronDown className="w-5 h-5 text-neutral-600" />
        </button>
      </div>
    </div>
  );
}
