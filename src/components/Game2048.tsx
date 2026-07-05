import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, ArrowUp, ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight, HelpCircle, Sparkles } from 'lucide-react';

interface Game2048Props {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
  highScore: number;
  onUpdateHighScore: (score: number) => void;
}

const TILE_COLORS: Record<number, { bg: string; text: string; size: string }> = {
  2: { bg: '#F5EDE5', text: '#2B1F2E', size: 'text-2xl' },
  4: { bg: '#F3E4D3', text: '#2B1F2E', size: 'text-2xl' },
  8: { bg: '#F0997B', text: '#FFFFFF', size: 'text-2xl' },
  16: { bg: '#EF9F27', text: '#FFFFFF', size: 'text-2xl' },
  32: { bg: '#FF6B5D', text: '#FFFFFF', size: 'text-2xl' },
  64: { bg: '#F5A623', text: '#FFFFFF', size: 'text-2xl' },
  128: { bg: '#C94A3D', text: '#FFFFFF', size: 'text-xl' },
  256: { bg: '#B5760A', text: '#FFFFFF', size: 'text-xl' },
  512: { bg: '#6B4E9E', text: '#FFFFFF', size: 'text-xl' },
  1024: { bg: '#4A3670', text: '#FFFFFF', size: 'text-lg' },
  2048: { bg: '#2B1F2E', text: '#FFFFFF', size: 'text-lg' },
  4096: { bg: '#2B1F2E', text: '#FF6B5D', size: 'text-base' },
};

const MILESTONES = [128, 256, 512, 1024, 2048, 4096];

