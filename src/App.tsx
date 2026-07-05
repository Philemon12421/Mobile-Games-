import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gamepad2, Search, Settings, ShieldCheck, HelpCircle, 
  Sparkles, Volume2, VolumeX, Smartphone, Trophy, Award, 
  TrendingUp, Compass, Flame, Info, CheckCircle2, ChevronRight, Check,
  Grid3x3, Binary, Scissors, Brain, Hammer, Wind, Layers, Route, Footprints, Rocket, Plane, Hash, Disc, Crown, CircleDot
} from 'lucide-react';
import { Game, UserProgress } from './types';
import Onboarding from './components/Onboarding';
import TicTacToe from './components/TicTacToe';
import Game2048 from './components/Game2048';
import RockPaperScissors from './components/RockPaperScissors';
import GameTeaser from './components/GameTeaser';
import SnakeGame from './components/SnakeGame';
import FlappyDash from './components/FlappyDash';
import WhackAMole from './components/WhackAMole';
import StackTower from './components/StackTower';
import SkyShooter from './components/SkyShooter';
import DeepSudoku from './components/DeepSudoku';
import PocketPool from './components/PocketPool';
import MarineCheckers from './components/MarineCheckers';
import MemoryMatch from './components/MemoryMatch';
import EndlessRunner from './components/EndlessRunner';
import ConnectFour from './components/ConnectFour';
import AirplaneShooter from './components/AirplaneShooter';
import { playSound, triggerHaptic } from './utils/audio';

const GAMES: Game[] = [
  { id: 'ttt', name: 'Tic-Tac-Toe', phase: 1, meta: 'Playable now', desc: 'Classic 3x3 grid vs a smart defensive AI.', playable: true, plays: 340, releaseDate: '2025-06-01' },
  { id: 'g2048', name: '2048 Sliders', phase: 1, meta: 'Playable now', desc: 'Slide and merge tiles to reach the glorious 2048.', playable: true, plays: 520, releaseDate: '2025-07-12' },
  { id: 'rps', name: 'Rock Paper Scissors', phase: 1, meta: 'Playable now', desc: 'Best of five rounds against the Deep Sea Octopus.', playable: true, plays: 180, releaseDate: '2025-08-05' },
  { id: 'memory', name: 'Memory Match', phase: 1, meta: 'Playable now', desc: 'Flip underwater tiles, find every matching pair.', playable: true, plays: 210, releaseDate: '2025-09-20' },
  { id: 'whack', name: 'Whack-a-Mole', phase: 1, meta: 'Playable now', desc: 'Tap rapid moles before they submerge back down.', playable: true, plays: 290, releaseDate: '2025-10-15' },
  { id: 'flappy', name: 'Flappy Dash', phase: 2, meta: 'Playable now', desc: 'Tap to glide between gaps in the deep coral reefs.', playable: true, plays: 460, releaseDate: '2025-11-30' },
  { id: 'stack', name: 'Stack Tower', phase: 2, meta: 'Playable now', desc: 'Time your drop to stack blocks perfectly into the sky.', playable: true, plays: 150, releaseDate: '2025-12-25' },
  { id: 'snake', name: 'Ocean Snake', phase: 2, meta: 'Playable now', desc: 'Grow your trail without doubling back or hitting reefs.', playable: true, plays: 380, releaseDate: '2026-02-10' },
  { id: 'runner', name: 'Endless Runner', phase: 2, meta: 'Playable now', desc: 'Jump over anchors as the speed keeps climbing.', playable: true, plays: 230, releaseDate: '2026-03-05' },
  { id: 'shooter', name: 'Sky Shooter', phase: 2, meta: 'Playable now', desc: 'Tap to fire bubble torpedos at targets.', playable: true, plays: 190, releaseDate: '2026-04-18' },
  { id: 'air', name: 'Air Strike 1945', phase: 2, meta: 'Playable now', desc: 'Command a fighter plane to dogfight falling alien invaders.', playable: true, plays: 120, releaseDate: '2026-07-05' },
  { id: 'sudoku', name: 'Deep Sudoku', phase: 3, meta: 'Playable now', desc: 'Fill the grid, one logical step at a time.', playable: true, plays: 110, releaseDate: '2026-05-12' },
  { id: 'c4', name: 'Connect Four', phase: 3, meta: 'Playable now', desc: 'Match four colored shells in a row to defeat the AI.', playable: true, plays: 80, releaseDate: '2026-06-01' },
  { id: 'checkers', name: 'Marine Checkers', phase: 3, meta: 'Playable now', desc: 'Classic checker board strategy, jump and capture.', playable: true, plays: 65, releaseDate: '2026-06-20' },
  { id: 'pool', name: 'Pocket Pool', phase: 3, meta: 'Playable now', desc: 'Line up shots, bounce shells, sink every ball.', playable: true, plays: 140, releaseDate: '2026-07-01' },
];

const PHASE_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-coral/10', text: 'text-coral', border: 'border-coral/30' },
  2: { bg: 'bg-amber/10', text: 'text-amber', border: 'border-amber/30' },
  3: { bg: 'bg-purple/10', text: 'text-purple', border: 'border-purple/30' },
};

