import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Play, Trophy, PartyPopper } from 'lucide-react';

interface FlappyDashProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

interface Obstacle {
  id: number;
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
}

interface ScorePopup {
  id: number;
  x: number;
  y: number;
  value: number;
}

const MAX_LEVEL = 100;
const LEVEL_KEY = 'ocean_flappy_level';

// Score needed (within the current level) to advance to the next one — grows each level
const pointsNeededForLevel = (lvl: number) => 6 + lvl * 3;

export default function FlappyDash({ onBack, userProgress, onAddCoins }: FlappyDashProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [earnedCoins, setEarnedCoins] = useState(0);

  const [birdY, setBirdY] = useState(50);
  const [velocity, setVelocity] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const [hitFlash, setHitFlash] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [levelUpToast, setLevelUpToast] = useState<number | null>(null);

  const gameLoopRef = useRef<number | null>(null);
  const obstacleIdCounter = useRef(0);
  const popupIdCounter = useRef(0);
  const levelStartScoreRef = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem('ocean_flappy_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
    const savedLevel = localStorage.getItem(LEVEL_KEY);
    if (savedLevel) setLevel(Math.min(MAX_LEVEL, Math.max(1, parseInt(savedLevel, 10))));
  }, []);

  const getDifficulty = (lvl: number) => Math.min(10000, (lvl - 1) * 100);
  const getSpeed = (lvl: number) => 1.2 + (getDifficulty(lvl) * 2.8) / 10000;
  const getGravity = (lvl: number) => 0.12 + (getDifficulty(lvl) * 0.18) / 10000;
  const getGapSize = (lvl: number) => Math.max(16, 35 - (getDifficulty(lvl) * 19) / 10000);

  const resetGame = () => {
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);
    setBirdY(45);
    setVelocity(0);
    setObstacles([]);
    setScorePopups([]);
    setGameOver(false);
    setIsPlaying(false);
    setScore(0);
    levelStartScoreRef.current = 0;
    setEarnedCoins(0);
  };

  const flap = () => {
    if (gameOver) return;
    if (!isPlaying) setIsPlaying(true);
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(12, userProgress.hapticEnabled);
    setVelocity(-2.8);
  };

  const stateRef = useRef({ isPlaying, gameOver, birdY, velocity, score, highScore, level, obstacles });
  useEffect(() => {
    stateRef.current = { isPlaying, gameOver, birdY, velocity, score, highScore, level, obstacles };
  }, [isPlaying, gameOver, birdY, velocity, score, highScore, level, obstacles]);

  const triggerCrash = () => {
    setGameOver(true);
    setIsPlaying(false);
    setHitFlash(true);
    setShakeKey((k) => k + 1);
    playSound('lose', userProgress.soundEnabled);
    triggerHaptic(50, userProgress.hapticEnabled);
  };

  useEffect(() => {
    if (hitFlash) {
      const t = setTimeout(() => setHitFlash(false), 220);
      return () => clearTimeout(t);
    }
  }, [hitFlash]);

  const checkLevelUp = (currentScore: number, currentLevel: number) => {
    if (currentLevel >= MAX_LEVEL) return currentLevel;
    const progress = currentScore - levelStartScoreRef.current;
    if (progress >= pointsNeededForLevel(currentLevel)) {
      const nextLevel = currentLevel + 1;
      localStorage.setItem(LEVEL_KEY, nextLevel.toString());
      levelStartScoreRef.current = currentScore;
      setLevelUpToast(nextLevel);
      playSound('win', userProgress.soundEnabled);
      triggerHaptic(30, userProgress.hapticEnabled);
      setTimeout(() => setLevelUpToast(null), 2200);
      return nextLevel;
    }
    return currentLevel;
  };

  useEffect(() => {
    if (!isPlaying || gameOver) return;
    let obstacleTimer = 0;

    const tick = () => {
      const current = stateRef.current;
      if (!current.isPlaying || current.gameOver) return;

      let nextBirdY = current.birdY + current.velocity;
      let nextVelocity = current.velocity + getGravity(current.level);

      if (nextBirdY <= 0 || nextBirdY >= 100) {
        triggerCrash();
        return;
      }

      let updatedList = current.obstacles.map((ob) => ({ ...ob, x: ob.x - getSpeed(current.level) }));
      updatedList = updatedList.filter((ob) => ob.x > -15);

      obstacleTimer += 1;
      const spawnInterval = Math.max(45, 90 - Math.floor(getDifficulty(current.level) / 200));
      if (obstacleTimer >= spawnInterval || current.obstacles.length === 0) {
        obstacleTimer = 0;
        const gap = getGapSize(current.level);
        const minHeight = 15;
        const maxHeight = 100 - gap - minHeight;
        const topHeight = minHeight + Math.random() * (maxHeight - minHeight);
        const bottomHeight = 100 - topHeight - gap;
        updatedList.push({ id: obstacleIdCounter.current++, x: 100, topHeight, bottomHeight, passed: false });
      }

      let scoreGainTotal = 0;
      let coinsToAwardTotal = 0;
      let hasPassed = false;
      const newPopups: ScorePopup[] = [];
      updatedList.forEach((ob) => {
        if (ob.x < 25 && !ob.passed) {
          ob.passed = true;
          hasPassed = true;
          const scoreGain = 1;
          scoreGainTotal += scoreGain;
          const coinsToAward = 3 + Math.floor(getDifficulty(current.level) / 1000);
          coinsToAwardTotal += coinsToAward;
          newPopups.push({ id: popupIdCounter.current++, x: 30, y: nextBirdY, value: scoreGain });
        }
      });

      const birdX = 25;
      const collided = updatedList.some((ob) => {
        if (ob.x < birdX + 4 && ob.x + 12 > birdX - 4) {
          const isCollidingTop = nextBirdY < ob.topHeight;
          const isCollidingBottom = nextBirdY > 100 - ob.bottomHeight;
          return isCollidingTop || isCollidingBottom;
        }
        return false;
      });

      if (collided) {
        triggerCrash();
        return;
      }

      setBirdY(nextBirdY);
      setVelocity(nextVelocity);
      setObstacles(updatedList);

      if (newPopups.length > 0) {
        setScorePopups((prev) => [...prev, ...newPopups]);
        setTimeout(() => {
          setScorePopups((prev) => prev.filter((p) => !newPopups.find((n) => n.id === p.id)));
        }, 700);
      }

      if (hasPassed) {
        const nextScore = current.score + scoreGainTotal;
        setScore(nextScore);
        if (nextScore > current.highScore) {
          setHighScore(nextScore);
          localStorage.setItem('ocean_flappy_highscore', nextScore.toString());
        }
        setEarnedCoins((c) => c + coinsToAwardTotal);
        onAddCoins(coinsToAwardTotal);

        const maybeNewLevel = checkLevelUp(nextScore, current.level);
        if (maybeNewLevel !== current.level) setLevel(maybeNewLevel);

        playSound('win', userProgress.soundEnabled);
        triggerHaptic(20, userProgress.hapticEnabled);
      }

      gameLoopRef.current = requestAnimationFrame(tick);
    };

    gameLoopRef.current = requestAnimationFrame(tick);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, gameOver]);

  const progressInLevel = Math.min(1, (score - levelStartScoreRef.current) / pointsNeededForLevel(level));

  return (
    <div className="h-full flex flex-col p-4 bg-[#FBF6F1] text-[#2B1F2E] overflow-y-auto" id="flappy_game_wrapper">

      <div className="flex items-center justify-between mb-3 shrink-0" id="flappy_header">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display font-extrabold text-base tracking-tight text-[#F5A623]">Flappy Dash</h2>
          <p className="text-[9px] font-bold text-neutral-500 uppercase">Glide & Dodge</p>
        </div>
        <button onClick={resetGame} className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Level progression card — replaces the old free-drag slider */}
      <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3.5 mb-3 shrink-0 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F5A623]/10 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-[#F5A623]" />
            </div>
            <div>
              <p className="text-[8px] font-black uppercase text-neutral-400 tracking-wider">Current Level</p>
              <p className="text-sm font-black text-[#F5A623] leading-tight">
                Level {level} <span className="text-neutral-400 font-bold">/ {MAX_LEVEL}</span>
              </p>
            </div>
          </div>
          <span className="text-[9px] font-black text-neutral-400">
            {level >= MAX_LEVEL ? 'MAX' : `${Math.floor(progressInLevel * 100)}%`}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div className="h-full bg-[#F5A623] rounded-full transition-all" style={{ width: `${progressInLevel * 100}%` }} />
        </div>
        <p className="text-[8px] font-bold text-center text-neutral-400 mt-1.5">
          Clear pipes to reach the score target and level up mid-run
        </p>
      </div>

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

      <motion.div
        key={shakeKey}
        animate={hitFlash ? { x: [0, -6, 6, -4, 4, 0] } : {}}
        transition={{ duration: 0.22 }}
        onClick={flap}
        className="flex-1 min-h-[220px] bg-sky-50 border border-[#EDE4DC] rounded-3xl overflow-hidden relative shadow-inner cursor-pointer"
        id="flappy_game_tap_zone"
      >
        <AnimatePresence>
          {levelUpToast !== null && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.9 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border-2 border-amber/40 rounded-2xl px-4 py-2.5 shadow-lg flex items-center gap-2"
            >
              <PartyPopper className="w-4 h-4 text-amber" />
              <span className="text-xs font-black text-white">Level Up! Now Level {levelUpToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {hitFlash && (
            <motion.div
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0 bg-rose-500 z-30 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {obstacles.map((ob) => (
          <React.Fragment key={ob.id}>
            <div
              className="absolute bg-emerald-500 rounded-b-xl border-x-2 border-b-2 border-emerald-700"
              style={{ left: `${ob.x}%`, width: '12%', top: 0, height: `${ob.topHeight}%` }}
            />
            <div
              className="absolute bg-emerald-500 rounded-t-xl border-x-2 border-t-2 border-emerald-700"
              style={{ left: `${ob.x}%`, width: '12%', bottom: 0, height: `${ob.bottomHeight}%` }}
            />
          </React.Fragment>
        ))}

        <AnimatePresence>
          {scorePopups.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -30, scale: 1.1 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="absolute font-display font-black text-sm text-[#F5A623] pointer-events-none select-none"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              +{p.value}
            </motion.div>
          ))}
        </AnimatePresence>

        <div
          className="absolute w-8 h-8 rounded-full bg-[#F5A623] border border-white flex items-center justify-center text-base shadow-xs"
          style={{
            left: '25%',
            top: `${birdY}%`,
            transform: `translate(-50%, -50%) rotate(${Math.min(45, Math.max(-45, velocity * 15))}deg)`,
            transition: 'transform 0.08s ease',
          }}
        >
          {userProgress.avatar || '🐠'}
        </div>

        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-2xl font-black text-[#2B1F2E]/30 pointer-events-none select-none">
          {score}
        </div>

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
                Tap or click ANYWHERE inside this aquarium to swim up. Clear pipes to level up as you go!
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
              <p className="text-[10px] text-neutral-600 mb-1">
                You scored <strong className="text-lg font-black">{score}</strong> pts
              </p>
              <p className="text-[9px] text-neutral-400 mb-3">Reached Level {level}</p>
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
      </motion.div>

      <div className="mt-3 text-center text-[10px] text-neutral-400 font-bold">
        ℹ️ Your level carries over between runs — pick up right where you left off!
      </div>
    </div>
  );
}
