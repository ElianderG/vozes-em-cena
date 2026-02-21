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

## Piper nao encontrado

Sintoma:
- erro de dublagem com mensagem sobre `Piper`.

Como corrigir:
1. Instale:
   `sudo apt install piper-tts`
   - se o pacote nao existir no Ubuntu, rode o fallback do projeto:
     `bash scripts/install-system.sh`
2. Teste:
   `piper --version`
3. Se o binario estiver em caminho customizado, configure `PIPER_BIN`.
4. Rode o instalador do projeto para baixar vozes:
   `bash scripts/install-system.sh`

## Voz Piper ausente ou caminho invalido

Sintoma:
- erro ao sintetizar audio indicando modelo `.onnx` inexistente.

Como corrigir:
1. Verifique diretório:
   `ls models/piper`
2. Confirme variaveis no `.env.local`:
   - `PIPER_VOICE_DEFAULT_MODEL`
   - `PIPER_VOICE_FABER_MODEL`
   - `PIPER_VOICE_EDRESSON_MODEL`
3. Se faltar arquivo de voz, rode novamente:
   `bash scripts/install-system.sh`

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
3. Verificar logs da API para erro no Piper.

## Preset nao parece surtir efeito

Sintoma:
- diferenca pequena entre `Rapido`, `Natural` e `Cinematico`.

Como corrigir:
1. Confirme os modelos carregados no Ollama:
   `ollama list`
2. Ajuste os parametros `OLLAMA_*` no `.env.local`.
3. Reinicie o servidor:
   `yarn dev:server`