const AVATARS = ['🐙', '🐳', '🐢', '🦈', '🦀', '🦑', '🐠', '🐚', '🐬'];

export default function App() {
  const [user, setUser] = useState<UserProgress | null>(null);
  const [activeScreen, setActiveScreen] = useState<'hub' | 'ttt' | 'g2048' | 'rps' | 'teaser' | 'snake' | 'flappy' | 'whack' | 'stack' | 'shooter' | 'sudoku' | 'pool' | 'checkers' | 'memory' | 'runner' | 'c4' | 'air'>('hub');
  const [selectedTeaserGame, setSelectedTeaserGame] = useState<Game | null>(null);
  const [activeTab, setActiveTab] = useState<'arcade' | 'quests' | 'settings'>('arcade');

  // Search and Category filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<number | 'all'>('all');

  // Sort By state ('name' | 'played' | 'newest')
  const [sortBy, setSortBy] = useState<'name' | 'played' | 'newest'>('name');

  // Interactive skeleton screen state for game processing simulation
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  useEffect(() => {
    setIsLoadingLibrary(true);
    const timer = setTimeout(() => {
      setIsLoadingLibrary(false);
    }, 450); // Fluid 450ms adaptive skeleton shimmer
    return () => clearTimeout(timer);
  }, [searchQuery, selectedPhase, sortBy]);

  // Track dynamic plays per game to support live sorting by 'played'
  const [gamePlays, setGamePlays] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    GAMES.forEach((g) => {
      initial[g.id] = g.plays ?? 0;
    });
    const saved = localStorage.getItem('ocean_games_playcounts');
    if (saved) {
      try {
        return { ...initial, ...JSON.parse(saved) };
      } catch {
        return initial;
      }
    }
    return initial;
  });

  // Quest Completed Toasts state
  interface QuestToast {
    id: string;
    title: string;
    reward: number;
  }
  const [toasts, setToasts] = useState<QuestToast[]>([]);

  const addQuestToast = (title: string, reward: number) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, title, reward }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Time state for mobile status bar
  const [timeStr, setTimeStr] = useState('12:00');

  // Quest achievements
  const [quests, setQuests] = useState([
    { id: 'play_game', title: 'Explore Any Game', desc: 'Launch a game or teaser from the console', reward: 20, done: false },
    { id: 'high_score', title: 'Earn High Score', desc: 'Reach 100+ score in 2048 Sliders', reward: 50, done: false },
    { id: 'win_ttt', title: 'Victory Standard', desc: 'Outsmart the AI in Tic-Tac-Toe', reward: 35, done: false },
    { id: 'air_combat', title: 'Sky Guardian', desc: 'Launch the new Air Strike 1945 fighter jet', reward: 40, done: false },
    { id: 'spin_wheel', title: 'Gamer Fortune', desc: 'Spin the release wheel in any preview', reward: 15, done: false },
  ]);

  // Load user data on startup
  useEffect(() => {
    const saved = localStorage.getItem('ocean_games_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
      } catch {
        // Fallback
      }
    }

    // Set up ticking clock
    const updateTime = () => {
      const now = new Date();
      let h = now.getHours();
      const m = now.getMinutes().toString().padStart(2, '0');
      const period = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      setTimeStr(`${h}:${m} ${period}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Save progress state helper
  const saveProgress = (updatedUser: UserProgress) => {
    setUser(updatedUser);
    localStorage.setItem('ocean_games_user', JSON.stringify(updatedUser));
  };

  // Onboarding Complete Handler
  const handleOnboardingComplete = (newUser: UserProgress) => {
    saveProgress(newUser);
  };

  // Add coins helper (adds a pleasant visual increment)
  const handleAddCoins = (amount: number) => {
    setTimeout(() => {
      setUser((currentUser) => {
        if (!currentUser) return currentUser;
        const nextCoins = currentUser.coins + amount;
        const nextUser = { ...currentUser, coins: nextCoins };
        localStorage.setItem('ocean_games_user', JSON.stringify(nextUser));
        return nextUser;
      });
    }, 0);
  };

  // Update 2048 High Score helper
  const handleUpdateHighScore = (score: number) => {
    setTimeout(() => {
      setUser((currentUser) => {
        if (!currentUser) return currentUser;
        const nextUser = {
          ...currentUser,
          highScores: {
            ...currentUser.highScores,
            g2048: score
          }
        };
        localStorage.setItem('ocean_games_user', JSON.stringify(nextUser));
        return nextUser;
      });
    }, 0);
  };

  // Trigger achievement complete
  const completeQuest = (questId: string) => {
    setQuests((prev) => 
      prev.map((q) => {
        if (q.id === questId && !q.done) {
          playSound('win', user?.soundEnabled);
          triggerHaptic(30, user?.hapticEnabled);
          handleAddCoins(q.reward);
          // Show Toast notification popup!
          addQuestToast(q.title, q.reward);
          return { ...q, done: true };
        }
        return q;
      })
    );
  };

  // Reset progress entirely (back to onboarding)
  const resetProgress = () => {
    if (confirm('Are you sure you want to reset your gamer profile and scores?')) {
      localStorage.removeItem('ocean_games_user');
      localStorage.removeItem('ocean_games_playcounts');
      setUser(null);
      setActiveScreen('hub');
      setActiveTab('arcade');
      setQuests((prev) => prev.map((q) => ({ ...q, done: false })));
      const initial: Record<string, number> = {};
      GAMES.forEach((g) => {
        initial[g.id] = g.plays ?? 0;
      });
      setGamePlays(initial);
    }
  };

  const handleLaunchGame = (game: Game) => {
    playSound('tap', user?.soundEnabled);
    triggerHaptic(15, user?.hapticEnabled);

    completeQuest('play_game');
    if (game.id === 'air') {
      completeQuest('air_combat');
    }

    setGamePlays((prev) => {
      const next = { ...prev, [game.id]: (prev[game.id] || 0) + 1 };
      localStorage.setItem('ocean_games_playcounts', JSON.stringify(next));
      return next;
    });

    if (game.playable) {
      setActiveScreen(game.id as any);
    } else {
      setSelectedTeaserGame(game);
      setActiveScreen('teaser');
    }
  };

  // Custom UI icon helper mapping to professional Lucide icons
  const getGameIcon = (id: string, className = "w-6 h-6") => {
    const icons: Record<string, React.ReactNode> = {
      ttt: <Grid3x3 className={className} />,
      g2048: <Binary className={className} />,
      rps: <Scissors className={className} />,
      memory: <Brain className={className} />,
      whack: <Hammer className={className} />,
      flappy: <Wind className={className} />,
      stack: <Layers className={className} />,
      snake: <Route className={className} />,
      runner: <Footprints className={className} />,
      shooter: <Rocket className={className} />,
      air: <Plane className={className} />,
      sudoku: <Hash className={className} />,
      c4: <Disc className={className} />,
      checkers: <Crown className={className} />,
      pool: <CircleDot className={className} />,
    };
    return icons[id] || <Gamepad2 className={className} />;
  };

  // Filters calculation and sorting
  const filteredGames = GAMES.filter((game) => {
    const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          game.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPhase = selectedPhase === 'all' || game.phase === selectedPhase;
    return matchesSearch && matchesPhase;
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'played') {
      const playsA = gamePlays[a.id] ?? 0;
      const playsB = gamePlays[b.id] ?? 0;
      return playsB - playsA;
    } else if (sortBy === 'newest') {
      const dateA = a.releaseDate ?? '';
      const dateB = b.releaseDate ?? '';
      return dateB.localeCompare(dateA);
    }
    return 0;
  });

  // Current theme tint
  const accentColor = user?.themeColor || '#FF6B5D';

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-0 sm:p-4 md:p-6 select-none" id="app_viewport">
      
      {/* Handheld Device Frame for immersive mobile gaming feeling */}
      <div 
        className="w-full h-screen sm:h-[840px] sm:max-w-[430px] sm:rounded-[48px] bg-ink sm:border-8 sm:border-line shadow-2xl relative overflow-hidden flex flex-col transition-all duration-300"
        style={{ borderColor: accentColor }}
        id="phone_simulator"
      >
        {/* Simulator Notch / Top Speaker Bar on Desktop */}
        <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-ink rounded-b-2xl z-40 flex items-center justify-center">
          <div className="w-12 h-1 bg-ink-soft/40 rounded-full" />
        </div>

        {/* Device Status Bar */}
        <div className="h-10 bg-bg text-ink px-6 pt-2 flex justify-between items-center z-30 select-none text-xs font-bold" id="device_status_bar">
          <span className="font-sans">{timeStr}</span>
          {/* Notch Spacer */}
          <div className="w-16 h-4 sm:block hidden" />
          <div className="flex items-center gap-1.5" id="status_icons">
            <span className="text-[10px]">LTE</span>
            <div className="flex gap-0.5 items-end h-3">
              <span className="w-0.5 h-1 bg-ink rounded-xs" />
              <span className="w-0.5 h-1.5 bg-ink rounded-xs" />
              <span className="w-0.5 h-2 bg-ink rounded-xs" />
              <span className="w-0.5 h-2.5 bg-ink rounded-xs" />
            </div>
            {/* Battery */}
            <div className="w-5 h-2.5 border border-ink rounded-xs p-0.5 flex items-center">
              <div className="w-full h-full bg-ink rounded-xs" />
            </div>
          </div>
        </div>

        {/* Content Router */}
        <div className="flex-1 overflow-hidden relative bg-bg flex flex-col" id="app_main_content">
          {/* Quest Completed Toasts Portal */}
          <div className="absolute top-4 left-4 right-4 z-[99] pointer-events-none space-y-2" id="toast_container">
            <AnimatePresence>
              {toasts.map((toast) => (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  className="w-full bg-slate-900 border-2 border-amber/40 rounded-2xl p-3 shadow-lg flex items-center justify-between gap-3 pointer-events-auto backdrop-blur-md"
                  id={`toast_${toast.id}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber/10 flex items-center justify-center text-lg shrink-0">
                      🏆
                    </div>
                    <div className="text-left">
                      <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Quest Completed</p>
                      <p className="text-xs font-bold text-white leading-tight mt-0.5">{toast.title}</p>
                    </div>
                  </div>
                  <div className="bg-amber text-slate-950 font-sans font-black text-[10px] px-2 py-1 rounded-lg shrink-0 flex items-center gap-0.5 shadow-xs">
                    🪙+{toast.reward}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {!user ? (
              <motion.div 
                key="onboarding"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <Onboarding onComplete={handleOnboardingComplete} />
              </motion.div>
            ) : (
              <motion.div
                key="arcade_router"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col"
              >
                {/* Embedded Screen Views */}
                <div className="flex-1 overflow-hidden relative">
                  
                  {activeScreen === 'hub' && (
                    <div className="h-full flex flex-col p-5 pb-0" id="hub_view">
                      
                      {/* Brand Header */}
                      <div className="flex justify-between items-center mb-3" id="hub_header">
                        <div>
                          <h1 className="font-display font-extrabold text-2xl tracking-tight text-ink flex items-center gap-1.5 leading-none">
                            Ocean<span style={{ color: accentColor }}>Games</span>
                          </h1>
                          <p className="text-[10px] font-bold text-ink-soft/70 uppercase tracking-widest mt-0.5">
                            Play instantly • Zero blue
                          </p>
                        </div>

                        {/* Gold coin balance readout */}
                        <motion.div 
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center gap-1.5 bg-surface border border-line rounded-full py-1.5 px-3.5 shadow-sm font-display font-extrabold text-sm text-ink-soft"
                          id="coin_pouch"
                        >
                          <span className="text-amber animate-pulse">🪙</span>
                          <span className="text-ink font-sans font-black">{user.coins}</span>
                        </motion.div>
                      </div>

                      {/* Dynamic Tab Selector (Arcade, Quests, Profile/Settings) */}
                      {activeTab === 'arcade' && (
                        <div className="flex-1 flex flex-col overflow-hidden" id="tab_arcade_view">
                          
                          {/* Search bar & filters panel */}
                          <div className="space-y-2.5 mb-4" id="search_and_filters">
                            <div className="flex gap-2 items-center" id="search_sort_container">
                              <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft/50" />
                                <input
                                  type="text"
                                  placeholder="Search games..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="w-full bg-surface border border-line focus:border-coral rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none placeholder:text-ink-soft/40 transition-colors text-ink"
                                />
                              </div>
                              
                              {/* Elegant Sort Dropdown */}
                              <div className="relative shrink-0">
                                <select
                                  value={sortBy}
                                  onChange={(e) => {
                                    playSound('tap', user?.soundEnabled);
                                    setSortBy(e.target.value as any);
                                  }}
                                  className="bg-surface border border-line focus:border-coral text-[11px] font-extrabold rounded-2xl px-3.5 py-2.5 outline-none cursor-pointer text-ink appearance-none pr-7 shadow-xs relative"
                                  id="sort_by_dropdown"
                                >
                                  <option value="name">A-Z</option>
                                  <option value="played">Most Played</option>
                                  <option value="newest">Newest</option>
                                </select>
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-soft/60 font-sans text-[9px]">▼</span>
                              </div>
                            </div>

                            {/* Phase filter category tabs */}
                            <div className="flex gap-1.5 overflow-x-auto pb-1" id="phase_filters">
                              <button
                                onClick={() => setSelectedPhase('all')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  selectedPhase === 'all'
                                    ? 'bg-ink text-white shadow-xs'
                                    : 'bg-surface border border-line text-ink-soft hover:bg-line/20'
                                }`}
                              >
                                All Releases
                              </button>
                              {[1, 2, 3].map((ph) => (
                                <button
                                  key={ph}
                                  onClick={() => setSelectedPhase(ph)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                    selectedPhase === ph
                                      ? 'bg-ink text-white shadow-xs'
                                      : 'bg-surface border border-line text-ink-soft hover:bg-line/20'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${ph === 1 ? 'bg-coral' : ph === 2 ? 'bg-amber' : 'bg-purple'}`} />
                                  Phase {ph}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Legend & release grid */}
                          <div className="flex-1 overflow-y-auto pb-24" id="games_grid_container">
                            
                            {/* Vibrant Palette Welcome Banner */}
                            <div className="p-4 rounded-3xl border-2 mb-3.5 transition-transform shadow-xs" style={{ backgroundColor: '#FFEFEC', borderColor: '#FF6B5D' }} id="welcome_banner">
                              <h2 className="text-lg font-extrabold mb-1" style={{ color: '#C94A3D' }}>Welcome Back!</h2>
                              <p className="text-[11px] leading-relaxed font-bold" style={{ color: '#6E6270' }}>
                                You've unlocked playable phase games. Ready to climb the leaderboard?
                              </p>
                            </div>

                            {/* Vibrant Palette Level Tracker */}
                            <div className="p-4 rounded-3xl bg-surface border border-line mb-4.5 shadow-xs" id="level_tracker_card">
                              <div className="flex items-center gap-3 mb-2.5">
                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 flex items-center justify-center bg-line text-lg" style={{ borderColor: '#F5A623' }}>
                                  {user?.avatar || '🐙'}
                                </div>
                                <div>
                                  <p className="font-extrabold text-xs text-ink">{user?.nickname || 'Guest Gamer'}</p>
                                  <p className="text-[10px] font-bold" style={{ color: '#6E6270' }}>Level 24 Pro Player</p>
                                </div>
                              </div>
                              <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#EDE4DC' }}>
                                <div className="h-full rounded-full" style={{ width: '75%', backgroundColor: '#F5A623' }} />
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: '#6E6270' }}>750 / 1000 XP to Level 25</p>
                                <span className="text-[8px] font-black uppercase py-0.5 px-2 rounded-lg text-white" style={{ backgroundColor: '#F5A623' }}>LEVEL UP</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3.5" id="game_cards_grid">
                              {isLoadingLibrary ? (
                                Array.from({ length: 4 }).map((_, idx) => (
                                  <div
                                    key={`skeleton_${idx}`}
                                    className="bg-surface border border-line rounded-3xl overflow-hidden shadow-xs relative flex flex-col justify-between animate-pulse h-[132px]"
                                  >
                                    {/* Top Accent Strip Skeleton */}
                                    <div className="h-1.5 w-full bg-ink-soft/10" />

                                    <div className="p-4 flex-1 flex flex-col justify-between">
                                      <div className="flex justify-between items-start">
                                        {/* Icon block skeleton */}
                                        <div className="w-11 h-11 rounded-2xl bg-ink-soft/10 shadow-inner" />
                                        {/* Badge skeleton */}
                                        <div className="w-10 h-4 rounded-full bg-ink-soft/5" />
                                      </div>

                                      <div className="mt-3.5 space-y-1.5">
                                        {/* Title skeleton */}
                                        <div className="h-3.5 w-3/4 rounded-md bg-ink-soft/10" />
                                        <div className="flex items-center justify-between gap-1.5 mt-1">
                                          {/* Description skeleton */}
                                          <div className="h-2.5 w-1/2 rounded bg-ink-soft/5" />
                                          {/* Playcount skeleton */}
                                          <div className="h-2.5 w-1/5 rounded bg-ink-soft/5" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : filteredGames.length > 0 ? (
                                filteredGames.map((game) => {
                                  const config = PHASE_COLORS[game.phase] || { bg: 'bg-line/30', text: 'text-ink-soft', border: 'border-line' };
                                  return (
                                    <motion.div
                                      key={game.id}
                                      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(43,31,46,0.06)' }}
                                      whileTap={{ scale: 0.96 }}
                                      onClick={() => handleLaunchGame(game)}
                                      className="bg-surface border border-line hover:border-coral/40 rounded-3xl overflow-hidden cursor-pointer shadow-xs transition-all relative flex flex-col justify-between"
                                    >
                                      {/* Top Accent Strip with Brand Colors */}
                                      <div className={`h-1.5 w-full ${game.phase === 1 ? 'bg-coral' : game.phase === 2 ? 'bg-amber' : 'bg-purple'}`} />

                                      <div className="p-4 flex-1 flex flex-col justify-between">
                                        <div className="flex justify-between items-start">
                                          <div className={`w-11 h-11 rounded-2xl ${config.bg} flex items-center justify-center shadow-inner`}>
                                            {getGameIcon(game.id, `w-5.5 h-5.5 ${config.text}`)}
                                          </div>
                                          
                                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${config.bg} ${config.text} ${config.border}`}>
                                            P{game.phase}
                                          </span>
                                        </div>

                                        <div className="mt-4">
                                          <h3 className="font-display font-extrabold text-sm text-ink line-clamp-1 leading-none mb-1">
                                            {game.name}
                                          </h3>
                                          <div className="flex items-center justify-between gap-1.5 mt-1">
                                            <p className="text-[9px] font-bold text-ink-soft/80 leading-tight line-clamp-1">
                                              {game.playable ? game.meta : 'Phase teaser demo'}
                                            </p>
                                            <span className="text-[8px] font-mono font-bold text-ink-soft/50">
                                              {game.plays ? `${game.plays} plays` : ''}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  );
                                })
                              ) : (
                                <div className="col-span-2 text-center py-10 space-y-2">
                                  <span className="text-3xl">🏜️</span>
                                  <p className="text-xs font-bold text-ink-soft">No matching games found.</p>
                                </div>
                              )}
                            </div>

                            {/* Vibrant Palette Your Stats Section */}
                            <div className="mt-6 mb-4" id="stats_section">
                              <h3 className="text-sm font-extrabold mb-3 text-ink">Your Stats</h3>
                              <div className="grid grid-cols-2 gap-3" id="stats_grid">
                                <div className="p-4 rounded-3xl bg-surface border border-line flex flex-col justify-between shadow-xs" id="stat_wins">
                                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: '#6E6270' }}>Total Wins</p>
                                  <p className="text-xl font-black animate-pulse" style={{ color: '#FF6B5D' }}>{quests.filter((q) => q.done).length * 4 + 12}</p>
                                </div>
                                <div className="p-4 rounded-3xl bg-surface border border-line flex flex-col justify-between shadow-xs" id="stat_hours">
                                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: '#6E6270' }}>Game Hours</p>
                                  <p className="text-xl font-black" style={{ color: '#F5A623' }}>{(user?.coins ? (user.coins / 35).toFixed(1) : '1.5')}</p>
                                </div>
                                <div className="p-4 rounded-3xl bg-surface border border-line flex flex-col justify-between shadow-xs" id="stat_rank">
                                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: '#6E6270' }}>World Rank</p>
                                  <p className="text-xl font-black" style={{ color: '#6B4E9E' }}>#1,402</p>
                                </div>
                                <div className="p-4 rounded-3xl bg-surface border border-line flex flex-col justify-between shadow-xs" id="stat_collectibles">
                                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: '#6E6270' }}>Gold Coins</p>
                                  <p className="text-xl font-black" style={{ color: '#2B1F2E' }}>{user?.coins || 0}</p>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      )}

                      {activeTab === 'quests' && (
                        <div className="flex-1 flex flex-col overflow-hidden pb-24" id="tab_quests_view">
                          <div className="mb-4">
                            <h2 className="font-display font-extrabold text-xl text-ink">Quest Coins Center</h2>
                            <p className="text-xs text-ink-soft">Complete quick tasks in standard games & earn real gold coins.</p>
                          </div>

                          <div className="space-y-3 overflow-y-auto flex-1 pb-4" id="quests_list">
                            {quests.map((q) => (
                              <div 
                                key={q.id}
                                className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all ${
                                  q.done 
                                    ? 'bg-success/5 border-success/30 opacity-70' 
                                    : 'bg-surface border-line'
                                }`}
                              >
                                <div className="space-y-1">
                                  <h4 className={`text-xs font-extrabold ${q.done ? 'text-success line-through' : 'text-ink'}`}>
                                    {q.title}
                                  </h4>
                                  <p className="text-[10px] font-semibold text-ink-soft leading-tight">{q.desc}</p>
                                  <p className="text-[9px] font-black text-amber mt-1">🪙 +{q.reward} Gold</p>
                                </div>

                                <div className="flex items-center">
                                  {q.done ? (
                                    <div className="w-7 h-7 rounded-full bg-success/15 flex items-center justify-center text-success">
                                      <Check className="w-4 h-4 stroke-[3]" />
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        playSound('tap', user.soundEnabled);
                                        // Auto claim quest if it's high score and achieved
                                        if (q.id === 'play_game') {
                                          completeQuest('play_game');
                                        } else {
                                          alert(`Launch a game and complete its objective to unlock this reward!`);
                                        }
                                      }}
                                      className="text-[10px] font-black bg-coral text-white px-2.5 py-1.5 rounded-lg uppercase tracking-wider hover:bg-coral-dark"
                                    >
                                      Claim
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeTab === 'settings' && (
                        <div className="flex-1 flex flex-col overflow-hidden pb-24" id="tab_settings_view">
                          <div className="mb-4">
                            <h2 className="font-display font-extrabold text-xl text-ink">Gamer Settings</h2>
                            <p className="text-xs text-ink-soft">Adjust audio preferences, customize accents, or reset scores.</p>
                          </div>

                          <div className="space-y-4 overflow-y-auto flex-1 pb-4" id="settings_container">
                            
                            {/* React Native Expo Specs Card */}
                            <div className="bg-gradient-to-br from-[#1e1b4b]/80 to-[#0f172a]/90 border border-indigo-500/25 rounded-2xl p-4 space-y-2.5 shadow-md text-left" id="expo_specs_card">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">📱 Expo Mobile Active</h4>
                                <span className="bg-indigo-500/10 text-indigo-300 text-[9px] font-black px-1.5 py-0.5 rounded border border-indigo-500/30">SDK 51</span>
                              </div>
                              <p className="text-[10px] text-slate-300 leading-normal font-bold">
                                This dashboard workspace is fully optimized for React Native and Expo Go compatibility.
                              </p>
                              <div className="bg-black/40 p-2.5 rounded-xl border border-slate-800/60 font-mono text-[9px] text-indigo-300 space-y-1">
                                <p className="text-slate-500"># Launch Expo Metro Bundler</p>
                                <p><span className="text-amber-400">npx</span> expo start</p>
                                <p className="text-slate-500 mt-1"># Build iOS/Android Binaries</p>
                                <p><span className="text-amber-400">npx</span> eas build --platform all</p>
                              </div>
                            </div>

                            {/* Sound & Haptics toggle card */}
                            <div className="bg-surface border border-line rounded-2xl p-4 space-y-3.5 shadow-xs">
                              <h4 className="text-xs font-black text-ink-soft uppercase tracking-wider">Device Toggles</h4>
                              
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-bold text-ink">Sound FX Synth</p>
                                  <p className="text-[9px] font-semibold text-ink-soft">Procedural game melody generator</p>
                                </div>
                                <button
                                  onClick={() => {
                                    const next = { ...user, soundEnabled: !user.soundEnabled };
                                    saveProgress(next);
                                    playSound('tap', next.soundEnabled);
                                  }}
                                  className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer ${user.soundEnabled ? 'bg-success' : 'bg-line'}`}
                                >
                                  <div className={`w-5.5 h-5.5 rounded-full bg-white absolute top-0.5 transition-transform ${user.soundEnabled ? 'right-0.5' : 'left-0.5'}`} />
                                </button>
                              </div>

                              <div className="flex items-center justify-between border-t border-line/40 pt-3">
                                <div>
                                  <p className="text-xs font-bold text-ink">Haptic Vibration</p>
                                  <p className="text-[9px] font-semibold text-ink-soft">Tactile web-vibration response</p>
                                </div>
                                <button
                                  onClick={() => {
                                    const next = { ...user, hapticEnabled: !user.hapticEnabled };
                                    saveProgress(next);
                                    triggerHaptic(20, next.hapticEnabled);
                                  }}
                                  className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer ${user.hapticEnabled ? 'bg-success' : 'bg-line'}`}
                                >
                                  <div className={`w-5.5 h-5.5 rounded-full bg-white absolute top-0.5 transition-transform ${user.hapticEnabled ? 'right-0.5' : 'left-0.5'}`} />
                                </button>
                              </div>
                            </div>

                            {/* Profile customizer card */}
                            <div className="bg-surface border border-line rounded-2xl p-4 space-y-3 shadow-xs">
                              <h4 className="text-xs font-black text-ink-soft uppercase tracking-wider">Mascot Settings</h4>
                              
                              <div className="flex gap-2 items-center">
                                <label className="text-xs font-bold text-ink">Nickname:</label>
                                <input
                                  type="text"
                                  maxLength={12}
                                  value={user.nickname}
                                  onChange={(e) => {
                                    const next = { ...user, nickname: e.target.value };
                                    saveProgress(next);
                                  }}
                                  className="flex-1 bg-bg border border-line focus:border-coral rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none"
                                />
                              </div>

                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-ink-soft">Select Mascot Avatar:</p>
                                <div className="flex gap-1.5 overflow-x-auto py-1">
                                  {AVATARS.map((av) => (
                                    <button
                                      key={av}
                                      onClick={() => {
                                        playSound('tap', user.soundEnabled);
                                        const next = { ...user, avatar: av };
                                        saveProgress(next);
                                      }}
                                      className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl transition-all shrink-0 cursor-pointer ${
                                        user.avatar === av 
                                          ? 'bg-coral/10 border-coral ring-2 ring-coral/20' 
                                          : 'bg-bg border-line'
                                      }`}
                                    >
                                      {av}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Reset state card */}
                            <button
                              onClick={resetProgress}
                              className="w-full bg-coral/10 border border-coral/30 hover:bg-coral/20 text-coral font-display font-extrabold text-xs py-3.5 rounded-2xl transition-colors cursor-pointer"
                            >
                              Reset Gamer Progress
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Floating Bottom Nav Rail bar */}
                      <div className="absolute bottom-5 left-5 right-5 h-16 bg-[#2B1F2E] border border-line/10 rounded-3xl p-2.5 flex justify-between items-center shadow-lg z-30" id="bottom_navbar">
                        <button
                          onClick={() => {
                            playSound('tap', user.soundEnabled);
                            setActiveTab('arcade');
                          }}
                          className={`flex-1 flex flex-col items-center justify-center gap-1.5 cursor-pointer rounded-2xl transition-colors py-1 ${
                            activeTab === 'arcade' ? 'text-white font-extrabold bg-coral/10' : 'text-white/50 hover:text-white/70'
                          }`}
                        >
                          <Gamepad2 className="w-5 h-5" />
                          <span className="text-[8px] uppercase tracking-wider leading-none">Arcade</span>
                        </button>

                        <button
                          onClick={() => {
                            playSound('tap', user.soundEnabled);
                            setActiveTab('quests');
                          }}
                          className={`flex-1 flex flex-col items-center justify-center gap-1.5 cursor-pointer rounded-2xl transition-colors py-1 ${
                            activeTab === 'quests' ? 'text-white font-extrabold bg-coral/10' : 'text-white/50 hover:text-white/70'
                          }`}
                        >
                          <Trophy className="w-5 h-5" />
                          <span className="text-[8px] uppercase tracking-wider leading-none">Quests</span>
                        </button>

                        <button
                          onClick={() => {
                            playSound('tap', user.soundEnabled);
                            setActiveTab('settings');
                          }}
                          className={`flex-1 flex flex-col items-center justify-center gap-1.5 cursor-pointer rounded-2xl transition-colors py-1 ${
                            activeTab === 'settings' ? 'text-white font-extrabold bg-coral/10' : 'text-white/50 hover:text-white/70'
                          }`}
                        >
                          <Settings className="w-5 h-5" />
                          <span className="text-[8px] uppercase tracking-wider leading-none">Settings</span>
                        </button>
                      </div>

                    </div>
                  )}

                  {activeScreen === 'ttt' && (
                    <TicTacToe
                      onBack={() => {
                        playSound('tap', user.soundEnabled);
                        setActiveScreen('hub');
                      }}
                      userProgress={user}
                      onAddCoins={handleAddCoins}
                    />
                  )}

                  {activeScreen === 'g2048' && (
                    <Game2048
                      onBack={() => {
                        playSound('tap', user.soundEnabled);
                        setActiveScreen('hub');
                      }}
                      userProgress={user}
                      onAddCoins={handleAddCoins}
                      highScore={user.highScores?.g2048 || 0}
                      onUpdateHighScore={handleUpdateHighScore}
                    />
                  )}

                  {activeScreen === 'rps' && (
                    <RockPaperScissors
                      onBack={() => {
                        playSound('tap', user.soundEnabled);
                        setActiveScreen('hub');
                      }}
                      userProgress={user}
                      onAddCoins={handleAddCoins}
                    />
                  )}

                  {activeScreen === 'snake' && (
                    <SnakeGame
                      onBack={() => {
                        playSound('tap', user.soundEnabled);
                        setActiveScreen('hub');
                      }}
                      userProgress={user}
                      onAddCoins={handleAddCoins}
                    />
                  )}

                  {activeScreen === 'flappy' && (
                    <FlappyDash
                      onBack={() => {
                        playSound('tap', user.soundEnabled);
                        setActiveScreen('hub');
                      }}
                      userProgress={user}
                      onAddCoins={handleAddCoins}
                    />
                  )}

                  {activeScreen === 'whack' && (
                    <WhackAMole
                      onBack={() => {
                        playSound('tap', user.soundEnabled);
                        setActiveScreen('hub');
                      }}
                      userProgress={user}
                      onAddCoins={handleAddCoins}
                    />
                  )}

                  {activeScreen === 'stack' && (
                    <StackTower
                      onBack={() => {
                        playSound('tap', user.soundEnabled);
                        setActiveScreen('hub');
                      }}
                      userProgress={user}
                      onAddCoins={handleAddCoins}
                    />
                  )}

                  {activeScreen === 'shooter' && (
                    <SkyShooter
                      onBack={() => {
                        playSound('tap', user.soundEnabled);
                        setActiveScreen('hub');
                      }}
                      userProgress={user}
                      onAddCoins={handleAddCoins}
                    />
                  )}

                  {activeScreen === 'sudoku' && (
                    <DeepSudoku
                      onBack={() => {
                        playSound('tap', user.soundEnabled);
                        setActiveScreen('hub');
                      }}
                      userProgress={user}
                      onAddCoins={handleAddCoins}
                    />
                  )}

                  {activeScreen === 'pool' && (
                    <PocketPool
                      onBack={() => {
                        playSound('tap', user.soundEnabled);
                        setActiveScreen('hub');
                      }}
                      userProgress={user}
                      onAddCoins={handleAddCoins}
                    />
                  )}

                  {activeScreen === 'checkers' && (
                    <MarineCheckers
                      onBack={() => {
                        playSound('tap', user.soundEnabled);
                        setActiveScreen('hub');
                      }}
                      userProgress={user}
                      onAddCoins={handleAddCoins}
                    />
                  )}

                  {activeScreen === 'memory' && (
                    <MemoryMatch
                      onBack={() => {
                        playSound('tap', user.soundEnabled);
                        setActiveScreen('hub');
                      }}
                      userProgress={user}
                      onAddCoins={handleAddCoins}
                    />
                  )}

                  {activeScreen === 'runner' && (
                    <EndlessRunner
                      onBack={() => {
                        playSound('tap', user.soundEnabled);
                        setActiveScreen('hub');
                      }}
                      userProgress={user}
                      onAddCoins={handleAddCoins}
                    />
                  )}

                  {activeScreen === 'c4' && (
                    <ConnectFour
                      onBack={() => {
                        playSound('tap', user.soundEnabled);
                        setActiveScreen('hub');
                      }}
                      userProgress={user}
                      onAddCoins={handleAddCoins}
                    />
                  )}

                  {activeScreen === 'air' && (
                    <AirplaneShooter
                      onBack={() => {
                        playSound('tap', user.soundEnabled);
                        setActiveScreen('hub');
                      }}
                      userProgress={user}
                      onAddCoins={handleAddCoins}
                    />
                  )}

                  {activeScreen === 'teaser' && selectedTeaserGame && (
                    <GameTeaser
                      game={selectedTeaserGame}
                      onBack={() => {
                        playSound('tap', user.soundEnabled);
                        setActiveScreen('hub');
                      }}
                      userProgress={user}
                      onAddCoins={(amount) => {
                        handleAddCoins(amount);
                        completeQuest('spin_wheel');
                      }}
                    />
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Apple/Android Virtual Home Gesture Bar inside Simulator */}
        <div className="h-6 bg-bg flex items-center justify-center pb-2 select-none pointer-events-none" id="simulator_home_bar">
          <div className="w-32 h-1 bg-ink/30 rounded-full" />
        </div>
      </div>
    </div>
  );
}
