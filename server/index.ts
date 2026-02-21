import express from 'express';
import { generateDialogueScript, type Character, type DialogueLine } from './services/ollama';
import { synthesizeDialogueWav } from './services/tts';

const app = express();
const PORT = Number(process.env.API_PORT || 8787);

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/script', async (req, res) => {
  try {
    const { prompt, character1, character2 } = req.body as {
      prompt?: string;
      character1?: Character;
      character2?: Character;
    };

    if (!prompt?.trim() || !character1?.name || !character2?.name) {
      return res.status(400).json({ error: 'Payload invalido para geracao de roteiro.' });
    }

    const script = await generateDialogueScript({ prompt, character1, character2 });
    return res.json({ script });
  } catch (error: any) {
    const message = error?.message || 'Erro desconhecido ao gerar roteiro.';
    return res.status(500).json({ error: message });
  }
});

app.post('/api/dub', async (req, res) => {
  try {
    const { script, character1, character2 } = req.body as {
      script?: DialogueLine[];
      character1?: Character;
      character2?: Character;
    };

    if (!Array.isArray(script) || script.length === 0) {
      return res.status(400).json({ error: 'Roteiro vazio para dublagem.' });
    }

    const wavBuffer = await synthesizeDialogueWav({ script, character1, character2 });
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
