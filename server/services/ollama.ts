export interface Character {
  name: string;
  voice: string;
  accent: string;
  emotion: string;
}

export interface DialogueLine {
  characterName: string;
  text: string;
}

export type GenerationPreset = 'fast' | 'natural' | 'cinematic';

interface GenerateDialogueInput {
  prompt: string;
  character1: Character;
  character2: Character;
  preset?: GenerationPreset;
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b-instruct-q4_K_M';

function readNumberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

const PRESET_CONFIG: Record<
  GenerationPreset,
  { model: string; temperature: number; topP: number; repeatPenalty: number; numPredict: number }
> = {
  fast: {
    model: process.env.OLLAMA_MODEL_FAST || OLLAMA_MODEL,
    temperature: readNumberEnv('OLLAMA_TEMPERATURE_FAST', 0.55),
    topP: readNumberEnv('OLLAMA_TOP_P_FAST', 0.85),
    repeatPenalty: readNumberEnv('OLLAMA_REPEAT_PENALTY_FAST', 1.08),
    numPredict: readNumberEnv('OLLAMA_NUM_PREDICT_FAST', 220),
  },
  natural: {
    model: process.env.OLLAMA_MODEL_NATURAL || OLLAMA_MODEL,
    temperature: readNumberEnv('OLLAMA_TEMPERATURE_NATURAL', 0.82),
    topP: readNumberEnv('OLLAMA_TOP_P_NATURAL', 0.92),
    repeatPenalty: readNumberEnv('OLLAMA_REPEAT_PENALTY_NATURAL', 1.12),
    numPredict: readNumberEnv('OLLAMA_NUM_PREDICT_NATURAL', 320),
  },
  cinematic: {
    model: process.env.OLLAMA_MODEL_CINEMATIC || OLLAMA_MODEL,
    temperature: readNumberEnv('OLLAMA_TEMPERATURE_CINEMATIC', 0.95),
    topP: readNumberEnv('OLLAMA_TOP_P_CINEMATIC', 0.95),
    repeatPenalty: readNumberEnv('OLLAMA_REPEAT_PENALTY_CINEMATIC', 1.16),
    numPredict: readNumberEnv('OLLAMA_NUM_PREDICT_CINEMATIC', 420),
  },
};

function fallbackDialogue(input: GenerateDialogueInput): DialogueLine[] {
  return [
    {
      characterName: input.character1.name,
      text: `Vamos falar sobre: ${input.prompt.trim()}.`,
    },
    {
      characterName: input.character2.name,
      text: 'Perfeito, vamos construir esse dialogo juntos de forma natural.',
    },
  ];
}

function extractJsonArray(raw: string): DialogueLine[] | null {
  const trimmed = raw.trim();
  const attempts: string[] = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) attempts.push(fenced[1].trim());
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch?.[0]) attempts.push(arrayMatch[0]);
  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) attempts.push(objectMatch[0]);

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed as DialogueLine[];
      if (parsed && typeof parsed === 'object') {
        const maybeArray =
          (parsed as any).script ||
          (parsed as any).dialogue ||
          (parsed as any).lines ||
          (parsed as any).conversa ||
          (parsed as any).falas;
        if (Array.isArray(maybeArray)) return maybeArray as DialogueLine[];
      }
    } catch {
      // ignora tentativa invalida e continua
    }
  }

  return null;
}

function normalizeScript(
  script: DialogueLine[] | null,
  character1: Character,
  character2: Character
): DialogueLine[] | null {
  if (!script || script.length === 0) return null;
  const allowedNames = new Set([character1.name, character2.name]);
  const cleaned = script
    .slice(0, 6)
    .map((line, index) => {
      const characterName =
        typeof line.characterName === 'string' && allowedNames.has(line.characterName)
          ? line.characterName
          : index % 2 === 0
            ? character1.name
            : character2.name;
      const text = typeof line.text === 'string' ? line.text.trim() : '';
      return { characterName, text };
    })
    .map((line) => ({
      characterName: line.characterName,
      text: line.text
        .replace(/\[(.*?)\]|\((.*?)\)/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    }))
    .filter((line, index, lines) => line.text && line.text !== lines[index - 1]?.text)
    .map((line) => ({
      characterName: line.characterName,
      text: line.text.length > 180 ? `${line.text.slice(0, 177).trimEnd()}...` : line.text,
    }))
    .filter((line) => line.text.length > 0);

  return cleaned.length > 0 ? cleaned : null;
}

export async function generateDialogueScript(input: GenerateDialogueInput): Promise<DialogueLine[]> {
  const preset = input.preset || 'natural';
  const presetConfig = PRESET_CONFIG[preset];
  const prompt = `
Voce escreve dialogos conversacionais naturais para dublagem.
Retorne APENAS um JSON valido.

Objetivo:
- Criar um dialogo curto e fluido (4 a 6 falas) entre "${input.character1.name}" e "${input.character2.name}".
- Soar como fala real: frases curtas, ritmo oral, variacao emocional.

Contexto:
${input.prompt}

Regras:
- Use somente os nomes "${input.character1.name}" e "${input.character2.name}" em "characterName".
- ${input.character1.name}: sotaque ${input.character1.accent}, emocao ${input.character1.emotion}.
- ${input.character2.name}: sotaque ${input.character2.accent}, emocao ${input.character2.emotion}.
- Cada fala deve ser curta (idealmente 6 a 16 palavras).
- Evite frases formais demais, exposicao longa e repeticoes.
- Nao use markdown, narracao de palco ou texto fora do JSON.

Formato obrigatorio:
[
  {"characterName":"${input.character1.name}","text":"..."},
  {"characterName":"${input.character2.name}","text":"..."}
]
`.trim();

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: presetConfig.model,
      prompt,
      stream: false,
      options: {
        temperature: presetConfig.temperature,
        top_p: presetConfig.topP,
        repeat_penalty: presetConfig.repeatPenalty,
        num_predict: presetConfig.numPredict,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao chamar Ollama (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { response?: string };
  const parsed = extractJsonArray(data.response || '');
  const normalized = normalizeScript(parsed, input.character1, input.character2);
  return normalized || fallbackDialogue(input);
}
