# Vozes em Cena (Offline em runtime)

Aplicativo para criar roteiro e gerar dublagem entre dois personagens com IA local.

## Setup

### Pre-requisitos
- Node.js 20+
- Yarn 1.x
- Ollama instalado localmente
- Piper instalado localmente (TTS neural)

### Instalação
1. Instale dependencias:
   `yarn install`
2. Copie variaveis:
   `cp .env.example .env.local`
3. Inicie os servicos:
   `yarn dev`

### Instalacao automatica (script unico)
Para provisionar o sistema completo (Ollama + modelo + Piper + vozes + dependencias do projeto):

`bash scripts/install-system.sh`

Depois, rode:
`yarn dev`

### Modelos locais
Baixe ao menos um modelo no Ollama:
`ollama pull llama3.1:8b-instruct-q4_K_M`

## Uso

1. Abra o app em `http://localhost:3050`.
2. Selecione um preset (`Rapido`, `Natural` ou `Cinematico`).
3. Configure os dois personagens (nome, voz, sotaque, emocao).
4. Digite o contexto no campo de prompt.
5. Clique em **Gerar Texto** para criar o roteiro.
6. Revise/edite o dialogo.
7. Clique em **Gerar Dublagem** para obter o WAV.
8. Use o botao de download para salvar o audio.

## Presets

- `Rapido`: menor latencia, respostas mais objetivas.
- `Natural`: equilibrio entre naturalidade e velocidade.
- `Cinematico`: maior expressividade, com pausas mais longas e roteiro mais elaborado.

Cada preset atua em todo o pipeline:
- texto no Ollama (modelo + parametros);
- voz no Piper (ritmo, pausa e expressividade).

## Vozes Piper

- `Faber`: voz recomendada para personagem 1.
- `Edresson`: voz recomendada para personagem 2.
- `Amy`: opcao feminina adicional.
- `Kathleen`: opcao feminina adicional.
- O seletor de voz no front agora mostra tags de idioma e genero e inclui busca.
- Idiomas adicionados no seletor: Português (Brasil), Português (Portugal), Inglês (Britânico), Inglês (US), Japonês, Francês e Espanhol.
- O sistema usa modo **hibrido** de TTS: Piper (principal) + eSpeak (complementar para ampliar cobertura de idioma/genero).

As vozes podem ser personalizadas via variaveis `PIPER_*` no `.env.local`.

## Arquitetura

- Frontend React + Vite consome endpoints locais em `/api/*`.
- API local (Express) faz:
  - `POST /api/script` -> chama Ollama para gerar roteiro JSON com preset.
  - `POST /api/dub` -> chama Piper para gerar audio WAV com voz por personagem e preset.
- Sem dependencias de API em nuvem no fluxo principal.

Detalhes: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Troubleshooting

- **Erro ao gerar roteiro (Ollama):**
  - confirme que o Ollama esta rodando: `ollama serve`
  - confirme modelo instalado: `ollama list`
- **Erro de TTS (Piper):**
  - confirme binario: `piper --version`
  - confira modelos em `models/piper`
  - valide variaveis `PIPER_*` no `.env.local`
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
- atualizar `README.md` (Setup, Uso, Presets, Arquitetura, Troubleshooting);
- atualizar `.env.example` se variavel mudar;
- atualizar `docs/ARCHITECTURE.md` em mudancas de fluxo;
- atualizar `docs/TROUBLESHOOTING.md` ao corrigir erro operacional.
