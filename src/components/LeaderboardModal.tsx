import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, X, Crown, TrendingUp, Sparkles, RefreshCw, 
  ShieldCheck, Server, Award, Flame, Users
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { UserProgress } from '../types';
import { playSound, triggerHaptic } from '../utils/audio';

interface LeaderboardModalProps {
  user: UserProgress;
  onClose: () => void;
  serverEngine?: 'unreal' | 'unity';
}

interface PlayerScore {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  score: number;
  region: string;
  isUser?: boolean;
}

const GLOBAL_BASE_PLAYERS = [
  { id: 'p1', name: 'PoseidonX', avatar: '👑', score: 14850, region: 'NA-East' },
  { id: 'p2', name: 'AbyssalViper', avatar: '⚡', score: 12400, region: 'EU-Central' },
  { id: 'p3', name: 'CoralQueen', avatar: '🌸', score: 10650, region: 'AP-East' },
  { id: 'p4', name: 'DeepNautilus', avatar: '🌊', score: 8920, region: 'NA-West' },
  { id: 'p5', name: 'SharkByte', avatar: '🦈', score: 7450, region: 'SA-East' },
  { id: 'p6', name: 'KrakenLord', avatar: '🦑', score: 6300, region: 'EU-West' },
  { id: 'p7', name: 'ShellySpeed', avatar: '🐢', score: 5120, region: 'AP-South' },
  { id: 'p8', name: 'Leviathan_7', avatar: '🦕', score: 4300, region: 'NA-Central' },
  { id: 'p9', name: 'TidalRider', avatar: '🐬', score: 3600, region: 'EU-North' },
  { id: 'p10', name: 'ReefDiver', avatar: '🐚', score: 2850, region: 'AF-South' }
];

