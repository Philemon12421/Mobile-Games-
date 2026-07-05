import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Star, CheckCircle, Eraser } from 'lucide-react';

interface DeepSudokuProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

const BASE_SEED = [
  1,2,3, 4,5,6, 7,8,9,
  4,5,6, 7,8,9, 1,2,3,
  7,8,9, 1,2,3, 4,5,6,

  2,3,1, 5,6,4, 8,9,7,
  5,6,4, 8,9,7, 2,3,1,
  8,9,7, 2,3,1, 5,6,4,

  3,1,2, 6,4,5, 9,7,8,
  6,4,5, 9,7,8, 3,1,2,
  9,7,8, 3,1,2, 6,4,5
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Generates a fresh, genuinely randomized valid Sudoku solution every call.
// Digit remapping + row/column permutation within bands/stacks (+ optional
// transpose) all preserve Sudoku validity while producing a different grid.
function generateRandomSolution(): number[] {
  const digitMap = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const remapped = BASE_SEED.map((v) => digitMap[v - 1]);

  const bandOrder = shuffle([0, 1, 2]);
  const rowOrder: number[] = [];
  bandOrder.forEach((band) => {
    shuffle([0, 1, 2]).forEach((r) => rowOrder.push(band * 3 + r));
  });

  const stackOrder = shuffle([0, 1, 2]);
  const colOrder: number[] = [];
  stackOrder.forEach((stack) => {
    shuffle([0, 1, 2]).forEach((c) => colOrder.push(stack * 3 + c));
  });

  let result = Array(81).fill(0);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      result[r * 9 + c] = remapped[rowOrder[r] * 9 + colOrder[c]];
    }
  }

  if (Math.random() < 0.5) {
    const transposed = Array(81).fill(0);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) transposed[r * 9 + c] = result[c * 9 + r];
    result = transposed;
  }

  return result;
}

