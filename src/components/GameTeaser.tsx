import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, triggerHaptic } from '../utils/audio';
import { ArrowLeft, Play, Lock, Award, Sparkles, RefreshCw } from 'lucide-react';
import { Game, UserProgress } from '../types';

interface GameTeaserProps {
  game: Game;
  onBack: () => void;
  userProgress: UserProgress;
  onAddCoins: (amount: number) => void;
}

export default function GameTeaser({ game, onBack, userProgress, onAddCoins }: GameTeaserProps) {
  const [activeTeaser, setActiveTeaser] = useState<'none' | 'memory' | 'whack' | 'wheel'>('none');
  
  // Memory Teaser State
  const [memCards, setMemCards] = useState<{ id: number; symbol: string; flipped: boolean; matched: boolean }[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [memWin, setMemWin] = useState(false);

  // Whack-a-Mole Teaser State
  const [moleActive, setMoleActive] = useState<number | null>(null);
  const [moleScore, setMoleScore] = useState(0);
  const [whackTimer, setWhackTimer] = useState(5);
  const [whackGameActive, setWhackGameActive] = useState(false);
  const [whackWin, setWhackWin] = useState(false);

  // Wheel Teaser State
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelDegree, setWheelDegree] = useState(0);
  const [wheelPrize, setWheelPrize] = useState<number | null>(null);

  // Start a specific teaser
  const startTeaser = () => {
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(15, userProgress.hapticEnabled);
    
    if (game.id === 'memory') {
      setActiveTeaser('memory');
      // Init a 2x2 memory cards deck
      const symbols = ['🐠', '🐡', '🐠', '🐡'];
      const deck = symbols
        .map((sym, idx) => ({ id: idx, symbol: sym, flipped: false, matched: false }))
        .sort(() => Math.random() - 0.5);
      setMemCards(deck);
      setSelectedIndices([]);
      setMemWin(false);
    } else if (game.id === 'whack') {
      setActiveTeaser('whack');
      setMoleScore(0);
      setWhackTimer(5);
      setWhackGameActive(true);
      setWhackWin(false);
      setMoleActive(Math.floor(Math.random() * 4));
    } else {
      setActiveTeaser('wheel');
      setWheelPrize(null);
    }
  };

  // 1. Memory Match Teaser Logic
  const handleMemoryTap = (index: number) => {
    if (memCards[index].flipped || memCards[index].matched || selectedIndices.length >= 2 || memWin) return;
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(10, userProgress.hapticEnabled);

    const newCards = [...memCards];
    newCards[index].flipped = true;
    setMemCards(newCards);

    const newSelected = [...selectedIndices, index];
    setSelectedIndices(newSelected);

    if (newSelected.length === 2) {
      const [firstIdx, secondIdx] = newSelected;
      if (newCards[firstIdx].symbol === newCards[secondIdx].symbol) {
        // Matched
        setTimeout(() => {
          playSound('win', userProgress.soundEnabled);
          triggerHaptic(25, userProgress.hapticEnabled);
          const matchedCards = [...newCards];
          matchedCards[firstIdx].matched = true;
          matchedCards[secondIdx].matched = true;
          setMemCards(matchedCards);
          setSelectedIndices([]);

          if (matchedCards.every((c) => c.matched)) {
            setMemWin(true);
            onAddCoins(10);
          }
        }, 400);
      } else {
        // No match, turn back
        setTimeout(() => {
          playSound('slide', userProgress.soundEnabled);
          const resetCards = [...newCards];
          resetCards[firstIdx].flipped = false;
          resetCards[secondIdx].flipped = false;
          setMemCards(resetCards);
          setSelectedIndices([]);
        }, 900);
      }
    }
  };

  // 2. Whack-a-Mole Teaser Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (whackGameActive && whackTimer > 0) {
      interval = setInterval(() => {
        setWhackTimer((t) => t - 1);
        setMoleActive(Math.floor(Math.random() * 4));
      }, 1000);
    } else if (whackTimer === 0 && whackGameActive) {
      setWhackGameActive(false);
      setMoleActive(null);
      if (moleScore >= 4) {
        setWhackWin(true);
        playSound('win', userProgress.soundEnabled);
        triggerHaptic(40, userProgress.hapticEnabled);
        onAddCoins(15);
      } else {
        playSound('lose', userProgress.soundEnabled);
      }
    }
    return () => clearInterval(interval);
  }, [whackGameActive, whackTimer, moleScore]);

  const handleMoleWhack = (index: number) => {
    if (index !== moleActive || !whackGameActive) return;
    playSound('tap', userProgress.soundEnabled);
    triggerHaptic(20, userProgress.hapticEnabled);
    setMoleScore((s) => s + 1);
    setMoleActive(null); // immediately hide
  };

  // 3. Wheel Spinner Teaser Logic
  const spinWheel = () => {
    if (wheelSpinning) return;
    playSound('powerup', userProgress.soundEnabled);
    triggerHaptic(30, userProgress.hapticEnabled);
    setWheelSpinning(true);

    const randomRotations = 3 + Math.floor(Math.random() * 3); // 3-5 full spins
    const randomSector = Math.floor(Math.random() * 6); // 6 sectors
    const degree = randomRotations * 360 + randomSector * 60;
    setWheelDegree(degree);

    setTimeout(() => {
      setWheelSpinning(false);
      const coinPrizes = [5, 15, 8, 25, 10, 30];
      const sectorIdx = (6 - (randomSector % 6)) % 6; // pointer is at top
      const prize = coinPrizes[sectorIdx];
      setWheelPrize(prize);
      onAddCoins(prize);
      playSound('win', userProgress.soundEnabled);
      triggerHaptic(35, userProgress.hapticEnabled);
    }, 2500);
  };

  const currentThemeHex = userProgress.themeColor;

  return (
    <div className="flex flex-col h-full bg-bg text-ink rounded-3xl p-5 overflow-y-auto" id="teaser_wrapper">
      {/* Header */}
      <div className="flex justify-between items-center mb-5" id="teaser_header">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-ink hover:bg-line/40 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-display font-black text-lg tracking-tight text-ink-soft">
          Phase Preview
        </span>
        <div className="w-10 h-10" />
      </div>

      {activeTeaser === 'none' ? (
        <div className="flex-1 flex flex-col justify-between" id="teaser_main">
          {/* Main lock overview */}
          <div className="bg-surface border border-line rounded-3xl p-6 text-center space-y-4 shadow-sm" id="teaser_card">
            <div className="w-16 h-16 rounded-2xl bg-line/50 flex items-center justify-center text-3xl mx-auto shadow-inner relative">
              <span className="filter drop-shadow-sm">
                {game.id === 'memory' ? '🎴' : game.id === 'whack' ? '🦦' : '🎮'}
              </span>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-coral flex items-center justify-center border-2 border-surface shadow-xs">
                <Lock className="w-3 h-3 text-white" />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="inline-block bg-purple/10 text-purple font-display font-extrabold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
                Phase {game.phase} Release
              </span>
              <h3 className="font-display font-black text-2xl text-ink">
                {game.name}
              </h3>
              <p className="text-xs text-ink-soft px-4 leading-relaxed">
                {game.desc} — arriving in Phase {game.phase}. Stay tuned for full gameplay!
              </p>
            </div>

            {/* Feature spec list */}
            <div className="grid grid-cols-2 gap-2 text-left bg-bg/50 rounded-2xl p-3 text-[10px] font-bold text-ink-soft uppercase tracking-wider">
              <div className="flex items-center gap-1.5 p-1 bg-surface rounded-lg border border-line/50">
                ⭐ Fluid Physics
              </div>
              <div className="flex items-center gap-1.5 p-1 bg-surface rounded-lg border border-line/50">
                ✨ Combo Multipliers
              </div>
              <div className="flex items-center gap-1.5 p-1 bg-surface rounded-lg border border-line/50">
                👥 Local Rivals
              </div>
              <div className="flex items-center gap-1.5 p-1 bg-surface rounded-lg border border-line/50">
                🏆 Cloud Trophies
              </div>
            </div>
          </div>

          {/* Call to action */}
          <div className="space-y-2 pt-4" id="teaser_call_to_action">
            <button
              onClick={startTeaser}
              className="w-full bg-coral hover:bg-coral-dark text-white font-display font-extrabold text-sm py-4 rounded-2xl shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" /> Play Interactive Teaser
            </button>
            <p className="text-[10px] font-bold text-ink-soft/60 text-center uppercase tracking-widest">
              Unlock gold coins with the preview simulator!
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between" id="teaser_active_container">
          <div className="bg-surface border border-line rounded-3xl p-5 shadow-sm text-center space-y-4" id="teaser_interactive_window">
            <div className="flex justify-between items-center pb-2 border-b border-line/50">
              <span className="text-xs font-bold text-ink-soft uppercase tracking-wider">
                Interactive Teaser
              </span>
              <button
                onClick={() => {
                  playSound('tap', userProgress.soundEnabled);
                  setActiveTeaser('none');
                }}
                className="text-xs font-extrabold text-coral uppercase tracking-wider"
              >
                Quit
              </button>
            </div>

            {/* Teaser 1: Memory Match */}
            {activeTeaser === 'memory' && (
              <div className="space-y-4" id="teaser_memory_board">
                <div>
                  <h4 className="font-display font-black text-lg text-ink">Ocean Memory Demo</h4>
                  <p className="text-[10px] font-semibold text-ink-soft">Match the ocean creatures to claim your rewards.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-[200px] mx-auto py-2">
                  {memCards.map((card, idx) => (
                    <button
                      key={card.id}
                      onClick={() => handleMemoryTap(idx)}
                      className={`aspect-square rounded-2xl text-2xl flex items-center justify-center font-bold border-2 transition-transform outline-none active:scale-95 cursor-pointer ${
                        card.flipped || card.matched
                          ? 'bg-purple/10 border-purple text-ink'
                          : 'bg-bg border-line hover:border-ink-soft/40 text-transparent'
                      }`}
                    >
                      {card.flipped || card.matched ? card.symbol : '?'}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {memWin && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-success/10 border border-success text-success rounded-xl p-3 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Award className="w-4 h-4 animate-bounce" /> Matches Complete! +10 Gold 🪙
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Teaser 2: Whack-a-Mole */}
            {activeTeaser === 'whack' && (
              <div className="space-y-4" id="teaser_whack_board">
                <div className="flex justify-between items-center px-2">
                  <span className="text-xs font-extrabold text-coral uppercase">Timer: {whackTimer}s</span>
                  <span className="text-xs font-extrabold text-purple uppercase">Whacks: {moleScore}/4</span>
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-[200px] mx-auto py-2">
                  {[0, 1, 2, 3].map((idx) => {
                    const isActive = moleActive === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleMoleWhack(idx)}
                        className={`aspect-square rounded-2xl flex items-center justify-center text-3xl transition-all relative overflow-hidden border-2 outline-none cursor-pointer ${
                          isActive 
                            ? 'bg-amber/15 border-amber active:scale-90' 
                            : 'bg-bg border-line'
                        }`}
                      >
                        {isActive ? '🦦' : '🕳️'}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {whackWin && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-success/10 border border-success text-success rounded-xl p-3 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Award className="w-4 h-4 animate-pulse" /> Whack Champ! +15 Gold 🪙
                    </motion.div>
                  )}
                  {!whackGameActive && !whackWin && (
                    <div className="text-xs font-bold text-coral bg-coral/10 rounded-xl p-3">
                      Whack 4 moles to win! Tap retry.
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Teaser 3: Wheel of Fortune */}
            {activeTeaser === 'wheel' && (
              <div className="space-y-4 flex flex-col items-center" id="teaser_wheel_board">
                <div>
                  <h4 className="font-display font-black text-lg text-ink">Golden Release Spinner</h4>
                  <p className="text-[10px] font-semibold text-ink-soft">Spin to predict release week & win gold coins!</p>
                </div>

                {/* Spinning Wheel Container */}
                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* Outer needle pointer */}
                  <div className="absolute top-0 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] border-t-coral z-10" />

                  <motion.div
                    animate={{ rotate: wheelDegree }}
                    transition={{ duration: wheelSpinning ? 2.5 : 0.2, ease: "easeOut" }}
                    className="w-full h-full rounded-full border-4 border-ink bg-surface flex items-center justify-center relative overflow-hidden shadow-md"
                    style={{
                      backgroundImage: `conic-gradient(
                        #FF6B5D 0deg 60deg, 
                        #F5A623 60deg 120deg, 
                        #6B4E9E 120deg 180deg, 
                        #4E9E6B 180deg 240deg, 
                        #EDE4DC 240deg 300deg, 
                        #FFFFFF 300deg 360deg
                      )`
                    }}
                  >
                    {/* Inner gold hub */}
                    <div className="absolute w-8 h-8 rounded-full bg-amber border-2 border-white flex items-center justify-center z-10 font-bold text-white text-[10px] shadow-sm">
                      🪙
                    </div>
                  </motion.div>
                </div>

                <AnimatePresence>
                  {wheelPrize !== null && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-success/10 border border-success text-success rounded-xl py-2 px-5 font-extrabold text-xs flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Won +{wheelPrize} Gold Coins!
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Action buttons inside teaser mode */}
          <div className="pt-4" id="teaser_active_footer">
            {activeTeaser === 'memory' && memWin && (
              <button
                onClick={startTeaser}
                className="w-full bg-surface border border-line hover:bg-line/20 text-ink font-bold text-xs py-3.5 rounded-2xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Demo Card Deck
              </button>
            )}

            {activeTeaser === 'whack' && !whackGameActive && (
              <button
                onClick={startTeaser}
                className="w-full bg-surface border border-line hover:bg-line/20 text-ink font-bold text-xs py-3.5 rounded-2xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Rapid Whack Demo
              </button>
            )}

            {activeTeaser === 'wheel' && (
              <button
                disabled={wheelSpinning}
                onClick={spinWheel}
                style={{ backgroundColor: wheelSpinning ? '#EDE4DC' : currentThemeHex }}
                className="w-full text-white font-display font-black text-sm py-3.5 rounded-2xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                {wheelSpinning ? 'SPINNING...' : 'TAP TO SPIN WHEEL'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
