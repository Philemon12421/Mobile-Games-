# 🌊 OceanGames

> An immersive, high-fidelity deep-sea arcade campaign and games hub. Seamlessly runs as a high-performance React SPA via Vite and is fully structured for mobile devices with React Native & Expo.

---

## ✨ Highlights & Key Features

- **Sleek Motion Engine**: Fluid layout transitions, stagger entrances, and haptic-aligned micro-animations powered by `motion` (`motion/react`).
- **Tactile Physics**: Authentic angle projections, whirlpool gravitational currents, and custom elastic collision engines (featured in *Pocket Pool 3D*).
- **Campaign Progression**: Earn coin increments, clear challenges, level-up profiles, and unlock progressively advanced game modes.
- **Unified Dual-Architecture**: Runs natively on the web through a robust Vite dev server and comes pre-configured for mobile platforms with Expo Metro Bundler.

---

## 🎮 The Arcade Suite

A collection of 12 fully-featured classic and premium arcade titles integrated into the sea-floor leveling campaign:

| Title | Campaign Tier | Gameplay Type | System Mechanics |
| :--- | :---: | :--- | :--- |
| **Pocket Pool 3D** | Tier 3 | Sports Simulation | Cue guides, real-time friction & pocket vortex gravity |
| **Ocean Snake** | Tier 2 | Grid Reflex | Directional drift, reef boundaries, trailing neon tail algae |
| **Flappy Dash** | Tier 2 | Physics Tap | Synchronous jump impulses, dynamic coral obstacle corridors |
| **Deep Sudoku** | Tier 3 | Logic Puzzle | Multi-difficulty matrix solver, note system, instant check |
| **Tic-Tac-Toe** | Tier 1 | Strategy Board | Multi-depth minimax artificial intelligence opponent |
| **2048 Sliders** | Tier 1 | Grid Merger | Floating coral tiles, directional slide summation, high-score engine |
| **R.P.S. Duel** | Tier 1 | Playful Chance | Best-of-five interactive showdown with a deep-sea Octopus |
| **Whack-a-Mole** | Tier 1 | Speed Tapping | Multidimensional bubble geyser reflex test |
| **Stack Tower** | Tier 2 | Perfect Timing | Gravity block stack alignment with shifting speed markers |
| **Sky Shooter** | Tier 2 | Shooter Action | Bubble torpedo projectile trajectory and alien jellyfish targets |
| **Endless Runner** | Tier 2 | Scrolling Run | Jump spikes and ocean currents with progressive scroll speed |
| **Connect Four** | Tier 3 | Strategy Board | Interactive shell drop matrix with vertical/horizontal check rules |

---

## 🚀 Execution & Setup Guide

### 🌐 1. Browser Development Mode (Vite SPA)

Our high-speed web application framework is optimized for local browser iteration inside the AI Studio sandbox.

```bash
# Install dependencies
npm install

# Launch development preview server
npm run dev

# Compile static assets
npm run build
```

---

### 📱 2. Mobile Native Development (Expo React Native)

Ready to launch on physical mobile hardware or simulators using Expo’s advanced development clients.

```bash
# Ensure you have the Expo toolchain
npm install -g expo-cli

# Start the interactive Metro Bundler
npx expo start
```

#### Running on Devices:
- **iOS Simulator**: Press `i` to launch in the simulator.
- **Android Emulator**: Press `a` to launch in the emulator.
- **Physical Device**: Install the **Expo Go** application on your device (iOS App Store or Google Play) and scan the QR code printed in the terminal.

---

## 🎨 System Architecture

```
📁 project-root/
├── 📄 app.json             # Expo Mobile configurations & Android/iOS package names
├── 📄 package.json         # Standard Vite tasks & Expo bundler commands
├── 📄 tsconfig.json        # Unified strict TypeScript configuration compiler rules
├── 📄 vite.config.ts       # Optimized bundler mapping for fast browser refresh
├── 📁 assets/              # Creative icon mappings, app banners and splashscreens
└── 📁 src/                 # Application source
    ├── 📄 App.tsx          # Multi-view main controller & Campaign dashboard
    ├── 📄 types.ts         # Shared state typings for Quests, Profiles, and Stats
    ├── 📁 utils/
    │   └── 📄 audio.ts     # Synthesized frequency SFX engine and audio toggle
    └── 📁 components/
        ├── 📄 Onboarding.tsx # Aquatic profile selections and visual setups
        ├── 📄 PocketPool.tsx # Real-time mathematical pool cue & pocket physics
        └── ...             # Integrated individual React game components
```

---

## 📐 Quality Standards & Design Directives

- **Offline-First Storage**: Standard browser profile data and campaign accomplishments are stored via client-side `localStorage`.
- **Elegant Typography**: Hand-crafted layouts utilizing clean typography elements (Inter/JetBrains Mono for statistics).
- **Sound Toggle**: Interactive global sound control mechanism which manages synthetic SFX and alerts.