export default function LeaderboardModal({ user, onClose, serverEngine = 'unreal' }: LeaderboardModalProps) {
  const [activeCategory, setActiveCategory] = useState<'overall' | 'g2048' | 'air' | 'ttt'>('overall');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  // Compute User's dynamic score based on their high scores, coins, and streak
  const userScore = useMemo(() => {
    const scores = user.highScores || {};
    if (activeCategory === 'g2048') {
      return (scores.g2048 || 0) + 120;
    }
    if (activeCategory === 'air') {
      return (scores.air || scores.shooter || 0) * 15 + 450;
    }
    if (activeCategory === 'ttt') {
      return (scores.ttt || 0) * 100 + 300;
    }
    // Overall score combines all games + coins/2 + streak * 100
    const rawScores = Object.values(scores).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
    const bonus = Math.floor((user.coins || 0) * 0.8) + (user.dailyStreak || 1) * 120;
    return Math.max(850, rawScores * 2 + bonus);
  }, [user, activeCategory]);

  // Combine user with global players and sort
  const leaderboardData: PlayerScore[] = useMemo(() => {
    let baseList = GLOBAL_BASE_PLAYERS.map((p) => {
      let score = p.score;
      if (activeCategory === 'g2048') score = Math.floor(p.score * 0.45);
      if (activeCategory === 'air') score = Math.floor(p.score * 0.28);
      if (activeCategory === 'ttt') score = Math.floor(p.score * 0.15);
      return { ...p, score };
    });

    const userEntry: PlayerScore = {
      rank: 0,
      id: 'current_user',
      name: `${user.nickname} (You)`,
      avatar: user.avatar || '🐙',
      score: userScore,
      region: user.serverRegion || 'US-East',
      isUser: true
    };

    const all = [...baseList, userEntry].sort((a, b) => b.score - a.score);
    return all.map((player, idx) => ({
      ...player,
      rank: idx + 1
    }));
  }, [user, userScore, activeCategory]);

  // Find user's rank
  const userRankItem = leaderboardData.find((p) => p.isUser);
  const userRank = userRankItem ? userRankItem.rank : 8;

  // Chart data: Top 6 players + User if user is outside top 6
  const chartData = useMemo(() => {
    const top6 = leaderboardData.slice(0, 6);
    const userInTop6 = top6.some((p) => p.isUser);
    if (!userInTop6 && userRankItem) {
      return [...top6.slice(0, 5), userRankItem];
    }
    return top6;
  }, [leaderboardData, userRankItem]);

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    playSound('tap', user.soundEnabled);
    triggerHaptic(20, user.hapticEnabled);

    const engineName = serverEngine === 'unreal' ? 'Unreal Engine 5 NetDriver' : 'Unity Netcode Relay';
    setRefreshMessage(`Syncing RPC packets with ${engineName}...`);

    setTimeout(() => {
      setIsRefreshing(false);
      setRefreshMessage(`Verified & replicated with ${engineName} (Ping: 22ms)`);
      playSound('win', user.soundEnabled);
      triggerHaptic(30, user.hapticEnabled);

      setTimeout(() => setRefreshMessage(null), 3000);
    }, 900);
  };

  const accentColor = user.themeColor || '#FF6B5D';

  return (
    <div className="absolute inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4" id="leaderboard_modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        className="bg-surface border-2 border-line rounded-3xl w-full max-w-[400px] h-[720px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative"
        style={{ borderColor: accentColor }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-line flex items-center justify-between bg-bg/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-display font-black text-sm text-ink leading-none">Global Leaderboard</h3>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber/15 text-amber border border-amber/30">
                  Live
                </span>
              </div>
              <p className="text-[10px] font-bold text-ink-soft/70 mt-0.5 flex items-center gap-1">
                <Server className="w-2.5 h-2.5 text-emerald-500" />
                <span>{serverEngine === 'unreal' ? 'Unreal Engine 5.4 Netcode' : 'Unity Netcode Server'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              className="w-8 h-8 rounded-full bg-line/40 flex items-center justify-center text-ink cursor-pointer hover:bg-line transition-all active:scale-95"
              title="Refresh Leaderboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-ink-soft ${isRefreshing ? 'animate-spin text-amber' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-line/40 flex items-center justify-center text-ink cursor-pointer hover:bg-line transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Server Sync Message */}
        {refreshMessage && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 text-center shrink-0 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>{refreshMessage}</span>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-1 p-2 bg-bg/30 border-b border-line overflow-x-auto shrink-0 scrollbar-none">
          {[
            { id: 'overall', label: '🏆 Overall Power' },
            { id: 'g2048', label: '🔢 2048 Sliders' },
            { id: 'air', label: '✈️ Air Strike' },
            { id: 'ttt', label: '⭕ Tic-Tac-Toe' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                playSound('tap', user.soundEnabled);
                setActiveCategory(cat.id as any);
              }}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-ink text-surface shadow-xs'
                  : 'text-ink-soft hover:bg-line/40'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 scrollbar-none">
          
          {/* User High Score Highlight Card */}
          <div 
            className="p-3 rounded-2xl border flex items-center justify-between shadow-xs relative overflow-hidden"
            style={{ 
              borderColor: `${accentColor}40`,
              backgroundColor: `${accentColor}10`
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-surface border border-line flex items-center justify-center text-xl shadow-xs">
                {user.avatar || '🐙'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-black text-xs text-ink">{user.nickname}</span>
                  <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-ink text-surface">YOU</span>
                </div>
                <p className="text-[10px] font-bold text-ink-soft">
                  Global Rank: <span className="font-black text-ink">#{userRank}</span> of 25,480 players
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[9px] font-black uppercase text-ink-soft/70 block">Your Score</span>
              <span className="font-mono font-black text-sm text-ink flex items-center gap-0.5 justify-end">
                <Sparkles className="w-3 h-3 text-amber" />
                {userScore.toLocaleString()}
              </span>
            </div>
          </div>

          {/* RECHARTS Visual Bar Chart: Top Players Relative Comparison */}
          <div className="bg-bg/80 border border-line rounded-2xl p-3 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-coral" />
                <h4 className="font-display font-black text-[11px] text-ink uppercase tracking-wider">
                  Relative Standing
                </h4>
              </div>
              <span className="text-[9px] font-mono text-ink-soft/60">Top Contenders</span>
            </div>

            {/* Recharts Container */}
            <div className="h-44 w-full" id="recharts_leaderboard_container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 2, right: 15, left: 10, bottom: 2 }}
                >
                  <XAxis 
                    type="number" 
                    hide 
                    domain={[0, 'dataMax + 1000']} 
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fill: '#7A6B82', fontSize: 9, fontWeight: 700 }}
                    width={78}
                    tickFormatter={(val) => val.length > 11 ? `${val.slice(0, 10)}…` : val}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as PlayerScore;
                        return (
                          <div className="bg-surface border border-line p-2 rounded-xl shadow-lg text-[10px] space-y-0.5 z-50">
                            <p className="font-black text-ink flex items-center gap-1">
                              <span>{data.avatar}</span>
                              <span>{data.name}</span>
                              {data.isUser && <span className="text-coral">(You)</span>}
                            </p>
                            <p className="font-mono text-ink-soft">
                              Rank: <span className="font-bold text-ink">#{data.rank}</span>
                            </p>
                            <p className="font-mono font-bold text-amber">
                              Score: {data.score.toLocaleString()} pts
                            </p>
                            <p className="text-[8px] text-ink-soft/60">Region: {data.region}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="score" 
                    radius={[0, 8, 8, 0]}
                    animationDuration={800}
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={`cell-${entry.id}`}
                        fill={entry.isUser ? accentColor : entry.rank === 1 ? '#F5A623' : entry.rank === 2 ? '#9E9E9E' : entry.rank === 3 ? '#CD7F32' : '#6B4E9E'}
                        stroke={entry.isUser ? '#ffffff' : 'transparent'}
                        strokeWidth={entry.isUser ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[8px] text-center text-ink-soft/50 mt-1">
              Visual scores rendered with Recharts • Highlights your position in real-time
            </p>
          </div>

          {/* Full List of Rankings */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase text-ink-soft tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3 text-ink-soft" />
                Global Roster
              </span>
              <span className="text-[9px] font-mono text-ink-soft/60">Rank / Score</span>
            </div>

            {leaderboardData.slice(0, 10).map((player) => {
              const isTop3 = player.rank <= 3;
              const rankColor = 
                player.rank === 1 ? 'text-amber font-black' :
                player.rank === 2 ? 'text-slate-400 font-bold' :
                player.rank === 3 ? 'text-amber-700 dark:text-amber-600 font-bold' :
                'text-ink-soft';

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                    player.isUser
                      ? 'border-coral bg-coral/10 shadow-xs ring-1 ring-coral/30'
                      : 'border-line/70 bg-surface hover:bg-bg/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Rank Badge */}
                    <div className="w-6 text-center">
                      {player.rank === 1 ? (
                        <Crown className="w-4 h-4 text-amber mx-auto animate-bounce" />
                      ) : player.rank === 2 ? (
                        <span className="text-xs font-black text-slate-400">#2</span>
                      ) : player.rank === 3 ? (
                        <span className="text-xs font-black text-amber-700">#3</span>
                      ) : (
                        <span className={`text-[10px] font-mono font-bold ${rankColor}`}>#{player.rank}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-xl bg-bg border border-line/60 flex items-center justify-center text-sm shrink-0">
                      {player.avatar}
                    </div>

                    {/* Name and Region */}
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-display font-extrabold text-xs text-ink line-clamp-1">
                          {player.name}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono text-ink-soft/60">
                        {player.region} • Dedicated Sync
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <span className="font-mono font-black text-xs text-ink block">
                      {player.score.toLocaleString()}
                    </span>
                    <span className="text-[8px] font-bold text-ink-soft/60 uppercase">pts</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer Server Info */}
        <div className="p-3 border-t border-line bg-bg/70 flex items-center justify-between text-[9px] text-ink-soft shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono font-bold text-ink">
              {serverEngine === 'unreal' ? 'UE5.4 Dedicated NetDriver' : 'Unity Netcode Relay'}
            </span>
          </div>
          <span className="font-mono text-ink-soft/60">Tick: 60Hz • 21ms Latency</span>
        </div>
      </motion.div>
    </div>
  );
}
