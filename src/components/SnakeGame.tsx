import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Play, Pause, Trophy, Star, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface SnakeGameProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
interface Position {
  x: number;
  y: number;
}

export default function SnakeGame({ onBack, userProgress, onAddCoins }: SnakeGameProps) {
  const GRID_SIZE = 15;
  const [snake, setSnake] = useState<Position[]>([
    { x: 7, y: 7 },
    { x: 7, y: 8 },
    { x: 7, y: 9 },
  ]);
  const [food, setFood] = useState<Position>({ x: 3, y: 3 });
  const [dir, setDir] = useState<Direction>('UP');
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // Level system: 0 to 10000
  const [level, setLevel] = useState(1);
  const [earnedCoins, setEarnedCoins] = useState(0);

  const directionRef = useRef<Direction>('UP');

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('ocean_snake_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Calculate speed based on level: level 0 = 200ms, level 10000 = 30ms
  // Scale dynamically
  const getSpeed = () => {
    return Math.max(25, 200 - Math.floor((level * 175) / 10000));
  };

  // Generate random food position not on snake
  const spawnFood = (currentSnake: Position[]) => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    setFood(newFood);
  };

  // Reset Game
  const resetGame = () => {
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);
    setSnake([
      { x: 7, y: 7 },
      { x: 7, y: 8 },
      { x: 7, y: 9 },
    ]);
    setDir('UP');
    directionRef.current = 'UP';
    setGameOver(false);
    setIsPlaying(false);
    setScore(0);
    setEarnedCoins(0);
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

  // Main game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const gameTick = () => {
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

        // Boundary collision
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          setGameOver(true);
          setIsPlaying(false);
          playSound('lose', userProgress.soundEnabled);
          triggerHaptic(50, userProgress.hapticEnabled);
          return prevSnake;
        }

        // Self collision
        if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
          setGameOver(true);
          setIsPlaying(false);
          playSound('lose', userProgress.soundEnabled);
          triggerHaptic(50, userProgress.hapticEnabled);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Eat food check
        if (newHead.x === food.x && newHead.y === food.y) {
          playSound('win', userProgress.soundEnabled);
          triggerHaptic(20, userProgress.hapticEnabled);
          
          // Score formula increases based on level to reward higher difficulties
          const scoreGain = 1 + Math.floor(level / 100);
          const nextScore = score + scoreGain;
          setScore(nextScore);
          
          if (nextScore > highScore) {
            setHighScore(nextScore);
            localStorage.setItem('ocean_snake_highscore', nextScore.toString());
          }

          // Coin reward
          const coinGain = 2 + Math.floor(level / 500);
          setEarnedCoins(prev => prev + coinGain);
          onAddCoins(coinGain);

          // Level up progress automatically if playing
          if (level < 10000 && nextScore % 3 === 0) {
            setLevel(prev => Math.min(10000, prev + 50));
          }

          spawnFood(newSnake);
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const intervalId = setInterval(gameTick, getSpeed());
    return () => clearInterval(intervalId);
  }, [isPlaying, gameOver, food, level, score, highScore]);

  const handleMobileDir = (newDir: Direction) => {
    if (!isPlaying || gameOver) return;
    triggerHaptic(10, userProgress.hapticEnabled);
    if (newDir === 'UP' && dir !== 'DOWN') { setDir('UP'); directionRef.current = 'UP'; }
    if (newDir === 'DOWN' && dir !== 'UP') { setDir('DOWN'); directionRef.current = 'DOWN'; }
    if (newDir === 'LEFT' && dir !== 'RIGHT') { setDir('LEFT'); directionRef.current = 'LEFT'; }
    if (newDir === 'RIGHT' && dir !== 'LEFT') { setDir('RIGHT'); directionRef.current = 'RIGHT'; }
  };

  const handleLevelChange = (val: number) => {
    playSound('tap', userProgress.soundEnabled);
    const nextLevel = Math.max(0, Math.min(10000, val));
    setLevel(nextLevel);
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[#FBF6F1] text-[#2B1F2E] overflow-y-auto" id="snake_game_wrapper">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0" id="snake_header">
        <button 
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display font-extrabold text-base tracking-tight text-[#FF6B5D]">Ocean Snake</h2>
          <p className="text-[9px] font-bold text-neutral-500 uppercase">Swim & Grow</p>
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

      {/* Speed Level Tuning Slider (0 - 10000) */}
      <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3 mb-3 shrink-0 shadow-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-black uppercase text-[#6E6270] flex items-center gap-1">
            <Star className="w-3 h-3 text-[#F5A623] fill-current" /> Game Level (0-10000)
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
            className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] active:bg-[#FFEFEC] disabled:opacity-50 text-neutral-600"
          >
            -1000
          </button>
          <button 
            onClick={() => handleLevelChange(level - 100)}
            disabled={isPlaying}
            className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] active:bg-[#FFEFEC] disabled:opacity-50 text-neutral-600"
          >
            -100
          </button>
          <button 
            onClick={() => handleLevelChange(level + 100)}
            disabled={isPlaying}
            className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] active:bg-[#FFEFEC] disabled:opacity-50 text-neutral-600"
          >
            +100
          </button>
          <button 
            onClick={() => handleLevelChange(level + 1000)}
            disabled={isPlaying}
            className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] active:bg-[#FFEFEC] disabled:opacity-50 text-neutral-600"
          >
            +1000
          </button>
        </div>
        <p className="text-[8px] font-bold text-center text-neutral-400 mt-1">
          {level >= 5000 ? '🔥 CHAOTIC HYPERDRIVE SPEED' : level >= 2000 ? '⚡ ADVANCED TURBO SPEED' : '🐢 CASUAL REEF CRUISE'}
        </p>
      </div>

      {/* Grid Canvas Zone */}
      <div className="flex-1 flex items-center justify-center min-h-[180px] bg-white border border-[#EDE4DC] rounded-3xl overflow-hidden relative shadow-inner p-1" id="snake_grid_canvas_container">
        <div className="grid grid-cols-15 gap-[1px] w-full max-w-[260px] aspect-square bg-[#EDE4DC]">
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
            const x = index % GRID_SIZE;
            const y = Math.floor(index / GRID_SIZE);
            const isSnake = snake.some((segment) => segment.x === x && segment.y === y);
            const isHead = snake[0].x === x && snake[0].y === y;
            const isFood = food.x === x && food.y === y;

            return (
              <div
                key={index}
                className={`w-full aspect-square rounded-xs transition-colors ${
                  isHead
                    ? 'bg-[#FF6B5D] scale-105 z-10'
                    : isSnake
                    ? 'bg-[#FF9B91]'
                    : isFood
                    ? 'bg-[#6B4E9E] animate-bounce scale-95 z-10'
                    : 'bg-white'
                }`}
              />
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
              className="absolute inset-0 bg-[#FBF6F1]/90 flex flex-col items-center justify-center p-4 text-center z-20"
            >
              <span className="text-3xl mb-1.5">🐍</span>
              <h3 className="font-display font-black text-sm text-[#2B1F2E] mb-1">Deep Coral Snake</h3>
              <p className="text-[10px] text-neutral-500 max-w-[180px] leading-snug mb-3">
                Swim through safe spots. Playable up to speed Level 10000. Use arrow keys or layout D-pad.
              </p>
              <button
                onClick={() => {
                  playSound('tap', userProgress.soundEnabled);
                  setIsPlaying(true);
                }}
                className="px-5 py-2.5 bg-[#FF6B5D] hover:bg-[#E55A4C] text-white font-display font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Start Swim
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
              <h3 className="font-display font-black text-sm text-[#C94A3D] mb-1">Crashed into Reef!</h3>
              <p className="text-[10px] text-neutral-600 mb-3">
                Final Score: <strong className="text-lg font-black">{score}</strong>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={resetGame}
                  className="px-4 py-2 bg-[#FF6B5D] hover:bg-[#E55A4C] text-white font-display font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Try Again
                </button>
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-white border border-[#EDE4DC] text-neutral-600 font-display font-black text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Interactive Mobile D-Pad Control Buttons */}
      <div className="mt-3 bg-white border border-[#EDE4DC] rounded-2xl p-2 shadow-xs flex flex-col items-center gap-1.5 shrink-0" id="dpad_controller">
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
          <div className="w-10 h-10 bg-neutral-50 rounded-full flex items-center justify-center text-[10px] font-bold text-neutral-400">
            PAD
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
