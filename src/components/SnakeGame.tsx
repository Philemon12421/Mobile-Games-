import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Play, Star, Shield, Zap, Info, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trophy, Sparkles, Coins, Compass, Waves } from 'lucide-react';

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

interface PredatorSnake {
  id: number;
  segments: Position[];
  emoji: string;
  color: string;
}

const PORTALS: Position[] = [
  { x: 2, y: 2 },
  { x: 12, y: 12 }
];

export default function SnakeGame({ onBack, userProgress, onAddCoins }: SnakeGameProps) {
  const accentColor = userProgress.themeColor || '#FF6B5D';
  const GRID_SIZE = 15;
  const [snake, setSnake] = useState<Position[]>([
    { x: 7, y: 7 },
    { x: 7, y: 8 },
    { x: 7, y: 9 },
  ]);
  const [predators, setPredators] = useState<PredatorSnake[]>([
    {
      id: 1,
      segments: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
      ],
      emoji: '🦈',
      color: '#A855F7',
    },
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
  const predatorTickCounterRef = useRef(0);

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

  // Generate obstacles based on Level (avoiding portals & predators)
  const spawnObstacles = (
    currentSnake: Position[],
    currentFood: Position,
    currentLevel: number,
    currentPredators: PredatorSnake[]
  ) => {
    // 0 obstacles for level < 1500, up to 5 for level >= 7000
    const obstacleCount = currentLevel >= 7500 ? 5 : currentLevel >= 4500 ? 3 : currentLevel >= 2000 ? 1 : 0;
    const newObstacles: Position[] = [];
    
    while (newObstacles.length < obstacleCount) {
      const obs = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };

      // Rules: Avoid spawning close to initial snake head (7,7), on current snake, on current food, or duplicate locations, and avoid portals/predators
      const isNearStart = Math.abs(obs.x - 7) <= 2 && Math.abs(obs.y - 7) <= 2;
      const isOnSnake = currentSnake.some((seg) => seg.x === obs.x && seg.y === obs.y);
      const isOnFood = obs.x === currentFood.x && obs.y === currentFood.y;
      const isDuplicate = newObstacles.some((o) => o.x === obs.x && o.y === obs.y);
      const isOnPortal = PORTALS.some((p) => p.x === obs.x && p.y === obs.y);
      const isOnPredator = currentPredators.some((pred) =>
        pred.segments.some((seg) => seg.x === obs.x && seg.y === obs.y)
      );

      if (!isNearStart && !isOnSnake && !isOnFood && !isDuplicate && !isOnPortal && !isOnPredator) {
        newObstacles.push(obs);
      }
    }
    setObstacles(newObstacles);
  };

  // Spawn food avoiding snake & obstacles & portals & predators
  const spawnFoodItem = (
    currentSnake: Position[],
    currentObstacles: Position[],
    currentPredators: PredatorSnake[]
  ) => {
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
        PORTALS.some((p) => p.x === newFood.x && p.y === newFood.y) ||
        currentPredators.some((pred) =>
          pred.segments.some((seg) => seg.x === newFood.x && seg.y === newFood.y)
        )
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

  // Autonomous predator pathfinding move
  const movePredators = (
    playerSnake: Position[],
    currentObstacles: Position[],
    currentPredators: PredatorSnake[]
  ): PredatorSnake[] => {
    const playerHead = playerSnake[0];
    
    return currentPredators.map((pred) => {
      const head = pred.segments[0];
      
      // Calculate 4 possible options
      const directions: { dir: Direction; pos: Position }[] = [
        { dir: 'UP', pos: { x: head.x, y: head.y - 1 } },
        { dir: 'DOWN', pos: { x: head.x, y: head.y + 1 } },
        { dir: 'LEFT', pos: { x: head.x - 1, y: head.y } },
        { dir: 'RIGHT', pos: { x: head.x + 1, y: head.y } },
      ];
      
      // Filter valid cells (inside board, avoiding corals, portals, and other predators' body parts)
      const validSteps = directions.filter((step) => {
        const p = step.pos;
        const outOfBounds = p.x < 0 || p.x >= GRID_SIZE || p.y < 0 || p.y >= GRID_SIZE;
        const hitsObstacle = currentObstacles.some((obs) => obs.x === p.x && obs.y === p.y);
        const hitsPortal = PORTALS.some((port) => port.x === p.x && port.y === p.y);
        
        const hitsOtherPredator = currentPredators.some((other) => {
          if (other.id === pred.id) {
            // Avoid own body tail segments
            return other.segments.slice(1).some((seg) => seg.x === p.x && seg.y === p.y);
          }
          return other.segments.some((seg) => seg.x === p.x && seg.y === p.y);
        });
        
        return !outOfBounds && !hitsObstacle && !hitsPortal && !hitsOtherPredator;
      });
      
      let bestPos = head;
      if (validSteps.length > 0) {
        // Greedy choice towards player head
        validSteps.sort((a, b) => {
          const distA = Math.abs(a.pos.x - playerHead.x) + Math.abs(a.pos.y - playerHead.y);
          const distB = Math.abs(b.pos.x - playerHead.x) + Math.abs(b.pos.y - playerHead.y);
          return distA - distB;
        });
        bestPos = validSteps[0].pos;
      } else {
        // Fallback to any in-bound step
        const boundsSteps = directions.filter((step) => {
          const p = step.pos;
          return p.x >= 0 && p.x < GRID_SIZE && p.y >= 0 && p.y < GRID_SIZE;
        });
        if (boundsSteps.length > 0) {
          bestPos = boundsSteps[Math.floor(Math.random() * boundsSteps.length)].pos;
        }
      }
      
      const newSegments = [bestPos, ...pred.segments.slice(0, pred.segments.length - 1)];
      return {
        ...pred,
        segments: newSegments,
      };
    });
  };

  // Check and spawn additional predators at score checkpoints
  const checkAndSpawnPredators = (currentScore: number, currentPredators: PredatorSnake[]): PredatorSnake[] => {
    const updated = [...currentPredators];
    
    // Predator 2 (Eel) at score >= 8
    if (currentScore >= 8 && !updated.some((p) => p.id === 2)) {
      updated.push({
        id: 2,
        segments: [
          { x: GRID_SIZE - 1, y: 0 },
          { x: GRID_SIZE - 1, y: 1 },
        ],
        emoji: '🐍',
        color: '#F43F5E', // rose
      });
      spawnFloatingIcon(GRID_SIZE - 1, 0, '⚠️ Predator Eel Spawned!', '#F43F5E');
    }
    
    // Predator 3 (Squid) at score >= 20
    if (currentScore >= 20 && !updated.some((p) => p.id === 3)) {
      updated.push({
        id: 3,
        segments: [
          { x: 0, y: GRID_SIZE - 1 },
          { x: 1, y: GRID_SIZE - 1 },
        ],
        emoji: '🦑',
        color: '#EF4444', // red
      });
      spawnFloatingIcon(0, GRID_SIZE - 1, '⚠️ Predator Squid Spawned!', '#EF4444');
    }
    
    return updated;
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
    const initialPredators = [
      {
        id: 1,
        segments: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
        ],
        emoji: '🦈',
        color: '#A855F7',
      }
    ];
    setSnake(initialSnake);
    setPredators(initialPredators);
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
    predatorTickCounterRef.current = 0;
    
    const tempFood = { x: 3, y: 3, type: 'NORMAL' as FoodType };
    setFoodItem(tempFood);
    spawnObstacles(initialSnake, tempFood, level, initialPredators);
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

      // --- AUTONOMOUS PREDATORS MOVEMENT & COLLISION PHASE ---
      predatorTickCounterRef.current += 1;
      let nextPredators = predators;
      
      if (predatorTickCounterRef.current % 2 === 0) {
        nextPredators = movePredators(snake, obstacles, predators);
        setPredators(nextPredators);
      }

      // Check if predator head collides with any part of player's snake body
      let predatorHitPlayer = false;
      let hitPredator: PredatorSnake | undefined;
      for (const pred of nextPredators) {
        const head = pred.segments[0];
        if (snake.some((seg) => seg.x === head.x && seg.y === head.y)) {
          predatorHitPlayer = true;
          hitPredator = pred;
          break;
        }
      }

      if (predatorHitPlayer && hitPredator) {
        if (hasShield) {
          setHasShield(false);
          playSound('lose', userProgress.soundEnabled);
          triggerHaptic(40, userProgress.hapticEnabled);
          spawnFloatingIcon(snake[0].x, snake[0].y, '🛡️ Predator Bounced!', '#38BDF8');
          
          // Reset this specific predator to its corner
          setPredators((prevPreds) =>
            prevPreds.map((p) => {
              if (p.id === hitPredator!.id) {
                let corner = { x: 0, y: 0 };
                if (p.id === 2) corner = { x: GRID_SIZE - 1, y: 0 };
                if (p.id === 3) corner = { x: 0, y: GRID_SIZE - 1 };
                return {
                  ...p,
                  segments: [corner, { ...corner }],
                };
              }
              return p;
            })
          );
          return; // Ignore this tick to let player escape
        } else {
          setGameOver(true);
          setIsPlaying(false);
          playSound('lose', userProgress.soundEnabled);
          triggerHaptic(50, userProgress.hapticEnabled);
          return;
        }
      }

      // --- PLAYER MOVEMENT PHASE ---
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

        // Collision Checks: Wall, Self, Obstacles, or Predator segments
        const isBoundaryCollision = newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE;
        const isSelfCollision = prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y);
        const isObstacleCollision = obstacles.some((obs) => obs.x === newHead.x && obs.y === newHead.y);
        
        let isPredatorCollision = false;
        let collidedPredator: PredatorSnake | undefined;
        for (const pred of nextPredators) {
          if (pred.segments.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
            isPredatorCollision = true;
            collidedPredator = pred;
            break;
          }
        }

        if (isBoundaryCollision || isSelfCollision || isObstacleCollision || isPredatorCollision) {
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
            } else if (isPredatorCollision && collidedPredator) {
              spawnFloatingIcon(head.x, head.y, '🛡️ Shield Deflected Predator!', '#38BDF8');
              // Reset predator
              setPredators((prevPreds) =>
                prevPreds.map((p) => {
                  if (p.id === collidedPredator!.id) {
                    let corner = { x: 0, y: 0 };
                    if (p.id === 2) corner = { x: GRID_SIZE - 1, y: 0 };
                    if (p.id === 3) corner = { x: 0, y: GRID_SIZE - 1 };
                    return {
                      ...p,
                      segments: [corner, { ...corner }],
                    };
                  }
                  return p;
                })
              );
              return prevSnake; // Ignore tick to let user turn away
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

          // Dynamic Predator spawn checks on score update
          const updatedPreds = checkAndSpawnPredators(nextScore, nextPredators);
          setPredators(updatedPreds);

          spawnFoodItem(newSnake, obstacles, updatedPreds);
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const intervalId = setInterval(gameTick, getSpeed());
    return () => clearInterval(intervalId);
  }, [
    isPlaying,
    gameOver,
    foodItem,
    obstacles,
    level,
    score,
    highScore,
    hasShield,
    slowTicks,
    combo,
    predators,
    snake,
    userProgress.soundEnabled,
    userProgress.hapticEnabled,
  ]);

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
    spawnObstacles(snake, foodItem, nextLevel, predators);
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[#FBF6F1] text-[#2B1F2E] overflow-y-auto select-none" id="snake_game_wrapper">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5 shrink-0" id="snake_header">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 active:scale-95 transition-all shadow-xs"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-600" />
        </button>
        <div className="text-center">
          <h2 className="font-display font-extrabold text-lg tracking-tight text-[#FF6B5D]" style={{ color: accentColor }}>Ocean Snake Advanced</h2>
          <div className="flex items-center gap-1 mt-0.5 justify-center">
            <span className="text-[10px] font-bold text-neutral-400 bg-white border border-[#EDE4DC] px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
              <span>{userProgress.avatar || '🐢'}</span>
              <span>{userProgress.nickname}</span>
            </span>
          </div>
        </div>
        <button 
          onClick={resetGame}
          className="w-10 h-10 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 active:scale-95 transition-all shadow-xs"
        >
          <RotateCcw className="w-4 h-4 text-neutral-600" />
        </button>
      </div>

      {/* Score and Stats Bar */}
      <div className="grid grid-cols-3 gap-2.5 mb-3.5 shrink-0 text-center" id="score_stats_grid">
        <motion.div 
          whileHover={{ y: -1 }}
          className="bg-white border border-[#EDE4DC] rounded-2xl p-2 flex flex-col justify-between shadow-2xs relative overflow-hidden h-14"
        >
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: accentColor }} />
          <p className="text-[8px] font-black uppercase text-neutral-400 tracking-wider flex items-center justify-center gap-0.5 mt-1">
            <Sparkles className="w-2.5 h-2.5 text-neutral-400" /> Score
          </p>
          <p className="text-sm font-black font-display mb-1.5" style={{ color: accentColor }}>{score}</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -1 }}
          className="bg-white border border-[#EDE4DC] rounded-2xl p-2 flex flex-col justify-between shadow-2xs relative overflow-hidden h-14"
        >
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#6B4E9E]" />
          <p className="text-[8px] font-black uppercase text-neutral-400 tracking-wider flex items-center justify-center gap-0.5 mt-1">
            <Trophy className="w-2.5 h-2.5 text-[#F5A623] fill-yellow-50" /> High
          </p>
          <p className="text-sm font-black text-[#6B4E9E] font-display mb-1.5">{highScore}</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -1 }}
          className="bg-white border border-[#EDE4DC] rounded-2xl p-2 flex flex-col justify-between shadow-2xs relative overflow-hidden h-14"
        >
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#F5A623]" />
          <p className="text-[8px] font-black uppercase text-neutral-400 tracking-wider flex items-center justify-center gap-0.5 mt-1">
            <Coins className="w-2.5 h-2.5 text-[#F5A623]" /> Coins
          </p>
          <p className="text-sm font-black text-[#F5A623] font-display mb-1.5">🪙 {earnedCoins}</p>
        </motion.div>
      </div>

      {/* Buff / Effect Indicators */}
      <div className="flex gap-1.5 mb-2.5 shrink-0 justify-center h-5">
        {combo > 1 && (
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-600 rounded-lg px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wide animate-bounce shadow-3xs">
            🔥 {combo}x Combo
          </div>
        )}
        {hasShield && (
          <div className="flex items-center gap-1 bg-cyan-50 border border-cyan-200 text-cyan-600 rounded-lg px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wide animate-pulse shadow-3xs">
            <Shield className="w-2.5 h-2.5 text-cyan-500" /> Bubble Shield
          </div>
        )}
        {slowTicks > 0 && (
          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wide animate-pulse shadow-3xs">
            <Zap className="w-2.5 h-2.5 text-emerald-500" /> Slowed ({slowTicks})
          </div>
        )}
      </div>

      {/* Speed Level Tuning Slider (0 - 10000) */}
      <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3 mb-3 shrink-0 shadow-2xs">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] font-black uppercase text-[#6E6270] flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-[#F5A623] fill-current animate-pulse" /> Throttle Current
          </span>
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full text-white font-display" style={{ backgroundColor: accentColor }}>
            Lvl {level}
          </span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="10000" 
          step="100"
          value={level} 
          disabled={isPlaying}
          onChange={(e) => handleLevelChange(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
          style={{ accentColor }}
        />
        <div className="flex justify-between mt-2 gap-1.5">
          {[-1000, -100, 100, 1000].map((offset) => {
            const isNegative = offset < 0;
            const formatted = isNegative ? `${offset}` : `+${offset}`;
            return (
              <button 
                key={offset}
                onClick={() => handleLevelChange(level + offset)}
                disabled={isPlaying}
                className="flex-1 text-[8.5px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] active:bg-[#FFEFEC] disabled:opacity-50 text-neutral-600 cursor-pointer transition-all hover:bg-neutral-50"
              >
                {formatted}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1 justify-center mt-2 pt-2 border-t border-dashed border-[#EDE4DC]">
          <Waves className="w-3 h-3 text-neutral-400" />
          <p className="text-[8px] font-black text-center text-neutral-400 uppercase tracking-wider">
            {level >= 7500 ? '🔥 ABYSSAL JETSTREAM (5 REEFS + HYPER Current)' : level >= 4500 ? '⚡ Turbo current (3 reefs + fast speed)' : level >= 2000 ? '🌀 Reef Cruise (1 reef + calm cruise)' : '🌊 CALM SLOTS (0 reefs + easy swim)'}
          </p>
        </div>
      </div>

      {/* Grid Canvas Zone with Sonar Bezel */}
      <div 
        className="flex-1 flex items-center justify-center min-h-[210px] bg-slate-950 border-4 border-slate-800 rounded-[28px] overflow-hidden relative shadow-2xl p-2 touch-none select-none" 
        style={{ boxShadow: `0 10px 25px -5px rgba(15, 23, 42, 0.4), inset 0 0 12px ${accentColor}10, 0 0 0 1px ${accentColor}15` }}
        id="snake_grid_canvas_container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-slate-950/80 pointer-events-none" />

        {/* Dynamic Coral Sea Grid Map */}
        <div className="grid grid-cols-15 gap-[1.5px] w-full max-w-[270px] aspect-square bg-[#0b1524] rounded-2xl overflow-hidden relative border border-slate-800/50 p-[1px]">
          
          {/* Real-time Underwater floating text notifications */}
          <AnimatePresence>
            {floatingIcons.map((icon) => (
              <motion.div
                key={icon.id}
                initial={{ opacity: 1, scale: 0.8, x: `${icon.x * 6.66}%`, y: `${icon.y * 6.66}%` }}
                animate={{ opacity: 0, scale: 1.3, y: `${(icon.y - 1.8) * 6.66}%` }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="absolute z-30 font-display font-black text-[9px] px-1.5 py-0.5 rounded bg-slate-900/90 border border-white/20 select-none pointer-events-none drop-shadow-md flex items-center gap-0.5"
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

            // Predator Cell Detection
            let isPredator = false;
            let isPredatorHead = false;
            let foundPredator: PredatorSnake | undefined;
            let predatorSegmentIndex = -1;

            for (const pred of predators) {
              const segIdx = pred.segments.findIndex((seg) => seg.x === x && seg.y === y);
              if (segIdx !== -1) {
                isPredator = true;
                isPredatorHead = segIdx === 0;
                foundPredator = pred;
                predatorSegmentIndex = segIdx;
                break;
              }
            }

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
                className="w-full aspect-square flex items-center justify-center relative bg-[#091524]/50"
              >
                {/* Undersea tile subtle texture */}
                <div className="absolute inset-[0.5px] rounded-xs bg-[#0F223D]/25" />

                {/* Render Portal Whirlpools */}
                {PORTALS.some((p) => p.x === x && p.y === y) && !isSnake && !isFood && !isObstacle && (
                  <motion.div
                    animate={{ rotate: 360, scale: [0.85, 1.1, 0.85] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    className="absolute inset-0 flex items-center justify-center text-sm z-5 select-none filter drop-shadow-[0_0_4px_#a855f7] opacity-80"
                  >
                    🌀
                  </motion.div>
                )}

                {/* Render Obstacle Corals */}
                {isObstacle && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm z-10 select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                    🪸
                  </div>
                )}

                {/* Render Predator Head and Tail Segments */}
                {isPredator && !isSnake && !isFood && !isObstacle && (
                  <motion.div
                    animate={isPredatorHead ? { scale: [0.9, 1.1, 0.9] } : {}}
                    transition={isPredatorHead ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } : undefined}
                    className="absolute inset-0.5 rounded-full flex items-center justify-center z-10 select-none shadow-sm animate-pulse"
                    style={{
                      background: isPredatorHead
                        ? `linear-gradient(135deg, ${foundPredator?.color || '#A855F7'}, #1E1B4B)`
                        : 'linear-gradient(135deg, #4C1D95, #1E1B4B)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      opacity: Math.max(0.4, 1 - predatorSegmentIndex * 0.25),
                      transform: `scale(${Math.max(0.65, 1 - predatorSegmentIndex * 0.15)})`
                    }}
                  >
                    {isPredatorHead ? (
                      <span className="text-xs">
                        {foundPredator?.emoji || '🦈'}
                      </span>
                    ) : (
                      <div className="w-1 h-1 rounded-full bg-white/45" />
                    )}
                  </motion.div>
                )}

                {/* Render Food Items with customized models */}
                {isFood && (
                  <motion.div
                    animate={{ 
                      scale: [0.85, 1.15, 0.85],
                      rotate: [0, 15, -15, 0]
                    }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                    className="absolute inset-0 flex items-center justify-center text-sm z-10 select-none"
                  >
                    {foodItem.type === 'GOLDEN' ? (
                      <span className="filter drop-shadow-[0_0_6px_#EAB308]">✨🪙</span>
                    ) : foodItem.type === 'SHIELD' ? (
                      <span className="filter drop-shadow-[0_0_6px_#22D3EE] animate-pulse">🫧</span>
                    ) : foodItem.type === 'SLOW' ? (
                      <span className="filter drop-shadow-[0_0_6px_#10B981]">🌿</span>
                    ) : (
                      <span className="filter drop-shadow-[0_2px_4px_rgba(239,68,68,0.4)]">🦐</span>
                    )}
                  </motion.div>
                )}

                {/* Render Snake Head and organic Tail Segments with Dynamic Theme Colors */}
                {isSnake && (
                  <motion.div
                    style={{ 
                      scale: segmentScale,
                      opacity: segmentOpacity,
                      background: isHead
                        ? `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`
                        : `linear-gradient(135deg, ${accentColor}bb, ${accentColor}44)`
                    }}
                    className={`absolute inset-0.5 rounded-full flex items-center justify-center z-10 select-none shadow-sm ${
                      isHead 
                        ? 'border border-white/20 shadow-md' 
                        : ''
                    } ${isHead && hasShield ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-sky-950 animate-pulse' : ''}`}
                  >
                    {isHead ? (
                      <span className={`text-sm transform transition-transform duration-75 ${rotation}`}>
                        {userProgress.avatar || '🐢'}
                      </span>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
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
              className="absolute inset-0 bg-slate-950/95 backdrop-blur-xs flex flex-col items-center justify-center p-5 text-center z-20"
            >
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center text-3xl mb-3 shadow-lg animate-bounce"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, #2B1F2E)`,
                  boxShadow: `0 8px 16px ${accentColor}30, 0 0 10px ${accentColor}20`
                }}
              >
                {userProgress.avatar || '🐠'}
              </div>
              <h3 className="font-display font-extrabold text-sm text-white mb-1.5 uppercase tracking-wide">Ocean Expedition</h3>
              <p className="text-[10px] text-slate-300 max-w-[210px] leading-relaxed mb-4 font-sans font-medium">
                Swim through safe slots. Dodge <strong className="text-[#FF6B5D]" style={{ color: accentColor }}>coral reefs (🪸)</strong>. Swipe/drag inside the sonar screen or use the compass dial below!
              </p>
              
              <div className="grid grid-cols-3 gap-1.5 bg-slate-900/80 border border-white/10 rounded-2xl p-2 mb-4 w-full max-w-[250px] text-center shadow-inner">
                <div className="flex flex-col items-center">
                  <span className="text-sm">🪙</span>
                  <span className="text-[8px] text-amber-400 font-bold mt-0.5 leading-tight">Pearl (4x)</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm">🫧</span>
                  <span className="text-[8px] text-cyan-400 font-bold mt-0.5 leading-tight">Shield Aura</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm">🌿</span>
                  <span className="text-[8px] text-emerald-400 font-bold mt-0.5 leading-tight">Kelp Slow</span>
                </div>
              </div>

              <button
                onClick={() => {
                  playSound('tap', userProgress.soundEnabled);
                  setIsPlaying(true);
                }}
                className="px-6 py-3 text-white font-display font-black text-xs rounded-2xl shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                style={{ backgroundColor: accentColor, boxShadow: `0 6px 12px ${accentColor}40` }}
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
              className="absolute inset-0 bg-slate-950/95 backdrop-blur-xs flex flex-col items-center justify-center p-5 text-center z-20"
            >
              <span className="text-4xl mb-2 animate-pulse">💥</span>
              <h3 className="font-display font-extrabold text-base text-[#FF8B80] mb-1.5 uppercase tracking-wide">Crashed into reef!</h3>
              <p className="text-[11px] text-slate-300 mb-4 leading-relaxed font-sans font-medium">
                Outstanding attempt! Your final score is <strong className="text-white text-xs bg-rose-950/60 px-2.5 py-0.5 rounded-full font-bold ml-1" style={{ border: `1px solid ${accentColor}40` }}>{score} points</strong>.
              </p>
              <div className="flex gap-2 w-full max-w-[220px]">
                <button
                  onClick={resetGame}
                  className="flex-1 py-2.5 text-white font-display font-black text-xs rounded-2xl shadow-md cursor-pointer flex items-center justify-center gap-1 active:scale-95 transition-all"
                  style={{ backgroundColor: accentColor, boxShadow: `0 4px 10px ${accentColor}30` }}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Re-swim
                </button>
                <button
                  onClick={onBack}
                  className="flex-1 py-2.5 bg-white text-slate-700 font-display font-black text-xs rounded-2xl shadow-sm cursor-pointer active:scale-95 transition-all border border-slate-200"
                >
                  Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Compass (Symmetrical D-Pad Controls) */}
      <div className="mt-3.5 bg-white/90 backdrop-blur-sm border border-[#EDE4DC] rounded-3xl p-3 shadow-xs flex flex-col items-center gap-2 shrink-0" id="dpad_controller">
        <div className="text-[8.5px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-neutral-400" /> Swipe grid or tap the Compass dial below!
        </div>
        
        {/* Symmetrical Round Navigation Ring */}
        <div className="relative w-36 h-36 rounded-full border border-[#EDE4DC] bg-[#FBF6F1]/50 shadow-inner flex items-center justify-center">
          
          {/* Decorative spinning ring tick indicators */}
          <div className="absolute inset-1 border border-dashed border-neutral-300/40 rounded-full pointer-events-none animate-[spin_40s_linear_infinite]" />

          {/* North Direction Indicator Tick Label */}
          <span className="absolute top-1 text-[7px] font-black text-neutral-400">N</span>
          {/* South Direction Indicator Tick Label */}
          <span className="absolute bottom-1 text-[7px] font-black text-neutral-400">S</span>
          {/* West Direction Indicator Tick Label */}
          <span className="absolute left-1.5 text-[7px] font-black text-neutral-400">W</span>
          {/* East Direction Indicator Tick Label */}
          <span className="absolute right-1.5 text-[7px] font-black text-neutral-400">E</span>

          {/* UP Button (North) */}
          <button 
            onClick={() => handleMobileDir('UP')}
            className={`absolute top-2 w-10 h-10 rounded-full border flex items-center justify-center shadow-xs cursor-pointer transition-all active:scale-90 ${
              dir === 'UP' 
                ? 'text-white border-2' 
                : 'bg-white hover:bg-neutral-50 border-[#EDE4DC] text-neutral-600'
            }`}
            style={dir === 'UP' ? { backgroundColor: accentColor, borderColor: accentColor, boxShadow: `0 0 10px ${accentColor}40` } : {}}
          >
            <ChevronUp className="w-5 h-5" />
          </button>

          {/* LEFT Button (West) */}
          <button 
            onClick={() => handleMobileDir('LEFT')}
            className={`absolute left-2 w-10 h-10 rounded-full border flex items-center justify-center shadow-xs cursor-pointer transition-all active:scale-90 ${
              dir === 'LEFT' 
                ? 'text-white border-2' 
                : 'bg-white hover:bg-neutral-50 border-[#EDE4DC] text-neutral-600'
            }`}
            style={dir === 'LEFT' ? { backgroundColor: accentColor, borderColor: accentColor, boxShadow: `0 0 10px ${accentColor}40` } : {}}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* CENTER Sonar Core Screen */}
          <div className="w-13 h-13 rounded-full bg-white border border-[#EDE4DC] shadow-sm flex flex-col items-center justify-center select-none relative overflow-hidden">
            <div className="absolute inset-0 bg-neutral-100/30 animate-pulse rounded-full pointer-events-none" />
            <Compass className="w-4 h-4 text-neutral-400/80 animate-[spin_8s_linear_infinite]" />
            <span className="text-[8px] font-black tracking-widest text-neutral-500 uppercase mt-0.5 z-10">
              {dir === 'UP' ? 'UP' : dir === 'DOWN' ? 'DOWN' : dir === 'LEFT' ? 'LEFT' : 'RGHT'}
            </span>
          </div>

          {/* RIGHT Button (East) */}
          <button 
            onClick={() => handleMobileDir('RIGHT')}
            className={`absolute right-2 w-10 h-10 rounded-full border flex items-center justify-center shadow-xs cursor-pointer transition-all active:scale-90 ${
              dir === 'RIGHT' 
                ? 'text-white border-2' 
                : 'bg-white hover:bg-neutral-50 border-[#EDE4DC] text-neutral-600'
            }`}
            style={dir === 'RIGHT' ? { backgroundColor: accentColor, borderColor: accentColor, boxShadow: `0 0 10px ${accentColor}40` } : {}}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* DOWN Button (South) */}
          <button 
            onClick={() => handleMobileDir('DOWN')}
            className={`absolute bottom-2 w-10 h-10 rounded-full border flex items-center justify-center shadow-xs cursor-pointer transition-all active:scale-90 ${
              dir === 'DOWN' 
                ? 'text-white border-2' 
                : 'bg-white hover:bg-neutral-50 border-[#EDE4DC] text-neutral-600'
            }`}
            style={dir === 'DOWN' ? { backgroundColor: accentColor, borderColor: accentColor, boxShadow: `0 0 10px ${accentColor}40` } : {}}
          >
            <ChevronDown className="w-5 h-5" />
          </button>

        </div>
      </div>
    </div>
  );
}
