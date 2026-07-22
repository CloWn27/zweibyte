#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
#  zweibyte – Local AI Pro Kit • Installer
#  One-command setup: Ollama + CUDA + Open WebUI + MCP Server
#  (c) 2026 zweibyte.net
# ═══════════════════════════════════════════════════════════════════

VERSION="1.0.0"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

log()  { printf "${GREEN}▸${NC} %s\n" "$*"; }
info() { printf "${BLUE}ℹ${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}⚠${NC} %s\n" "$*"; }
err()  { printf "${RED}✗${NC} %s\n" "$*"; exit 1; }
step() { printf "\n${PURPLE}═══ ${BOLD}%s${NC}${PURPLE} ═══${NC}\n" "$*"; }

# ─── Banner ───
cat << "EOF"
  ╔══════════════════════════════════╗
  ║     zweibyte • Local AI Pro Kit  ║
  ║     v1.0.0 — GPU Edition         ║
  ╚══════════════════════════════════╝
EOF

# ─── Prerequisites ───
step "System-Prüfung"

# OS
OS="$(uname -s)"
ARCH="$(uname -m)"
log "OS: $OS $ARCH"

# NVIDIA GPU
if command -v nvidia-smi &>/dev/null; then
  GPU_INFO=$(nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader 2>/dev/null || true)
  log "GPU gefunden: $GPU_INFO"
else
  warn "Kein nvidia-smi gefunden. Prüfe CUDA-Toolkit…"
  if ! command -v nvcc &>/dev/null; then
    err "Keine NVIDIA GPU / CUDA erkannt. Das Kit benötigt NVIDIA GPU mit CUDA 12."
  fi
fi

# CUDA version
if command -v nvcc &>/dev/null; then
  CUDA_VER=$(nvcc --version | grep "release" | awk '{print $6}' | cut -d, -f1)
  log "CUDA Version: $CUDA_VER"
fi

# Node.js
if ! command -v node &>/dev/null; then
  warn "Node.js nicht gefunden. Wird installiert…"
  if command -v curl &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - 2>/dev/null || true
    apt-get install -y nodejs 2>/dev/null || brew install node 2>/dev/null || warn "Bitte Node.js 22+ manuell installieren"
  fi
fi
NODE_VER=$(node --version 2>/dev/null || echo "nicht installiert")
log "Node.js: $NODE_VER"

# Docker (optional)
if command -v docker &>/dev/null; then
  log "Docker: $(docker --version 2>/dev/null || true)"
  HAS_DOCKER=true
else
  warn "Docker nicht gefunden. WebUI wird ohne Docker installiert."
  HAS_DOCKER=false
fi

# ─── Install Ollama ───
step "Ollama Installation"
if command -v ollama &>/dev/null; then
  OLLAMA_VER=$(ollama --version 2>/dev/null || true)
  log "Ollama bereits installiert: $OLLAMA_VER"
else
  log "Installiere Ollama…"
  curl -fsSL https://ollama.com/install.sh | sh
  log "Ollama installiert."
fi

# Configure Ollama for GPU
if [ "$OS" = "Linux" ]; then
  mkdir -p /etc/systemd/system/ollama.service.d
  cat > /etc/systemd/system/ollama.service.d/override.conf << 'OLLAMA'
[Service]
Environment="OLLAMA_HOST=0.0.0.0"
Environment="OLLAMA_KEEP_ALIVE=5m"
Environment="OLLAMA_NUM_PARALLEL=1"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
OLLAMA
  systemctl daemon-reload 2>/dev/null || true
  systemctl restart ollama 2>/dev/null || true
  log "Ollama GPU-Konfiguration angewendet."
fi

# ─── CUDA Optimization ───
step "CUDA-Optimierung"
if command -v nvidia-smi &>/dev/null; then
  # Persistenzmodus für bessere Performance
  nvidia-smi -pm 1 2>/dev/null || true
  
  # GPU-Infos
  VRAM_TOTAL=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1)
  log "VRAM: ${VRAM_TOTAL}MB verfügbar"
  
  # CUDA-Version check
  if command -v nvcc &>/dev/null; then
    CUDA_MAJOR=$(echo "$CUDA_VER" | cut -d. -f1)
    if [ "$CUDA_MAJOR" -ge 12 ]; then
      log "CUDA $CUDA_VER ✓ – volle Kompatibilität"
    else
      warn "CUDA $CUDA_VER – Update auf CUDA 12 empfohlen"
    fi
  fi
  
  # Empfehlung für Modelle basierend auf VRAM
  if [ "${VRAM_TOTAL:-0}" -ge 20000 ]; then
    log "20GB+ VRAM: Llama 3.2 8B, Mistral 7B, DeepSeek, Qwen 32B (Q4) laufen flüssig"
  elif [ "${VRAM_TOTAL:-0}" -ge 12000 ]; then
    log "12GB+ VRAM: Llama 3.2 8B, Mistral 7B, Phi-4 laufen flüssig"
  elif [ "${VRAM_TOTAL:-0}" -ge 8000 ]; then
    log "8GB VRAM: Kleine Modelle (7B Q4, Phi-3) empfohlen"
  fi