export default function Game2048({ onBack, userProgress, onAddCoins, highScore, onUpdateHighScore }: Game2048Props) {
  const [grid, setGrid] = useState<number[]>(Array(16).fill(0));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [milestoneToast, setMilestoneToast] = useState<number | null>(null);

  const scoreRef = useRef(0);
  scoreRef.current = score;
  const bestTileSeenRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const spawnTile = (currentGrid: number[]) => {
    const empty = currentGrid.map((v, i) => (v === 0 ? i : null)).filter((v) => v !== null) as number[];
    if (empty.length === 0) return currentGrid;
    const idx = empty[Math.floor(Math.random() * empty.length)];
    const val = Math.random() < 0.9 ? 2 : 4;
    const copy = [...currentGrid];
    copy[idx] = val;
    return copy;
  };

  const initGame = useCallback(() => {
    let freshGrid = Array(16).fill(0);
    freshGrid = spawnTile(freshGrid);
    freshGrid = spawnTile(freshGrid);
    setGrid(freshGrid);
    setScore(0);
    setGameOver(false);
    bestTileSeenRef.current = 0;
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const rotateLeft = (g: number[]): number[] => {
    const next = Array(16).fill(0);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        next[(3 - c) * 4 + r] = g[r * 4 + c];
      }
    }
    return next;
  };

  const slideRowLeft = (row: number[], addedScoreRef: { value: number }) => {
    const filtered = row.filter((v) => v !== 0);
    const result: number[] = [];
    let i = 0;
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        const mergedVal = filtered[i] * 2;
        result.push(mergedVal);
        addedScoreRef.value += mergedVal;
        i += 2;
      } else {
        result.push(filtered[i]);
        i += 1;
      }
    }
    while (result.length < 4) result.push(0);
    return result;
  };

  const checkGameOver = (g: number[]) => {
    if (g.some((v) => v === 0)) return false;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = g[r * 4 + c];
        if (c + 1 < 4 && val === g[r * 4 + (c + 1)]) return false;
        if (r + 1 < 4 && val === g[(r + 1) * 4 + c]) return false;
      }
    }
    return true;
  };

  const handleMove = useCallback((dir: 'left' | 'up' | 'right' | 'down') => {
    if (gameOver) return;

    let tempGrid = [...grid];
    let rotations = { left: 0, up: 1, right: 2, down: 3 }[dir];
    let moved = false;
    let addedScore = { value: 0 };

    for (let i = 0; i < rotations; i++) tempGrid = rotateLeft(tempGrid);

    for (let r = 0; r < 4; r++) {
      const row = tempGrid.slice(r * 4, r * 4 + 4);
      const newRow = slideRowLeft(row, addedScore);
      for (let c = 0; c < 4; c++) {
        if (tempGrid[r * 4 + c] !== newRow[c]) moved = true;
        tempGrid[r * 4 + c] = newRow[c];
      }
    }

    const reverseRotations = (4 - rotations) % 4;
    for (let i = 0; i < reverseRotations; i++) tempGrid = rotateLeft(tempGrid);

    if (moved) {
      playSound('slide', userProgress.soundEnabled);
      triggerHaptic(12, userProgress.hapticEnabled);

      const nextGrid = spawnTile(tempGrid);
      setGrid(nextGrid);
      const nextScore = scoreRef.current + addedScore.value;
      setScore(nextScore);

      if (nextScore > highScore) onUpdateHighScore(nextScore);

      if (addedScore.value >= 64) {
        onAddCoins(Math.floor(addedScore.value / 16));
      }

      const maxTile = Math.max(...nextGrid);
      if (maxTile > bestTileSeenRef.current && MILESTONES.includes(maxTile)) {
        bestTileSeenRef.current = maxTile;
        setMilestoneToast(maxTile);
        playSound('win', userProgress.soundEnabled);
        triggerHaptic(30, userProgress.hapticEnabled);
        setTimeout(() => setMilestoneToast(null), 2200);
      }

      if (checkGameOver(nextGrid)) {
        setGameOver(true);
        playSound('lose', userProgress.soundEnabled);
        triggerHaptic(50, userProgress.hapticEnabled);
      }
    }
  }, [grid, gameOver, highScore, onUpdateHighScore, onAddCoins, userProgress]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) { e.preventDefault(); handleMove('left'); }
      else if (['ArrowRight', 'd', 'D'].includes(e.key)) { e.preventDefault(); handleMove('right'); }
      else if (['ArrowUp', 'w', 'W'].includes(e.key)) { e.preventDefault(); handleMove('up'); }
      else if (['ArrowDown', 's', 'S'].includes(e.key)) { e.preventDefault(); handleMove('down'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove]);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const threshold = 24;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? 'right' : 'left');
    } else {
      handleMove(dy > 0 ? 'down' : 'up');
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg text-ink rounded-3xl p-5 overflow-y-auto" id="g2048_game_wrapper">
      <div className="flex justify-between items-center mb-4" id="g2048_header">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-ink hover:bg-line/40 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-display font-black text-xl tracking-tight text-ink">2048 Sliders</span>
        <button
          onClick={() => { playSound('tap', userProgress.soundEnabled); initGame(); }}
          className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-ink hover:bg-line/40 transition-colors cursor-pointer"
          title="Restart Game"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4" id="g2048_scoreboard">
        <div className="bg-surface border border-line rounded-2xl p-2 px-4 shadow-sm relative flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-ink-soft uppercase leading-none mb-1">Score</p>
            <p className="font-display font-black text-xl text-coral leading-none">{score}</p>
          </div>
          <div className="w-6 h-6 rounded-lg bg-coral/10 flex items-center justify-center text-coral text-xs">🪙</div>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-2 px-4 shadow-sm relative flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-ink-soft uppercase leading-none mb-1">Best</p>
            <p className="font-display font-black text-xl text-amber leading-none">{highScore}</p>
          </div>
          <div className="w-6 h-6 rounded-lg bg-amber/10 flex items-center justify-center text-amber text-xs">🏆</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full mb-4 relative" id="g2048_grid_outer">
        {/* Milestone celebration toast */}
        <AnimatePresence>
          {milestoneToast && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.9 }}
              className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 bg-slate-900 border-2 border-amber/40 rounded-2xl px-4 py-2 shadow-lg flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber" />
              <span className="text-xs font-black text-white">{milestoneToast} tile unlocked!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="bg-[#EFE6DD] p-3 rounded-3xl relative aspect-square shadow-inner touch-none"
          id="g2048_inner_grid"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="grid grid-cols-4 gap-2.5 h-full w-full">
            {grid.map((value, idx) => {
              const style = value > 0 ? TILE_COLORS[value] || { bg: '#2B1F2E', text: '#FFFFFF', size: 'text-sm' } : { bg: '#F5EDE5', text: 'transparent', size: 'text-2xl' };
              return (
                <div
                  key={idx}
                  style={{ backgroundColor: style.bg }}
                  className={`aspect-square rounded-xl flex items-center justify-center font-display font-black ${style.size} transition-all duration-100 shadow-sm relative overflow-hidden`}
                >
                  <AnimatePresence mode="popLayout">
                    {value > 0 && (
                      <motion.span
                        key={`${idx}-${value}`}
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 15 }}
                        style={{ color: style.text }}
                        className="select-none font-bold"
                      >
                        {value}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {gameOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#2B1F2E]/90 rounded-3xl flex flex-col items-center justify-center p-6 text-center z-20 backdrop-blur-xs"
              >
                <div className="w-16 h-16 rounded-full bg-coral/20 border-2 border-coral flex items-center justify-center text-coral mb-4 text-3xl animate-bounce">
                  💀
                </div>
                <h3 className="font-display font-black text-2xl text-white mb-1">Moves Exhausted!</h3>
                <p className="text-xs text-white/70 max-w-xs mb-4">
                  Outstanding attempt! You achieved a score of <span className="text-coral font-black">{score}</span>.
                </p>
                <button
                  onClick={() => { playSound('tap', userProgress.soundEnabled); initGame(); }}
                  className="bg-coral hover:bg-coral-dark text-white font-display font-extrabold text-sm py-3 px-6 rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  Try Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col items-center" id="g2048_controls_wrapper">
        <div className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-widest mb-2 flex items-center gap-1">
          <HelpCircle className="w-3 h-3 cursor-pointer" onClick={() => setShowHelp(!showHelp)} />
          {showHelp ? 'Swipe, use arrow keys, or the buttons below!' : 'Swipe or use Arrow Keys'}
        </div>

        <div className="flex flex-col items-center gap-1.5 p-2 bg-surface/50 border border-line rounded-3xl" id="g2048_d_pad">
          <button
            onClick={() => handleMove('up')}
            className="w-12 h-12 rounded-2xl bg-surface border border-line flex items-center justify-center text-ink hover:bg-line/40 shadow-xs cursor-pointer active:scale-90 transition-transform"
          >
            <ArrowUp className="w-5 h-5 text-coral stroke-[3]" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => handleMove('left')}
              className="w-12 h-12 rounded-2xl bg-surface border border-line flex items-center justify-center text-ink hover:bg-line/40 shadow-xs cursor-pointer active:scale-90 transition-transform"
            >
              <ArrowLeftIcon className="w-5 h-5 text-coral stroke-[3]" />
            </button>
            <button
              onClick={() => handleMove('down')}
              className="w-12 h-12 rounded-2xl bg-surface border border-line flex items-center justify-center text-ink hover:bg-line/40 shadow-xs cursor-pointer active:scale-90 transition-transform"
            >
              <ArrowDown className="w-5 h-5 text-coral stroke-[3]" />
            </button>
            <button
              onClick={() => handleMove('right')}
              className="w-12 h-12 rounded-2xl bg-surface border border-line flex items-center justify-center text-ink hover:bg-line/40 shadow-xs cursor-pointer active:scale-90 transition-transform"
            >
              <ArrowRight className="w-5 h-5 text-coral stroke-[3]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
