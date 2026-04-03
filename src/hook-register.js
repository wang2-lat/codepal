/**
 * Auto-register hooks into Claude Code settings.json
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { PORT } = require('./hook-server');

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

const HOOK_EVENTS = [
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'SubagentStart',
  'SubagentEnd',
  'Stop',
  'StopFailure',
  'PreCompact',
  'PostCompact',
  'Notification',
  'WorktreeCreate',
];

function registerHooks() {
  try {
    let settings = {};
    if (fs.existsSync(SETTINGS_PATH)) {
      settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    }

    if (!settings.hooks) settings.hooks = {};

    let changed = false;

    for (const event of HOOK_EVENTS) {
      if (!settings.hooks[event]) {
        settings.hooks[event] = [];
      }

      const hookCmd = `curl -s -X POST http://127.0.0.1:${PORT}/hook/${event} -H "Content-Type: application/json" -d '{"tool_name":"'$CLAUDE_TOOL_NAME'","success":true}' > /dev/null 2>&1`;

      // Check if our hook is already there
      const existing = settings.hooks[event].find(h =>
        (typeof h === 'string' && h.includes(`${PORT}/hook/`)) ||
        (h && h.command && h.command.includes(`${PORT}/hook/`))
      );

      if (!existing) {
        settings.hooks[event].push({
          command: hookCmd,
          timeout: 2000,
        });
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
      console.log('[CodePal] Hooks registered in Claude Code settings.json');
    } else {
      console.log('[CodePal] Hooks already registered');
    }
  } catch (e) {
    console.error('[CodePal] Failed to register hooks:', e.message);
  }
}

function unregisterHooks() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return;
    const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    if (!settings.hooks) return;

    for (const event of HOOK_EVENTS) {
      if (settings.hooks[event]) {
        settings.hooks[event] = settings.hooks[event].filter(h => {
          if (typeof h === 'string') return !h.includes(`${PORT}/hook/`);
          return !(h && h.command && h.command.includes(`${PORT}/hook/`));
        });
        if (settings.hooks[event].length === 0) {
          delete settings.hooks[event];
        }
      }
    }

    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    console.log('[CodePal] Hooks unregistered');
  } catch (e) { /* ignore */ }
}

module.exports = { registerHooks, unregisterHooks };
