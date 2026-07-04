# 🌊 OceanGames: Premium Arcade Hub & Campaign 🐠

[![Expo Ready](https://img.shields.io/badge/Expo-Ready-4630EB?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-v0.74-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev)
[![Vite Powered](https://img.shields.io/badge/Vite-v6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

Welcome to **OceanGames**, an immersive, high-fidelity gaming suite and campaign styled after a glowing deep-sea aquatic sanctuary. This codebase functions in **two versatile modes**: a high-speed **Vite-powered React SPA** for responsive browser play, and an **Expo React Native Mobile App** ready for native deployment!

---

## 🔮 Animated Experience & Highlights

```
     _.-'''''''-._
   .'  ________   '.
  /  .'-======-'.   \   🫧  [ 🪙 COINS INCREMENTING... ]
 |  /  /  Pocket \  |
 |  |  |  Pool 3D|  |   🎱  [ STRIKE ANGLE: 180° ]
 |  \  \  -=====-/  |
  \  '. '-------' .'    🫧  [ LEVEL 5 CLEAR: +450 COINS ✨ ]
   '.  '---------' .'
     '-._______.-'
```

- **Sleek Motion Engine**: Fluid layout transitions, staggered entrances, and micro-animations powered by **Motion** (`motion/react`).
- **3D Natural Physics Pool**: Experience tactile angle projections, whirlpool gravitational currents, and fully simulated collision calculations.
- **Dynamic Progression System**: Clear current levels, complete custom quests, level-up, and earn increasing coin rewards to unlock subsequent campaign tiers.

---

## 🎮 The Arcade Suite (12+ Classic Games)

| Game | Campaign Phase | Mechanics | Vibe |
| :--- | :--- | :--- | :--- |
| **Pocket Pool 3D** | Phase 3 Campaign | 3D Ball collisions, cue guides, & pocket vortexes | Real-time physics |
| **Ocean Snake** | Phase 2 Campaign | Grow trailing algae, navigate reefs & avoid boundaries | Classic arcade |
| **Flappy Dash** | Phase 2 Campaign | Glide through coral crevices with synchronous physics | High tension |
| **Deep Sudoku** | Phase 3 Campaign | Complete high-resolution logical matrices | Mind puzzle |
| **Tic-Tac-Toe** | Phase 1 Campaign | Fast-paced 3x3 challenge vs smart defensive AI | Casual strategy |
| **2048 Sliders** | Phase 1 Campaign | Slide tiles on a neon-glowing coral matrix | High score run |
| **Rock Paper Scissors** | Phase 1 Campaign | Best-of-five showdown vs Deep Sea Octopus | Playful duel |
| **Whack-a-Mole** | Phase 1 Campaign | Multi-hole aquatic tap reflex tests | Reflex test |
| **Stack Tower** | Phase 2 Campaign | Drop platform layers at perfect timing increments | Arcade builder |
| **Sky Shooter** | Phase 2 Campaign | Launch bubble torpedoes at floating targets | Shooter action |
| **Endless Runner** | Phase 2 Campaign | Jump obstacles as speed metrics ramp up | Fast pace |
| **Connect Four** | Phase 3 Campaign | Stack colored shells on a grid for line matches | Smart board |

---

## ⚙️ Installation & Usage Guide

### 🌐 Running the Web App (Vite & Dev Server)
The primary mode for local preview in the browser iframe. It boots instantly, supports live reloads, and serves the optimized code on Port 3000.

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Dev Mode**:
   ```bash
   npm run dev
   ```
   *The server will mount on `http://localhost:3000`.*

3. **Build Static SPA**:
   ```bash
   npm run build
   ```

---

### 📱 Running the App in Expo (React Native Mobile)
This codebase is fully configured with Expo `app.json` properties. You can easily execute and preview it natively on your iOS/Android devices!

1. **Install the Expo Command Line Tool**:
   ```bash
   npm install -g expo-cli
   ```

2. **Boot the Expo Metro Bundler**:
   ```bash
   npx expo start
   ```

3. **Preview on Device**:
   - For **iOS**: Press `i` to boot inside the local simulator, or download the **Expo Go** app and scan the QR code.
   - For **Android**: Press `a` to boot inside an Android emulator, or scan the QR code via **Expo Go**.

4. **Compile Native Binaries**:
   ```bash
   npx eas build --platform all
   ```

---

## 🎨 Interactive Architecture Map

```
  📁 Root Folder
  ├── 📄 app.json            <-- Expo Mobile Properties & Native Bundle Identifiers
  ├── 📄 package.json        <-- Shared Scripts (Vite Dev & Native Expo Commands)
  ├── 📄 vite.config.ts      <-- Web Bundler Configuration
  └── 📁 src
      ├── 📄 App.tsx         <-- Main Arcade Hub, Quest Center & State Management
      ├── 📄 types.ts        <-- Strict Typings for Progressions, Quests, & Games
      ├── 📁 utils
      │   └── 📄 audio.ts    <-- Tactile SFX Playback & Haptic Controller
      └── 📁 components
          ├── 📄 Onboarding.tsx   <-- Glowing Onboarding Character Profile Selection
          ├── 📄 PocketPool.tsx   <-- Real-time 3D billiard physics simulation
          └── [ ...Other Games ]
```

---

## ✨ Developed with Deep Sea Care
- Fully localized profile persistence using standard client-side `localStorage`.
- Hand-tuned typography utilizing **Inter** and monospace code indices for game readouts.
- Built-in sound toggles and responsive haptic feedbacks.
