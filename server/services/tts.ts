import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import type { Character, DialogueLine } from './ollama';

interface SynthesizeInput {
  script: DialogueLine[];
  character1?: Character;
  character2?: Character;
}

const ESPEAK_BIN = process.env.ESPEAK_BIN || 'espeak';
const ESPEAK_VOICE = process.env.ESPEAK_VOICE || 'pt-br';
const ESPEAK_SPEED = Number(process.env.ESPEAK_SPEED || 160);

function buildSpeechText(script: DialogueLine[]): string {
  return script.map((line) => `${line.characterName}. ${line.text}`).join('\n');
}

function runEspeakToWav(text: string, outFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ESPEAK_BIN, ['-v', ESPEAK_VOICE, '-s', String(ESPEAK_SPEED), '-w', outFile, text], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(new Error(`Nao foi possivel iniciar o eSpeak (${ESPEAK_BIN}): ${error.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Falha no eSpeak (codigo ${code}). ${stderr.trim()}`));
    });
  });
}

export async function synthesizeDialogueWav({ script }: SynthesizeInput): Promise<Buffer> {
  const speechText = buildSpeechText(script);
  if (!speechText.trim()) {
    throw new Error('Roteiro invalido para sintese de voz.');
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'vozes-em-cena-'));
  const wavPath = join(tempDir, 'dublagem.wav');

  try {
    await runEspeakToWav(speechText, wavPath);
    return await readFile(wavPath);
  } catch (error: any) {
    if (String(error?.message || '').includes('ENOENT')) {
      throw new Error(
        'eSpeak nao encontrado. Instale o eSpeak no sistema para habilitar TTS local (ex.: sudo apt install espeak).'
      );
    }
    throw error;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
