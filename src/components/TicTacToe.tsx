import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Award, Sparkles } from 'lucide-react';

interface TicTacToeProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

export default function TicTacToe({ onBack, userProgress, onAddCoins }: TicTacToeProps) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [scores, setScores] = useState({ player: 0, ai: 0, draws: 0 });
  const [gameStatus, setGameStatus] = useState<'playing' | 'player_win' | 'ai_win' | 'draw'>('playing');
  const [winningLine, setWinningLine] = useState<number[] | null>(null);

  const checkWinner = (currentBoard: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];

    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return { winner: currentBoard[a], line: lines[i] };
      }
    }

    if (currentBoard.every((cell) => cell !== null)) {
      return { winner: 'draw', line: null };
    }

    return null;
  };

  // AI Move
  useEffect(() => {
    if (!isPlayerTurn && gameStatus === 'playing') {
      const timer = setTimeout(() => {
        makeAIMove();
      }, 550);
      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, gameStatus]);

  const makeAIMove = () => {
    // 1. Try to win, 2. Try to block, 3. Take center, 4. Take corners, 5. Random
    const emptyIndices = board.map((cell, idx) => (cell === null ? idx : null)).filter((idx) => idx !== null) as number[];
    if (emptyIndices.length === 0) return;

    let targetIndex = -1;

    // Helper to simulate a move and check winner
    const testMove = (symbol: string) => {
      for (const idx of emptyIndices) {
        const testBoard = [...board];
        testBoard[idx] = symbol;
        const res = checkWinner(testBoard);
        if (res && res.winner === symbol) {
          return idx;
        }
      }
      return -1;
    };

    // Try to win
    targetIndex = testMove('o');

    // Try to block player
    if (targetIndex === -1) {
      targetIndex = testMove('x');
    }

    // Take center
    if (targetIndex === -1 && board[4] === null) {
      targetIndex = 4;
    }

    // Take random
    if (targetIndex === -1) {
      const randomIndex = Math.floor(Math.random() * emptyIndices.length);
      targetIndex = emptyIndices[randomIndex];
    }

    const newBoard = [...board];
    newBoard[targetIndex] = 'o';
    
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(12, userProgress.hapticEnabled);
    setBoard(newBoard);

    const winResult = checkWinner(newBoard);
    if (winResult) {
      if (winResult.winner === 'o') {
        setGameStatus('ai_win');
        setWinningLine(winResult.line);
        setScores((prev) => ({ ...prev, ai: prev.ai + 1 }));
        playSound('lose', userProgress.soundEnabled);
        triggerHaptic(40, userProgress.hapticEnabled);
      } else if (winResult.winner === 'draw') {
        setGameStatus('draw');
        setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
        playSound('slide', userProgress.soundEnabled);
      }
    } else {
      setIsPlayerTurn(true);
    }
  };

  const handleCellClick = (index: number) => {
    if (!isPlayerTurn || board[index] !== null || gameStatus !== 'playing') return;

    const newBoard = [...board];
    newBoard[index] = 'x';
    
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);
    setBoard(newBoard);

    const winResult = checkWinner(newBoard);
    if (winResult) {
      if (winResult.winner === 'x') {
        setGameStatus('player_win');
        setWinningLine(winResult.line);
        setScores((prev) => ({ ...prev, player: prev.player + 1 }));
        playSound('win', userProgress.soundEnabled);
        triggerHaptic(50, userProgress.hapticEnabled);
        onAddCoins(25); // +25 gold coins for winning!
      } else if (winResult.winner === 'draw') {
        setGameStatus('draw');
        setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
        playSound('slide', userProgress.soundEnabled);
        onAddCoins(5); // +5 for a draw
      }
    } else {
      setIsPlayerTurn(false);
    }
  };

  const resetGame = () => {
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);
    setBoard(Array(9).fill(null));
    setIsPlayerTurn(true);
    setGameStatus('playing');
    setWinningLine(null);
  };

  return (
    <div className="flex flex-col h-full bg-bg text-ink rounded-3xl p-5 overflow-y-auto" id="ttt_game_wrapper">
      {/* Header */}
      <div className="flex justify-between items-center mb-5" id="ttt_header">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-ink hover:bg-line/40 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-display font-black text-xl tracking-tight text-ink">
          Tic-Tac-Toe
        </span>
        <button
          onClick={resetGame}
          className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-ink hover:bg-line/40 transition-colors cursor-pointer"
          title="Reset Round"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-3 gap-2.5 mb-6" id="ttt_scoreboard">
        <div className="bg-surface border border-line rounded-2xl p-3 text-center shadow-sm">
          <div className="text-2xl mb-0.5">{userProgress.avatar}</div>
          <p className="text-[10px] font-bold text-ink-soft uppercase truncate">{userProgress.nickname}</p>
          <p className="font-display font-black text-lg text-coral">{scores.player}</p>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-3 text-center shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-bold text-ink-soft uppercase">Draws</p>
          <p className="font-display font-black text-lg text-ink-soft">{scores.draws}</p>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-3 text-center shadow-sm">
          <div className="text-2xl mb-0.5">🤖</div>
          <p className="text-[10px] font-bold text-ink-soft uppercase truncate">Deep Sea AI</p>
          <p className="font-display font-black text-lg text-purple">{scores.ai}</p>
        </div>
      </div>

      {/* TTT Board Wrapper */}
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full" id="ttt_board_outer">
        <div className="bg-surface border border-line rounded-3xl p-3.5 shadow-md relative" id="ttt_board_grid">
          <div className="grid grid-cols-3 gap-3 aspect-square">
            {board.map((cell, idx) => {
              const isWinningCell = winningLine?.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  className={`aspect-square rounded-2xl flex items-center justify-center font-display text-4xl font-extrabold transition-all relative overflow-hidden outline-none ${
                    cell === null && gameStatus === 'playing'
                      ? 'bg-bg/60 hover:bg-bg cursor-pointer active:scale-95'
                      : 'bg-bg pointer-events-none'
                  } ${
                    isWinningCell 
                      ? 'ring-4 ring-success bg-success/10 z-10' 
                      : ''
                  }`}
                >
                  <AnimatePresence mode="popLayout">
                    {cell === 'x' && (
                      <motion.span
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        className="text-coral select-none"
                      >
                        ✕
                      </motion.span>
                    )}
                    {cell === 'o' && (
                      <motion.span
                        initial={{ scale: 0, rotate: 45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        className="text-purple select-none"
                      >
                        ◯
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status banner */}
        <div className="mt-5 text-center min-h-12 flex items-center justify-center px-4" id="ttt_status_banner">
          <AnimatePresence mode="wait">
            {gameStatus === 'playing' ? (
              <motion.p
                key="playing"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-sm font-bold text-ink-soft flex items-center gap-2"
              >
                {isPlayerTurn ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-coral animate-ping" />
                    Your turn! Make your move.
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-purple animate-pulse" />
                    Deep Sea AI is thinking...
                  </>
                )}
              </motion.p>
            ) : gameStatus === 'player_win' ? (
              <motion.div
                key="p_win"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-success/10 border border-success rounded-xl py-2 px-5 flex items-center gap-2 text-success font-extrabold text-sm shadow-sm"
              >
                <Award className="w-4 h-4" />
                You Win! +25 Gold Coins 🪙
              </motion.div>
            ) : gameStatus === 'ai_win' ? (
              <motion.div
                key="ai_win"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-coral/10 border border-coral text-coral rounded-xl py-2 px-5 font-bold text-sm"
              >
                Deep Sea AI wins this round!
              </motion.div>
            ) : (
              <motion.div
                key="draw"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-line/80 text-ink-soft rounded-xl py-2 px-5 font-bold text-sm flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-amber" />
                Draw game! +5 Gold Coins 🪙
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        {gameStatus !== 'playing' && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={resetGame}
            className="w-full bg-coral hover:bg-coral-dark text-white font-display font-extrabold text-sm py-3.5 rounded-2xl shadow-md transition-all active:scale-[0.98] mt-2 cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Play Again
          </motion.button>
        )}
      </div>
    </div>
  );
}
