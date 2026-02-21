import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import type { Character, DialogueLine } from './ollama';

interface SynthesizeInput {
  script: DialogueLine[];
  character1: Character;
  character2: Character;
  preset?: 'fast' | 'natural' | 'cinematic';
  ttsOptions?: TtsOptions;
}

const PIPER_BIN = process.env.PIPER_BIN || 'piper';
const PIPER_VOICES_DIR = process.env.PIPER_VOICES_DIR || './models/piper';
const PIPER_VOICE_DEFAULT_MODEL =
  process.env.PIPER_VOICE_DEFAULT_MODEL || join(PIPER_VOICES_DIR, 'pt_BR-faber-medium.onnx');
const PIPER_VOICE_FABER_MODEL =
  process.env.PIPER_VOICE_FABER_MODEL || join(PIPER_VOICES_DIR, 'pt_BR-faber-medium.onnx');
const PIPER_VOICE_EDRESSON_MODEL =
  process.env.PIPER_VOICE_EDRESSON_MODEL || join(PIPER_VOICES_DIR, 'pt_BR-edresson-low.onnx');
const PIPER_VOICE_AMY_MODEL =
  process.env.PIPER_VOICE_AMY_MODEL || join(PIPER_VOICES_DIR, 'en_US-amy-medium.onnx');
const PIPER_VOICE_KATHLEEN_MODEL =
  process.env.PIPER_VOICE_KATHLEEN_MODEL || join(PIPER_VOICES_DIR, 'en_US-kathleen-low.onnx');

const TTS_PRESET_CONFIG: Record<'fast' | 'natural' | 'cinematic', { pauseMs: number; lengthScale: number; noiseScale: number; noiseW: number }> = {
  fast: { pauseMs: 120, lengthScale: 0.93, noiseScale: 0.6, noiseW: 0.7 },
  natural: { pauseMs: 220, lengthScale: 1.0, noiseScale: 0.7, noiseW: 0.8 },
  cinematic: { pauseMs: 340, lengthScale: 1.08, noiseScale: 0.85, noiseW: 1.0 },
};

interface WavData {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  pcmData: Buffer;
}

interface CharacterVoiceOptions {
  lengthScale?: number;
  noiseScale?: number;
  noiseW?: number;
}

export interface TtsOptions {
  pauseMs?: number;
  character1?: CharacterVoiceOptions;
  character2?: CharacterVoiceOptions;
}

function sanitizeLine(line: DialogueLine): string {
  const raw = typeof line.text === 'string' ? line.text.trim() : '';
  return raw.replace(/\s+/g, ' ').replace(/\[(.*?)\]|\((.*?)\)/g, '').trim();
}

function getCharacterModel(character: Character): string {
  const voice = String(character.voice || '').toLowerCase();
  if (voice.includes('kathleen') && existsSync(PIPER_VOICE_KATHLEEN_MODEL)) return PIPER_VOICE_KATHLEEN_MODEL;
  if (voice.includes('amy') && existsSync(PIPER_VOICE_AMY_MODEL)) return PIPER_VOICE_AMY_MODEL;
  if (voice.includes('edresson') && existsSync(PIPER_VOICE_EDRESSON_MODEL)) return PIPER_VOICE_EDRESSON_MODEL;
  if (voice.includes('faber') && existsSync(PIPER_VOICE_FABER_MODEL)) return PIPER_VOICE_FABER_MODEL;
  return PIPER_VOICE_DEFAULT_MODEL;
}

function runPiperToWav(
  text: string,
  modelPath: string,
  outFile: string,
  config: { lengthScale: number; noiseScale: number; noiseW: number }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      PIPER_BIN,
      [
        '--model',
        modelPath,
        '--output_file',
        outFile,
        '--length_scale',
        String(config.lengthScale),
        '--noise_scale',
        String(config.noiseScale),
        '--noise_w',
        String(config.noiseW),
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );

    child.stdin.write(text);
    child.stdin.end();
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(new Error(`Nao foi possivel iniciar o Piper (${PIPER_BIN}): ${error.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Falha no Piper (codigo ${code}). ${stderr.trim()}`));
    });
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mergeVoiceConfig(
  preset: 'fast' | 'natural' | 'cinematic',
  options?: CharacterVoiceOptions
): { lengthScale: number; noiseScale: number; noiseW: number } {
  const base = TTS_PRESET_CONFIG[preset];
  return {
    lengthScale: clamp(Number(options?.lengthScale ?? base.lengthScale), 0.7, 1.4),
    noiseScale: clamp(Number(options?.noiseScale ?? base.noiseScale), 0.1, 1.6),
    noiseW: clamp(Number(options?.noiseW ?? base.noiseW), 0.1, 1.6),
  };
}

