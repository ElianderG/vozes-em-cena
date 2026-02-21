# Historico do Projeto - Vozes em Cena

Este documento resume a evolucao do projeto, o que ja foi implementado e os proximos passos recomendados.

## Objetivo do projeto

Criar uma aplicacao local para:
- gerar roteiro de dialogo entre dois personagens com IA;
- dublar o roteiro com vozes diferentes;
- funcionar offline em runtime (sem depender de APIs em nuvem durante o uso).

## O que ja foi feito

### 1) Migracao para fluxo local (offline em runtime)

- Frontend passou a consumir API local (`/api/script` e `/api/dub`).
- Integracao cloud do Gemini foi removida do fluxo principal.
- Backend local com Express foi criado para orquestrar:
  - geracao de roteiro via Ollama local;
  - sintese de audio via TTS local.

Arquivos principais:
- `server/index.ts`
- `server/services/ollama.ts`
- `server/services/tts.ts`
- `src/App.tsx`
- `vite.config.ts`

### 2) Melhoria de qualidade de voz (TTS)

- Evolucao de TTS simples para modelo hibrido:
  - Piper como motor principal;
  - eSpeak como complemento para ampliar cobertura de idiomas/genero.
- Remocao da leitura de rótulo de personagem no audio (fala apenas o texto).
- Concatenacao de falas com pausas configuraveis.
- Fallback e compatibilizacao de formato de audio para evitar quebra entre vozes diferentes.

### 3) Presets de geracao

- Implementados presets:
  - `fast`
  - `natural`
  - `cinematic`
- Presets afetam:
  - parametros/modelo do Ollama;
  - comportamento da sintese no TTS.

### 4) UX e controles no frontend

- Tema com tres modos:
  - claro
  - escuro
  - sistema (padrao)
- Dialogo inicial padrao ao abrir a tela.
- Botao de cancelamento para interromper geracao de roteiro/audio.
- Layout revisado para ficar mais compacto e legivel.
- Busca de voz no seletor e exibicao por tags (idioma e genero).
- Controle de nuances de voz:
  - pausa entre falas
  - ritmo
  - expressividade
  - variacao por personagem

### 5) Instalacao automatizada e resiliente

- Script unico de instalacao:
  - `scripts/install-system.sh`
- O script instala/configura:
  - dependencias base do sistema;
  - Ollama e modelo local;
  - Piper (com fallback de instalacao quando apt nao tem pacote);
  - vozes principais;
  - dependencias do projeto e `.env.local`.
- Tratamento para falha de repositorio externo no `apt update` (fallback para fontes oficiais Ubuntu).

### 6) Documentacao e manutencao

- README atualizado para fluxo local.
- Documentacao tecnica criada/atualizada:
  - `docs/ARCHITECTURE.md`
  - `docs/TROUBLESHOOTING.md`
- Check automatizado de docs:
  - `scripts/docs-check.mjs`
  - comando: `yarn docs:check`

## Problemas relevantes ja tratados

- Erro de `apt update` por repositório externo quebrado.
- Erro de conexao com Ollama durante primeira inicializacao (timing de servico).
- Erro de download de metadado de voz (`.onnx.json`) no instalador.
- Roteiro repetitivo por fallback constante no parser do retorno do Ollama.
- Colapso de voz (personagem 1 lendo tudo) em incompatibilidade de formato de audio.

## Estado atual

- Aplicacao roda localmente com API local, Ollama e TTS local.
- Fluxo principal sem dependencia de cloud em runtime.
- Interface com controles de voz e presets.
- Base de documentacao existente e verificacao automatica disponivel.

## Proximos passos recomendados

### Curto prazo (prioridade alta)

1. Consolidar catalogo de vozes
   - validar uma lista final por idioma/genero com foco em qualidade perceptiva;
   - garantir download automatizado de todas as vozes "oficiais do projeto".

2. Melhorar robustez do parser de roteiro
   - ampliar testes para formatos de resposta variados do Ollama;
   - registrar logs tecnicos (debug) quando cair em fallback.

3. Garantir consistencia de voz por personagem
   - validar combinacoes de vozes no modo hibrido;
   - manter separacao clara de personagem em todos os cenarios.

### Medio prazo

4. Benchmark de qualidade
   - criar conjunto fixo de prompts de avaliacao;
   - medir naturalidade, clareza, expressividade e latencia por preset.

5. Presets avancados
   - adicionar presets por contexto (podcast, narracao, conversa casual);
   - permitir salvar preset personalizado por usuario.

6. Pacote de distribuicao local
   - preparar empacotamento para instalacao simplificada em outras maquinas.

### Longo prazo

7. Observabilidade local
   - logs estruturados por etapa (roteiro, tts, concat, download);
   - painel simples de diagnostico.

8. Testes automatizados
   - testes de regressao para parser de roteiro e pipeline de audio;
   - smoke tests de instalacao local.

## Como usar este historico

- Atualize este arquivo sempre que houver:
  - mudanca de arquitetura;
  - novo recurso principal;
  - incidente relevante e sua correcao;
  - alteracao na estrategia de instalacao/deploy local.