fi

# ─── Open WebUI ───
step "Open WebUI"
WEBUI_DIR="$HOME/.zweibyte/open-webui"
mkdir -p "$WEBUI_DIR"

if [ "$HAS_DOCKERVERSE" = true ] 2>/dev/null || $HAS_DOCKER 2>/dev/null; then
  log "Installiere Open WebUI via Docker…"
  cd "$WEBUI_DIR"
  cp "$(dirname "$0")/../configs/docker-compose.yml" ./ 2>/dev/null || true
  docker compose up -d 2>/dev/null || docker-compose up -d 2>/dev/null || warn "Docker-Compose nicht verfügbar"
  log "Open WebUI: http://localhost:3000"
else
  log "Installiere Open WebUI direkt (Python)…"
  if command -v pip3 &>/dev/null; then
    pip3 install open-webui -q 2>/dev/null || warn "Open WebUI Installation fehlgeschlagen. Installiere manuell: pip3 install open-webui"
  fi
fi

# ─── MCP Server Setup ───
step "MCP Server Konfiguration"
MCP_DIR="$HOME/.zweibyte/mcp"
mkdir -p "$MCP_DIR"

install_mcp_server() {
  local name="$1"
  local package="$2"
  log "Installiere MCP-Server: $name"
  npm install -g "$package" --ignore-scripts 2>/dev/null || warn "MCP $name: Installation fehlgeschlagen"
}

install_mcp_server "filesystem" "@modelcontextprotocol/server-filesystem"
install_mcp_server "github" "@modelcontextprotocol/server-github"
install_mcp_server "postgres" "@modelcontextprotocol/server-postgres"

# Custom MCP Server Config
cat > "$HOME/.zweibyte/mcp/mcp-servers.json" << 'MCPJSON'
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home"],
      "env": {}
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN:-}"
      }
    },
    "web-search": {
      "command": "node",
      "args": ["$(HOME)/.zweibyte/mcp/web-search-server.mjs"],
      "env": {}
    },
    "custom-blueprint": {
      "command": "node",
      "args": ["$(HOME)/.zweibyte/mcp/custom-server.mjs"],
      "env": {}
    }
  }
}
MCPJSON
log "MCP-Konfiguration erstellt: ~/.zweibyte/mcp/mcp-servers.json"

# ─── CLI installieren ───
step "zweibyte CLI"
CLI_DIR="$HOME/.zweibyte/cli"
mkdir -p "$CLI_DIR"
cp "$(dirname "$0")/scripts/zweibyte-cli.mjs" "$CLI_DIR/zweibyte.mjs" 2>/dev/null || true

# Alias einrichten
SHELL_CONFIG="$HOME/.bashrc"
if [ -f "$HOME/.zshrc" ]; then SHELL_CONFIG="$HOME/.zshrc"; fi

if ! grep -q "zweibyte" "$SHELL_CONFIG" 2>/dev/null; then
  cat >> "$SHELL_CONFIG" << 'ALIAS'
# zweibyte CLI
alias zweibyte='node ~/.zweibyte/cli/zweibyte.mjs'
ALIAS
  log "Alias 'zweibyte' zu $SHELL_CONFIG hinzugefügt"
fi

# ─── Fertig ───
step "Installation abgeschlossen! 🎉"
echo ""
echo "  ${BOLD}Was jetzt?${NC}"
echo ""
echo "  ${CYAN}zweibyte status${NC}        – Systemstatus prüfen"
echo "  ${CYAN}zweibyte model list${NC}    – Verfügbare Modelle"
echo "  ${CYAN}zweibyte model pull${NC}   – Modell herunterladen"
echo "  ${CYAN}zweibyte mcp list${NC}      – MCP-Server verwalten"
echo "  ${CYAN}zweibyte webui${NC}         – Open WebUI öffnen"
echo ""
echo "  WebUI:    ${BLUE}http://localhost:3000${NC}"
echo "  MCP-Port: ${BLUE}http://localhost:7100${NC}"
echo "  Configs:  ${BLUE}~/.zweibyte/${NC}"
echo ""
echo "  ${YELLOW}Nach dem Kauf enthalten: Troubleshooting-Guide + Lifetime-Updates${NC}"
echo "  ${YELLOW}Doku: https://zweibyte.net/docs${NC}"
echo ""

# Source shell config
source "${SHELL_CONFIG}" 2>/dev/null || true
