import express from 'express';
import { generateDialogueScript, type Character, type DialogueLine, type GenerationPreset } from './services/ollama';
import { synthesizeDialogueWav, type TtsOptions } from './services/tts';

const app = express();
const PORT = Number(process.env.API_PORT || 8787);

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/script', async (req, res) => {
  try {
    const { prompt, character1, character2, preset } = req.body as {
      prompt?: string;
      character1?: Character;
      character2?: Character;
      preset?: GenerationPreset;
    };

    if (!prompt?.trim() || !character1?.name || !character2?.name) {
      return res.status(400).json({ error: 'Payload invalido para geracao de roteiro.' });
    }

    const script = await generateDialogueScript({ prompt, character1, character2, preset });
    return res.json({ script });
  } catch (error: any) {
    const message = error?.message || 'Erro desconhecido ao gerar roteiro.';
    return res.status(500).json({ error: message });
  }
});

app.post('/api/dub', async (req, res) => {
  try {
    const { script, character1, character2, preset, ttsOptions } = req.body as {
      script?: DialogueLine[];
      character1?: Character;
      character2?: Character;
      preset?: GenerationPreset;
      ttsOptions?: TtsOptions;
    };

    if (!Array.isArray(script) || script.length === 0) {
      return res.status(400).json({ error: 'Roteiro vazio para dublagem.' });
    }
    if (!character1?.name || !character2?.name) {
      return res.status(400).json({ error: 'Personagens invalidos para dublagem.' });
    }

    const wavBuffer = await synthesizeDialogueWav({ script, character1, character2, preset, ttsOptions });
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Disposition', 'inline; filename="dublagem.wav"');
    return res.send(wavBuffer);
  } catch (error: any) {
    const message = error?.message || 'Erro desconhecido ao gerar dublagem.';
    return res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`API local online em http://localhost:${PORT}`);
});
