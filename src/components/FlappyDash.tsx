import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Play, Star } from 'lucide-react';

interface FlappyDashProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

interface Obstacle {
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
}

export default function FlappyDash({ onBack, userProgress, onAddCoins }: FlappyDashProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [earnedCoins, setEarnedCoins] = useState(0);

  // Physics States
  const [birdY, setBirdY] = useState(50); // percentage 0 - 100
  const [velocity, setVelocity] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  const gameLoopRef = useRef<number | null>(null);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('ocean_flappy_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Level scaling stats
  // Speed goes from 1.5% to 4% per frame depending on Level (0 - 10000)
  const getSpeed = () => {
    return 1.2 + (level * 2.8) / 10000;
  };

  // Gravity scale: 0.1 to 0.3
  const getGravity = () => {
    return 0.12 + (level * 0.18) / 10000;
  };

  // Gap size percentage: level 0 = 35%, level 10000 = 15%
  const getGapSize = () => {
    return Math.max(16, 35 - (level * 19) / 10000);
  };

  const resetGame = () => {
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);
    setBirdY(45);
    setVelocity(0);
    setObstacles([]);
    setGameOver(false);
    setIsPlaying(false);
    setScore(0);
    setEarnedCoins(0);
  };

  const flap = () => {
    if (gameOver) return;
    if (!isPlaying) {
      setIsPlaying(true);
    }
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(12, userProgress.hapticEnabled);
    setVelocity(-2.8); // jump impulse
  };

  // Keep values in ref to avoid stale closure issues in game loop tick()
  const stateRef = useRef({
    isPlaying,
    gameOver,
    birdY,
    velocity,
    score,
    highScore,
    level,
    obstacles,
  });

  useEffect(() => {
    stateRef.current = {
      isPlaying,
      gameOver,
      birdY,
      velocity,
      score,
      highScore,
      level,
      obstacles,
    };
  }, [isPlaying, gameOver, birdY, velocity, score, highScore, level, obstacles]);

  // Game Loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    let obstacleTimer = 0;

    const tick = () => {
      const current = stateRef.current;
      if (!current.isPlaying || current.gameOver) return;

      // 1. Calculate next bird Y and velocity
      let nextBirdY = current.birdY + current.velocity;
      let nextVelocity = current.velocity + getGravity();

      if (nextBirdY <= 0 || nextBirdY >= 100) {
        // Crashed top or bottom
        setGameOver(true);
        setIsPlaying(false);
        playSound('lose', userProgress.soundEnabled);
        triggerHaptic(50, userProgress.hapticEnabled);
        return;
      }

      // 2. Spawn and move obstacles
      let updatedList = current.obstacles.map((ob) => ({
        ...ob,
        x: ob.x - getSpeed(),
      }));

      // Remove off-screen obstacles
      updatedList = updatedList.filter((ob) => ob.x > -15);

      // Spawn new obstacle
      obstacleTimer += 1;
      // Interval depends on speed
      const spawnInterval = Math.max(45, 90 - Math.floor(current.level / 200));
      if (obstacleTimer >= spawnInterval || current.obstacles.length === 0) {
        obstacleTimer = 0;
        const gap = getGapSize();
        const minHeight = 15;
        const maxHeight = 100 - gap - minHeight;
        const topHeight = minHeight + Math.random() * (maxHeight - minHeight);
        const bottomHeight = 100 - topHeight - gap;

        updatedList.push({
          x: 100,
          topHeight,
          bottomHeight,
          passed: false,
        });
      }

      // Check for passes & score increment
      let scoreGainTotal = 0;
      let coinsToAwardTotal = 0;
      let hasPassed = false;
      updatedList.forEach((ob) => {
        if (ob.x < 25 && !ob.passed) {
          ob.passed = true;
          hasPassed = true;
          const scoreGain = 1 + Math.floor(current.level / 500);
          scoreGainTotal += scoreGain;

          const coinsToAward = 3 + Math.floor(current.level / 1000);
          coinsToAwardTotal += coinsToAward;
        }
      });

      // 3. Collision checks (bird is physically placed at constant x=25%)
      const birdX = 25;
      const collided = updatedList.some((ob) => {
        // Obstacle width is 12% of screen
        if (ob.x < birdX + 4 && ob.x + 12 > birdX - 4) {
          // Check y bounds
          const isCollidingTop = nextBirdY < ob.topHeight;
          const isCollidingBottom = nextBirdY > (100 - ob.bottomHeight);
          return isCollidingTop || isCollidingBottom;
        }
        return false;
      });

      if (collided) {
        setGameOver(true);
        setIsPlaying(false);
        playSound('lose', userProgress.soundEnabled);
        triggerHaptic(50, userProgress.hapticEnabled);
        return;
      }

      // Apply changes synchronously in one frame
      setBirdY(nextBirdY);
      setVelocity(nextVelocity);
      setObstacles(updatedList);

      if (hasPassed) {
        const nextScore = current.score + scoreGainTotal;
        setScore(nextScore);
        if (nextScore > current.highScore) {
          setHighScore(nextScore);
          localStorage.setItem('ocean_flappy_highscore', nextScore.toString());
        }

        setEarnedCoins((c) => c + coinsToAwardTotal);
        onAddCoins(coinsToAwardTotal);

        if (current.level < 10000) {
          setLevel((prevLvl) => Math.min(10000, prevLvl + 80));
        }

        playSound('win', userProgress.soundEnabled);
        triggerHaptic(20, userProgress.hapticEnabled);
      }

      gameLoopRef.current = requestAnimationFrame(tick);
    };

    gameLoopRef.current = requestAnimationFrame(tick);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [isPlaying, gameOver]);

  const handleLevelSlider = (val: number) => {
    playSound('tap', userProgress.soundEnabled);
    setLevel(Math.max(0, Math.min(10000, val)));
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[#FBF6F1] text-[#2B1F2E] overflow-y-auto" id="flappy_game_wrapper">
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 shrink-0" id="flappy_header">
        <button 
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display font-extrabold text-base tracking-tight text-[#F5A623]">Flappy Dash</h2>
          <p className="text-[9px] font-bold text-neutral-500 uppercase">Glide & Dodge</p>
        </div>
        <button 
          onClick={resetGame}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Scores Dashboard */}
      <div className="grid grid-cols-3 gap-2 mb-3 shrink-0 text-center">
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[8px] font-black uppercase text-neutral-400">Score</p>
          <p className="text-sm font-black text-[#F5A623]">{score}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[8px] font-black uppercase text-neutral-400">High Score</p>
          <p className="text-sm font-black text-[#6B4E9E]">{highScore}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[8px] font-black uppercase text-neutral-400">Coins Won</p>
          <p className="text-sm font-black text-[#FF6B5D]">🪙 {earnedCoins}</p>
        </div>
      </div>

      {/* Level progression slider (0 - 10000) */}
      <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3 mb-3 shrink-0 shadow-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-black uppercase text-[#6E6270] flex items-center gap-1">
            <Star className="w-3 h-3 text-[#F5A623] fill-current" /> Flap Difficulty (Level 0-10000)
          </span>
          <span className="text-xs font-black text-[#F5A623]">Lvl {level}</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="10000" 
          step="100"
          value={level} 
          disabled={isPlaying}
          onChange={(e) => handleLevelSlider(parseInt(e.target.value, 10))}
          className="w-full accent-[#F5A623] h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between mt-1.5 gap-1">
          <button 
            onClick={() => handleLevelSlider(level - 1000)}
            disabled={isPlaying}
            className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] active:bg-[#FFEFEC] disabled:opacity-50 text-neutral-600"
          >
            -1000
          </button>
          <button 
            onClick={() => handleLevelSlider(level - 100)}
            disabled={isPlaying}
            className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] active:bg-[#FFEFEC] disabled:opacity-50 text-neutral-600"
          >
            -100
          </button>
          <button 
            onClick={() => handleLevelSlider(level + 100)}
            disabled={isPlaying}
            className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] active:bg-[#FFEFEC] disabled:opacity-50 text-neutral-600"
          >
            +100
          </button>
          <button 
            onClick={() => handleLevelSlider(level + 1000)}
            disabled={isPlaying}
            className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] active:bg-[#FFEFEC] disabled:opacity-50 text-neutral-600"
          >
            +1000
          </button>
        </div>
      </div>

      {/* Physics Canvas Screen */}
      <div 
        onClick={flap}
        className="flex-1 min-h-[220px] bg-sky-50 border border-[#EDE4DC] rounded-3xl overflow-hidden relative shadow-inner cursor-pointer"
        id="flappy_game_tap_zone"
      >
        {/* Dynamic Seaweed/Sky Obstacles */}
        {obstacles.map((ob, idx) => (
          <React.Fragment key={idx}>
            {/* Top seaweed obstacle */}
            <div 
              className="absolute bg-emerald-500 rounded-b-xl border-x-2 border-b-2 border-emerald-700"
              style={{
                left: `${ob.x}%`,
                width: '12%',
                top: 0,
                height: `${ob.topHeight}%`,
              }}
            />
            {/* Bottom seaweed obstacle */}
            <div 
              className="absolute bg-emerald-500 rounded-t-xl border-x-2 border-t-2 border-emerald-700"
              style={{
                left: `${ob.x}%`,
                width: '12%',
                bottom: 0,
                height: `${ob.bottomHeight}%`,
              }}
            />
          </React.Fragment>
        ))}

        {/* Player Fish Mascot */}
        <div 
          className="absolute w-8 h-8 rounded-full bg-[#F5A623] border border-white flex items-center justify-center text-base shadow-xs"
          style={{
            left: '25%',
            top: `${birdY}%`,
            transform: `translate(-50%, -50%) rotate(${Math.min(45, Math.max(-45, velocity * 15))}deg)`,
            transition: 'transform 0.08s ease'
          }}
        >
          {userProgress.avatar || '🐠'}
        </div>

        {/* Score Readout in Game */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-2xl font-black text-[#2B1F2E]/30 pointer-events-none select-none">
          {score}
        </div>

        {/* Start / Game Over screens */}
        <AnimatePresence>
          {!isPlaying && !gameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#FBF6F1]/90 flex flex-col items-center justify-center p-4 text-center z-20 pointer-events-none"
            >
              <span className="text-3xl mb-1.5">🐠</span>
              <h3 className="font-display font-black text-sm text-[#2B1F2E] mb-1">Flappy Coral Dash</h3>
              <p className="text-[10px] text-neutral-500 max-w-[180px] leading-snug mb-3">
                Tap or click ANYWHERE inside this aquarium to swim up. Avoid dangerous coral spikes!
              </p>
              <button
                onClick={flap}
                className="px-5 py-2.5 bg-[#F5A623] text-white font-display font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1 pointer-events-auto cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Tap To Swim
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
              <span className="text-4xl mb-1">🐡</span>
              <h3 className="font-display font-black text-sm text-[#C94A3D] mb-1">Crashed into Coral!</h3>
              <p className="text-[10px] text-neutral-600 mb-3">
                You scored <strong className="text-lg font-black">{score}</strong> pts
              </p>
              <div className="flex gap-2">
                <button
                  onClick={resetGame}
                  className="px-4 py-2 bg-[#F5A623] hover:bg-[#E59513] text-white font-display font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Try Again
                </button>
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-white border border-[#EDE4DC] text-neutral-600 font-display font-black text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Exit Game
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 text-center text-[10px] text-neutral-400 font-bold">
        ℹ️ PRO-TIP: Speed and Gravity intensify as you crank the levels up!
      </div>
    </div>
  );
}
