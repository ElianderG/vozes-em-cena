# Arquitetura Local (Offline em runtime)

## Visao geral

O projeto roda com duas camadas locais:

1. Frontend (`React + Vite`) em `http://localhost:3050`
2. API local (`Express`) em `http://localhost:8787`

## Fluxo

1. Frontend envia `POST /api/script` com prompt e personagens.
2. API chama Ollama local para gerar o roteiro em JSON (com preset).
3. Frontend exibe e permite editar o roteiro.
4. Frontend envia `POST /api/dub` com roteiro final, personagens e preset.
5. API sintetiza linha a linha com Piper (voz por personagem).
6. API concatena os WAVs com pausas configuradas pelo preset.
7. Frontend toca e permite download do audio.

## Arquivos principais

- `src/App.tsx`: UI e chamadas para `/api/script` e `/api/dub`
- `server/index.ts`: rotas da API local
- `server/services/ollama.ts`: integracao com Ollama
- `server/services/tts.ts`: sintese WAV via Piper + concatenacao por linha
- `vite.config.ts`: proxy `/api` para API local

## Variaveis de ambiente

- `LOCAL_API_URL`
- `API_PORT`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_MODEL_FAST`
- `OLLAMA_MODEL_NATURAL`
- `OLLAMA_MODEL_CINEMATIC`
- `OLLAMA_TEMPERATURE_FAST`
- `OLLAMA_TEMPERATURE_NATURAL`
- `OLLAMA_TEMPERATURE_CINEMATIC`
- `OLLAMA_TOP_P_FAST`
- `OLLAMA_TOP_P_NATURAL`
- `OLLAMA_TOP_P_CINEMATIC`
- `OLLAMA_REPEAT_PENALTY_FAST`
- `OLLAMA_REPEAT_PENALTY_NATURAL`
- `OLLAMA_REPEAT_PENALTY_CINEMATIC`
- `OLLAMA_NUM_PREDICT_FAST`
- `OLLAMA_NUM_PREDICT_NATURAL`
- `OLLAMA_NUM_PREDICT_CINEMATIC`
- `PIPER_BIN`
- `PIPER_VOICES_DIR`
- `PIPER_VOICE_DEFAULT_MODEL`
- `PIPER_VOICE_FABER_MODEL`
- `PIPER_VOICE_EDRESSON_MODEL`
