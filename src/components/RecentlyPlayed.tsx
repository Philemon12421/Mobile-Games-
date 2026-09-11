import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Play, Clock, Sparkles, RotateCcw } from 'lucide-react';
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
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const displayItems = normalizedItems.length > 0
    ? normalizedItems
    : [
        { game: allGames.find((g) => g.id === 'g2048') || allGames[0], timestamp: 0, isSuggested: true },
        { game: allGames.find((g) => g.id === 'air') || allGames[1], timestamp: 0, isSuggested: true },
        { game: allGames.find((g) => g.id === 'ttt') || allGames[2], timestamp: 0, isSuggested: true },
      ].filter((i) => Boolean(i.game));

  const hasHistory = normalizedItems.length > 0;

  return (
    <section aria-label="Recently Played" className="mb-4" id="recently_played_section">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Recently Played
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>

        {hasHistory && onClearHistory && (
          <button
            onClick={() => {
              playSound('tap', soundEnabled);
              triggerHaptic(15, hapticEnabled);
              onClearHistory();
            }}
            className="text-[10px] text-ink-soft/60 hover:text-coral transition-colors flex items-center gap-1 cursor-pointer"
            title="Clear history"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2" id="recently_played_grid">
        <AnimatePresence mode="popLayout">
          {displayItems.map((item) => {
            if (!item.game) return null;
            const isSuggested = 'isSuggested' in item && item.isSuggested;

            return (
              <motion.button
                key={item.game.id}
                layout
                whileHover={{ y: -1.5 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playSound('tap', soundEnabled);
                  triggerHaptic(15, hapticEnabled);
                  onLaunchGame(item.game);
                }}
                className="group flex flex-col items-start p-2.5 rounded-2xl bg-surface border border-line/60 hover:border-coral/50 transition-all text-left cursor-pointer shadow-xs"
              >
                <div className="w-full flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-xl bg-line/30 flex items-center justify-center text-coral group-hover:scale-105 transition-transform">
                    {getGameIcon(item.game.id, 'w-4 h-4')}
                  </div>
                  <div className="w-5 h-5 rounded-full bg-line/20 flex items-center justify-center text-ink-soft opacity-0 group-hover:opacity-100 group-hover:bg-coral group-hover:text-white transition-all">
                    <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                  </div>
                </div>

                <span className="text-[11px] font-bold text-ink truncate w-full group-hover:text-coral transition-colors">
                  {item.game.name}
                </span>

                <span className="text-[9.5px] font-mono text-ink-soft/70 mt-0.5">
                  {isSuggested ? 'Suggested' : getRelativeTime(item.timestamp)}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default RecentlyPlayed;
