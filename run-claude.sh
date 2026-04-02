#!/bin/bash
# Author: Tiago Daniel Jacobs <tiago.jacobs@gmail.com>

mkdir -p .data/claude .data/claude-config .data/npm .data/npm-global && \
docker run -it --rm \
  -e HOME=/home/node \
  -e TERM=xterm-256color \
  -e npm_config_cache=/workspace/.data/npm \
  -e npm_config_prefix=/workspace/.data/npm-global \
  -v $(pwd)/.data/claude:/home/node/.claude \
  -v $(pwd)/.data/claude-config:/home/node/.config/claude-code \
  -v $(pwd):/workspace \
  -w /workspace \
  --network host \
  node:24 \
  bash -lc '
    # Fix ownership so node user can use everything
    chown -R node:node /home/node/.claude /home/node/.config/claude-code

    # Drop to node user for Claude
    su node -c "
      export HOME=/home/node
      export TERM=xterm-256color
      export npm_config_cache=/workspace/.data/npm
      export npm_config_prefix=/workspace/.data/npm-global
      export PATH=\"\$npm_config_prefix/bin:\$PATH\"
      [ ! -f /workspace/.data/npm-global/bin/claude ] && npm install -g @anthropic-ai/claude-code
      /workspace/.data/npm-global/bin/claude --dangerously-skip-permissions
    "
  '
