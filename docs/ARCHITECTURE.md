# Arquitetura Local (Offline em runtime)

## Visao geral

O projeto roda com duas camadas locais:

1. Frontend (`React + Vite`) em `http://localhost:3050`
2. API local (`Express`) em `http://localhost:8787`

## Fluxo

1. Frontend envia `POST /api/script` com prompt e personagens.
2. API chama Ollama local para gerar o roteiro em JSON.
3. Frontend exibe e permite editar o roteiro.
4. Frontend envia `POST /api/dub` com roteiro final.
5. API chama eSpeak para sintetizar WAV.
6. Frontend toca e permite download do audio.

## Arquivos principais

- `src/App.tsx`: UI e chamadas para `/api/script` e `/api/dub`
- `server/index.ts`: rotas da API local
- `server/services/ollama.ts`: integracao com Ollama
- `server/services/tts.ts`: sintese WAV via eSpeak
- `vite.config.ts`: proxy `/api` para API local

## Variaveis de ambiente

- `LOCAL_API_URL`
- `API_PORT`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `ESPEAK_BIN`
- `ESPEAK_VOICE`
- `ESPEAK_SPEED`
