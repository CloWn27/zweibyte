# GPU Tuning Guide – zweibyte Local AI Pro Kit

## 1. CUDA-Optimierung für LLM-Inference

### CUDA 12 Flags für maximale Performance
```bash
# Optimierte Umgebungsvariablen für Ollama
export OLLAMA_CUDA_MALLOC=1
export CUDA_CACHE_DISABLE=0
export CUDA_LAUNCH_BLOCKING=0
export OLLAMA_KEEP_ALIVE=5m
```

### VRAM-Management
| VRAM | Max Modell | Quantisierung | Kontext |
|------|-----------|---------------|---------|
| 8 GB  | 7B        | Q4_K_M        | 4K      |
| 12 GB | 13B       | Q4_K_M        | 8K      |
| 20 GB | 34B       | Q4_K_M        | 8K      |
| 24 GB | 70B       | Q3_K_L        | 4K      |

### Batch-Größen-Tuning
```bash
# Default (beste Kompatibilität)
ollama run llama3.2

# Optimiert für RTX 3080 (20GB)
ollama run llama3.2 --num-batch 512 --num-ctx 8192
```

## 2. NVIDIA-Treiber-Optimierung

### Persistenzmodus (immer aktivieren)
```bash
sudo nvidia-smi -pm 1
```

### Power-Limits für stabile Performance
```bash
# RTX 3080 – Optimales Power-Limit
sudo nvidia-smi -pl 280

# Max Performance
sudo nvidia-smi -pl 320
```

### GPU-Taktung fixieren (optional)
```bash
sudo nvidia-smi -lgc 1500,1800
```

## 3. Fehlerbehebung: CUDA 13 → CUDA 12 Mapping

Falls onnxruntime-node Probleme mit CUDA 13 macht:
```bash
# Patch onnxruntime
cd node_modules/onnxruntime-node/bin/napi-v3-linux-x64-gpu-12
# CUDA 13 binary → CUDA 12 symlink
ln -sfv libonnxruntime_providers_cuda.so libonnxruntime_providers_cuda.so.12
ln -sfv libonnxruntime_providers_shared.so libonnxruntime_providers_shared.so.12
```

## 4. Benchmark-Script

```bash
#!/bin/bash
echo "=== zweibyte GPU Benchmark ==="
for model in llama3.2:3b llama3.2 mistral; do
  echo "--- Testing: $model ---"
  ollama pull $model 2>/dev/null
  time ollama run $model "What is 2+2? Answer in one word." --nowordwrap 2>&1
  echo ""
done
```

## 5. Multi-GPU Setup (falls verfügbar)

```bash
# CUDA_VISIBLE_DEVICES=0 für erste GPU
export CUDA_VISIBLE_DEVICES=0
ollama run llama3.2
```
