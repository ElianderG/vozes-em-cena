/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic2, 
  Play, 
  Pause, 
  RotateCcw, 
  Settings2, 
  MessageSquare, 
  User, 
  Sparkles, 
  Loader2,
  Volume2,
  Download,
  Plus,
  Trash2,
  Moon
} from 'lucide-react';

interface VoiceOption {
  value: string;
  label: string;
  language: string;
  gender: 'Feminina' | 'Masculina';
}

const VOICE_OPTIONS: VoiceOption[] = [
  // Portugues (Brasil)
  { value: 'pt_BR-faber-medium', label: 'Faber', language: 'Português (Brasil)', gender: 'Masculina' },
  { value: 'pt_BR-edresson-low', label: 'Edresson', language: 'Português (Brasil)', gender: 'Masculina' },
  { value: 'pt_BR-maria-medium', label: 'Maria', language: 'Português (Brasil)', gender: 'Feminina' },
  { value: 'pt_BR-talita-medium', label: 'Talita', language: 'Português (Brasil)', gender: 'Feminina' },
  // Portugues (Portugal)
  { value: 'pt_PT-duarte-medium', label: 'Duarte', language: 'Português (Portugal)', gender: 'Masculina' },
  { value: 'pt_PT-tugao-medium', label: 'Tugão', language: 'Português (Portugal)', gender: 'Masculina' },
  { value: 'pt_PT-joana-medium', label: 'Joana', language: 'Português (Portugal)', gender: 'Feminina' },
  { value: 'pt_PT-beatriz-medium', label: 'Beatriz', language: 'Português (Portugal)', gender: 'Feminina' },
  // Ingles (Britanico)
  { value: 'en_GB-alan-medium', label: 'Alan', language: 'Inglês (Britânico)', gender: 'Masculina' },
  { value: 'en_GB-northern_english_male-medium', label: 'Northern Male', language: 'Inglês (Britânico)', gender: 'Masculina' },
  { value: 'en_GB-cori-medium', label: 'Cori', language: 'Inglês (Britânico)', gender: 'Feminina' },
  { value: 'en_GB-southern_english_female-low', label: 'Southern Female', language: 'Inglês (Britânico)', gender: 'Feminina' },
  // Ingles (US)
  { value: 'en_US-ryan-high', label: 'Ryan', language: 'Inglês (US)', gender: 'Masculina' },
  { value: 'en_US-joe-medium', label: 'Joe', language: 'Inglês (US)', gender: 'Masculina' },
  { value: 'en_US-amy-medium', label: 'Amy', language: 'Inglês (US)', gender: 'Feminina' },
  { value: 'en_US-kathleen-low', label: 'Kathleen', language: 'Inglês (US)', gender: 'Feminina' },
  // Japones
  { value: 'ja_JP-hiroshi-medium', label: 'Hiroshi', language: 'Japonês', gender: 'Masculina' },
  { value: 'ja_JP-kenta-medium', label: 'Kenta', language: 'Japonês', gender: 'Masculina' },
  { value: 'ja_JP-kokoro-medium', label: 'Kokoro', language: 'Japonês', gender: 'Feminina' },
  { value: 'ja_JP-haruka-medium', label: 'Haruka', language: 'Japonês', gender: 'Feminina' },
  // Frances
  { value: 'fr_FR-tom-medium', label: 'Tom', language: 'Francês', gender: 'Masculina' },
  { value: 'fr_FR-gilles-low', label: 'Gilles', language: 'Francês', gender: 'Masculina' },
  { value: 'fr_FR-siwis-medium', label: 'Siwis', language: 'Francês', gender: 'Feminina' },
  { value: 'fr_FR-mls-medium', label: 'MLS', language: 'Francês', gender: 'Feminina' },
  // Espanhol
  { value: 'es_ES-carlfm-x_low', label: 'CarlFM', language: 'Espanhol', gender: 'Masculina' },
  { value: 'es_ES-davefx-medium', label: 'DaveFX', language: 'Espanhol', gender: 'Masculina' },
  { value: 'es_ES-sharvard-medium', label: 'Sharvard', language: 'Espanhol', gender: 'Feminina' },
  { value: 'es_MX-claudia-medium', label: 'Claudia', language: 'Espanhol', gender: 'Feminina' },
];
type GenerationPreset = 'fast' | 'natural' | 'cinematic';

