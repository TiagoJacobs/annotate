#!/bin/bash

mkdir -p .data/claude .data/npm .data/npm-global .data/rustup .data/cargo && \
docker run -it --rm \
  -e HOME=/home/node \
  -e TERM=xterm-256color \
  -e npm_config_cache=/workspace/.data/npm \
  -e npm_config_prefix=/workspace/.data/npm-global \
  -e RUSTUP_HOME=/workspace/.data/rustup \
  -e CARGO_HOME=/workspace/.data/cargo \
  -v $(pwd)/.data/claude:/home/node/.claude \
  -v $(pwd)/.data/rustup:/workspace/.data/rustup \
  -v $(pwd)/.data/cargo:/workspace/.data/cargo \
  -v $(pwd):/workspace \
  -w /workspace \
  --network host \
  node:24 \
  bash -lc '
    # Install system build deps (runs as root inside container)
    if ! command -v cmake &>/dev/null || ! dpkg -s libxkbcommon-dev &>/dev/null 2>&1; then
      apt-get update -qq && apt-get install -y -qq \
        cmake ninja-build pkg-config \
        libxkbcommon-dev libwayland-dev libvulkan-dev \
        libfontconfig-dev libfreetype-dev libexpat1-dev \
        libssl-dev libglib2.0-dev libx11-dev libxcb1-dev \
        libxcb-render0-dev libxcb-shm0-dev \
        2>&1 | tail -3
    fi

    # Install Rust toolchain (persisted in .data/rustup + .data/cargo)
    export RUSTUP_HOME=/workspace/.data/rustup
    export CARGO_HOME=/workspace/.data/cargo
    export PATH="$CARGO_HOME/bin:$PATH"
    if ! command -v rustc &>/dev/null; then
      curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain 1.88.0 2>&1 | tail -3
    fi

    # Fix ownership so node user can use everything
    chown -R node:node /workspace/.data/rustup /workspace/.data/cargo /home/node/.claude

    # Drop to node user for Claude
    su node -c "
      export HOME=/home/node
      export TERM=xterm-256color
      export npm_config_cache=/workspace/.data/npm
      export npm_config_prefix=/workspace/.data/npm-global
      export RUSTUP_HOME=/workspace/.data/rustup
      export CARGO_HOME=/workspace/.data/cargo
      export PATH=\"\$CARGO_HOME/bin:\$npm_config_prefix/bin:\$PATH\"
      [ ! -f /workspace/.data/npm-global/bin/claude ] && npm install -g @anthropic-ai/claude-code
      /workspace/.data/npm-global/bin/claude --dangerously-skip-permissions
    "
  '
