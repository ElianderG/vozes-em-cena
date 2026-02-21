#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODEL_NAME="${OLLAMA_MODEL:-llama3.1:8b-instruct-q4_K_M}"
PIPER_VOICES_DIR="${PIPER_VOICES_DIR:-./models/piper}"
PIPER_VOICE_FABER_MODEL="${PIPER_VOICE_FABER_MODEL:-./models/piper/pt_BR-faber-medium.onnx}"
PIPER_VOICE_EDRESSON_MODEL="${PIPER_VOICE_EDRESSON_MODEL:-./models/piper/pt_BR-edresson-low.onnx}"
PIPER_VOICE_AMY_MODEL="${PIPER_VOICE_AMY_MODEL:-./models/piper/en_US-amy-medium.onnx}"
PIPER_VOICE_KATHLEEN_MODEL="${PIPER_VOICE_KATHLEEN_MODEL:-./models/piper/en_US-kathleen-low.onnx}"
PIPER_FABER_URL="${PIPER_FABER_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx}"
PIPER_FABER_JSON_URL="${PIPER_FABER_JSON_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx.json}"
PIPER_EDRESSON_URL="${PIPER_EDRESSON_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/edresson/low/pt_BR-edresson-low.onnx}"
PIPER_EDRESSON_JSON_URL="${PIPER_EDRESSON_JSON_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/edresson/low/pt_BR-edresson-low.onnx.json}"
PIPER_AMY_URL="${PIPER_AMY_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx}"
PIPER_AMY_JSON_URL="${PIPER_AMY_JSON_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json}"
PIPER_KATHLEEN_URL="${PIPER_KATHLEEN_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/kathleen/low/en_US-kathleen-low.onnx}"
PIPER_KATHLEEN_JSON_URL="${PIPER_KATHLEEN_JSON_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/kathleen/low/en_US-kathleen-low.onnx.json}"
PIPER_DOWNLOAD_URL="${PIPER_DOWNLOAD_URL:-https://github.com/rhasspy/piper/releases/latest/download/piper_linux_x86_64.tar.gz}"
PIPER_INSTALL_DIR="${PIPER_INSTALL_DIR:-/opt/piper}"

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
  sudo apt-get install -y curl ca-certificates
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

install_piper_if_missing() {
  if command -v piper >/dev/null 2>&1; then
    log "Piper ja instalado: $(piper --version 2>/dev/null || echo "binario disponivel")"
    return
  fi

  log "Instalando Piper"
  if sudo apt-get install -y piper-tts; then
    log "Piper instalado via apt"
    return
  fi

  log "Pacote piper-tts indisponivel no apt. Tentando fallback via release oficial"
  install_piper_from_release
}

install_piper_from_release() {
  local temp_dir archive_path
  temp_dir="$(mktemp -d)"
  archive_path="${temp_dir}/piper.tar.gz"

  if ! curl -fL "${PIPER_DOWNLOAD_URL}" -o "${archive_path}"; then
    echo "Erro: falha ao baixar Piper de ${PIPER_DOWNLOAD_URL}"
    echo "Defina PIPER_DOWNLOAD_URL no ambiente com uma URL valida e rode novamente."
    rm -rf "${temp_dir}"
    exit 1
  fi

  sudo mkdir -p "${PIPER_INSTALL_DIR}"
  sudo tar -xzf "${archive_path}" -C "${PIPER_INSTALL_DIR}" --strip-components=1

  if [ -x "${PIPER_INSTALL_DIR}/piper" ]; then
    sudo ln -sf "${PIPER_INSTALL_DIR}/piper" /usr/local/bin/piper
  elif [ -x "${PIPER_INSTALL_DIR}/piper/piper" ]; then
    sudo ln -sf "${PIPER_INSTALL_DIR}/piper/piper" /usr/local/bin/piper
  else
    echo "Erro: binario do Piper nao encontrado apos extracao em ${PIPER_INSTALL_DIR}."
    rm -rf "${temp_dir}"
    exit 1
  fi

  rm -rf "${temp_dir}"
  log "Piper instalado via release oficial"
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

resolve_project_path() {
  local path="$1"
  if [[ "${path}" = /* ]]; then
    echo "${path}"
    return
  fi
  echo "${PROJECT_ROOT}/${path#./}"
}

download_if_missing() {
  local url="$1"
  local output_file="$2"
  if [ -f "${output_file}" ]; then
    return
  fi
  log "Baixando arquivo: $(basename "${output_file}")"
  curl -fL "${url}" -o "${output_file}"
}

download_if_missing_optional() {
  local url="$1"
  local output_file="$2"
  if [ -f "${output_file}" ]; then
    return
  fi
  log "Tentando baixar voz extra: $(basename "${output_file}")"
  if ! curl -fL "${url}" -o "${output_file}"; then
    echo "Aviso: nao foi possivel baixar ${url}. Seguindo sem essa voz extra."
    rm -f "${output_file}"
  fi
}

install_piper_voices() {
  local voices_dir
  voices_dir="$(resolve_project_path "${PIPER_VOICES_DIR}")"
  mkdir -p "${voices_dir}"

  local faber_model
  local edresson_model
  local amy_model
  local kathleen_model
  faber_model="$(resolve_project_path "${PIPER_VOICE_FABER_MODEL}")"
  edresson_model="$(resolve_project_path "${PIPER_VOICE_EDRESSON_MODEL}")"
  amy_model="$(resolve_project_path "${PIPER_VOICE_AMY_MODEL}")"
  kathleen_model="$(resolve_project_path "${PIPER_VOICE_KATHLEEN_MODEL}")"

  download_if_missing "${PIPER_FABER_URL}" "${faber_model}"
  download_if_missing "${PIPER_FABER_JSON_URL}" "${faber_model}.json"
  download_if_missing "${PIPER_EDRESSON_URL}" "${edresson_model}"
  download_if_missing "${PIPER_EDRESSON_JSON_URL}" "${edresson_model}.json"
  download_if_missing_optional "${PIPER_AMY_URL}" "${amy_model}"
  download_if_missing_optional "${PIPER_AMY_JSON_URL}" "${amy_model}.json"
  download_if_missing_optional "${PIPER_KATHLEEN_URL}" "${kathleen_model}"
  download_if_missing_optional "${PIPER_KATHLEEN_JSON_URL}" "${kathleen_model}.json"
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
  install_piper_if_missing
  start_ollama_service
  wait_for_ollama
  pull_model
  install_piper_voices
  install_project_dependencies
  ensure_env_file

  log "Instalacao concluida"
  echo "Proximo passo: execute 'yarn dev'"
}

main "$@"