function readWavData(buffer: Buffer): WavData {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Arquivo WAV invalido gerado pelo Piper.');
  }
  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);
  const dataSize = buffer.readUInt32LE(40);
  const pcmData = buffer.subarray(44, 44 + dataSize);
  return { sampleRate, channels, bitsPerSample, pcmData };
}

function createSilence(sampleRate: number, channels: number, bitsPerSample: number, pauseMs: number): Buffer {
  const bytesPerSample = bitsPerSample / 8;
  const samples = Math.max(1, Math.floor((sampleRate * pauseMs) / 1000));
  return Buffer.alloc(samples * channels * bytesPerSample);
}

function buildWavFile(sampleRate: number, channels: number, bitsPerSample: number, pcmData: Buffer): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmData.length, 40);
  return Buffer.concat([header, pcmData]);
}

export async function synthesizeDialogueWav({
  script,
  character1,
  character2,
  preset = 'natural',
  ttsOptions,
}: SynthesizeInput): Promise<Buffer> {
  const lines = script
    .map((line) => ({ ...line, text: sanitizeLine(line) }))
    .filter((line) => line.text.length > 0);

  if (lines.length === 0) {
    throw new Error('Roteiro invalido para sintese de voz.');
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'vozes-em-cena-'));
  const config = TTS_PRESET_CONFIG[preset];
  const pauseMs = clamp(Number(ttsOptions?.pauseMs ?? config.pauseMs), 80, 700);
  const voiceConfig1 = mergeVoiceConfig(preset, ttsOptions?.character1);
  const voiceConfig2 = mergeVoiceConfig(preset, ttsOptions?.character2);
  const parts: Buffer[] = [];
  let audioFormat: Pick<WavData, 'sampleRate' | 'channels' | 'bitsPerSample'> | null = null;
  const baseModelPath = getCharacterModel(character1);

  try {
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const speaker = line.characterName === character2.name ? character2 : character1;
      const modelPath = getCharacterModel(speaker);
      const voiceConfig = line.characterName === character2.name ? voiceConfig2 : voiceConfig1;
      const partPath = join(tempDir, `line-${index}.wav`);
      await runPiperToWav(line.text, modelPath, partPath, voiceConfig);
      const wavData = readWavData(await readFile(partPath));

      if (!audioFormat) {
        audioFormat = wavData;
      } else {
        const mismatch =
          audioFormat.sampleRate !== wavData.sampleRate ||
          audioFormat.channels !== wavData.channels ||
          audioFormat.bitsPerSample !== wavData.bitsPerSample;
        if (mismatch) {
          // Fallback automatico para evitar quebrar a geracao
          // quando as vozes usam formatos diferentes.
          await runPiperToWav(line.text, baseModelPath, partPath, voiceConfig1);
          const fallbackWavData = readWavData(await readFile(partPath));
          const fallbackMismatch =
            audioFormat.sampleRate !== fallbackWavData.sampleRate ||
            audioFormat.channels !== fallbackWavData.channels ||
            audioFormat.bitsPerSample !== fallbackWavData.bitsPerSample;
          if (fallbackMismatch) {
            throw new Error(
              'Falha ao compatibilizar formatos de voz no Piper. Configure vozes com o mesmo formato de audio.'
            );
          }
          parts.push(fallbackWavData.pcmData);
          if (index < lines.length - 1) {
            parts.push(
              createSilence(
                fallbackWavData.sampleRate,
                fallbackWavData.channels,
                fallbackWavData.bitsPerSample,
                pauseMs
              )
            );
          }
          continue;
        }
      }

      parts.push(wavData.pcmData);
      if (index < lines.length - 1) {
        parts.push(
          createSilence(wavData.sampleRate, wavData.channels, wavData.bitsPerSample, pauseMs)
        );
      }
    }

    if (!audioFormat) throw new Error('Falha ao gerar audio com Piper.');
    return buildWavFile(
      audioFormat.sampleRate,
      audioFormat.channels,
      audioFormat.bitsPerSample,
      Buffer.concat(parts)
    );
  } catch (error: any) {
    if (String(error?.message || '').includes('ENOENT')) {
      throw new Error(
        'Piper nao encontrado. Instale e configure o Piper para habilitar TTS local.'
      );
    }
    throw error;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
