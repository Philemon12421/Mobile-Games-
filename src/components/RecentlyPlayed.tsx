import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Play, Sparkles, Clock, Zap, RotateCcw, Flame } from 'lucide-react';
import { Game, RecentlyPlayedItem } from '../types';
import { playSound, triggerHaptic } from '../utils/audio';

interface RecentlyPlayedProps {
  recentlyPlayed: (RecentlyPlayedItem | string)[];
  allGames: Game[];
  onLaunchGame: (game: Game) => void;
  onClearHistory?: () => void;
  getGameIcon: (id: string, className?: string) => React.ReactNode;
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
}

export const RecentlyPlayed: React.FC<RecentlyPlayedProps> = ({
  recentlyPlayed,
  allGames,
  onLaunchGame,
  onClearHistory,
  getGameIcon,
  soundEnabled = true,
  hapticEnabled = true,
}) => {
  // Live relative timestamp ticker (updates every second for real-time accuracy)
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Normalize recently played items into uniform objects with game and timestamp
  const normalizedItems = recentlyPlayed
    .map((item, index) => {
      if (typeof item === 'string') {
        const game = allGames.find((g) => g.id === item);
        return game ? { game, timestamp: Date.now() - index * 60000 } : null;
      }
      const game = allGames.find((g) => g.id === item.gameId);
      return game ? { game, timestamp: item.timestamp || Date.now() } : null;
    })
    .filter((entry): entry is { game: Game; timestamp: number } => entry !== null)
    .slice(0, 3);

  // Helper for real-time relative time
  const getRelativeTime = (timestamp: number) => {
    const diffMs = Math.max(0, now - timestamp);
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // If user has zero recently played games, offer quick starter games (top 3)
  const displayItems = normalizedItems.length > 0 
    ? normalizedItems 
    : [
        { game: allGames.find((g) => g.id === 'g2048') || allGames[0], timestamp: 0, isSuggested: true },
        { game: allGames.find((g) => g.id === 'air') || allGames[1], timestamp: 0, isSuggested: true },
        { game: allGames.find((g) => g.id === 'ttt') || allGames[2], timestamp: 0, isSuggested: true },
      ].filter((i) => Boolean(i.game));

  const hasHistory = normalizedItems.length > 0;

  return (
    <section 
      aria-label="Recently Played Games"
      id="recently_played_section" 
      className="mb-4 bg-surface/80 dark:bg-surface/60 border border-line/80 rounded-2xl p-3 shadow-xs backdrop-blur-xs transition-all"
    >
      {/* Header bar with Real-time indicator */}
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-coral/15 flex items-center justify-center text-coral">
            <History className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-black tracking-tight text-ink flex items-center gap-1.5">
                Recently Played
                {hasHistory && (
                  <span className="text-[10px] text-ink-soft/70 font-mono font-normal">
                    ({normalizedItems.length}/3)
                  </span>
                )}
              </h3>
              {/* Real-time pulse pill */}
              <span 
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[8.5px] font-extrabold uppercase tracking-wider"
                title="Real-time session updates active"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live
              </span>
            </div>
            <p className="text-[9.5px] font-semibold text-ink-soft">
              {hasHistory ? 'Instant 1-tap jump to your active games' : 'Quick recommendations to jump into the action'}
            </p>
          </div>
        </div>

        {/* Clear History Button (if history exists) */}
        {hasHistory && onClearHistory && (
          <button
            onClick={() => {
              playSound('tap', soundEnabled);
              triggerHaptic(15, hapticEnabled);
              onClearHistory();
            }}
            className="text-[10px] font-bold text-ink-soft/70 hover:text-coral flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-coral/10 transition-colors cursor-pointer"
            title="Clear recently played history"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* 3 Quick-access game cards */}
      <div className="grid grid-cols-3 gap-2" id="recently_played_cards_grid">
        <AnimatePresence mode="popLayout">
          {displayItems.map((item, idx) => {
            if (!item.game) return null;
            const isSuggested = 'isSuggested' in item && item.isSuggested;
            const isPlayable = item.game.playable;

            return (
              <motion.button
                layout
                key={item.game.id}
                id={`recent_game_${item.game.id}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2 }}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  playSound('tap', soundEnabled);
                  triggerHaptic(15, hapticEnabled);
                  onLaunchGame(item.game);
                }}
                className="group relative flex flex-col items-start p-2.5 rounded-xl border border-line bg-bg/90 hover:bg-line/20 hover:border-coral/50 transition-all text-left cursor-pointer overflow-hidden shadow-xs"
              >
                {/* Subtle top-right quick launch glyph */}
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-surface border border-line flex items-center justify-center text-ink-soft group-hover:bg-coral group-hover:text-white group-hover:border-coral transition-colors shadow-2xs">
                  <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                </div>

                {/* Game Icon & rank pill */}
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-surface border border-line flex items-center justify-center text-coral shadow-2xs group-hover:scale-105 transition-transform">
                    {getGameIcon(item.game.id, 'w-4 h-4')}
                  </div>
                  <span className="text-[9px] font-mono font-black text-ink-soft/60 px-1 py-0.5 rounded bg-line/30">
                    #{idx + 1}
                  </span>
                </div>

                {/* Game Name */}
                <span className="text-[11px] font-extrabold text-ink line-clamp-1 group-hover:text-coral transition-colors leading-tight">
                  {item.game.name}
                </span>

                {/* Real-time status / relative timestamp */}
                <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-ink-soft">
                  {isSuggested ? (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Sparkles className="w-2.5 h-2.5" />
                      Suggested
                    </span>
                  ) : (
                    <span 
                      className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400"
                      title={`Last launched at ${new Date(item.timestamp).toLocaleTimeString()}`}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      {getRelativeTime(item.timestamp)}
                    </span>
                  )}
                </div>

                {/* Status tag */}
                <div className="mt-1.5 w-full flex items-center justify-between border-t border-line/40 pt-1.5">
                  <span className="text-[8.5px] font-black uppercase tracking-wider text-ink-soft/70">
                    {isPlayable ? 'Ready' : 'Preview'}
                  </span>
                  <span className="text-[8.5px] font-black text-coral group-hover:translate-x-0.5 transition-transform">
                    Launch →
                  </span>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default RecentlyPlayed;
