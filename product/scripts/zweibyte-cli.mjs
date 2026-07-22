#!/usr/bin/env node
/**
 * zweibyte CLI – GPU Status, Model Manager, MCP Control
 * (c) 2026 zweibyte.net
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const ZWEIBYTE_DIR = path.join(HOME, '.zweibyte');
const MCP_CONFIG = path.join(ZWEIBYTE_DIR, 'mcp', 'mcp-servers.json');
const MODEL_CONFIG = path.join(__dirname, '..', 'configs', 'models.json');

const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', ...opts }).trim();
  } catch { return ''; }
}

// ─── Commands ───

const commands = {

  /** GPU status */
  status() {
    console.log(`\n${colors.bold}╭─ zweibyte System Status${colors.reset}`);
    
    // GPU
    const gpuInfo = run("nvidia-smi --query-gpu=name,memory.total,memory.used,driver_version,temperature.gpu --format=csv,noheader,nounits 2>/dev/null");
    if (gpuInfo) {
      const [name, vramTotal, vramUsed, driver, temp] = gpuInfo.split(', ').map(s => s.trim());
      const pct = vramTotal > 0 ? ((vramUsed / vramTotal) * 100).toFixed(0) : 0;
      const barLen = 20;
      const filled = Math.round((pct / 100) * barLen);
      const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
      console.log(` GPU  : ${colors.bold}${name}${colors.reset}`);
      console.log(` VRAM : ${bar} ${vramUsed}MB / ${vramTotal}MB (${pct}%)`);
      console.log(` Temp : ${temp}°C`);
      console.log(` Driver: ${driver}`);
    } else {
      console.log(` ${colors.red}GPU: nvidia-smi nicht verfügbar${colors.reset}`);
    }

    // Ollama
    const ollamaVer = run('ollama --version 2>/dev/null');
    if (ollamaVer) {
      console.log(` ${colors.green}✓${colors.reset} Ollama: ${ollamaVer}`);
      const models = run('ollama list 2>/dev/null').split('\n').slice(1).filter(Boolean);
      console.log(` Modelle: ${models.length > 0 ? models.length + ' installiert' : 'keine'}`);
    } else {
      console.log(` ${colors.red}✗${colors.reset} Ollama nicht gefunden`);
    }

    // MCP
    if (fs.existsSync(MCP_CONFIG)) {
      const config = JSON.parse(fs.readFileSync(MCP_CONFIG, 'utf-8'));
      const count = Object.keys(config.mcpServers || {}).length;
      console.log(` MCP  : ${count} Server konfiguriert`);
    }

    // WebUI
    try {
      const webui = run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null');
      if (webui === '200') console.log(` WebUI: ${colors.green}✓${colors.reset} http://localhost:3000`);
      else console.log(` WebUI: ${colors.yellow}○${colors.reset} nicht erreichbar`);
    } catch { console.log(` WebUI: ${colors.yellow}○${colors.reset} nicht erreichbar`); }

    console.log();
  },

  /** Model management */
  model: {
    list() {
      const models = run('ollama list 2>/dev/null');
      console.log(`\n${colors.bold}Installierte Modelle:${colors.reset}`);
      if (models) {
        models.split('\n').forEach(line => {
          if (line.trim()) console.log(`  ${line}`);
        });
      } else {
        console.log('  Keine Modelle installiert.');
        console.log(`  ${colors.dim}zweibyte model pull <name>${colors.reset}`);
      }
      console.log();
    },

    pull(model) {
      if (!model) {
        console.log(`\n${colors.bold}Verfügbare Modelle:${colors.reset}`);
        const configs = loadModelConfigs();
        configs.forEach(m => {
          console.log(`  ${colors.cyan}${m.name}${colors.reset.padEnd(25)} ${m.description || ''}`);
        });
        console.log(`\n  ${colors.dim}zweibyte model pull llama3.2${colors.reset}`);
        return;
      }
      console.log(` ${colors.green}▸${colors.reset} Lade ${model} herunter (das kann dauern)…`);
      try {
        execSync(`ollama pull ${model}`, { stdio: 'inherit' });
        console.log(` ${colors.green}✓${colors.reset} ${model} installiert`);
      } catch {
        console.log(` ${colors.red}✗${colors.reset} Fehler beim Download von ${model}`);
      }
    },

    available() {
      console.log(`\n${colors.bold}Empfohlene Modelle für NVIDIA GPUs:${colors.reset}\n`);
      const configs = loadModelConfigs();
      configs.forEach(m => {
        const size = m.vramGb ? `${'█'.repeat(Math.min(m.vramGb / 2, 20))}${m.vramGb}GB VRAM` : '';
        console.log(`  ${colors.purple}${m.name}${colors.reset}`);
        if (m.description) console.log(`  ${colors.dim}${m.description}${colors.reset}`);
        if (size) console.log(`  ${size}`);
        console.log();
      });
    },

    remove(model) {
      if (!model) return console.log(' Nutzung: zweibyte model remove <name>');
      run(`ollama rm ${model}`);
      console.log(` ${colors.green}✓${colors.reset} ${model} entfernt`);
    },
  },

  /** MCP commands */
  mcp: {
    list() {
      if (!fs.existsSync(MCP_CONFIG)) {
        return console.log(` ${colors.yellow}!${colors.reset} Keine MCP-Konfiguration gefunden`);
      }
      const config = JSON.parse(fs.readFileSync(MCP_CONFIG, 'utf-8'));
      const servers = config.mcpServers || {};
      console.log(`\n${colors.bold}MCP Server:${colors.reset}\n`);
      Object.entries(servers).forEach(([name, srv]) => {
        const cmd = typeof srv.command === 'string' ? srv.command : '';
        console.log(`  ${colors.green}✓${colors.reset} ${colors.bold}${name}${colors.reset}`);
        console.log(`    Cmd: ${cmd} ${(srv.args || []).slice(0, 2).join(' ')}`);
        console.log();
      });
    },
  },

  /** Open WebUI */
  webui() {
    console.log(` ${colors.blue}ℹ${colors.reset} Öffne WebUI…`);
    run('xdg-open http://localhost:3000 2>/dev/null || open http://localhost:3000 2>/dev/null');
    console.log(` WebUI: ${colors.cyan}http://localhost:3000${colors.reset}`);
  },

  /** Help */
  help() {
    console.log(`
${colors.bold}zweibyte CLI v1.0.0${colors.reset}

  ${colors.purple}status${colors.reset}        Systemstatus (GPU, Ollama, MCP, WebUI)
  ${colors.purple}model list${colors.reset}     Installierte Modelle anzeigen
  ${colors.purple}model pull${colors.reset}     Modell herunterladen (z.B. "zweibyte model pull llama3.2")
  ${colors.purple}model available${colors.reset} Empfohlene Modelle anzeigen
  ${colors.purple}model remove${colors.reset}   Modell löschen
  ${colors.purple}mcp list${colors.reset}       MCP-Server anzeigen
  ${colors.purple}webui${colors.reset}          Open WebUI öffnen
  ${colors.purple}help${colors.reset}           Diese Hilfe
`);
  },
};

// ─── Helpers ───
function loadModelConfigs() {
  const configPath = path.join(ZWEIBYTE_DIR, 'configs', 'models.json');
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8')).models || [];
  }
  if (fs.existsSync(MODEL_CONFIG)) {
    return JSON.parse(fs.readFileSync(MODEL_CONFIG, 'utf-8')).models || [];
  }
  return [];
}

// ─── Main ───
const args = process.argv.slice(2);
if (args.length === 0) {
  commands.status();
  process.exit(0);
}

let cmd = commands;
for (const arg of args) {
  if (cmd[arg]) {
    cmd = cmd[arg];
  } else {
    if (typeof cmd === 'function') {
      cmd(arg);
    } else if (typeof cmd === 'object' && cmd !== null) {
      // Check if this is a parent object - try to use the arg as a param
      console.log(` Unbekannter Befehl: ${args.join(' ')}`);
      commands.help();
    }
    process.exit(0);
  }
}
if (typeof cmd === 'function') cmd();
else console.log(` Unbekannter Befehl: ${args.join(' ')}`);
