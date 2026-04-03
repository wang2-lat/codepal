/**
 * PetState — Emotion engine + RPG system + persistence
 * The "brain" of CodePal. Tracks mood, stats, XP, evolution, achievements.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const SAVE_PATH = path.join(os.homedir(), '.claude', 'codepal.json');

const SPECIES = {
  cat:      { emoji: '🐱', name: 'Cat',      baseHp: 20, baseAtk: 5, baseDef: 3, trait: 'curious' },
  fox:      { emoji: '🦊', name: 'Fox',      baseHp: 18, baseAtk: 6, baseDef: 3, trait: 'clever' },
  owl:      { emoji: '🦉', name: 'Owl',      baseHp: 16, baseAtk: 7, baseDef: 3, trait: 'wise' },
  dragon:   { emoji: '🐉', name: 'Dragon',   baseHp: 35, baseAtk: 10, baseDef: 7, trait: 'fierce' },
  octopus:  { emoji: '🐙', name: 'Octopus',  baseHp: 20, baseAtk: 8, baseDef: 2, trait: 'creative' },
  phoenix:  { emoji: '🔥', name: 'Phoenix',  baseHp: 18, baseAtk: 11, baseDef: 3, trait: 'resilient' },
};

const MOODS = [
  { name: 'ecstatic',  emoji: '😄', threshold: 90 },
  { name: 'happy',     emoji: '😊', threshold: 70 },
  { name: 'content',   emoji: '😐', threshold: 50 },
  { name: 'sad',       emoji: '😢', threshold: 30 },
  { name: 'miserable', emoji: '😭', threshold: 0 },
];

const EVOLUTIONS = [
  { level: 1,  name: 'Egg' },
  { level: 5,  name: 'Baby' },
  { level: 15, name: 'Junior' },
  { level: 30, name: 'Adult' },
  { level: 50, name: 'Elder' },
  { level: 80, name: 'Legendary' },
];

const ACHIEVEMENTS = {
  first_session:  { name: 'Hello World', desc: 'Start your first coding session', emoji: '👋' },
  level_10:       { name: 'Growing Up', desc: 'Reach level 10', emoji: '📈' },
  level_50:       { name: 'Veteran', desc: 'Reach level 50', emoji: '🏅' },
  feed_100:       { name: 'Master Chef', desc: 'Feed 100 times', emoji: '🍳' },
  bugs_squashed:  { name: 'Bug Hunter', desc: 'Survive 50 errors', emoji: '🐛' },
  marathon:       { name: 'Marathon', desc: '8-hour coding session', emoji: '🏃' },
  commits_50:     { name: 'Committer', desc: '50 successful completions', emoji: '📝' },
  subagent_master:{ name: 'Conductor', desc: 'Spawn 20 subagents', emoji: '🎼' },
  max_happy:      { name: 'Best Friend', desc: '100% happiness', emoji: '💕' },
  week_streak:    { name: 'Dedicated', desc: '7-day streak', emoji: '🔥' },
};

class PetState {
  constructor() {
    this.data = this.load() || this.createNew();
    this.agentState = 'idle'; // Current animation state
    this.agentStateTimer = 0;
    this.sessionStart = null;
    this.sessionErrors = 0;
    this.sessionCompletions = 0;
    this.subagentCount = 0;
  }

  createNew() {
    // Random species selection
    const speciesIds = Object.keys(SPECIES);
    const speciesId = speciesIds[Math.floor(Math.random() * speciesIds.length)];
    const species = SPECIES[speciesId];

    return {
      species: speciesId,
      name: species.name,
      nickname: null,
      level: 1,
      xp: 0,
      xpNext: 20,
      hp: species.baseHp,
      maxHp: species.baseHp,
      atk: species.baseAtk,
      def: species.baseDef,
      happiness: 70,
      hunger: 30,
      energy: 80,
      // Emotion dimensions (0-100)
      emotions: {
        joy: 60,
        curiosity: 50,
        pride: 40,
        stress: 20,
        loneliness: 30,
      },
      // Stats
      timesFed: 0,
      timesPlayed: 0,
      totalSessions: 0,
      totalErrors: 0,
      totalCompletions: 0,
      totalSubagents: 0,
      totalToolUses: 0,
      longestSession: 0, // minutes
      streakDays: 0,
      lastActiveDate: new Date().toISOString().split('T')[0],
      achievements: [],
      createdAt: new Date().toISOString(),
      lastSaved: new Date().toISOString(),
    };
  }

  load() {
    try {
      if (fs.existsSync(SAVE_PATH)) {
        return JSON.parse(fs.readFileSync(SAVE_PATH, 'utf8'));
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  save() {
    try {
      this.data.lastSaved = new Date().toISOString();
      const dir = path.dirname(SAVE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(SAVE_PATH, JSON.stringify(this.data, null, 2));
    } catch (e) { /* ignore */ }
  }

  // ─── Agent Event Handling ───

  onAgentEvent(event) {
    const { type, tool, success } = event;

    switch (type) {
      case 'SessionStart':
        this.agentState = 'wake';
        this.sessionStart = Date.now();
        this.sessionErrors = 0;
        this.data.totalSessions++;
        this.data.emotions.loneliness = Math.max(0, this.data.emotions.loneliness - 20);
        this.addXp(5);
        this.checkAchievement('first_session');
        this.updateStreak();
        break;

      case 'SessionEnd':
        this.agentState = 'sleep';
        if (this.sessionStart) {
          const minutes = (Date.now() - this.sessionStart) / 60000;
          if (minutes > this.data.longestSession) this.data.longestSession = Math.round(minutes);
          if (minutes >= 480) this.checkAchievement('marathon');
        }
        this.sessionStart = null;
        break;

      case 'UserPromptSubmit':
        this.agentState = 'thinking';
        this.data.emotions.curiosity = Math.min(100, this.data.emotions.curiosity + 5);
        break;

      case 'PreToolUse':
        if (tool === 'Read' || tool === 'Grep' || tool === 'Glob') {
          this.agentState = 'reading';
        } else if (tool === 'Edit' || tool === 'Write') {
          this.agentState = 'typing';
        } else if (tool === 'Bash') {
          this.agentState = 'building';
        } else {
          this.agentState = 'working';
        }
        this.data.totalToolUses++;
        this.data.energy = Math.max(0, this.data.energy - 0.5);
        break;

      case 'PostToolUse':
        if (success === false) {
          this.agentState = 'error';
          this.sessionErrors++;
          this.data.totalErrors++;
          this.data.emotions.stress = Math.min(100, this.data.emotions.stress + 8);
          this.data.emotions.joy = Math.max(0, this.data.emotions.joy - 3);
          if (this.data.totalErrors >= 50) this.checkAchievement('bugs_squashed');
        } else {
          this.addXp(2);
          this.data.emotions.pride = Math.min(100, this.data.emotions.pride + 2);
        }
        break;

      case 'Stop':
        this.agentState = 'happy';
        this.data.totalCompletions++;
        this.data.emotions.joy = Math.min(100, this.data.emotions.joy + 10);
        this.data.emotions.pride = Math.min(100, this.data.emotions.pride + 5);
        this.data.emotions.stress = Math.max(0, this.data.emotions.stress - 10);
        this.addXp(15);
        if (this.data.totalCompletions >= 50) this.checkAchievement('commits_50');
        break;

      case 'StopFailure':
        this.agentState = 'sad';
        this.data.emotions.stress = Math.min(100, this.data.emotions.stress + 15);
        this.data.emotions.joy = Math.max(0, this.data.emotions.joy - 10);
        break;

      case 'SubagentStart':
        this.subagentCount++;
        this.data.totalSubagents++;
        this.agentState = this.subagentCount > 1 ? 'conducting' : 'juggling';
        if (this.data.totalSubagents >= 20) this.checkAchievement('subagent_master');
        break;

      case 'SubagentEnd':
        this.subagentCount = Math.max(0, this.subagentCount - 1);
        if (this.subagentCount === 0) this.agentState = 'idle';
        break;

      case 'PreCompact':
        this.agentState = 'sweeping';
        break;

      case 'Notification':
        this.agentState = 'alert';
        break;

      case 'WorktreeCreate':
        this.agentState = 'carrying';
        break;
    }

    // Auto-reset to idle after 10 seconds for transient states
    clearTimeout(this._stateTimer);
    if (['happy', 'sad', 'error', 'alert', 'carrying', 'sweeping', 'wake'].includes(this.agentState)) {
      this._stateTimer = setTimeout(() => {
        this.agentState = this.sessionStart ? 'idle' : 'sleep';
      }, 8000);
    }

    this.recalculateHappiness();
  }

  // ─── Periodic Tick (every 30s) ───

  tick() {
    // Hunger increases
    this.data.hunger = Math.min(100, this.data.hunger + 0.3);
    // Energy slowly recovers if idle/sleeping
    if (this.agentState === 'sleep' || this.agentState === 'idle') {
      this.data.energy = Math.min(100, this.data.energy + 0.5);
    }
    // Loneliness increases if no session
    if (!this.sessionStart) {
      this.data.emotions.loneliness = Math.min(100, this.data.emotions.loneliness + 0.5);
    }
    // Stress naturally decays
    this.data.emotions.stress = Math.max(0, this.data.emotions.stress - 0.3);
    // Curiosity decays when idle
    if (this.agentState === 'idle' || this.agentState === 'sleep') {
      this.data.emotions.curiosity = Math.max(20, this.data.emotions.curiosity - 0.2);
    }
    this.recalculateHappiness();

    // If idle too long, transition to sleep
    if (this.agentState === 'idle' && !this.sessionStart) {
      this.agentState = 'sleep';
    }
  }

  // ─── User Interactions ───

  feed() {
    if (this.data.hunger < 10) return { message: "Not hungry right now!" };
    this.data.hunger = Math.max(0, this.data.hunger - 30);
    this.data.emotions.joy = Math.min(100, this.data.emotions.joy + 8);
    this.data.timesFed++;
    this.addXp(5);
    if (this.data.timesFed >= 100) this.checkAchievement('feed_100');
    this.recalculateHappiness();
    return { message: "*munch munch* 🍎" };
  }

  play() {
    if (this.data.energy < 10) return { message: "Too tired to play! 😴" };
    this.data.energy = Math.max(0, this.data.energy - 15);
    this.data.hunger = Math.min(100, this.data.hunger + 5);
    this.data.emotions.joy = Math.min(100, this.data.emotions.joy + 15);
    this.data.emotions.loneliness = Math.max(0, this.data.emotions.loneliness - 20);
    this.data.timesPlayed++;
    this.addXp(10);
    this.recalculateHappiness();
    return { message: "Wheee! 🎮" };
  }

  train() {
    if (this.data.energy < 20) return { message: "Need rest first! 😴" };
    this.data.energy = Math.max(0, this.data.energy - 25);
    this.data.hunger = Math.min(100, this.data.hunger + 10);
    this.data.emotions.pride = Math.min(100, this.data.emotions.pride + 10);
    const xp = 15 + Math.floor(Math.random() * 15);
    this.addXp(xp);
    this.recalculateHappiness();
    return { message: `Trained hard! +${xp} XP 💪` };
  }

  // ─── XP & Leveling ───

  addXp(amount) {
    this.data.xp += amount;
    while (this.data.xp >= this.data.xpNext) {
      this.data.xp -= this.data.xpNext;
      this.data.level++;
      this.data.xpNext = Math.round(this.data.xpNext * 1.25);
      const sp = SPECIES[this.data.species];
      this.data.maxHp = sp.baseHp + this.data.level * 2;
      this.data.hp = this.data.maxHp;
      this.data.atk = sp.baseAtk + this.data.level;
      this.data.def = sp.baseDef + Math.floor(this.data.level / 2);
    }
    if (this.data.level >= 10) this.checkAchievement('level_10');
    if (this.data.level >= 50) this.checkAchievement('level_50');
  }

  // ─── Helpers ───

  recalculateHappiness() {
    const e = this.data.emotions;
    const hunger_penalty = this.data.hunger > 70 ? (this.data.hunger - 70) * 0.5 : 0;
    const energy_penalty = this.data.energy < 20 ? (20 - this.data.energy) * 0.3 : 0;
    this.data.happiness = Math.round(
      Math.max(0, Math.min(100,
        e.joy * 0.35 + e.pride * 0.15 + (100 - e.stress) * 0.2 +
        (100 - e.loneliness) * 0.15 + e.curiosity * 0.15 -
        hunger_penalty - energy_penalty
      ))
    );
    if (this.data.happiness >= 100) this.checkAchievement('max_happy');
  }

  getMood() {
    for (const m of MOODS) {
      if (this.data.happiness >= m.threshold) return m;
    }
    return MOODS[MOODS.length - 1];
  }

  getEvolution() {
    let evo = EVOLUTIONS[0];
    for (const e of EVOLUTIONS) {
      if (this.data.level >= e.level) evo = e;
    }
    return evo.name;
  }

  updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    if (this.data.lastActiveDate !== today) {
      const last = new Date(this.data.lastActiveDate);
      const now = new Date(today);
      const diffDays = Math.round((now - last) / 86400000);
      if (diffDays === 1) {
        this.data.streakDays++;
      } else if (diffDays > 1) {
        this.data.streakDays = 1;
      }
      this.data.lastActiveDate = today;
      if (this.data.streakDays >= 7) this.checkAchievement('week_streak');
    }
  }

  checkAchievement(id) {
    if (!this.data.achievements.includes(id)) {
      this.data.achievements.push(id);
      return true;
    }
    return false;
  }

  getFullState() {
    const species = SPECIES[this.data.species];
    const mood = this.getMood();
    return {
      ...this.data,
      speciesEmoji: species.emoji,
      speciesName: species.name,
      trait: species.trait,
      mood: mood.name,
      moodEmoji: mood.emoji,
      evolution: this.getEvolution(),
      agentState: this.agentState,
      achievementDetails: Object.entries(ACHIEVEMENTS).map(([id, a]) => ({
        ...a, id, unlocked: this.data.achievements.includes(id),
      })),
    };
  }

  getStats() {
    return {
      level: this.data.level,
      xp: this.data.xp,
      xpNext: this.data.xpNext,
      totalSessions: this.data.totalSessions,
      totalCompletions: this.data.totalCompletions,
      totalErrors: this.data.totalErrors,
      totalToolUses: this.data.totalToolUses,
      totalSubagents: this.data.totalSubagents,
      longestSession: this.data.longestSession,
      streakDays: this.data.streakDays,
      achievements: this.data.achievements.length,
      totalAchievements: Object.keys(ACHIEVEMENTS).length,
    };
  }
}

module.exports = { PetState, SPECIES, ACHIEVEMENTS };
