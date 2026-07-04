import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Play, Star, ChevronDown } from 'lucide-react';

interface StackTowerProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

interface StackLayer {
  y: number;
  width: number;
  x: number; // offset center
  color: string;
}

export default function StackTower({ onBack, userProgress, onAddCoins }: StackTowerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [earnedCoins, setEarnedCoins] = useState(0);

  // Stacking states
  const [layers, setLayers] = useState<StackLayer[]>([
    { y: 0, width: 60, x: 20, color: '#6B4E9E' } // Base layer
  ]);
  const [currentBlock, setCurrentBlock] = useState({
    x: 0,
    width: 60,
    direction: 1 // 1 = right, -1 = left
  });

  const animationRef = useRef<number | null>(null);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('ocean_stack_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Calculate speed based on level (0 - 10000)
  // Higher level = faster slider
  const getSlideSpeed = () => {
    return 1.2 + (level * 6.5) / 10000;
  };

  // Calculate starting block width based on level (0 - 10000)
  // Level 0 = 70% width, Level 10000 = 20% width
  const getStartingWidth = () => {
    return Math.max(15, 70 - (level * 50) / 10000);
  };

  // Game tick to slide the current block
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const tick = () => {
      setCurrentBlock((prev) => {
        let nextX = prev.x + prev.direction * getSlideSpeed();
        let nextDir = prev.direction;

        // Bounce back if hit edge
        if (nextX <= 0) {
          nextX = 0;
          nextDir = 1;
        } else if (nextX + prev.width >= 100) {
          nextX = 100 - prev.width;
          nextDir = -1;
        }

        return {
          ...prev,
          x: nextX,
          direction: nextDir
        };
      });

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, gameOver, level]);

  const resetGame = () => {
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);
    const startW = getStartingWidth();
    setLayers([
      { y: 0, width: startW, x: 50 - startW / 2, color: '#6B4E9E' }
    ]);
    setCurrentBlock({
      x: 0,
      width: startW,
      direction: 1
    });
    setGameOver(false);
    setIsPlaying(false);
    setScore(0);
    setEarnedCoins(0);
  };

  const handleDrop = () => {
    if (!isPlaying || gameOver) return;

    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(20, userProgress.hapticEnabled);

    const lastLayer = layers[layers.length - 1];
    const left1 = currentBlock.x;
    const right1 = currentBlock.x + currentBlock.width;
    const left2 = lastLayer.x;
    const right2 = lastLayer.x + lastLayer.width;

    // Calculate overlap
    const overlapLeft = Math.max(left1, left2);
    const overlapRight = Math.min(right1, right2);

    if (overlapLeft >= overlapRight) {
      // Missed completely!
      setGameOver(true);
      setIsPlaying(false);
      playSound('lose', userProgress.soundEnabled);
      triggerHaptic(50, userProgress.hapticEnabled);
      return;
    }

    const overlapWidth = overlapRight - overlapLeft;
    const nextY = layers.length;

    const layerColors = ['#FF6B5D', '#F5A623', '#6B4E9E', '#3D9BE9', '#2ECC71'];
    const chosenColor = layerColors[nextY % layerColors.length];

    const newLayer: StackLayer = {
      y: nextY,
      width: overlapWidth,
      x: overlapLeft,
      color: chosenColor
    };

    setLayers((prev) => [...prev, newLayer]);
    setScore((s) => {
      const added = 1 + Math.floor(level / 1000);
      const next = s + added;
      if (next > highScore) {
        setHighScore(next);
        localStorage.setItem('ocean_stack_highscore', next.toString());
      }
      return next;
    });

    // Reward coins
    const coins = 2 + Math.floor(level / 2000);
    setEarnedCoins(c => c + coins);
    onAddCoins(coins);

    // Prepare next sliding block
    setCurrentBlock({
      x: 0,
      width: overlapWidth,
      direction: 1
    });

    // Auto level up
    if (level < 10000) {
      setLevel((prev) => Math.min(10000, prev + 150));
    }
  };

  const handleLevelChange = (val: number) => {
    playSound('tap', userProgress.soundEnabled);
    setLevel(Math.max(0, Math.min(10000, val)));
    const startW = Math.max(15, 70 - (val * 50) / 10000);
    setLayers([
      { y: 0, width: startW, x: 50 - startW / 2, color: '#6B4E9E' }
    ]);
    setCurrentBlock({
      x: 0,
      width: startW,
      direction: 1
    });
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[#FBF6F1] text-[#2B1F2E] overflow-y-auto" id="stack_game_wrapper">
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 shrink-0" id="stack_header">
        <button 
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display font-extrabold text-base tracking-tight text-[#FF6B5D]">Stack Tower</h2>
          <p className="text-[9px] font-bold text-neutral-500 uppercase">Trim blocks & align</p>
        </div>
        <button 
          onClick={resetGame}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Scores bar */}
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

      {/* Difficulty Level Slider */}
      <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3 mb-3 shrink-0 shadow-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-black uppercase text-[#6E6270] flex items-center gap-1">
            <Star className="w-3 h-3 text-[#FF6B5D] fill-current" /> Stack Level (0-10000)
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
          <button onClick={() => handleLevelChange(level - 1000)} disabled={isPlaying} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">-1000</button>
          <button onClick={() => handleLevelChange(level - 100)} disabled={isPlaying} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">-100</button>
          <button onClick={() => handleLevelChange(level + 100)} disabled={isPlaying} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">+100</button>
          <button onClick={() => handleLevelChange(level + 1000)} disabled={isPlaying} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">+1000</button>
        </div>
      </div>

      {/* Tower Canvas Zone */}
      <div 
        onClick={handleDrop}
        className="flex-1 min-h-[220px] bg-[#EFEAF7] border border-[#EDE4DC] rounded-3xl overflow-hidden relative shadow-inner cursor-pointer"
        id="stack_canvas_tap_zone"
      >
        {/* Layer stack */}
        <div className="absolute bottom-4 left-0 right-0 h-full flex flex-col justify-end" id="stack_layers_visualizer">
          {layers.slice(-7).map((layer, index) => (
            <div 
              key={layer.y}
              className="h-8 border-t border-black/10 rounded-sm relative shadow-md transition-all duration-300"
              style={{
                width: `${layer.width}%`,
                left: `${layer.x}%`,
                backgroundColor: layer.color
              }}
            >
              {/* Little detail inside block */}
              <div className="absolute top-1 left-2 text-[8px] text-white/40 font-mono">🧱 Layer {layer.y}</div>
            </div>
          ))}
        </div>

        {/* Current sliding block */}
        {isPlaying && (
          <div 
            className="absolute h-8 border-t border-black/10 rounded-sm shadow-md"
            style={{
              width: `${currentBlock.width}%`,
              left: `${currentBlock.x}%`,
              bottom: `${16 + Math.min(6, layers.length) * 32}px`,
              backgroundColor: '#FF6B5D'
            }}
          >
            <div className="absolute inset-0 bg-white/10 animate-pulse" />
          </div>
        )}

        {/* Instructions and overlays */}
        <AnimatePresence>
          {!isPlaying && !gameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#FBF6F1]/90 flex flex-col items-center justify-center p-4 text-center z-20 pointer-events-none"
            >
              <span className="text-3xl mb-1.5 animate-bounce">🧱</span>
              <h3 className="font-display font-black text-sm text-[#2B1F2E] mb-1">Ocean Block Stacker</h3>
              <p className="text-[10px] text-neutral-500 max-w-[200px] leading-snug mb-3">
                Tap anywhere inside the frame to DROP the moving block. Align with the block below. Overhang will be trimmed!
              </p>
              <button
                onClick={handleDrop}
                className="px-5 py-2.5 bg-[#FF6B5D] text-white font-display font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1 pointer-events-auto cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Tap to Start
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
              <h3 className="font-display font-black text-sm text-[#C94A3D] mb-1">Missed the Stack!</h3>
              <p className="text-[10px] text-neutral-600 mb-3">
                You stacked <strong className="text-lg font-black">{score}</strong> blocks!
              </p>
              <div className="flex gap-2">
                <button
                  onClick={resetGame}
                  className="px-4 py-2 bg-[#FF6B5D] text-white font-display font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Re-Stack
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

      {/* Manual Drop Action Bar */}
      {isPlaying && (
        <button 
          onClick={handleDrop}
          className="mt-3 py-3.5 bg-[#FF6B5D] text-white text-xs font-black uppercase rounded-2xl shadow-md cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 transition-transform"
          id="manual_drop_btn"
        >
          <ChevronDown className="w-4 h-4 animate-bounce" /> DROP LAYER
        </button>
      )}

      <div className="mt-3 text-center text-[10px] text-neutral-400 font-bold">
        ℹ️ Leveling up decreases block widths and speeds up sliding velocity!
      </div>
    </div>
  );
}
