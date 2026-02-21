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

interface GenerateDialogueInput {
  prompt: string;
  character1: Character;
  character2: Character;
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b-instruct-q4_K_M';

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
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) attempts.push(arrayMatch[0]);

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed as DialogueLine[];
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
    .filter((line) => line.text.length > 0);

  return cleaned.length > 0 ? cleaned : null;
}

export async function generateDialogueScript(input: GenerateDialogueInput): Promise<DialogueLine[]> {
  const prompt = `
Voce e um roteirista. Responda APENAS com JSON valido.
Gere um dialogo curto de no maximo 6 falas entre "${input.character1.name}" e "${input.character2.name}".

Contexto:
${input.prompt}

Regras:
- Use somente os nomes "${input.character1.name}" e "${input.character2.name}" no campo characterName.
- ${input.character1.name}: sotaque ${input.character1.accent}, emocao ${input.character1.emotion}.
- ${input.character2.name}: sotaque ${input.character2.accent}, emocao ${input.character2.emotion}.
- Nao use markdown e nao inclua texto fora do JSON.

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
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      format: 'json',
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
