# Vozes em Cena (Offline em runtime)

Aplicativo para criar roteiro e gerar dublagem entre dois personagens com IA local.

## Setup

### Pre-requisitos
- Node.js 20+
- Yarn 1.x
- Ollama instalado localmente
- eSpeak instalado localmente (TTS)

### Instalação
1. Instale dependencias:
   `yarn install`
2. Copie variaveis:
   `cp .env.example .env.local`
3. Inicie os servicos:
   `yarn dev`

### Instalacao automatica (script unico)
Para provisionar o sistema completo (Ollama + modelo + eSpeak + dependencias do projeto):

`bash scripts/install-system.sh`

Depois, rode:
`yarn dev`

### Modelos locais
Baixe ao menos um modelo no Ollama:
`ollama pull llama3.1:8b-instruct-q4_K_M`

## Uso

1. Abra o app em `http://localhost:3050`.
2. Configure os dois personagens (nome, sotaque, emocao).
3. Digite o contexto no campo de prompt.
4. Clique em **Gerar Texto** para criar o roteiro.
5. Revise/edite o dialogo.
6. Clique em **Gerar Dublagem** para obter o WAV.
7. Use o botao de download para salvar o audio.

## Arquitetura

- Frontend React + Vite consome endpoints locais em `/api/*`.
- API local (Express) faz:
  - `POST /api/script` -> chama Ollama para gerar roteiro JSON.
  - `POST /api/dub` -> chama eSpeak para gerar audio WAV.
- Sem dependencias de API em nuvem no fluxo principal.

Detalhes: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Troubleshooting

- **Erro ao gerar roteiro (Ollama):**
  - confirme que o Ollama esta rodando: `ollama serve`
  - confirme modelo instalado: `ollama list`
- **Erro de TTS (eSpeak):**
  - instale eSpeak: `sudo apt install espeak`
  - valide binario: `espeak --version`
- **API local nao responde:**
  - verifique se `yarn dev:server` subiu em `http://localhost:8787`
  - cheque `API_PORT` e `LOCAL_API_URL` no `.env.local`

Detalhes: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

## Scripts

- `yarn dev` -> frontend + API local
- `yarn dev:client` -> apenas frontend
- `yarn dev:server` -> apenas API local
- `yarn lint` -> validacao TypeScript
- `yarn docs:check` -> valida se documentacao minima esta consistente
- `bash scripts/install-system.sh` -> instalacao automatica do ambiente local

## Checklist de atualizacao de docs

Sempre que mudar fluxo funcional:
- atualizar `README.md` (Setup, Uso, Arquitetura, Troubleshooting);
- atualizar `.env.example` se variavel mudar;
- atualizar `docs/ARCHITECTURE.md` em mudancas de fluxo;
- atualizar `docs/TROUBLESHOOTING.md` ao corrigir erro operacional.
