import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Flame, X, Check, Gift, Sparkles, AlertCircle, 
  Calendar, Trophy, ShieldAlert, Award
} from 'lucide-react';
import { UserProgress } from '../types';
import { playSound, triggerHaptic } from '../utils/audio';

interface DailyStreakModalProps {
  user: UserProgress;
  onClose: () => void;
  onClaimDailyReward: (day: number, reward: number) => void;
  canClaimToday: boolean;
  streakResetNotice?: boolean;
}

const STREAK_REWARDS = [
  { day: 1, reward: 25, label: 'Day 1', icon: '🪙' },
  { day: 2, reward: 50, label: 'Day 2', icon: '🪙' },
  { day: 3, reward: 75, label: 'Day 3', icon: '🪙' },
  { day: 4, reward: 100, label: 'Day 4', icon: '🪙' },
  { day: 5, reward: 150, label: 'Day 5', icon: '💎' },
  { day: 6, reward: 200, label: 'Day 6', icon: '🔥' },
  { day: 7, reward: 350, label: 'Day 7', icon: '👑', special: 'Mystery Jackpot' },
];

export default function DailyStreakModal({
  user,
  onClose,
  onClaimDailyReward,
  canClaimToday,
  streakResetNotice = false
}: DailyStreakModalProps) {
  const [claimed, setClaimed] = useState(false);
  const currentStreak = user.dailyStreak || 1;
  const currentDayIndex = ((currentStreak - 1) % 7) + 1; // 1 to 7
  const currentTier = STREAK_REWARDS.find((r) => r.day === currentDayIndex) || STREAK_REWARDS[0];

  const handleClaim = () => {
    if (!canClaimToday || claimed) return;
    setClaimed(true);
    playSound('win', user.soundEnabled);
    triggerHaptic(40, user.hapticEnabled);
    onClaimDailyReward(currentDayIndex, currentTier.reward);
  };

  const accentColor = user.themeColor || '#FF6B5D';

  return (
    <div className="absolute inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4" id="daily_streak_modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 15 }}
        className="bg-surface border-2 rounded-3xl w-full max-w-[390px] p-5 shadow-2xl flex flex-col relative overflow-hidden"
        style={{ borderColor: accentColor }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-line/40 flex items-center justify-center text-ink cursor-pointer hover:bg-line transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Flame */}
        <div className="text-center pt-2 pb-3">
          <div className="w-14 h-14 rounded-3xl bg-amber/15 border border-amber/30 mx-auto flex items-center justify-center text-2xl shadow-inner mb-2.5 relative">
            <Flame className="w-8 h-8 text-amber fill-amber animate-pulse" />
            <span className="absolute -top-1 -right-1 bg-coral text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
              {currentStreak}D
            </span>
          </div>

          <h3 className="font-display font-black text-xl text-ink leading-tight">
            Daily Login Streak
          </h3>
          <p className="text-xs font-bold text-ink-soft mt-1">
            {canClaimToday 
              ? `Day ${currentDayIndex} reward is waiting for you!` 
              : `Day ${currentDayIndex} claimed! Come back tomorrow for Day ${currentDayIndex === 7 ? 1 : currentDayIndex + 1}.`}
          </p>
        </div>

        {/* Missed Day Reset Warning Banner */}
        {streakResetNotice && (
          <div className="bg-coral/15 border border-coral/30 rounded-2xl p-2.5 mb-3 flex items-center gap-2 text-coral">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-[10px] font-bold leading-tight">
              A day was missed! Your login streak was reset to Day 1. Log in consecutively to rebuild your multiplier.
            </p>
          </div>
        )}

        {/* 7-Day Reward Grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {STREAK_REWARDS.slice(0, 4).map((tier) => {
            const isCompleted = tier.day < currentDayIndex || (tier.day === currentDayIndex && (!canClaimToday || claimed));
            const isCurrent = tier.day === currentDayIndex;

            return (
              <div
                key={tier.day}
                className={`p-2 rounded-2xl border text-center relative transition-all ${
                  isCurrent
                    ? 'border-amber bg-amber/15 shadow-sm ring-1 ring-amber/40 scale-105'
                    : isCompleted
                    ? 'border-line/40 bg-bg/40 opacity-70'
                    : 'border-line bg-surface'
                }`}
              >
                {isCompleted && (
                  <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px]">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <span className="text-[9px] font-black uppercase text-ink-soft block">{tier.label}</span>
                <span className="text-lg my-0.5 block">{tier.icon}</span>
                <span className="text-[10px] font-mono font-black text-ink">+{tier.reward}🪙</span>
              </div>
            );
          })}
        </div>

        {/* Days 5, 6, 7 (Expanded Tier) */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {STREAK_REWARDS.slice(4, 7).map((tier) => {
            const isCompleted = tier.day < currentDayIndex || (tier.day === currentDayIndex && (!canClaimToday || claimed));
            const isCurrent = tier.day === currentDayIndex;

            return (
              <div
                key={tier.day}
                className={`p-2.5 rounded-2xl border text-center relative transition-all ${
                  tier.day === 7
                    ? isCurrent
                      ? 'border-purple bg-purple/20 shadow-md ring-2 ring-purple/50 scale-105'
                      : 'border-purple/30 bg-purple/10'
                    : isCurrent
                    ? 'border-amber bg-amber/15 shadow-sm ring-1 ring-amber/40 scale-105'
                    : isCompleted
                    ? 'border-line/40 bg-bg/40 opacity-70'
                    : 'border-line bg-surface'
                }`}
              >
                {isCompleted && (
                  <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px]">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <span className="text-[9px] font-black uppercase text-ink-soft block">{tier.label}</span>
                <span className="text-xl my-0.5 block">{tier.icon}</span>
                <span className="text-[10px] font-mono font-black text-ink">+{tier.reward}🪙</span>
                {tier.special && (
                  <span className="text-[7px] font-black uppercase tracking-wider text-purple block mt-0.5">
                    Jackpot
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Rule description */}
        <div className="bg-bg/60 border border-line rounded-2xl p-2.5 text-[10px] text-ink-soft space-y-1 mb-4">
          <div className="flex items-center gap-1.5 font-bold text-ink">
            <Calendar className="w-3.5 h-3.5 text-coral" />
            <span>Streak Reset Rule</span>
          </div>
          <p className="leading-tight">
            Log in every calendar day to advance your streak. If you skip a single day, your streak safely resets back to Day 1.
          </p>
        </div>

        {/* Action Button */}
        {canClaimToday && !claimed ? (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleClaim}
            className="w-full py-3.5 text-white font-display font-black text-xs rounded-2xl shadow-lg cursor-pointer flex items-center justify-center gap-2"
            style={{ backgroundColor: accentColor }}
          >
            <Sparkles className="w-4 h-4 text-amber animate-spin" />
            <span>Claim Day {currentDayIndex} (+{currentTier.reward} 🪙 Coins)</span>
          </motion.button>
        ) : (
          <div className="w-full py-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-center flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-display font-black text-xs">
            <Check className="w-4 h-4" />
            <span>Today's Streak Claimed ({currentStreak} Days Active)</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
