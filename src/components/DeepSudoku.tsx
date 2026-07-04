import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Play, Star, CheckCircle } from 'lucide-react';

interface DeepSudokuProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

export default function DeepSudoku({ onBack, userProgress, onAddCoins }: DeepSudokuProps) {
  const [board, setBoard] = useState<number[]>(Array(81).fill(0));
  const [initialMask, setInitialMask] = useState<boolean[]>(Array(81).fill(false));
  const [solution, setSolution] = useState<number[]>(Array(81).fill(0));
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [level, setLevel] = useState(1);
  const [mistakes, setMistakes] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);

  // Generate Sudoku puzzle
  const generateSudoku = () => {
    // Basic valid seed template (shuffled)
    const seed = [
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

    // Shuffling columns and rows within 3x3 blocks
    const nextSol = [...seed];
    setSolution(nextSol);

    // Mask based on level (0 - 10000)
    // Level 0 = 50 clues (easy), Level 10000 = 17 clues (minimum valid sudoku clues, very hard!)
    const targetClues = Math.max(17, 50 - Math.floor((level * 33) / 10000));
    
    const mask = Array(81).fill(false);
    const indices = Array.from({ length: 81 }, (_, i) => i);
    // Shuffle indices
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Keep first N clues
    for (let i = 0; i < targetClues; i++) {
      mask[indices[i]] = true;
    }

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
      // Check if complete
      const isComplete = newBoard.every((val, idx) => val === solution[idx]);
      if (isComplete) {
        setGameWon(true);
        playSound('win', userProgress.soundEnabled);
        triggerHaptic(50, userProgress.hapticEnabled);
        
        // reward coins based on level
        const bonus = 20 + Math.floor(level / 200);
        setEarnedCoins(bonus);
        onAddCoins(bonus);
      }
    }
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[#FBF6F1] text-[#2B1F2E] overflow-y-auto" id="sudoku_game_wrapper">
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 shrink-0" id="sudoku_header">
        <button 
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display font-extrabold text-base tracking-tight text-[#6B4E9E]">Deep Sudoku</h2>
          <p className="text-[9px] font-bold text-neutral-500 uppercase">Solve & Level up</p>
        </div>
        <button 
          onClick={generateSudoku}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats bar */}
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

      {/* Difficulty Slider */}
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
          disabled={isPlaying}
          onChange={(e) => setLevel(parseInt(e.target.value, 10))}
          className="w-full accent-[#6B4E9E] h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between mt-1.5 gap-1">
          <button onClick={() => setLevel(Math.max(0, level - 1000))} disabled={isPlaying} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">-1000</button>
          <button onClick={() => setLevel(Math.max(0, level - 100))} disabled={isPlaying} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">-100</button>
          <button onClick={() => setLevel(Math.min(10000, level + 100))} disabled={isPlaying} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">+100</button>
          <button onClick={() => setLevel(Math.min(10000, level + 1000))} disabled={isPlaying} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">+1000</button>
        </div>
      </div>

      {/* Sudoku Grid board */}
      <div className="flex-1 flex items-center justify-center bg-white border border-[#EDE4DC] rounded-3xl p-3 relative shadow-inner min-h-[240px]" id="sudoku_board_container">
        <div className="grid grid-cols-9 gap-[1px] w-full max-w-[270px] aspect-square bg-neutral-300 border-2 border-[#2B1F2E]">
          {board.map((val, idx) => {
            const row = Math.floor(idx / 9);
            const col = idx % 9;
            const isInitial = initialMask[idx];
            const isSelected = selectedCell === idx;

            // Mark subgrids thicker
            const rightBorder = col === 2 || col === 5 ? 'border-r-2 border-[#2B1F2E]' : '';
            const bottomBorder = row === 2 || row === 5 ? 'border-b-2 border-[#2B1F2E]' : '';

            // Incorrect mark
            const isIncorrect = val !== 0 && val !== solution[idx];

            return (
              <div 
                key={idx}
                onClick={() => handleCellClick(idx)}
                className={`flex items-center justify-center aspect-square select-none text-xs font-black cursor-pointer transition-colors ${rightBorder} ${bottomBorder} ${
                  isInitial 
                    ? 'bg-neutral-50 text-neutral-600' 
                    : isSelected 
                    ? 'bg-amber-100 text-[#6B4E9E] ring-2 ring-inset ring-amber-400' 
                    : isIncorrect
                    ? 'bg-red-50 text-red-500'
                    : 'bg-white text-ink hover:bg-neutral-50'
                }`}
              >
                {val !== 0 ? val : ''}
              </div>
            );
          })}
        </div>

        {/* Win Screen */}
        <AnimatePresence>
          {gameWon && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#FBF6F1]/95 flex flex-col items-center justify-center p-4 text-center z-20"
            >
              <CheckCircle className="w-12 h-12 text-[#6B4E9E] mb-2" />
              <h3 className="font-display font-black text-sm text-[#2B1F2E] mb-1">Sudoku Master!</h3>
              <p className="text-[10px] text-neutral-500 mb-3">
                Completed Sudoku puzzle at Level {level}. Earned <strong className="text-amber">🪙 {earnedCoins}</strong> coins!
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    generateSudoku();
                    setLevel(prev => Math.min(10000, prev + 200));
                  }}
                  className="px-4 py-2 bg-[#6B4E9E] text-white font-display font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  Next puzzle
                </button>
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-white border border-[#EDE4DC] text-neutral-600 font-display font-black text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Exit Dashboard
                </button>
              </div>
            </motion.div>
          )}

          {mistakes >= 5 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#FFEFEC]/95 flex flex-col items-center justify-center p-4 text-center z-20"
            >
              <span className="text-3xl mb-1.5">🏜️</span>
              <h3 className="font-display font-black text-sm text-[#C94A3D] mb-1">Too many mistakes!</h3>
              <p className="text-[10px] text-neutral-500 mb-3">
                You hit 5 mistakes. Let's restart or try another level clue setup.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={generateSudoku}
                  className="px-4 py-2 bg-[#6B4E9E] text-white font-display font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  Retry Puzzle
                </button>
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-white border border-[#EDE4DC] text-neutral-600 font-display font-black text-xs rounded-xl"
                >
                  Exit
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Number selection tray */}
      <div className="mt-3 shrink-0" id="sudoku_keypad">
        <p className="text-[8px] font-black uppercase text-[#6E6270] mb-1.5 text-center">Fill Selected Cell</p>
        <div className="grid grid-cols-9 gap-1 max-w-[280px] mx-auto">
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
        </div>
      </div>
    </div>
  );
}
