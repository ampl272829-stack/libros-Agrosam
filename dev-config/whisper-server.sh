#!/usr/bin/env bash
# Lanza el servidor whisper en el puerto 4321 con el modelo small-q5_1.
exec whisper-server -m "$HOME/.local/share/whisper-models/ggml-small-q5_1.bin" \
  -l es --host 127.0.0.1 --port 4321 > /tmp/dictar/server.log 2>&1