interface Character {
  name: string;
  voice: string;
  accent: string;
  emotion: string;
}

interface DialogueLine {
  characterName: string;
  text: string;
}

const INITIAL_DIALOGUE: DialogueLine[] = [
  { characterName: 'Personagem 1', text: 'Oi! Tudo certo por ai?' },
  { characterName: 'Personagem 2', text: 'Tudo sim! Vamos começar a dublagem?' },
];

interface CharacterVoiceTuning {
  lengthScale: number;
  noiseScale: number;
  noiseW: number;
}

interface VoiceNuanceConfig {
  pauseMs: number;
  character1: CharacterVoiceTuning;
  character2: CharacterVoiceTuning;
}

export default function App() {
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  const [preset, setPreset] = useState<GenerationPreset>('natural');
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [character1, setCharacter1] = useState<Character>({
    name: 'Personagem 1',
    voice: 'pt_BR-faber-medium',
    accent: 'Francês',
    emotion: 'Calmo'
  });

  const [character2, setCharacter2] = useState<Character>({
    name: 'Personagem 2',
    voice: 'en_US-amy-medium',
    accent: 'Paulista',
    emotion: 'Entusiasmado'
  });
  const [voiceSearch1, setVoiceSearch1] = useState('');
  const [voiceSearch2, setVoiceSearch2] = useState('');

  const [prompt, setPrompt] = useState('');
  const [script, setScript] = useState<DialogueLine[]>(INITIAL_DIALOGUE);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [statusLog, setStatusLog] = useState<string>('');
  const [voiceNuance, setVoiceNuance] = useState<VoiceNuanceConfig>({
    pauseMs: 220,
    character1: { lengthScale: 1.0, noiseScale: 0.72, noiseW: 0.8 },
    character2: { lengthScale: 1.0, noiseScale: 0.72, noiseW: 0.8 },
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scriptAbortControllerRef = useRef<AbortController | null>(null);
  const audioAbortControllerRef = useRef<AbortController | null>(null);

  const filterVoiceOptions = (query: string): VoiceOption[] => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return VOICE_OPTIONS;
    return VOICE_OPTIONS.filter((voice) =>
      `${voice.label} ${voice.language} ${voice.gender} ${voice.value}`.toLowerCase().includes(normalized)
    );
  };

  const filteredVoiceOptions1 = filterVoiceOptions(voiceSearch1);
  const filteredVoiceOptions2 = filterVoiceOptions(voiceSearch2);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = (event?: MediaQueryListEvent) => {
      setSystemPrefersDark(event ? event.matches : mediaQuery.matches);
    };
    updateSystemTheme();
    mediaQuery.addEventListener('change', updateSystemTheme);
    return () => mediaQuery.removeEventListener('change', updateSystemTheme);
  }, []);

  const isDarkMode = themeMode === 'dark' || (themeMode === 'system' && systemPrefersDark);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      scriptAbortControllerRef.current?.abort();
      audioAbortControllerRef.current?.abort();
    };
  }, [audioUrl]);

  const generateScript = async () => {
    if (!prompt.trim()) return;
    const controller = new AbortController();
    scriptAbortControllerRef.current = controller;
    setIsGeneratingScript(true);
    setStatusLog('Gerando roteiro...');
    try {
      const response = await fetch('/api/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          prompt,
          character1,
          character2,
          preset,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Falha na API local de roteiro.');
      }
      const data = await response.json();
      const parsedScript = Array.isArray(data?.script) ? data.script : [];
      setScript(parsedScript);
      setStatusLog('Roteiro gerado com sucesso!');
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        setStatusLog('Geracao de roteiro cancelada pelo usuario.');
        return;
      }
      console.error("Erro ao gerar roteiro:", error);
      setStatusLog(`Erro no roteiro: ${error.message}`);
      alert(`Falha ao gerar o roteiro: ${error.message}`);
    } finally {
      setIsGeneratingScript(false);
      scriptAbortControllerRef.current = null;
    }
  };

  const generateAudio = async () => {
    if (script.length === 0) return;

    const controller = new AbortController();
    audioAbortControllerRef.current = controller;
    setIsGeneratingAudio(true);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setStatusLog('Gerando áudio dublado (isso pode levar alguns segundos)...');

    try {
      const response = await fetch('/api/dub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          script,
          character1,
          character2,
          preset,
          ttsOptions: voiceNuance,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Falha na API local de dublagem.');
      }
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setStatusLog('Áudio gerado com sucesso! Clique no play para ouvir.');
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        setStatusLog('Geracao de audio cancelada pelo usuario.');
        return;
      }
      console.error("Erro ao gerar áudio:", error);
      setStatusLog(`Erro no áudio: ${error.message}`);
      alert(`Falha ao gerar o áudio: ${error.message}`);
    } finally {
      setIsGeneratingAudio(false);
      audioAbortControllerRef.current = null;
    }
  };

  const cancelScriptGeneration = () => {
    scriptAbortControllerRef.current?.abort();
  };

  const cancelAudioGeneration = () => {
    audioAbortControllerRef.current?.abort();
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleLineChange = (index: number, field: keyof DialogueLine, value: string) => {
    const newScript = [...script];
    newScript[index] = { ...newScript[index], [field]: value };
    setScript(newScript);
  };

  const addLine = () => {
    setScript([...script, { characterName: character1.name, text: '' }]);
  };

  const removeLine = (index: number) => {
    setScript(script.filter((_, i) => i !== index));
  };

  return (
    <div className={`min-h-screen bg-[#f5f5f5] text-slate-900 font-sans p-3 md:p-4 ${isDarkMode ? 'dark-theme' : ''}`}>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Mic2 className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Vozes em Cena</h1>
              <p className="text-slate-500 text-sm">Dublagem com IA e Personalidade</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <Moon className="w-4 h-4 text-slate-600" />
              <select
                value={themeMode}
                onChange={(e) => setThemeMode(e.target.value as 'system' | 'light' | 'dark')}
                className="bg-transparent text-sm text-slate-700 focus:outline-none"
                title="Selecionar tema"
                aria-label="Selecionar tema"
              >
                <option value="system">Sistema</option>
                <option value="light">Claro</option>
                <option value="dark">Escuro</option>
              </select>
            </div>
            <div className="hidden md:flex items-center gap-4 text-xs font-mono text-slate-400 uppercase tracking-widest">
              <span>Status: Ready</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          {/* Left Column: Configuration */}
          <div className="xl:col-span-5 space-y-4 xl:sticky xl:top-3">
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 max-h-[calc(100vh-1.75rem)] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 mb-4 text-indigo-600">
                <Settings2 className="w-5 h-5" />
                <h2 className="font-semibold">Configuração de Voz</h2>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Preset de Geracao
                </label>
                <select
                  value={preset}
                  onChange={(e) => setPreset(e.target.value as GenerationPreset)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="fast">Rapido</option>
                  <option value="natural">Natural</option>
                  <option value="cinematic">Cinematico</option>
                </select>
              </div>

              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nuances da Voz</p>
                <label className="block text-xs text-slate-600">
                  Pausa entre falas: <span className="font-semibold">{voiceNuance.pauseMs}ms</span>
                  <input
                    type="range"
                    min={80}
                    max={700}
                    step={10}
                    value={voiceNuance.pauseMs}
                    onChange={(e) =>
                      setVoiceNuance((current) => ({ ...current, pauseMs: Number(e.target.value) }))
                    }
                    className="w-full mt-2"
                  />
                </label>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2">
                    <p className="text-[11px] font-semibold text-slate-600">{character1.name || 'Personagem 1'}</p>
                    <label className="block text-xs text-slate-600">
                      Ritmo: <span className="font-semibold">{voiceNuance.character1.lengthScale.toFixed(2)}</span>
                      <input
                        type="range"
                        min={0.8}
                        max={1.3}
                        step={0.01}
                        value={voiceNuance.character1.lengthScale}
                        onChange={(e) =>
                          setVoiceNuance((current) => ({
                            ...current,
                            character1: { ...current.character1, lengthScale: Number(e.target.value) },
                          }))
                        }
                        className="w-full mt-1"
                      />
                    </label>
                    <label className="block text-xs text-slate-600">
                      Expressividade: <span className="font-semibold">{voiceNuance.character1.noiseScale.toFixed(2)}</span>
                      <input
                        type="range"
                        min={0.3}
                        max={1.4}
                        step={0.01}
                        value={voiceNuance.character1.noiseScale}
                        onChange={(e) =>
                          setVoiceNuance((current) => ({
                            ...current,
                            character1: { ...current.character1, noiseScale: Number(e.target.value) },
                          }))
                        }
                        className="w-full mt-1"
                      />
                    </label>
                    <label className="block text-xs text-slate-600">
                      Variacao: <span className="font-semibold">{voiceNuance.character1.noiseW.toFixed(2)}</span>
                      <input
                        type="range"
                        min={0.3}
                        max={1.4}
                        step={0.01}
                        value={voiceNuance.character1.noiseW}
                        onChange={(e) =>
                          setVoiceNuance((current) => ({
                            ...current,
                            character1: { ...current.character1, noiseW: Number(e.target.value) },
                          }))
                        }
                        className="w-full mt-1"
                      />
                    </label>
                  </div>
                  <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2">
                    <p className="text-[11px] font-semibold text-slate-600">{character2.name || 'Personagem 2'}</p>
                    <label className="block text-xs text-slate-600">
                      Ritmo: <span className="font-semibold">{voiceNuance.character2.lengthScale.toFixed(2)}</span>
                      <input
                        type="range"
                        min={0.8}
                        max={1.3}
                        step={0.01}
                        value={voiceNuance.character2.lengthScale}
                        onChange={(e) =>
                          setVoiceNuance((current) => ({
                            ...current,
                            character2: { ...current.character2, lengthScale: Number(e.target.value) },
                          }))
                        }
                        className="w-full mt-1"
                      />
                    </label>
                    <label className="block text-xs text-slate-600">
                      Expressividade: <span className="font-semibold">{voiceNuance.character2.noiseScale.toFixed(2)}</span>
                      <input
                        type="range"
                        min={0.3}
                        max={1.4}
                        step={0.01}
                        value={voiceNuance.character2.noiseScale}
                        onChange={(e) =>
                          setVoiceNuance((current) => ({
                            ...current,
                            character2: { ...current.character2, noiseScale: Number(e.target.value) },
                          }))
                        }
                        className="w-full mt-1"
                      />
                    </label>
                    <label className="block text-xs text-slate-600">
                      Variacao: <span className="font-semibold">{voiceNuance.character2.noiseW.toFixed(2)}</span>
                      <input
                        type="range"
                        min={0.3}
                        max={1.4}
                        step={0.01}
                        value={voiceNuance.character2.noiseW}
                        onChange={(e) =>
                          setVoiceNuance((current) => ({
                            ...current,
                            character2: { ...current.character2, noiseW: Number(e.target.value) },
                          }))
                        }
                        className="w-full mt-1"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Character 1 */}
              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <User className="w-4 h-4" />
                  <span>{character1.name}</span>
                </div>
                <div className="grid gap-3">
                  <input 
                    type="text" 
                    value={character1.name}
                    onChange={(e) => setCharacter1({...character1, name: e.target.value})}
                    placeholder="Nome do Personagem"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <input
                    type="text"
                    value={voiceSearch1}
                    onChange={(e) => setVoiceSearch1(e.target.value)}
                    placeholder="Buscar voz por idioma, genero ou nome"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                  <select 
                    value={character1.voice}
                    onChange={(e) => setCharacter1({...character1, voice: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  >
                    {filteredVoiceOptions1.length === 0 ? (
                      <option value={character1.voice}>Nenhuma voz encontrada</option>
                    ) : (
                      filteredVoiceOptions1.map((voice) => (
                        <option key={voice.value} value={voice.value}>
                          {`[${voice.language}] [${voice.gender}] ${voice.label}`}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      value={character1.accent}
                      onChange={(e) => setCharacter1({...character1, accent: e.target.value})}
                      placeholder="Sotaque"
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                    <input 
                      type="text" 
                      value={character1.emotion}
                      onChange={(e) => setCharacter1({...character1, emotion: e.target.value})}
                      placeholder="Emoção"
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 my-4" />

              {/* Character 2 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <User className="w-4 h-4" />
                  <span>{character2.name}</span>
                </div>
                <div className="grid gap-3">
                  <input 
                    type="text" 
                    value={character2.name}
                    onChange={(e) => setCharacter2({...character2, name: e.target.value})}
                    placeholder="Nome do Personagem"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <input
                    type="text"
                    value={voiceSearch2}
                    onChange={(e) => setVoiceSearch2(e.target.value)}
                    placeholder="Buscar voz por idioma, genero ou nome"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  />
                  <select 
                    value={character2.voice}
                    onChange={(e) => setCharacter2({...character2, voice: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  >
                    {filteredVoiceOptions2.length === 0 ? (
                      <option value={character2.voice}>Nenhuma voz encontrada</option>
                    ) : (
                      filteredVoiceOptions2.map((voice) => (
                        <option key={voice.value} value={voice.value}>
                          {`[${voice.language}] [${voice.gender}] ${voice.label}`}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      value={character2.accent}
                      onChange={(e) => setCharacter2({...character2, accent: e.target.value})}
                      placeholder="Sotaque"
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                    <input 
                      type="text" 
                      value={character2.emotion}
                      onChange={(e) => setCharacter2({...character2, emotion: e.target.value})}
                      placeholder="Emoção"
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Script & Generation */}
          <div className="xl:col-span-7 space-y-4">
            {/* Prompt Area */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Sparkles className="w-5 h-5" />
                  <h2 className="font-semibold">Gerar Roteiro</h2>
                </div>
                {statusLog && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    {statusLog}
                  </span>
                )}
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Uma discussão sobre quem deixou a louça suja..."
                  className="flex-1 min-h-[72px] p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
                <button 
                  onClick={generateScript}
                  disabled={isGeneratingScript || !prompt.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-4 py-3 rounded-xl font-medium transition-all flex flex-col items-center justify-center gap-2 min-w-[110px]"
                >
                  {isGeneratingScript ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <MessageSquare className="w-5 h-5" />
                      <span className="text-xs">Gerar Texto</span>
                    </>
                  )}
                </button>
                {isGeneratingScript && (
                  <button
                    onClick={cancelScriptGeneration}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-medium transition-all min-w-[90px]"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </section>

            {/* Script Editor */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 min-h-[330px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-indigo-600">
                  <MessageSquare className="w-5 h-5" />
                  <h2 className="font-semibold">Diálogo</h2>
                </div>
                <button 
                  onClick={addLine}
                  className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto max-h-[420px] pr-1 custom-scrollbar">
                {script.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-12">
                    <MessageSquare className="w-12 h-12 opacity-20" />
                    <p className="text-sm">Nenhum roteiro gerado ainda.</p>
                  </div>
                ) : (
                  script.map((line, index) => (
                    <div key={index} className="group relative bg-slate-50 rounded-xl p-3 border border-slate-100 hover:border-indigo-200 transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <select 
                          value={line.characterName}
                          onChange={(e) => handleLineChange(index, 'characterName', e.target.value)}
                          className="bg-transparent font-bold text-xs text-indigo-600 uppercase tracking-wider focus:outline-none"
                        >
                          <option value={character1.name}>{character1.name}</option>
                          <option value={character2.name}>{character2.name}</option>
                        </select>
                        <button 
                          onClick={() => removeLine(index)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all absolute top-3 right-3"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea 
                        value={line.text}
                        onChange={(e) => handleLineChange(index, 'text', e.target.value)}
                        className="w-full bg-transparent text-sm text-slate-700 focus:outline-none resize-none"
                        rows={2}
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Action Footer */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  {audioUrl && (
                    <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full">
                      <button 
                        onClick={togglePlayback}
                        className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors"
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                      </button>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">Áudio Pronto</span>
                        <div className="flex gap-1">
                          {[...Array(12)].map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-1 h-3 bg-indigo-300 rounded-full ${isPlaying ? 'animate-bounce' : ''}`}
                              style={{ animationDelay: `${i * 0.1}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={generateAudio}
                    disabled={isGeneratingAudio || script.length === 0}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-slate-200"
                  >
                    {isGeneratingAudio ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Dublando...</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-5 h-5" />
                        <span>Gerar Dublagem</span>
                      </>
                    )}
                  </button>
                  {isGeneratingAudio && (
                    <button
                      onClick={cancelAudioGeneration}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-semibold transition-all"
                    >
                      Cancelar
                    </button>
                  )}
                  {audioUrl && (
                    <a 
                      href={audioUrl} 
                      download="dublagem.wav"
                      className="flex items-center justify-center w-12 h-12 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>

        <footer className="text-center text-slate-400 text-xs py-4">
          <p>© 2026 Vozes em Cena • IA Local</p>
        </footer>
      </div>

      {/* Hidden Audio Element */}
      {audioUrl && (
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }

        .dark-theme {
          background: #0f172a;
          color: #e2e8f0;
        }

        .dark-theme header {
          border-color: #334155;
        }

        .dark-theme section {
          background: #111827;
          border-color: #1f2937;
          box-shadow: none;
        }

        .dark-theme .bg-slate-50,
        .dark-theme .bg-white {
          background: #0f172a !important;
        }

        .dark-theme .hover\\:bg-slate-50:hover {
          background: #1e293b !important;
        }

        .dark-theme .bg-indigo-50 {
          background: #1e1b4b !important;
        }

        .dark-theme .border-slate-100,
        .dark-theme .border-slate-200 {
          border-color: #334155 !important;
        }

        .dark-theme .text-slate-900,
        .dark-theme .text-slate-700,
        .dark-theme .text-slate-600,
        .dark-theme .text-slate-500,
        .dark-theme .text-slate-400 {
          color: #cbd5e1 !important;
        }

        .dark-theme .text-white {
          color: #f8fafc !important;
        }

        .dark-theme input,
        .dark-theme select,
        .dark-theme textarea {
          background: #0b1220 !important;
          border-color: #334155 !important;
          color: #e2e8f0 !important;
        }

        .dark-theme input::placeholder,
        .dark-theme textarea::placeholder {
          color: #94a3b8;
        }

        .dark-theme button:disabled {
          background: #334155 !important;
          color: #94a3b8 !important;
          border-color: #475569 !important;
          cursor: not-allowed;
        }

        .dark-theme a.bg-white {
          background: #1e293b !important;
          color: #e2e8f0 !important;
          border-color: #334155 !important;
        }
      `}</style>
    </div>
  );
}
