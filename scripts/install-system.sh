#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODEL_NAME="${OLLAMA_MODEL:-llama3.1:8b-instruct-q4_K_M}"

log() {
  printf '\n[install-system] %s\n' "$1"
}

require_sudo() {
  if ! command -v sudo >/dev/null 2>&1; then
    echo "Erro: sudo nao encontrado. Execute como root ou instale sudo."
    exit 1
  fi
}

ensure_apt() {
  if ! command -v apt-get >/dev/null 2>&1; then
    echo "Erro: este script foi feito para sistemas Debian/Ubuntu (apt-get)."
    exit 1
  fi
}

safe_apt_update() {
  if sudo apt-get update; then
    return 0
  fi

  log "apt-get update falhou por repositorio externo. Tentando somente repositorio oficial Ubuntu"

  if [ -f "/etc/apt/sources.list.d/ubuntu.sources" ]; then
    sudo apt-get update \
      -o Dir::Etc::sourcelist="sources.list.d/ubuntu.sources" \
      -o Dir::Etc::sourceparts="-" \
      -o APT::Get::List-Cleanup="0"
    return 0
  fi

  if [ -f "/etc/apt/sources.list" ]; then
    sudo apt-get update \
      -o Dir::Etc::sourcelist="sources.list" \
      -o Dir::Etc::sourceparts="-" \
      -o APT::Get::List-Cleanup="0"
    return 0
  fi

  echo "Erro: nao foi possivel atualizar a lista de pacotes com seguranca."
  echo "Corrija repositorios quebrados no apt e rode novamente."
  exit 1
}

install_base_packages() {
  log "Atualizando indice de pacotes"
  safe_apt_update

  log "Instalando pacotes base"
  sudo apt-get install -y curl ca-certificates espeak
}

install_node_if_missing() {
  if command -v node >/dev/null 2>&1; then
    log "Node.js ja instalado: $(node --version)"
    return
  fi

  log "Node.js nao encontrado. Instalando Node.js e npm via apt"
  sudo apt-get install -y nodejs npm
  log "Node.js instalado: $(node --version)"
}

install_yarn_if_missing() {
  if command -v yarn >/dev/null 2>&1; then
    log "Yarn ja instalado: $(yarn --version)"
    return
  fi

  if command -v corepack >/dev/null 2>&1; then
    log "Habilitando Yarn via corepack"
    sudo corepack enable
    sudo corepack prepare yarn@stable --activate
  else
    log "Instalando Yarn globalmente via npm"
    sudo npm install -g yarn
  fi

  log "Yarn instalado: $(yarn --version)"
}

install_ollama_if_missing() {
  if command -v ollama >/dev/null 2>&1; then
    log "Ollama ja instalado: $(ollama --version)"
    return
  fi

  log "Instalando Ollama"
  curl -fsSL https://ollama.com/install.sh | sh
  log "Ollama instalado: $(ollama --version)"
}

start_ollama_service() {
  if command -v systemctl >/dev/null 2>&1; then
    log "Habilitando e iniciando servico do Ollama"
    sudo systemctl enable --now ollama || true
  fi
}

wait_for_ollama() {
  local tries=0
  local max_tries=30
  local url="http://127.0.0.1:11434/api/tags"

  log "Aguardando Ollama ficar disponivel em ${url}"
  until curl -fsS "${url}" >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [ "${tries}" -ge "${max_tries}" ]; then
      echo "Erro: Ollama nao respondeu a tempo."
      echo "Tente iniciar manualmente: ollama serve"
      exit 1
    fi
    sleep 1
  done
}

pull_model() {
  log "Baixando modelo local: ${MODEL_NAME}"
  ollama pull "${MODEL_NAME}"
}

install_project_dependencies() {
  log "Instalando dependencias do projeto com yarn"
  cd "${PROJECT_ROOT}"
  yarn install
}

ensure_env_file() {
  cd "${PROJECT_ROOT}"
  if [ ! -f ".env.local" ]; then
    log "Criando .env.local a partir de .env.example"
    cp .env.example .env.local
  else
    log ".env.local ja existe, mantendo arquivo atual"
  fi
}

main() {
  ensure_apt
  require_sudo
  install_base_packages
  install_node_if_missing
  install_yarn_if_missing
  install_ollama_if_missing
  start_ollama_service
  wait_for_ollama
  pull_model
  install_project_dependencies
  ensure_env_file

  log "Instalacao concluida"
  echo "Proximo passo: execute 'yarn dev'"
}

main "$@"
