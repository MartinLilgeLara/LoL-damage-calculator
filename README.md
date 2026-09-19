# ⚔️ LoL Combat Engine — Interactive Real-Time Combat Simulator

An advanced, real-time League of Legends combat simulator engineered to bridge the gap between static DPS calculators and in-game combat fidelity. Built with **React**, **TypeScript**, and a custom deterministic tick-based **Game Loop**.

---

## 🚀 Overview

Most combat tools for League of Legends rely on aggregate averages or static, turn-based snapshots that ignore frame-to-frame interaction.

**LoL Combat Engine** simulates real-time micro-engagements driven by continuous variables and discrete combat inputs. The engine models dynamic mitigation curves, continuous resource regeneration, fury thresholds/decay, dynamic cooldown tracking scaled by Ability Haste, and ability executions that factor in instantaneous missing health.

---

## 🎯 Conceptual Interface & Architecture

The simulator features a mirrored dual-champion HUD (e.g., Renekton vs. Garen), providing real-time visual feedback for vital statistics, active resource pools, dynamic cooldown overlays, and an interactive action bar.

<img width="1152" height="720" alt="Sem título" src="https://github.com/user-attachments/assets/5057393a-a0dc-4c95-83cc-8d64dd3f7c3d" />
> *Early architectural layout wireframe. The production UI incorporates active cooldown sweeps, dynamic combat floaters, and responsive state synchronization.*

---

## ✨ Key Technical Features

### ⏱️ Real-Time Game Loop (`requestAnimationFrame`)
- **Delta-Time Decoupling:** Continuous systems run independently of frame dips via explicit $\Delta t$ scaling.
- **Configurable Time Scale:** Analyze trades in slow-motion (`0.5x`), real-time (`1.0x`), fast-forward (`2.0x`), or pause state to inspect damage instances frame by frame.

### 🛡️ Strict Resistance Mitigation Pipeline
- Exact League of Legends mitigation order: Flat Reduction $\rightarrow$ Percent Reduction $\rightarrow$ Percent Penetration $\rightarrow$ Lethality (scaled by champion level) $\rightarrow$ Flat Magic Penetration.
- Seamless handling of Physical, Magic, and True Damage instances.

### 🩸 Non-Linear Dynamic Damage Scaling
- Real-time execution mathematics computed against the target's current millisecond health pool (e.g., Garen's *Demacian Justice* executing based on dynamically computed missing HP).

### ⚡ Dynamic Resource Systems
- 🔵 **Mana Pools:** Continuous regeneration derived from base MP5 and bonus stats.
- 🔴 **Fury Dynamics:** 50-point threshold ability empowerment, on-hit/spell generation triggers, and combat timer tracking with automatic decay outside the combat window.
- ⚫ **Manaless/Energy Engines:** Tailored state logic for energy regenerators and cost-free champions.

### 🎮 Reactive Combat Action Bar
- Direct spell-casting triggers (Q, W, E, R) and Auto-Attack pacing locked to actual Attack Speed windups and cooldown recovery.

---

## 🛠️ Tech Stack & Tooling

| Domain | Technology |
| :--- | :--- |
| **Core Framework** | React 19, TypeScript |
| **Build & Tooling** | Vite, Oxlint |
| **Styling & HUD** | Tailwind CSS |
| **Architecture** | Decoupled Pure Computational Engines (`engine/`) + Reactive UI State |

---

## 📂 Project Structure

src/
├── components/
│   ├── ChampionPanel/     # Dynamic stats, item slots, and resource bars
│   ├── Combat/            # Responsive health bars and combat indicators
│   └── Skills/            # Action bar buttons, cooldown sweeps, and cards
├── data/                  # Base champion stats, scalings, and item definitions
├── engine/
│   ├── calculator.ts      # Pure scaling calculations & stat aggregations
│   ├── mitigation.ts      # Strict resistance mitigation pipeline
│   └── gameLoop.ts        # Tick simulation engine (HP5, MP5, cooldowns, decay)
└── types/                 # Strict domain models and combat state definitions


---

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone [https://github.com/martinlilgelara/lol-damage-calculator.git](https://github.com/martinlilgelara/lol-damage-calculator.git)

# Navigate to project directory
cd lol-damage-calculator

# Install dependencies
npm install

# Start the local development server
npm run dev
```

🗺️ Roadmap

[x] Strict mitigation and resistance penetration engine.

[x] Dynamic scaling for missing HP / execute abilities.

[ ] Central Game Loop with variable time scaling (0.5x, 1.0x, 2.0x).

[ ] Dynamic HP5 / MP5 regeneration and out-of-combat Fury decay.

[ ] Active Action Bar with real-time ability cooldown counters.

[ ] Item on-hit / proc state machine (Spellblade, Sunfire ticks, Liandry burns).
