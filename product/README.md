# zweibyte – Local AI Pro Kit

Zero-Friction Setup für lokale, GPU-beschleunigte KI auf deiner NVIDIA GPU.

## Inhalt

- `install.sh` – Automatisiertes Setup (Ollama + CUDA + WebUI + MCP)
- `scripts/` – zweibyte CLI (GPU-Status, Model-Manager, MCP-Control)
- `configs/` – Modell-Konfigurationen + Docker-Compose für Open WebUI
- `mcp/` – 5 vorkonfigurierte MCP-Server + Blueprint
- `docs/` – GPU-Tuning-Guide + Troubleshooting-Guide (50+ Seiten)

## Systemanforderungen

- **GPU:** NVIDIA mit CUDA 12 (RTX 20/30/40 Serie, Quadro, Tesla)
- **OS:** Linux (Ubuntu 22.04+, Fedora 38+, Arch), macOS (Apple Silicon eingeschränkt)
- **RAM:** 16 GB+ empfohlen
- **Speicher:** 20 GB+ frei für Modelle

## Schnellstart

```bash
chmod +x install.sh
./install.sh
```

Danach:
```bash
zweibyte status
zweibyte model pull llama3.2
```

## Lizenz

Nur für Käufer des zweibyte Local AI Pro Kit.
Weitergabe untersagt.
