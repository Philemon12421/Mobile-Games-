import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, User, Palette, Gift, Volume2, ShieldCheck, Check } from 'lucide-react';
import { UserProgress } from '../types';
import { playSound, triggerHaptic } from '../utils/audio';

interface OnboardingProps {
  onComplete: (progress: UserProgress) => void;
}

const AVATARS = [
  { id: '🐙', name: 'Octo', desc: 'Curious & clever' },
  { id: '🐳', name: 'Wally', desc: 'Calm & giant' },
  { id: '🐢', name: 'Shelly', desc: 'Wise & steady' },
  { id: '🦈', name: 'Bruce', desc: 'Bold & fast' },
  { id: '🦀', name: 'Barnaby', desc: 'Snappy & fun' },
  { id: '🦑', name: 'Jellie', desc: 'Glows in dark' }
];

const COLORS = [
  { value: '#FF6B5D', label: 'Coral Rise', name: 'coral' },
  { value: '#F5A623', label: 'Amber Glow', name: 'amber' },
  { value: '#6B4E9E', label: 'Deep Purple', name: 'purple' },
  { value: '#4E9E6B', label: 'Kelp Forest', name: 'success' }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🐙');
  const [selectedColor, setSelectedColor] = useState('#FF6B5D');
  const [coinsClaimed, setCoinsClaimed] = useState(false);

  const handleNext = () => {
    playSound('tap');
    triggerHaptic(15);
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    playSound('tap');
    triggerHaptic(10);
    setStep((prev) => Math.max(0, prev - 1));
  };

  const handleClaimCoins = () => {
    if (coinsClaimed) return;
    playSound('win');
    triggerHaptic(40);
    setCoinsClaimed(true);
    
    // Auto-complete onboarding after a brief delay
    setTimeout(() => {
      onComplete({
        nickname: nickname.trim() || 'OceanRider',
        avatar: selectedAvatar,
        themeColor: selectedColor,
        coins: 340, // 240 default + 100 bonus
        gamesUnlocked: ['ttt', 'g2048'],
        highScores: { ttt: 0, g2048: 0 },
        onboarded: true,
        soundEnabled: true,
        hapticEnabled: true,
        streak: 1,
      });
    }, 1200);
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col justify-between h-full bg-bg p-6 text-ink rounded-3xl overflow-hidden relative" id="onboarding_container">
      {/* Background Decorative Bubble Patterns */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ y: [-10, -120], opacity: [0.3, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
          className="absolute bottom-10 left-10 w-8 h-8 rounded-full bg-coral/10 border border-coral/20"
        />
        <motion.div 
          animate={{ y: [-20, -180], opacity: [0.4, 0] }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear", delay: 1 }}
          className="absolute bottom-20 right-12 w-12 h-12 rounded-full bg-amber/10 border border-amber/20"
        />
        <motion.div 
          animate={{ y: [-5, -90], opacity: [0.2, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: "linear", delay: 3 }}
          className="absolute bottom-4 left-1/3 w-6 h-6 rounded-full bg-purple/10 border border-purple/20"
        />
      </div>

      {/* Top indicator bar */}
      <div className="flex justify-between items-center z-10" id="onboarding_header">
        <div className="flex gap-1.5" id="onboarding_progress_dots">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                idx === step 
                  ? 'w-7 bg-coral' 
                  : idx < step 
                    ? 'w-2.5 bg-ink/30' 
                    : 'w-2.5 bg-ink/10'
              }`}
            />
          ))}
        </div>
        <div className="text-xs font-semibold tracking-wider text-ink-soft bg-line px-2.5 py-1 rounded-full uppercase" id="onboarding_step_label">
          Step {step + 1} of 4
        </div>
      </div>

      {/* Slide screens */}
      <div className="flex-1 flex flex-col justify-center py-6 z-10" id="onboarding_slider">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 text-center flex flex-col items-center justify-center h-full"
              id="onboarding_step_0"
            >
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-24 h-24 rounded-3xl bg-coral/10 border-2 border-coral flex items-center justify-center shadow-lg shadow-coral/5"
              >
                <Sparkles className="w-12 h-12 text-coral" />
              </motion.div>

              <div className="space-y-3">
                <h2 className="font-display font-black text-3xl leading-tight">
                  Welcome to <br /><span className="text-coral">OceanGames</span> Mobile
                </h2>
                <p className="text-ink-soft text-sm px-4 leading-relaxed">
                  14 curated classic games. Zero blue light damage. Zero complex set ups. Instant offline-friendly mobile gameplay wrapped in a premium physical simulator.
                </p>
              </div>

              <div className="bg-line/40 rounded-2xl p-4 w-full flex items-center gap-3 border border-line text-left">
                <span className="text-2xl">🌴</span>
                <div>
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Phase Release Grid</h4>
                  <p className="text-xs text-ink-soft">Start with classic Tic-Tac-Toe and 2048 now! Unlock the others as we launch new phases.</p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
              id="onboarding_step_1"
            >
              <div className="text-center space-y-1">
                <h3 className="font-display font-extrabold text-2xl text-ink">
                  Select Your <span className="text-amber">Mascot</span>
                </h3>
                <p className="text-xs text-ink-soft">This beautiful ocean companion represents your score and profile.</p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2" id="avatar_picker_grid">
                {AVATARS.map((av) => (
                  <motion.button
                    key={av.id}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      playSound('tap');
                      triggerHaptic(10);
                      setSelectedAvatar(av.id);
                    }}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      selectedAvatar === av.id
                        ? 'bg-amber/10 border-amber shadow-sm'
                        : 'bg-surface border-line hover:border-ink/20'
                    }`}
                  >
                    <span className="text-3xl filter drop-shadow-sm">{av.id}</span>
                    <span className="text-xs font-bold text-ink">{av.name}</span>
                  </motion.button>
                ))}
              </div>

              <div className="bg-surface/50 rounded-xl p-3 text-center border border-line">
                <p className="text-xs text-ink-soft font-semibold">
                  Mascot Specialty: {AVATARS.find((a) => a.id === selectedAvatar)?.desc}
                </p>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
              id="onboarding_step_2"
            >
              <div className="text-center space-y-1">
                <h3 className="font-display font-extrabold text-2xl text-ink">
                  Set Up <span className="text-purple">Identity</span>
                </h3>
                <p className="text-xs text-ink-soft">Choose a username and your theme aesthetic.</p>
              </div>

              <div className="space-y-4 pt-2">
                {/* Nickname Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Nickname
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Enter gamer tag..."
                    className="w-full bg-surface border-2 border-line focus:border-purple rounded-2xl px-4 py-3 text-sm font-bold placeholder:text-ink-soft/40 outline-none transition-colors"
                  />
                </div>

                {/* Signature Color */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" /> Signature Accent Color
                  </label>
                  <div className="flex justify-between gap-2 bg-surface p-2.5 rounded-2xl border-2 border-line">
                    {COLORS.map((col) => (
                      <button
                        key={col.value}
                        onClick={() => {
                          playSound('tap');
                          triggerHaptic(10);
                          setSelectedColor(col.value);
                        }}
                        className="relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-200 active:scale-90"
                        style={{ backgroundColor: col.value }}
                        title={col.label}
                      >
                        {selectedColor === col.value && (
                          <motion.div 
                            layoutId="selectedColorBorder"
                            className="absolute -inset-1 rounded-full border-2" 
                            style={{ borderColor: col.value }}
                          >
                            <div className="w-full h-full flex items-center justify-center text-white">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-5 text-center flex flex-col items-center justify-center h-full"
              id="onboarding_step_3"
            >
              <div className="relative">
                <motion.div 
                  animate={{ 
                    scale: coinsClaimed ? [1, 1.4, 0] : [1, 1.08, 1],
                    rotate: coinsClaimed ? [0, 15, 0] : 0,
                    opacity: coinsClaimed ? [1, 1, 0] : 1
                  }}
                  transition={{ duration: 0.5 }}
                  onClick={handleClaimCoins}
                  className={`w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-lg border-4 border-amber cursor-pointer relative bg-amber/10 ${coinsClaimed ? 'pointer-events-none' : ''}`}
                >
                  <span className="text-4xl">🪙</span>
                  <span className="font-display font-black text-xl text-amber-dark mt-1">+100</span>
                  
                  {!coinsClaimed && (
                    <span className="absolute -bottom-2 bg-amber text-white font-extrabold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-widest animate-bounce">
                      Tap Me
                    </span>
                  )}
                </motion.div>

                {coinsClaimed && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-success/10 border-2 border-success flex items-center justify-center">
                      <ShieldCheck className="w-10 h-10 text-success" />
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="font-display font-black text-2xl text-ink">
                  {coinsClaimed ? "Gamer Registered!" : "Claim Starter Bonus!"}
                </h3>
                <p className="text-xs text-ink-soft leading-relaxed max-w-xs mx-auto">
                  {coinsClaimed 
                    ? `Welcome aboard, ${nickname || 'OceanRider'}! Entering OceanGames Mobile hub now...`
                    : "Tap the starter token to claim 100 bonus gold coins! Use them to preview locked games and test your skills."}
                </p>
              </div>

              {/* Summary card */}
              <div className="bg-surface border border-line rounded-2xl p-3 w-full flex items-center justify-between text-left shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-bg rounded-xl flex items-center justify-center text-2xl">
                    {selectedAvatar}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink">{nickname || 'OceanRider'}</h4>
                    <p className="text-[10px] text-ink-soft font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedColor }} /> Signature Color Theme
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-amber flex items-center gap-1">
                    🪙 {coinsClaimed ? '340' : '240'}
                  </p>
                  <p className="text-[9px] font-bold text-ink-soft uppercase tracking-wider">Ocean Gold</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation Buttons */}
      <div className="flex gap-3 pt-2 border-t border-line/50 z-10" id="onboarding_footer">
        {step > 0 && step < 3 && (
          <button
            onClick={handleBack}
            className="flex-1 bg-surface border border-line hover:border-ink/20 text-ink font-bold text-xs py-3.5 rounded-2xl transition-colors cursor-pointer"
          >
            Back
          </button>
        )}
        
        {step < 3 ? (
          <button
            onClick={handleNext}
            disabled={step === 2 && !nickname.trim()}
            className={`flex-1 flex items-center justify-center gap-1.5 text-white font-display font-extrabold text-sm py-3.5 rounded-2xl shadow-md cursor-pointer transition-all ${
              step === 2 && !nickname.trim()
                ? 'bg-ink-soft/40 cursor-not-allowed shadow-none'
                : 'bg-coral hover:bg-coral-dark active:scale-[0.98]'
            }`}
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-full text-center py-2 text-[10px] font-bold text-ink-soft/50 uppercase tracking-widest">
            Establishing server connection...
          </div>
        )}
      </div>
    </div>
  );
}
