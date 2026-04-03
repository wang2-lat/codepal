# CodePal 🐾

**A desktop pet that lives alongside your AI coding agent — with real emotions, RPG leveling, and persistent memory.**

Unlike other desktop pets that just show animations, CodePal has a real emotional state that evolves based on your coding sessions. It watches your Claude Code activity through hooks and reacts in real-time, gaining XP and leveling up as you work.

## Features

### Real-Time Agent Monitoring
12 animated states driven by Claude Code hook events:

| Event | Animation | What Happens |
|-------|-----------|-------------|
| Session starts | Wake up | Pet wakes, loneliness decreases |
| You type a prompt | Thinking | Curiosity increases |
| Read/Grep/Glob | Reading | Pet studies along with you |
| Edit/Write | Typing | Pet codes alongside you |
| Bash command | Building | Pet shakes with effort |
| Task completes | Happy bounce | Joy +10, Pride +5, XP +15 |
| Error occurs | Error flash | Stress increases |
| Subagent spawns | Juggling | Pet tracks parallel work |
| Multi-agent | Conducting | Orchestrating the swarm |
| Context compact | Sweeping | Cleaning up memory |
| Session ends | Sleep | ZZZ animation |

### Emotion Engine (actually implemented, not vaporware)
Five emotion dimensions that interact and decay over time:
- **Joy** — increases on task completion, decreases on errors
- **Curiosity** — rises when you prompt, decays when idle
- **Pride** — builds from successful work
- **Stress** — spikes on errors, naturally decays
- **Loneliness** — grows when you're away, drops when you code

These combine into a **happiness score** that affects the pet's appearance and behavior.

### RPG System
- 6 species (Cat, Fox, Owl, Dragon, Octopus, Phoenix)
- XP from coding activity and interactions
- 6 evolution stages: Egg → Baby → Junior → Adult → Elder → Legendary
- ATK/DEF/HP stats that grow with level

### 10 Achievements
Hello World, Growing Up, Veteran, Master Chef, Bug Hunter, Marathon, Committer, Conductor, Best Friend, Dedicated

### Interactions
Right-click the pet to:
- 🍎 Feed (reduces hunger, +joy)
- 🎮 Play (reduces loneliness, +joy, costs energy)
- 💪 Train (+XP, costs energy)
- 📊 View stats

## Install

```bash
git clone https://github.com/wang2-lat/codepal.git
cd codepal
npm install
npm start
```

That's it. CodePal automatically:
1. Registers hooks in `~/.claude/settings.json`
2. Starts an HTTP server on `127.0.0.1:23456`
3. Creates a transparent always-on-top pet window
4. Saves state to `~/.claude/codepal.json`

## How It Works

```
Claude Code ──hook──→ curl POST ──→ CodePal HTTP Server ──→ Event Router
                                                              │
                                          ┌──────────────────┤
                                          ▼                   ▼
                                    Emotion Engine      Animation State
                                          │                   │
                                          ▼                   ▼
                                    RPG/XP System      SVG Pet Renderer
                                          │                   │
                                          └──→ JSON Save ←────┘
```

Zero-config, zero-invasion. Works through official Claude Code hooks.

## Tech Stack

- **Electron** — transparent desktop window
- **Express** — HTTP hook receiver
- **SVG + CSS** — pet rendering and animations
- **Pure JS** — emotion engine and RPG system
- No Python, no Godot, no heavy dependencies

## vs Other Desktop Pets

| | CodePal | clawd-on-desk | Agentic-Desktop-Pet |
|--|:---:|:---:|:---:|
| Agent monitoring | ✅ | ✅ | ✅ |
| Real emotion system | ✅ 5 dimensions | ❌ | ❌ (not implemented) |
| RPG/leveling | ✅ | ❌ | ❌ (not implemented) |
| Persistent memory | ✅ JSON | ❌ | ❌ (in-memory only) |
| macOS support | ✅ | ✅ | ❌ |
| Install steps | 3 | 3 | 6 |
| Achievements | ✅ 10 | ❌ | ❌ |

## License

MIT
