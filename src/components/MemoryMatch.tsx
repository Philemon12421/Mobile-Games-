import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, RotateCcw, Play, Star, CheckSquare } from 'lucide-react';

interface MemoryMatchProps {
  onBack: () => void;
  userProgress: { nickname: string; avatar: string; themeColor: string; soundEnabled: boolean; hapticEnabled: boolean };
  onAddCoins: (amount: number) => void;
}

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MemoryMatch({ onBack, userProgress, onAddCoins }: MemoryMatchProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [earnedCoins, setEarnedCoins] = useState(0);

  const icons = ['🐙', '🐳', '🐢', '🦈', 'crab', '🦑', '🐠', '🐚', '🐬', '🐡', '🐚', '🐚'];

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('ocean_memory_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Time limit based on level: level 0 = 60s, level 10000 = 10s
  const getTimeLimit = () => {
    return Math.max(10, 60 - Math.floor((level * 50) / 10000));
  };

  const initGame = () => {
    // 6 pairs or 8 pairs depending on level
    const numPairs = level >= 5000 ? 8 : 6;
    const pool = ['🐙', '🐳', '🐢', '🦈', '🦀', '🦑', '🐠', '🐚', '🐬', '🐡'].slice(0, numPairs);
    const doublePool = [...pool, ...pool];

    // Shuffle pool
    for (let i = doublePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [doublePool[i], doublePool[j]] = [doublePool[j], doublePool[i]];
    }

    const initialCards: Card[] = doublePool.map((emoji, idx) => ({
      id: idx,
      emoji,
      isFlipped: false,
      isMatched: false,
    }));

    setCards(initialCards);
    setSelectedIndices([]);
    setScore(0);
    setTimeLeft(getTimeLimit());
    setGameOver(false);
    setIsPlaying(true);
    setEarnedCoins(0);
  };

  useEffect(() => {
    initGame();
  }, [level]);

  // Game timer loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    if (timeLeft <= 0) {
      setGameOver(true);
      setIsPlaying(false);
      playSound('lose', userProgress.soundEnabled);
      triggerHaptic(40, userProgress.hapticEnabled);
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [isPlaying, gameOver, timeLeft]);

  const handleCardClick = (index: number) => {
    if (!isPlaying || gameOver || cards[index].isFlipped || cards[index].isMatched || selectedIndices.length >= 2) return;

    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(12, userProgress.hapticEnabled);

    const updatedCards = [...cards];
    updatedCards[index].isFlipped = true;
    setCards(updatedCards);

    const nextSelected = [...selectedIndices, index];
    setSelectedIndices(nextSelected);

    if (nextSelected.length === 2) {
      const [idx1, idx2] = nextSelected;
      if (cards[idx1].emoji === cards[idx2].emoji) {
        // MATCH!
        setTimeout(() => {
          playSound('win', userProgress.soundEnabled);
          triggerHaptic(20, userProgress.hapticEnabled);

          const matchedCards = [...updatedCards];
          matchedCards[idx1].isMatched = true;
          matchedCards[idx2].isMatched = true;
          setCards(matchedCards);
          setSelectedIndices([]);

          setScore((s) => {
            const added = 20 + Math.floor(level / 500);
            const next = s + added;
            if (next > highScore) {
              setHighScore(next);
              localStorage.setItem('ocean_memory_highscore', next.toString());
            }
            return next;
          });

          // Reward coins
          const coins = 5 + Math.floor(level / 1000);
          setEarnedCoins(c => c + coins);
          onAddCoins(coins);

          // Check if all matched
          const won = matchedCards.every((c) => c.isMatched);
          if (won) {
            setGameOver(true);
            setIsPlaying(false);
            playSound('win', userProgress.soundEnabled);
          }
        }, 500);
      } else {
        // NO MATCH -> flip back after 800ms
        setTimeout(() => {
          playSound('slide', userProgress.soundEnabled);
          const flipBack = [...updatedCards];
          flipBack[idx1].isFlipped = false;
          flipBack[idx2].isFlipped = false;
          setCards(flipBack);
          setSelectedIndices([]);
        }, 850);
      }
    }
  };

  const handleLevelChange = (val: number) => {
    playSound('tap', userProgress.soundEnabled);
    setLevel(Math.max(0, Math.min(10000, val)));
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[#FBF6F1] text-[#2B1F2E] overflow-y-auto" id="memory_game_wrapper">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 shrink-0" id="memory_header">
        <button 
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display font-extrabold text-base tracking-tight text-[#FF6B5D]">Memory Match</h2>
          <p className="text-[9px] font-bold text-neutral-500 uppercase">Pair identical mascots</p>
        </div>
        <button 
          onClick={initGame}
          className="w-9 h-9 rounded-full bg-white border border-[#EDE4DC] flex items-center justify-center cursor-pointer hover:bg-neutral-50 shadow-xs"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-1.5 mb-3 shrink-0 text-center">
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[7px] font-black uppercase text-neutral-400">Time Left</p>
          <p className="text-sm font-black text-[#FF6B5D]">{timeLeft}s</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[7px] font-black uppercase text-neutral-400">Score</p>
          <p className="text-sm font-black text-[#6B4E9E]">{score}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[7px] font-black uppercase text-neutral-400">High</p>
          <p className="text-sm font-black text-neutral-600">{highScore}</p>
        </div>
        <div className="bg-white border border-[#EDE4DC] rounded-xl p-2">
          <p className="text-[7px] font-black uppercase text-neutral-400">Coins</p>
          <p className="text-xs font-black text-[#F5A623]">🪙 {earnedCoins}</p>
        </div>
      </div>

      {/* Difficulty Slider */}
      <div className="bg-white border border-[#EDE4DC] rounded-2xl p-3 mb-3 shrink-0 shadow-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-black uppercase text-[#6E6270] flex items-center gap-1">
            <Star className="w-3 h-3 text-[#FF6B5D] fill-current" /> Time Pressure Level (0-10000)
          </span>
          <span className="text-xs font-black text-[#FF6B5D]">Lvl {level}</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="10000" 
          step="100"
          value={level} 
          disabled={isPlaying && selectedIndices.length > 0}
          onChange={(e) => handleLevelChange(parseInt(e.target.value, 10))}
          className="w-full accent-[#FF6B5D] h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between mt-1.5 gap-1">
          <button onClick={() => handleLevelChange(level - 1000)} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">-1000</button>
          <button onClick={() => handleLevelChange(level - 100)} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">-100</button>
          <button onClick={() => handleLevelChange(level + 100)} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">+100</button>
          <button onClick={() => handleLevelChange(level + 1000)} className="flex-1 text-[8px] font-black py-1 px-1 bg-[#FBF6F1] rounded-lg border border-[#EDE4DC] text-neutral-600">+1000</button>
        </div>
      </div>

      {/* Cards Board container */}
      <div className="flex-1 flex items-center justify-center bg-white border border-[#EDE4DC] rounded-3xl p-3 relative shadow-inner min-h-[200px]" id="memory_board_zone">
        <div className={`grid gap-2 w-full max-w-[260px] aspect-square ${cards.length > 12 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {cards.map((card, idx) => {
            const revealed = card.isFlipped || card.isMatched;

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(idx)}
                className={`flex items-center justify-center aspect-square rounded-2xl border-2 text-2xl font-bold cursor-pointer transition-all duration-300 transform select-none ${
                  revealed 
                    ? 'bg-neutral-50 border-[#EDE4DC] rotate-0 scale-100 shadow-inner' 
                    : 'bg-[#FF6B5D] border-white hover:bg-[#E55A4C] rotate-180 scale-95 shadow-md text-white'
                }`}
              >
                {revealed ? card.emoji : '❓'}
              </div>
            );
          })}
        </div>

        {/* Win/Loss screen */}
        <AnimatePresence>
          {gameOver && cards.every((c) => c.isMatched) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#FBF6F1]/95 flex flex-col items-center justify-center p-4 text-center z-20 rounded-xl"
            >
              <span className="text-4xl mb-1.5 animate-bounce">🐳</span>
              <h3 className="font-display font-black text-sm text-[#2B1F2E] mb-1">Excellent Memory!</h3>
              <p className="text-[10px] text-neutral-500 mb-3">
                Completed matched sequence in time. Received <strong className="text-amber">🪙 {earnedCoins}</strong> coins!
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    initGame();
                    setLevel(prev => Math.min(10000, prev + 300));
                  }}
                  className="px-4 py-2 bg-[#FF6B5D] text-white font-display font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  Next Memory Lvl
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

          {timeLeft <= 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#FFEFEC]/95 flex flex-col items-center justify-center p-4 text-center z-20 rounded-xl"
            >
              <span className="text-4xl mb-1.5">⏰</span>
              <h3 className="font-display font-black text-sm text-[#C94A3D] mb-1">Out of Time!</h3>
              <p className="text-[10px] text-neutral-500 mb-3">
                Try again at a lower level or train your recall speeds.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={initGame}
                  className="px-4 py-2 bg-[#FF6B5D] text-white font-display font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Re-shuffle
                </button>
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-white border border-[#EDE4DC] text-neutral-600 font-display font-black text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Exit
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 text-center text-[10px] text-neutral-400 font-bold">
        ℹ️ Tip: Levels over 5000 increase grid difficulty from 3x4 to 4x4 squares!
      </div>
    </div>
  );
}
