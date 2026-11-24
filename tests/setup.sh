#!/bin/sh
# Скачивает три.js и cannon-es тех же версий, что подключает игра, в tests/.cache — тесты работают без CDN.
set -e
cd "$(dirname "$0")"
mkdir -p .cache
if [ ! -f .cache/three/build/three.module.js ]; then
  rm -rf .cache/three
  git clone -q --depth 1 --branch r160 --filter=blob:none --sparse https://github.com/mrdoob/three.js.git .cache/three
  (cd .cache/three && git sparse-checkout set build)
fi
if [ ! -f .cache/cannon-es/dist/cannon-es.js ]; then
  rm -rf .cache/cannon-es
  git clone -q --depth 1 --branch v0.20.0 https://github.com/pmndrs/cannon-es.git .cache/cannon-es
fi
echo "ok: three r160, cannon-es 0.20.0"
