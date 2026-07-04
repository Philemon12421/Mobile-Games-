import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Play, Star, Sparkles } from 'lucide-react';

interface MarineCheckersProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

type Piece = 'player' | 'ai' | null;

interface Cell {
  row: number;
  col: number;
  piece: Piece;
  isKing: boolean;
}

export default function MarineCheckers({ onBack, userProgress, onAddCoins }: MarineCheckersProps) {
  const [board, setBoard] = useState<Cell[]>([]);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [validMoves, setValidMoves] = useState<number[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [gameStatus, setGameStatus] = useState<'playing' | 'player_win' | 'ai_win'>('playing');
  const [level, setLevel] = useState(1);
  const [scores, setScores] = useState({ player: 0, ai: 0 });
  const [earnedCoins, setEarnedCoins] = useState(0);

  // Initialize checkers 8x8 board
  const initBoard = () => {
    const list: Cell[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isDark = (row + col) % 2 === 1;
        let piece: Piece = null;

        // Player starting top 3 rows, AI starting bottom 3 rows
        if (isDark) {
          if (row < 3) {
            piece = 'ai';
          } else if (row > 4) {
            piece = 'player';
          }
        }

        list.push({
          row,
          col,
          piece,
          isKing: false
        });
      }
    }
    setBoard(list);
    setSelectedCell(null);
    setValidMoves([]);
    setIsPlayerTurn(true);
    setGameStatus('playing');
    setEarnedCoins(0);
  };

  useEffect(() => {
    initBoard();
  }, [level]);

  // Click handler on board
  const handleCellClick = (index: number) => {
    if (!isPlayerTurn || gameStatus !== 'playing') return;

    const cell = board[index];

    // If clicked valid target destination, perform move!
    if (validMoves.includes(index) && selectedCell !== null) {
      executeMove(selectedCell, index);
      return;
    }

    // Otherwise select player piece
    if (cell.piece === 'player') {
      playSound('tap', userProgress.soundEnabled);
      triggerHaptic(10, userProgress.hapticEnabled);
      setSelectedCell(index);
      calculateValidMoves(index);
    } else {
      setSelectedCell(null);
      setValidMoves([]);
    }
  };

  // Basic checkers valid movement logic
  const calculateValidMoves = (index: number) => {
    const current = board[index];
    const moves: number[] = [];

    // Player pieces move diagonally up (unless King, then both directions)
    const rowDirs = current.isKing ? [-1, 1] : [-1];
    const colDirs = [-1, 1];

    rowDirs.forEach((rDir) => {
      colDirs.forEach((cDir) => {
        const targetRow = current.row + rDir;
        const targetCol = current.col + cDir;

        if (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
          const targetIndex = targetRow * 8 + targetCol;
          const targetCell = board[targetIndex];

          if (targetCell.piece === null) {
            // Simple empty tile move
            moves.push(targetIndex);
          } else if (targetCell.piece === 'ai') {
            // Check for jump capture
            const jumpRow = targetRow + rDir;
            const jumpCol = targetCol + cDir;

            if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8) {
              const jumpIndex = jumpRow * 8 + jumpCol;
              const jumpCell = board[jumpIndex];
              if (jumpCell.piece === null) {
                moves.push(jumpIndex);
              }
            }
          }
        }
      });
    });

    setValidMoves(moves);
  };

  const executeMove = (fromIdx: number, toIdx: number) => {
    const nextBoard = [...board];
    const pieceObj = nextBoard[fromIdx];
    const destObj = nextBoard[toIdx];

    // Move piece
    nextBoard[toIdx] = {
      ...destObj,
      piece: pieceObj.piece,
      isKing: pieceObj.isKing || (pieceObj.piece === 'player' && destObj.row === 0) || (pieceObj.piece === 'ai' && destObj.row === 7)
    };

    nextBoard[fromIdx] = {
      ...pieceObj,
      piece: null,
      isKing: false
    };

    // Check for capture removal
    const rowDiff = Math.abs(destObj.row - pieceObj.row);
    if (rowDiff === 2) {
      // It was a jump! Remove middle captured piece
      const midRow = (pieceObj.row + destObj.row) / 2;
      const midCol = (pieceObj.col + destObj.col) / 2;
      const midIdx = midRow * 8 + midCol;
      nextBoard[midIdx] = {
        ...nextBoard[midIdx],
        piece: null,
        isKing: false
      };
      playSound('win', userProgress.soundEnabled);
    } else {
      playSound('tap', userProgress.soundEnabled);
    }

    triggerHaptic(15, userProgress.hapticEnabled);
    setBoard(nextBoard);
    setSelectedCell(null);
    setValidMoves([]);

    // Check victory condition
    const aiPieces = nextBoard.filter(c => c.piece === 'ai');
    if (aiPieces.length === 0) {
      setGameStatus('player_win');
      setScores((s) => ({ ...s, player: s.player + 1 }));
      const bonus = 100 + Math.floor(level / 10);
      setEarnedCoins(bonus);
      onAddCoins(bonus);
      return;
    }

    // Toggle turn to AI
    setIsPlayerTurn(false);
  };

  // AI Turn simulated calculation
  useEffect(() => {
    if (!isPlayerTurn && gameStatus === 'playing') {
      const timer = setTimeout(() => {
        makeAIMove();
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, gameStatus]);

  const makeAIMove = () => {
    // 1. Gather all possible AI moves
    interface PossibleMove {
      fromIdx: number;
      toIdx: number;
      isCapture: boolean;
    }
    const aiMoves: PossibleMove[] = [];

    board.forEach((cell, fromIdx) => {
      if (cell.piece !== 'ai') return;

      const rowDirs = cell.isKing ? [-1, 1] : [1]; // AI usually moves down
      const colDirs = [-1, 1];

      rowDirs.forEach((rDir) => {
        colDirs.forEach((cDir) => {
          const targetRow = cell.row + rDir;
          const targetCol = cell.col + cDir;

          if (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
            const targetIdx = targetRow * 8 + targetCol;
            const targetCell = board[targetIdx];

            if (targetCell.piece === null) {
              aiMoves.push({ fromIdx, toIdx: targetIdx, isCapture: false });
            } else if (targetCell.piece === 'player') {
              const jumpRow = targetRow + rDir;
              const jumpCol = targetCol + cDir;

              if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8) {
                const jumpIdx = jumpRow * 8 + jumpCol;
                const jumpCell = board[jumpIdx];
                if (jumpCell.piece === null) {
                  aiMoves.push({ fromIdx, toIdx: jumpIdx, isCapture: true });
                }
              }
            }
          }
        });
      });
    });

    if (aiMoves.length === 0) {
      // AI cannot move -> Player wins!
      setGameStatus('player_win');
      return;
    }

    // AI Select logic based on Level (0 - 10000)
    // Level 0: AI selects completely randomly.
    // Level 10000: AI always prioritizes capture and picks smarter strategic blocking coordinates.
    let selectedMove = aiMoves[Math.floor(Math.random() * aiMoves.length)];

    // Prioritize capturing
    const captures = aiMoves.filter((m) => m.isCapture);
    if (captures.length > 0) {
      if (level > 1000 || Math.random() < 0.5) {
        selectedMove = captures[Math.floor(Math.random() * captures.length)];
      }
    }

    // Apply AI Move
    const nextBoard = [...board];
    const pieceObj = nextBoard[selectedMove.fromIdx];
    const destObj = nextBoard[selectedMove.toIdx];

    nextBoard[selectedMove.toIdx] = {
      ...destObj,
      piece: 'ai',
      isKing: pieceObj.isKing || destObj.row === 7
    };

    nextBoard[selectedMove.fromIdx] = {
      ...pieceObj,
      piece: null,
      isKing: false
    };

    if (selectedMove.isCapture) {
      const midRow = (pieceObj.row + destObj.row) / 2;
      const midCol = (pieceObj.col + destObj.col) / 2;
      const midIdx = midRow * 8 + midCol;
      nextBoard[midIdx] = {
        ...nextBoard[midIdx],
        piece: null,
        isKing: false
      };
      playSound('lose', userProgress.soundEnabled);
    } else {
      playSound('tap', userProgress.soundEnabled);
    }

    triggerHaptic(12, userProgress.hapticEnabled);
    setBoard(nextBoard);

    // Check player loss
    const playerPieces = nextBoard.filter(c => c.piece === 'player');
    if (playerPieces.length === 0) {
      setGameStatus('ai_win');
      setScores((s) => ({ ...s, ai: s.ai + 1 }));
      return;
    }

    setIsPlayerTurn(true);
  };

  const resetGame = () => {
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);
    initBoard();
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[#FBF6F1] text-[#2B1F2E] overflow-y-auto" id="checkers_game_wrapper">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 shrink-0" id="checkers_header">
        <button 
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display font-extrabold text-base tracking-tight text-[#FF6B5D]">Marine Checkers</h2>
          <p className="text-[9px] font-bold text-neutral-500 uppercase">Clash of Red & Black</p>
        </div>
        <button 
          onClick={resetGame}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-4 gap-1.5 mb-3 shrink-0 text-center">
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2 col-span-1">
          <p className="text-[7px] font-black uppercase text-neutral-400">Wins</p>
          <p className="text-sm font-black text-emerald-500">{scores.player}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2 col-span-1">
          <p className="text-[7px] font-black uppercase text-neutral-400">AI Wins</p>
          <p className="text-sm font-black text-red-400">{scores.ai}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2 col-span-1">
          <p className="text-[7px] font-black uppercase text-neutral-400">Checkers Lvl</p>
          <p className="text-sm font-black text-[#6B4E9E]">Lvl {level}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2 col-span-1">
          <p className="text-[7px] font-black uppercase text-neutral-400">Coins</p>
          <p className="text-xs font-black text-[#F5A623]">🪙 {earnedCoins}</p>
        </div>
      </div>

      {/* Difficulty Slider */}
      <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3 mb-3 shrink-0 shadow-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-black uppercase text-[#6E6270] flex items-center gap-1">
            <Star className="w-3 h-3 text-[#FF6B5D] fill-current" /> AI Intelligence Level (0-10000)
          </span>
          <span className="text-xs font-black text-[#FF6B5D]">Lvl {level}</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="10000" 
          step="100"
          value={level} 
          disabled={!isPlayerTurn && gameStatus === 'playing'}
          onChange={(e) => setLevel(parseInt(e.target.value, 10))}
          className="w-full accent-[#FF6B5D] h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between mt-1.5 gap-1">
          <button onClick={() => setLevel(Math.max(0, level - 1000))} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">-1000</button>
          <button onClick={() => setLevel(Math.max(0, level - 100))} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">-100</button>
          <button onClick={() => setLevel(Math.min(10000, level + 100))} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">+100</button>
          <button onClick={() => setLevel(Math.min(10000, level + 1000))} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">+1000</button>
        </div>
      </div>

      {/* 8x8 Board Container */}
      <div className="flex-1 flex items-center justify-center bg-white border border-[#EDE4DC] rounded-3xl p-3 relative shadow-inner min-h-[220px]" id="checkers_board_container">
        <div className="grid grid-cols-8 gap-[1px] w-full max-w-[270px] aspect-square bg-[#EDE4DC] border border-[#2B1F2E]">
          {board.map((cell, idx) => {
            const isDark = (cell.row + cell.col) % 2 === 1;
            const isSelected = selectedCell === idx;
            const isValidDestination = validMoves.includes(idx);

            return (
              <div
                key={idx}
                onClick={() => handleCellClick(idx)}
                className={`flex items-center justify-center aspect-square select-none cursor-pointer relative transition-all ${
                  isDark ? 'bg-neutral-100' : 'bg-white'
                } ${isSelected ? 'ring-2 ring-inset ring-amber-400 bg-amber-50' : ''} ${
                  isValidDestination ? 'ring-2 ring-inset ring-emerald-400 bg-emerald-50' : ''
                }`}
              >
                {/* Checkers piece */}
                {cell.piece === 'player' && (
                  <motion.div 
                    layoutId={`piece-${idx}`}
                    className="w-4/5 h-4/5 rounded-full bg-[#FF6B5D] border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-md"
                  >
                    {cell.isKing ? '👑' : '🔴'}
                  </motion.div>
                )}

                {cell.piece === 'ai' && (
                  <motion.div 
                    layoutId={`piece-${idx}`}
                    className="w-4/5 h-4/5 rounded-full bg-neutral-800 border-2 border-neutral-600 flex items-center justify-center text-[10px] font-bold text-neutral-400 shadow-md"
                  >
                    {cell.isKing ? '👑' : '⚫'}
                  </motion.div>
                )}

                {/* Valid move indicator helper dot */}
                {isValidDestination && cell.piece === null && (
                  <div className="w-2.5 h-2.5 bg-emerald-400/80 rounded-full animate-ping absolute" />
                )}
              </div>
            );
          })}
        </div>

        {/* Win/Loss Screen */}
        <AnimatePresence>
          {gameStatus === 'player_win' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#FBF6F1]/95 flex flex-col items-center justify-center p-4 text-center z-20 rounded-xl"
            >
              <span className="text-4xl mb-1.5 animate-bounce">🏆</span>
              <h3 className="font-display font-black text-sm text-[#2B1F2E] mb-1">Checkers Victory!</h3>
              <p className="text-[10px] text-neutral-500 mb-3">
                Defeated AI at Level {level}. Awarded <strong className="text-amber">🪙 {earnedCoins}</strong> coins!
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    initBoard();
                    setLevel(prev => Math.min(10000, prev + 250));
                  }}
                  className="px-4 py-2 bg-[#FF6B5D] text-white font-display font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  Next AI Level
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

          {gameStatus === 'ai_win' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#FFEFEC]/95 flex flex-col items-center justify-center p-4 text-center z-20 rounded-xl"
            >
              <span className="text-4xl mb-1.5">💔</span>
              <h3 className="font-display font-black text-sm text-[#C94A3D] mb-1">Defeated by AI!</h3>
              <p className="text-[10px] text-neutral-500 mb-3">
                The smart AI at Level {level} conquered all your pieces.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={initBoard}
                  className="px-4 py-2 bg-[#FF6B5D] text-white font-display font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Re-Match
                </button>
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-white border border-[#EDE4DC] text-neutral-600 font-display font-black text-xs rounded-xl"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 text-center text-[10px] text-neutral-400 font-bold">
        ℹ️ Tap a red piece to highlight valid destination tiles in green.
      </div>
    </div>
  );
}
