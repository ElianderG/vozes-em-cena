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
const ESPEAK_BIN = process.env.ESPEAK_BIN || 'espeak-ng';
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

interface VoiceSelection {
  engine: 'piper' | 'espeak';
  voiceId: string;
}

function sanitizeLine(line: DialogueLine): string {
  const raw = typeof line.text === 'string' ? line.text.trim() : '';
  return raw.replace(/\s+/g, ' ').replace(/\[(.*?)\]|\((.*?)\)/g, '').trim();
}

function parseVoiceSelection(character: Character): VoiceSelection {
  const rawVoice = String(character.voice || '').trim();
  if (rawVoice.includes(':')) {
    const [engine, ...rest] = rawVoice.split(':');
    const voiceId = rest.join(':').trim();
    if (engine === 'espeak' && voiceId) return { engine: 'espeak', voiceId };
    if (engine === 'piper' && voiceId) return { engine: 'piper', voiceId };
  }
  return { engine: 'piper', voiceId: rawVoice };
}

function getCharacterModel(character: Character): string {
  const { voiceId } = parseVoiceSelection(character);
  const rawVoice = voiceId;
  if (rawVoice) {
    const inferredPath = rawVoice.endsWith('.onnx')
      ? (rawVoice.startsWith('/') ? rawVoice : join(PIPER_VOICES_DIR, rawVoice))
      : join(PIPER_VOICES_DIR, `${rawVoice}.onnx`);
    if (existsSync(inferredPath)) return inferredPath;
  }

  const voice = rawVoice.toLowerCase();
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

function runEspeakToWav(
  text: string,
  voiceId: string,
  outFile: string,
  config: { lengthScale: number }
): Promise<void> {
  const speed = clamp(Math.round(170 / Math.max(0.5, config.lengthScale)), 110, 300);
  return new Promise((resolve, reject) => {
    const child = spawn(
      ESPEAK_BIN,
      ['-v', voiceId || 'pt-br', '-s', String(speed), '-w', outFile, text],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

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

function resamplePcm16Mono(input: Buffer, fromRate: number, toRate: number): Buffer {
  if (fromRate === toRate) return input;
  const inputSamples = input.length / 2;
  if (!Number.isFinite(inputSamples) || inputSamples <= 1) return input;

  const outputSamples = Math.max(1, Math.round((inputSamples * toRate) / fromRate));
  const output = Buffer.alloc(outputSamples * 2);

  for (let i = 0; i < outputSamples; i++) {
    const position = (i * (inputSamples - 1)) / Math.max(1, outputSamples - 1);
    const leftIndex = Math.floor(position);
    const rightIndex = Math.min(inputSamples - 1, leftIndex + 1);
    const fraction = position - leftIndex;

    const left = input.readInt16LE(leftIndex * 2);
    const right = input.readInt16LE(rightIndex * 2);
    const mixed = Math.round(left + (right - left) * fraction);
    output.writeInt16LE(mixed, i * 2);
  }

  return output;
}

function adaptWavDataToFormat(
  source: WavData,
  target: Pick<WavData, 'sampleRate' | 'channels' | 'bitsPerSample'>
): WavData | null {
  if (source.channels === target.channels && source.bitsPerSample === target.bitsPerSample) {
    if (source.sampleRate === target.sampleRate) return source;
    if (source.channels === 1 && source.bitsPerSample === 16) {
      return {
        sampleRate: target.sampleRate,
        channels: target.channels,
        bitsPerSample: target.bitsPerSample,
        pcmData: resamplePcm16Mono(source.pcmData, source.sampleRate, target.sampleRate),
      };
    }
  }
  return null;
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
  const baseVoiceSelection = parseVoiceSelection(character1);

  const synthesizeLine = async (
    text: string,
    character: Character,
    config: { lengthScale: number; noiseScale: number; noiseW: number },
    outFile: string
  ) => {
    const selection = parseVoiceSelection(character);
    if (selection.engine === 'espeak') {
      await runEspeakToWav(text, selection.voiceId, outFile, config);
      return;
    }
    const modelPath = getCharacterModel(character);
    await runPiperToWav(text, modelPath, outFile, config);
  };

  try {
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const speaker = line.characterName === character2.name ? character2 : character1;
      const voiceConfig = line.characterName === character2.name ? voiceConfig2 : voiceConfig1;
      const partPath = join(tempDir, `line-${index}.wav`);
      await synthesizeLine(line.text, speaker, voiceConfig, partPath);
      const wavData = readWavData(await readFile(partPath));

      if (!audioFormat) {
        audioFormat = wavData;
      } else {
        const adapted = adaptWavDataToFormat(wavData, audioFormat);
        if (adapted) {
          parts.push(adapted.pcmData);
          if (index < lines.length - 1) {
            parts.push(
              createSilence(
                adapted.sampleRate,
                adapted.channels,
                adapted.bitsPerSample,
                pauseMs
              )
            );
          }
          continue;
        }
        // Fallback de compatibilidade mantendo o personagem atual, sem trocar de voz para personagem 1.
        if (parseVoiceSelection(speaker).engine === 'espeak') {
          await runEspeakToWav(line.text, parseVoiceSelection(speaker).voiceId, partPath, voiceConfig);
        } else {
          await runEspeakToWav(line.text, 'pt-br', partPath, voiceConfig);
        }
        const fallbackWavData = readWavData(await readFile(partPath));
        const fallbackAdapted = adaptWavDataToFormat(fallbackWavData, audioFormat);
        if (!fallbackAdapted) {
          throw new Error(
            'Falha ao compatibilizar formatos de voz. Tente vozes do mesmo idioma/engine ou ajuste para preset Natural.'
          );
        }
        parts.push(fallbackAdapted.pcmData);
        if (index < lines.length - 1) {
          parts.push(
            createSilence(
              fallbackAdapted.sampleRate,
              fallbackAdapted.channels,
              fallbackAdapted.bitsPerSample,
              pauseMs
            )
          );
        }
        continue;
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
        'Motor de voz nao encontrado. Verifique Piper/eSpeak instalados e configurados.'
      );
    }
    throw error;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
