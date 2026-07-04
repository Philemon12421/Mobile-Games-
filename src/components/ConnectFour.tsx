import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Play, Star, Sparkles } from 'lucide-react';

interface ConnectFourProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

type Player = 'player' | 'ai' | null;

export default function ConnectFour({ onBack, userProgress, onAddCoins }: ConnectFourProps) {
  // Grid 7 columns x 6 rows
  const [grid, setGrid] = useState<Player[]>(Array(42).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player | 'draw'>(null);
  const [level, setLevel] = useState(1);
  const [earnedCoins, setEarnedCoins] = useState(0);

  // Load level settings
  const initGame = () => {
    setGrid(Array(42).fill(null));
    setIsPlayerTurn(true);
    setGameOver(false);
    setWinner(null);
    setEarnedCoins(0);
  };

  useEffect(() => {
    initGame();
  }, [level]);

  // Find lowest empty row in selected column
  const getLowestEmptyRow = (col: number, currentGrid: Player[]) => {
    for (let row = 5; row >= 0; row--) {
      const idx = row * 7 + col;
      if (currentGrid[idx] === null) {
        return row;
      }
    }
    return -1;
  };

  const handleColumnDrop = (col: number) => {
    if (!isPlayerTurn || gameOver) return;

    const row = getLowestEmptyRow(col, grid);
    if (row === -1) return; // Column full!

    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);

    const targetIdx = row * 7 + col;
    const nextGrid = [...grid];
    nextGrid[targetIdx] = 'player';
    setGrid(nextGrid);

    // Check Win
    if (checkWinner('player', nextGrid)) {
      setWinner('player');
      setGameOver(true);
      playSound('win', userProgress.soundEnabled);
      triggerHaptic(50, userProgress.hapticEnabled);

      const bonus = 50 + Math.floor(level / 20);
      setEarnedCoins(bonus);
      onAddCoins(bonus);
      return;
    }

    if (nextGrid.every((cell) => cell !== null)) {
      setWinner('draw');
      setGameOver(true);
      return;
    }

    setIsPlayerTurn(false);
  };

  // AI Turn simulation
  useEffect(() => {
    if (!isPlayerTurn && !gameOver) {
      const timer = setTimeout(() => {
        makeAIMove();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, gameOver]);

  const makeAIMove = () => {
    // Collect all valid columns
    const validCols = [];
    for (let c = 0; c < 7; c++) {
      if (getLowestEmptyRow(c, grid) !== -1) {
        validCols.push(c);
      }
    }

    if (validCols.length === 0) {
      setWinner('draw');
      setGameOver(true);
      return;
    }

    // AI Select Column strategy based on Level (0 to 10000)
    let selectedCol = validCols[0];

    // Check if AI can win immediately or block player immediately
    let moveFound = false;

    if (level > 1000) {
      // 1. Can AI win immediately?
      for (const col of validCols) {
        const row = getLowestEmptyRow(col, grid);
        const testIdx = row * 7 + col;
        const testGrid = [...grid];
        testGrid[testIdx] = 'ai';
        if (checkWinner('ai', testGrid)) {
          selectedCol = col;
          moveFound = true;
          break;
        }
      }

      // 2. Can AI block player?
      if (!moveFound && level > 2500) {
        for (const col of validCols) {
          const row = getLowestEmptyRow(col, grid);
          const testIdx = row * 7 + col;
          const testGrid = [...grid];
          testGrid[testIdx] = 'player';
          if (checkWinner('player', testGrid)) {
            selectedCol = col;
            moveFound = true;
            break;
          }
        }
      }
    }

    // Otherwise select random column or central column
    if (!moveFound) {
      // Prefer center column if available
      if (validCols.includes(3) && Math.random() < 0.6) {
        selectedCol = 3;
      } else {
        selectedCol = validCols[Math.floor(Math.random() * validCols.length)];
      }
    }

    const row = getLowestEmptyRow(selectedCol, grid);
    const targetIdx = row * 7 + selectedCol;
    const nextGrid = [...grid];
    nextGrid[targetIdx] = 'ai';
    setGrid(nextGrid);

    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(12, userProgress.hapticEnabled);

    if (checkWinner('ai', nextGrid)) {
      setWinner('ai');
      setGameOver(true);
      playSound('lose', userProgress.soundEnabled);
      triggerHaptic(40, userProgress.hapticEnabled);
      return;
    }

    if (nextGrid.every((cell) => cell !== null)) {
      setWinner('draw');
      setGameOver(true);
      return;
    }

    setIsPlayerTurn(true);
  };

  const checkWinner = (p: Player, currentGrid: Player[]) => {
    // Horizontal check
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 4; c++) {
        const i1 = r * 7 + c;
        const i2 = i1 + 1;
        const i3 = i1 + 2;
        const i4 = i1 + 3;
        if (currentGrid[i1] === p && currentGrid[i2] === p && currentGrid[i3] === p && currentGrid[i4] === p) return true;
      }
    }

    // Vertical check
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 7; c++) {
        const i1 = r * 7 + c;
        const i2 = i1 + 7;
        const i3 = i1 + 14;
        const i4 = i1 + 21;
        if (currentGrid[i1] === p && currentGrid[i2] === p && currentGrid[i3] === p && currentGrid[i4] === p) return true;
      }
    }

    // Diagonal right check
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const i1 = r * 7 + c;
        const i2 = i1 + 8;
        const i3 = i1 + 16;
        const i4 = i1 + 24;
        if (currentGrid[i1] === p && currentGrid[i2] === p && currentGrid[i3] === p && currentGrid[i4] === p) return true;
      }
    }

    // Diagonal left check
    for (let r = 0; r < 3; r++) {
      for (let c = 3; c < 7; c++) {
        const i1 = r * 7 + c;
        const i2 = i1 + 6;
        const i3 = i1 + 12;
        const i4 = i1 + 18;
        if (currentGrid[i1] === p && currentGrid[i2] === p && currentGrid[i3] === p && currentGrid[i4] === p) return true;
      }
    }

    return false;
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[#FBF6F1] text-[#2B1F2E] overflow-y-auto" id="c4_game_wrapper">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 shrink-0" id="c4_header">
        <button 
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display font-extrabold text-base tracking-tight text-[#6B4E9E]">Connect Four</h2>
          <p className="text-[9px] font-bold text-neutral-500 uppercase">Align 4 ocean spheres</p>
        </div>
        <button 
          onClick={initGame}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3 shrink-0 text-center">
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[8px] font-black uppercase text-neutral-400">Turn</p>
          <p className="text-sm font-black text-[#FF6B5D]">{isPlayerTurn ? 'Your Turn' : 'AI Thinking...'}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[8px] font-black uppercase text-neutral-400">AI Difficulty</p>
          <p className="text-sm font-black text-[#6B4E9E]">Lvl {level}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[8px] font-black uppercase text-neutral-400">Wins reward</p>
          <p className="text-sm font-black text-[#F5A623]">🪙 +{50 + Math.floor(level / 20)}</p>
        </div>
      </div>

      {/* Slider difficulty level */}
      <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3 mb-3 shrink-0 shadow-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-black uppercase text-[#6E6270] flex items-center gap-1">
            <Star className="w-3 h-3 text-[#FF6B5D] fill-current" /> AI Logic Level (0-10000)
          </span>
          <span className="text-xs font-black text-[#FF6B5D]">Lvl {level}</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="10000" 
          step="100"
          value={level} 
          disabled={!isPlayerTurn && !gameOver}
          onChange={(e) => setLevel(parseInt(e.target.value, 10))}
          className="w-full accent-[#FF6B5D] h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
        />
        <p className="text-[8px] font-bold text-center text-neutral-400 mt-1">
          {level >= 5000 ? '🔥 EXPERT STRATEGIC COMBINATIONS AI' : '🟢 EASY/CASUAL RANDOM AI'}
        </p>
      </div>

      {/* 7x6 Board Grid */}
      <div className="flex-1 flex items-center justify-center bg-white border border-[#EDE4DC] rounded-3xl p-3 relative shadow-inner min-h-[220px]" id="c4_grid_board">
        <div className="grid grid-cols-7 gap-1.5 w-full max-w-[280px] bg-sky-950 border-4 border-yellow-950 p-2 rounded-2xl relative shadow-2xl">
          
          {/* Drop helper columns */}
          {grid.map((cell, idx) => {
            const col = idx % 7;
            const isClickable = !gameOver && isPlayerTurn && getLowestEmptyRow(col, grid) !== -1;

            return (
              <div 
                key={idx}
                onClick={() => isClickable && handleColumnDrop(col)}
                className={`aspect-square rounded-full flex items-center justify-center cursor-pointer transition-all ${
                  cell === 'player' 
                    ? 'bg-[#FF6B5D] border border-white/40 shadow-lg' 
                    : cell === 'ai' 
                    ? 'bg-neutral-800 border border-neutral-600 shadow-lg' 
                    : 'bg-[#2B1F2E]/80 shadow-inner hover:bg-[#2B1F2E]'
                }`}
              >
                {cell === 'player' && '🔴'}
                {cell === 'ai' && '⚫'}
              </div>
            );
          })}
        </div>

        {/* Win / Loss / Draw overlay screens */}
        <AnimatePresence>
          {gameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#FBF6F1]/95 flex flex-col items-center justify-center p-4 text-center z-20 rounded-xl"
            >
              <span className="text-4xl mb-1.5 animate-bounce">🏆</span>
              <h3 className="font-display font-black text-sm text-[#2B1F2E] mb-1">
                {winner === 'player' ? 'Victory is Yours!' : winner === 'ai' ? 'Defeated by AI!' : 'Match is a Draw!'}
              </h3>
              <p className="text-[10px] text-neutral-500 mb-3">
                {winner === 'player' 
                  ? `Slick alignment! Awarded 🪙 ${earnedCoins} coins!` 
                  : 'Better luck next drop alignment strategy.'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={initGame}
                  className="px-4 py-2 bg-[#6B4E9E] text-white font-display font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Re-Match
                </button>
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-white border border-[#EDE4DC] text-neutral-600 font-display font-black text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Exit Table
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 text-center text-[10px] text-neutral-400 font-bold">
        ℹ️ Tap any column keyhole cell to drop a colored alignment shell.
      </div>
    </div>
  );
}
