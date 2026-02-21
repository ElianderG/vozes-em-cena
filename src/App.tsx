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
import ReactMarkdown from 'react-markdown';

// Available voices for Gemini TTS
const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

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

export default function App() {
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [character1, setCharacter1] = useState<Character>({
    name: 'Personagem 1',
    voice: 'Kore',
    accent: 'Francês',
    emotion: 'Calmo'
  });

  const [character2, setCharacter2] = useState<Character>({
    name: 'Personagem 2',
    voice: 'Kore',
    accent: 'Paulista',
    emotion: 'Entusiasmado'
  });

  const [prompt, setPrompt] = useState('');
  const [script, setScript] = useState<DialogueLine[]>([]);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [statusLog, setStatusLog] = useState<string>('');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    };
  }, [audioUrl]);

  const generateScript = async () => {
    if (!prompt.trim()) return;
    setIsGeneratingScript(true);
    setStatusLog('Gerando roteiro...');
    try {
      const response = await fetch('/api/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          character1,
          character2,
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
      console.error("Erro ao gerar roteiro:", error);
      setStatusLog(`Erro no roteiro: ${error.message}`);
      alert(`Falha ao gerar o roteiro: ${error.message}`);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const generateAudio = async () => {
    if (script.length === 0) return;

    setIsGeneratingAudio(true);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setStatusLog('Gerando áudio dublado (isso pode levar alguns segundos)...');

    try {
      const response = await fetch('/api/dub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          character1,
          character2,
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
      console.error("Erro ao gerar áudio:", error);
      setStatusLog(`Erro no áudio: ${error.message}`);
      alert(`Falha ao gerar o áudio: ${error.message}`);
    } finally {
      setIsGeneratingAudio(false);
    }
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
    <div className={`min-h-screen bg-[#f5f5f5] text-slate-900 font-sans p-4 md:p-8 ${isDarkMode ? 'dark-theme' : ''}`}>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 pb-6">
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

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Configuration */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-6 text-indigo-600">
                <Settings2 className="w-5 h-5" />
                <h2 className="font-semibold">Configuração de Voz</h2>
              </div>

              {/* Character 1 */}
              <div className="space-y-4 mb-8">
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
                  <select 
                    value={character1.voice}
                    onChange={(e) => setCharacter1({...character1, voice: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  >
                    {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
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

              <div className="h-px bg-slate-100 my-6" />

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
                  <select 
                    value={character2.voice}
                    onChange={(e) => setCharacter2({...character2, voice: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  >
                    {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
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
          <div className="lg:col-span-8 space-y-6">
            {/* Prompt Area */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
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
              <div className="flex gap-3">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Uma discussão sobre quem deixou a louça suja..."
                  className="flex-1 min-h-[80px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
                <button 
                  onClick={generateScript}
                  disabled={isGeneratingScript || !prompt.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-6 rounded-xl font-medium transition-all flex flex-col items-center justify-center gap-2 min-w-[120px]"
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
              </div>
            </section>

            {/* Script Editor */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 min-h-[400px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
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

              <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                {script.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-12">
                    <MessageSquare className="w-12 h-12 opacity-20" />
                    <p className="text-sm">Nenhum roteiro gerado ainda.</p>
                  </div>
                ) : (
                  script.map((line, index) => (
                    <div key={index} className="group relative bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-indigo-200 transition-all">
                      <div className="flex items-center gap-3 mb-2">
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
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all absolute top-4 right-4"
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
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
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
                    className="flex items-center gap-2 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-slate-200"
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

        <footer className="text-center text-slate-400 text-xs py-8">
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