export default function DeepSudoku({ onBack, userProgress, onAddCoins }: DeepSudokuProps) {
  const [board, setBoard] = useState<number[]>(Array(81).fill(0));
  const [initialMask, setInitialMask] = useState<boolean[]>(Array(81).fill(false));
  const [solution, setSolution] = useState<number[]>(Array(81).fill(0));
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  const [gameWon, setGameWon] = useState(false);
  const [level, setLevel] = useState(1);
  const [mistakes, setMistakes] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);

  const generateSudoku = () => {
    const nextSol = generateRandomSolution();
    setSolution(nextSol);

    const targetClues = Math.max(17, 50 - Math.floor((level * 33) / 10000));
    const mask = Array(81).fill(false);
    const indices = shuffle(Array.from({ length: 81 }, (_, i) => i));
    for (let i = 0; i < targetClues; i++) mask[indices[i]] = true;

    const nextBoard = nextSol.map((val, idx) => (mask[idx] ? val : 0));
    setBoard(nextBoard);
    setInitialMask(mask);
    setSelectedCell(null);
    setGameWon(false);
    setMistakes(0);
    setEarnedCoins(0);
  };

  useEffect(() => {
    generateSudoku();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const handleCellClick = (idx: number) => {
    if (initialMask[idx] || gameWon) return;
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(10, userProgress.hapticEnabled);
    setSelectedCell(idx);
  };

  const handleNumberInput = (num: number) => {
    if (selectedCell === null || gameWon) return;
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);

    const correctNum = solution[selectedCell];
    const newBoard = [...board];
    newBoard[selectedCell] = num;
    setBoard(newBoard);

    if (num !== correctNum) {
      setMistakes((m) => m + 1);
      triggerHaptic(35, userProgress.hapticEnabled);
    } else {
      const isComplete = newBoard.every((val, idx) => val === solution[idx]);
      if (isComplete) {
        setGameWon(true);
        playSound('win', userProgress.soundEnabled);
        triggerHaptic(50, userProgress.hapticEnabled);
        const bonus = 20 + Math.floor(level / 200);
        setEarnedCoins(bonus);
        onAddCoins(bonus);
      }
    }
  };

  const handleErase = () => {
    if (selectedCell === null || gameWon || initialMask[selectedCell]) return;
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(10, userProgress.hapticEnabled);
    const newBoard = [...board];
    newBoard[selectedCell] = 0;
    setBoard(newBoard);
  };

  const selectedRow = selectedCell !== null ? Math.floor(selectedCell / 9) : null;
  const selectedCol = selectedCell !== null ? selectedCell % 9 : null;
  const selectedBox = selectedCell !== null ? Math.floor(selectedRow! / 3) * 3 + Math.floor(selectedCol! / 3) : null;
  const selectedValue = selectedCell !== null ? board[selectedCell] : 0;

  return (
    <div className="h-full flex flex-col p-4 bg-[#FBF6F1] text-[#2B1F2E] overflow-y-auto" id="sudoku_game_wrapper">

      <div className="flex items-center justify-between mb-3 shrink-0" id="sudoku_header">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display font-extrabold text-base tracking-tight text-[#6B4E9E]">Deep Sudoku</h2>
          <p className="text-[9px] font-bold text-neutral-500 uppercase">Solve & Level up</p>
        </div>
        <button onClick={generateSudoku} className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 shrink-0 text-center">
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[8px] font-black uppercase text-neutral-400">Mistakes</p>
          <p className="text-sm font-black text-[#FF6B5D]">{mistakes} / 5</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[8px] font-black uppercase text-neutral-400">Sudoku Level</p>
          <p className="text-sm font-black text-[#6B4E9E]">Lvl {level}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[8px] font-black uppercase text-neutral-400">Win Rewards</p>
          <p className="text-sm font-black text-[#F5A623]">🪙 {earnedCoins || `+${20 + Math.floor(level / 200)}`}</p>
        </div>
      </div>

      <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3 mb-3 shrink-0 shadow-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-black uppercase text-[#6E6270] flex items-center gap-1">
            <Star className="w-3 h-3 text-[#6B4E9E] fill-current" /> Sudoku Clue Mask (Level 0-10000)
          </span>
          <span className="text-xs font-black text-[#6B4E9E]">Lvl {level}</span>
        </div>
        <input
          type="range"
          min="0"
          max="10000"
          step="100"
          value={level}
          onChange={(e) => setLevel(parseInt(e.target.value, 10))}
          className="w-full accent-[#6B4E9E] h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between mt-1.5 gap-1">
          <button onClick={() => setLevel(Math.max(0, level - 1000))} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">-1000</button>
          <button onClick={() => setLevel(Math.max(0, level - 100))} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">-100</button>
          <button onClick={() => setLevel(Math.min(10000, level + 100))} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">+100</button>
          <button onClick={() => setLevel(Math.min(10000, level + 1000))} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">+1000</button>
        </div>
        <p className="text-[8px] font-bold text-center text-neutral-400 mt-1.5">
          {level >= 5000 ? '🔥 EXPERT — fewer starting clues' : '🟢 EASY/CASUAL — more starting clues'}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-white border border-[#EDE4DC] rounded-3xl p-3 relative shadow-inner min-h-[240px]" id="sudoku_board_container">
        <div className="grid grid-cols-9 gap-[1px] w-full max-w-[270px] aspect-square bg-neutral-300 border-2 border-[#2B1F2E]">
          {board.map((val, idx) => {
            const row = Math.floor(idx / 9);
            const col = idx % 9;
            const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
            const isInitial = initialMask[idx];
            const isSelected = selectedCell === idx;
            const isRelated = selectedCell !== null && !isSelected && (row === selectedRow || col === selectedCol || box === selectedBox);
            const isSameValue = selectedValue !== 0 && val === selectedValue && !isSelected;

            const rightBorder = col === 2 || col === 5 ? 'border-r-2 border-[#2B1F2E]' : '';
            const bottomBorder = row === 2 || row === 5 ? 'border-b-2 border-[#2B1F2E]' : '';
            const isIncorrect = val !== 0 && val !== solution[idx];

            let bgClass = 'bg-white text-ink hover:bg-neutral-50';
            if (isInitial) bgClass = 'bg-neutral-50 text-neutral-600';
            if (isRelated) bgClass = 'bg-[#F3EEFB] text-ink';
            if (isSameValue) bgClass = 'bg-[#E6DCF5] text-[#6B4E9E] font-black';
            if (isIncorrect) bgClass = 'bg-red-50 text-red-500';
            if (isSelected) bgClass = 'bg-amber-100 text-[#6B4E9E] ring-2 ring-inset ring-amber-400';

            return (
              <div
                key={idx}
                onClick={() => handleCellClick(idx)}
                className={`flex items-center justify-center aspect-square select-none text-xs font-black cursor-pointer transition-colors ${rightBorder} ${bottomBorder} ${bgClass}`}
              >
                {val !== 0 ? val : ''}
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {gameWon && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#FBF6F1]/95 flex flex-col items-center justify-center p-4 text-center z-20">
              <CheckCircle className="w-12 h-12 text-[#6B4E9E] mb-2" />
              <h3 className="font-display font-black text-sm text-[#2B1F2E] mb-1">Sudoku Master!</h3>
              <p className="text-[10px] text-neutral-500 mb-3">
                Completed Sudoku puzzle at Level {level}. Earned <strong className="text-amber">🪙 {earnedCoins}</strong> coins!
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setLevel((prev) => Math.min(10000, prev + 200)); }}
                  className="px-4 py-2 bg-[#6B4E9E] text-white font-display font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  Next puzzle
                </button>
                <button onClick={onBack} className="px-4 py-2 bg-white border border-[#EDE4DC] text-neutral-600 font-display font-black text-xs rounded-xl shadow-xs cursor-pointer">
                  Exit Dashboard
                </button>
              </div>
            </motion.div>
          )}

          {mistakes >= 5 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#FFEFEC]/95 flex flex-col items-center justify-center p-4 text-center z-20">
              <span className="text-3xl mb-1.5">🏜️</span>
              <h3 className="font-display font-black text-sm text-[#C94A3D] mb-1">Too many mistakes!</h3>
              <p className="text-[10px] text-neutral-500 mb-3">You hit 5 mistakes. Let's restart or try another level clue setup.</p>
              <div className="flex gap-2">
                <button onClick={generateSudoku} className="px-4 py-2 bg-[#6B4E9E] text-white font-display font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1">
                  Retry Puzzle
                </button>
                <button onClick={onBack} className="px-4 py-2 bg-white border border-[#EDE4DC] text-neutral-600 font-display font-black text-xs rounded-xl">
                  Exit
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 shrink-0" id="sudoku_keypad">
        <p className="text-[8px] font-black uppercase text-[#6E6270] mb-1.5 text-center">Fill Selected Cell</p>
        <div className="grid grid-cols-10 gap-1 max-w-[310px] mx-auto">
          {[1,2,3,4,5,6,7,8,9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberInput(num)}
              disabled={selectedCell === null || gameWon}
              className="bg-white active:bg-neutral-100 disabled:opacity-40 border border-[#EDE4DC] py-2.5 rounded-lg text-xs font-black text-center cursor-pointer shadow-xs"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleErase}
            disabled={selectedCell === null || gameWon}
            className="bg-[#FFEFEC] active:bg-[#FFE0DB] disabled:opacity-40 border border-[#F5CFC7] py-2.5 rounded-lg text-center cursor-pointer shadow-xs flex items-center justify-center"
          >
            <Eraser className="w-3.5 h-3.5 text-[#C94A3D]" />
          </button>
        </div>
      </div>
    </div>
  );
}
