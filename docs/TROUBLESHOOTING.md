# Troubleshooting

## Ollama indisponivel

Sintoma:
- erro ao gerar roteiro no endpoint `/api/script`.

Como corrigir:
1. Inicie o Ollama:
   `ollama serve`
2. Confirme o endpoint local:
   `curl http://127.0.0.1:11434/api/tags`
3. Confirme o modelo:
   `ollama list`
4. Se necessario, baixe modelo:
   `ollama pull llama3.1:8b-instruct-q4_K_M`

## eSpeak nao encontrado

Sintoma:
- erro de dublagem com mensagem sobre `eSpeak`.

Como corrigir:
1. Instale:
   `sudo apt install espeak`
2. Teste:
   `espeak --version`
3. Se o binario tiver nome diferente, configure `ESPEAK_BIN`.

## API local fora do ar

Sintoma:
- frontend nao consegue chamar `/api/*`.

Como corrigir:
1. Suba apenas a API:
   `yarn dev:server`
2. Verifique health:
   `curl http://localhost:8787/api/health`
3. Confirme `API_PORT` e `LOCAL_API_URL`.

## Audio nao toca no navegador

Sintoma:
- WAV gerado, mas player nao toca.

Como corrigir:
1. Regerar dublagem com roteiro mais curto.
2. Baixar o arquivo e testar em player local.
3. Verificar logs da API para erro no eSpeak.
