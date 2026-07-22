# Troubleshooting Guide – zweibyte Local AI Pro Kit

## 1. CUDA-Fehler

### "CUDA error: out of memory"
**Ursache:** VRAM voll.
**Lösung:**
```bash
# Aktuelle VRAM-Auslastung prüfen
nvidia-smi

# Weniger Kontext nutzen
ollama run llama3.2 --num-ctx 4096

# Kleineres Modell
ollama run llama3.2:3b

# Andere Modelle entladen
ollama stop <model>
```

### "CUDA driver version is insufficient"
**Ursache:** Treiber zu alt für CUDA 12.
**Lösung:**
```bash
# Aktuelle Version prüfen
nvidia-smi | grep "CUDA Version"

# Treiber updaten (Fedora)
sudo dnf update -y nvidia-*
# oder
sudo dnf install -y akmod-nvidia xorg-x11-drv-nvidia-cuda

# Ubuntu
sudo apt update && sudo apt install -y nvidia-driver-570
```

### "libcuda.so.1: cannot open shared object file"
**Ursache:** CUDA-Library nicht im Pfad.
**Lösung:**
```bash
export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH
echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
```

## 2. Ollama-Fehler

### Ollama startet nicht
```bash
# Logs prüfen
journalctl -u ollama -n 50 --no-pager

# Manuell starten
ollama serve

# Neu installieren
curl -fsSL https://ollama.com/install.sh | sh
```

### "Error: model 'xxx' not found"
```bash
# Modell manuell pullen
ollama pull llama3.2

# Verfügbare Modelle
ollama list
```

### Ollama läuft aber WebUI verbindet nicht
```bash
# Prüfen ob Ollama läuft
curl http://localhost:11434/api/tags

# Host-Konfiguration prüfen
cat /etc/systemd/system/ollama.service.d/override.conf
# OLLAMA_HOST sollte 0.0.0.0 sein
```

## 3. Open WebUI-Fehler

### Container startet nicht
```bash
# Logs ansehen
docker logs open-webui

# Volume reset
docker compose down -v
docker compose up -d
```

### "No module named 'open_webui'"
```bash
pip3 install --upgrade open-webui
open-webui serve
```

## 4. MCP Server-Fehler

### Port bereits belegt
```bash
# Prüfen welcher Prozess den Port nutzt
lsof -i :7100
sudo kill -9 <PID>
```

### npx: command not found
```bash
# Node.js nachinstallieren
node --version || sudo dnf install nodejs || sudo apt install nodejs
```

## 5. Allgemeine Probleme

### "Permission denied" bei Install-Script
```bash
chmod +x install.sh
./install.sh
# Nicht: sh install.sh
```

### DNS/Netzwerk-Probleme
```bash
# Ollama verwendet lokale API – kein Internet nötig
# Nur Modell-Download braucht Internet
# Proxy setzen falls nötig:
export HTTP_PROXY=http://proxy:port
export HTTPS_PROXY=http://proxy:port
```

### Festplatte voll
```bash
# Modell-Größen prüfen
du -sh ~/.ollama/models/
# Alte Modelle löschen
ollama rm <model>
```

### System baut kein CUDA
```bash
# CUDA Toolkit prüfen
nvcc --version
# Installieren falls fehlt:
# Fedora
sudo dnf install cuda-toolkit-12-8
# Ubuntu
sudo apt install nvidia-cuda-toolkit
```

## 6. Quick Diagnostics

Ein Befehl alle wichtigen Infos:
```bash
echo "=== OS ===" && uname -a && echo "=== GPU ===" && nvidia-smi --query-gpu=name,driver_version,memory.total,temperature.gpu --format=csv && echo "=== Ollama ===" && ollama --version && ollama list && echo "=== MCP ===" && ls -la ~/.zweibyte/mcp/ && echo "=== WebUI ===" && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```
