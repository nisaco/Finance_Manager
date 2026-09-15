import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  X,
  AlertCircle,
  MessageSquare,
  Send,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Eye,
  EyeOff,
  User,
} from 'lucide-react';
import { useLedger } from '../../context/LedgerContext';
import { useAuth } from '../../context/AuthContext';
import { SpatialVoiceOrb } from '../SpatialVoiceOrb';
import { VoiceTranscriptSidebar, TranscriptItem } from '../VoiceTranscriptSidebar';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Convert Float32Array PCM audio buffer to 16-bit linear PCM byte buffer (base64)
function float32ToLinear16Base64(samples: Float32Array): string {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(binary);
}

// Convert Base64 16-bit linear PCM audio into Float32Array
function base64ToFloat32Array(base64: string): Float32Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const dataView = new DataView(bytes.buffer);
  const samples = new Float32Array(len / 2);
  for (let i = 0; i < samples.length; i++) {
    const int16 = dataView.getInt16(i * 2, true);
    samples[i] = int16 / (int16 < 0 ? 0x8000 : 0x7fff);
  }
  return samples;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose }) => {
  const {
    activeProfile,
    transactions,
    budgets,
    goals,
    debts,
    summary,
  } = useLedger();
  const { user } = useAuth();

  const [status, setStatus] = useState<
    'connecting' | 'connected' | 'speaking' | 'listening' | 'error' | 'disconnected'
  >('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [textInput, setTextInput] = useState('');

  // Audio, WebSocket, and Speech Recognition refs
  const wsRef = useRef<WebSocket | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const isMutedRef = useRef(false);
  isMutedRef.current = isMuted;
  const isSpeakerMutedRef = useRef(false);
  isSpeakerMutedRef.current = isSpeakerMuted;

  // Safe calculated financial metrics
  const currency = activeProfile?.displayCurrency || 'GHS';
  const profileName = activeProfile?.name || 'Personal';
  const netBalance =
    summary?.netBalance ??
    transactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
  const totalIncome =
    summary?.totalIncome ??
    transactions.filter((t) => t.type === 'income').reduce((a, b) => a + b.amount, 0);
  const totalExpense =
    summary?.totalExpense ??
    transactions.filter((t) => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const monthIncome = summary?.monthIncome ?? totalIncome;
  const monthExpense = summary?.monthExpense ?? totalExpense;
  const totalSavedInGoals =
    summary?.totalSavedInGoals ?? goals.reduce((acc, g) => acc + (g.current || 0), 0);
  const totalIOwe =
    summary?.totalIOwe ??
    debts
      .filter((d) => d.direction === 'i_owe')
      .reduce((acc, d) => acc + Math.max(0, d.amount - (d.paid || 0)), 0);

  // Cleanup all audio and socket resources
  const stopLiveSession = () => {
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'close' }));
        }
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current = null;
    }

    activeSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {}
    });
    activeSourcesRef.current = [];
    nextStartTimeRef.current = 0;

    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== 'closed') {
      try {
        inputAudioCtxRef.current.close();
      } catch {}
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current && outputAudioCtxRef.current.state !== 'closed') {
      try {
        outputAudioCtxRef.current.close();
      } catch {}
      outputAudioCtxRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }

    setStatus('disconnected');
    setAudioLevel(0);
  };

  const startLiveSession = async () => {
    setStatus('connecting');
    setErrorMessage(null);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus('error');
      setErrorMessage(
        'Fima Voice requires an active internet connection to stream live dialogue. Your core ledgers, balances, and reports remain fully accessible offline.'
      );
      return;
    }

    try {
      // 1. Request microphone access
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        mediaStreamRef.current = stream;
      } catch (micErr: any) {
        console.warn('Microphone permission denied or unavailable:', micErr);
        // User can still text with Fima in this session!
      }

      // 2. Setup client-side speech recognition for real-time transcription if supported
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          const recognition = new SpeechRecognitionClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                const speechText = event.results[i][0].transcript.trim();
                if (speechText) {
                  setTranscripts((prev) => [
                    ...prev,
                    {
                      id: Math.random().toString(36).substring(2, 9),
                      speaker: 'user',
                      text: speechText,
                      timestamp: new Date().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    },
                  ]);
                }
              }
            }
          };

          recognition.onerror = () => {};
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (srErr) {
          console.warn('Speech recognition not available:', srErr);
        }
      }

      // 3. Setup 16kHz input audio context if mic available
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (stream) {
        const inputAudioCtx = new AudioContextClass({ sampleRate: 16000 });
        inputAudioCtxRef.current = inputAudioCtx;
      }

      // 3. Setup 24kHz output audio context for model voice audio
      const outputAudioCtx = new AudioContextClass({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputAudioCtx;

      // 4. Establish WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socketUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(socketUrl);
      wsRef.current = ws;

      // Compile rich profile & user ledger summary for Fima
      const budgetsText =
        budgets.length > 0
          ? budgets.map((b) => `${b.category} limit ${currency} ${b.limit}`).join(', ')
          : 'None';
      const goalsText =
        goals.length > 0
          ? goals.map((g) => `${g.name} target ${currency} ${g.target}`).join(', ')
          : 'None';
      const debtsText =
        debts.length > 0
          ? debts.map((d) => `${d.person}: ${currency} ${d.amount}`).join(', ')
          : 'None';
      const recentTxText =
        transactions.length > 0
          ? transactions
              .slice(0, 5)
              .map((t) => `${t.type} ${currency} ${t.amount} (${t.category})`)
              .join(', ')
          : 'None';

      const userLedgerContext = `User: ${user?.username || 'User'}. Profile: ${profileName} (${currency}). Net Balance: ${currency} ${netBalance.toLocaleString()}. Month Income: ${currency} ${monthIncome.toLocaleString()}. Month Expenses: ${currency} ${monthExpense.toLocaleString()}. Budgets: ${budgetsText}. Goals: ${goalsText}. Debts: ${debtsText}. Recent transactions: ${recentTxText}.`;

      ws.onopen = () => {
        setStatus('listening');

        // Send full ledger context initialization
        ws.send(
          JSON.stringify({
            type: 'init_context',
            context: userLedgerContext,
          })
        );

        // Send initial greeting prompt
        ws.send(
          JSON.stringify({
            type: 'text',
            text: `[SYSTEM: The user just connected to Fima Voice. Profile: ${profileName} (${currency}). Net Balance: ${currency} ${netBalance.toLocaleString()}. Greet them warmly as Fima in 1 natural sentence.]`,
          })
        );
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'ready') {
            setStatus('listening');
          } else if (data.type === 'interrupted') {
            // Cancel current playback
            activeSourcesRef.current.forEach((src) => {
              try {
                src.stop();
              } catch {}
            });
            activeSourcesRef.current = [];
            if (outputAudioCtxRef.current) {
              nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
            }
            setStatus('listening');
          } else if (data.type === 'audio' && data.audio) {
            if (isSpeakerMutedRef.current) return;

            setStatus('speaking');
            const floatSamples = base64ToFloat32Array(data.audio);
            const outCtx = outputAudioCtxRef.current;
            if (!outCtx) return;

            if (outCtx.state === 'suspended') {
              await outCtx.resume();
            }

            const audioBuffer = outCtx.createBuffer(1, floatSamples.length, 24000);
            audioBuffer.copyToChannel(floatSamples, 0, 0);

            const source = outCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outCtx.destination);

            const now = outCtx.currentTime;
            const startTime = Math.max(now, nextStartTimeRef.current);
            source.start(startTime);
            nextStartTimeRef.current = startTime + audioBuffer.duration;

            activeSourcesRef.current.push(source);
            source.onended = () => {
              activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
              if (activeSourcesRef.current.length === 0) {
                setStatus('listening');
              }
            };
          } else if (data.type === 'user_text' && data.text) {
            setTranscripts((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.speaker === 'user') {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: (last.text + ' ' + data.text).trim() },
                ];
              }
              return [
                ...prev,
                {
                  id: Math.random().toString(36).substring(2, 9),
                  speaker: 'user',
                  text: data.text.trim(),
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ];
            });
          } else if (data.type === 'text' && data.text) {
            setTranscripts((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.speaker === 'fima') {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: (last.text + ' ' + data.text).trim() },
                ];
              }
              return [
                ...prev,
                {
                  id: Math.random().toString(36).substring(2, 9),
                  speaker: 'fima',
                  text: data.text,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ];
            });
          } else if (data.type === 'error') {
            const rawErr = String(data.error || '');
            if (rawErr.includes('429') || rawErr.toLowerCase().includes('rate limit') || rawErr.toLowerCase().includes('quota')) {
              setErrorMessage('AI Quota Limit Reached (40 messages / 8 hours). Please wait for your allocation window to reset before reconnecting to voice dialogue.');
            } else {
              setErrorMessage(data.error);
            }
            setStatus('error');
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      ws.onerror = () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setErrorMessage(
            'Connection lost. Fima Voice requires an active internet connection to stream live audio. Please reconnect and retry.'
          );
        } else {
          setErrorMessage('Voice connection encountered an error. Please retry in a few moments.');
        }
        setStatus('error');
      };

      ws.onclose = () => {
        setStatus('disconnected');
      };

      // 5. Setup microphone capture & stream to WebSocket if mic was granted
      if (stream && inputAudioCtxRef.current) {
        const inCtx = inputAudioCtxRef.current;
        if (inCtx.state === 'suspended') {
          await inCtx.resume();
        }

        const source = inCtx.createMediaStreamSource(stream);
        const processor = inCtx.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (isMutedRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            return;
          }

          const inputData = e.inputBuffer.getChannelData(0);

          // Calculate visualizer energy
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          setAudioLevel(Math.min(100, Math.round(rms * 400)));

          // Send PCM audio chunk
          const base64Audio = float32ToLinear16Base64(inputData);
          wsRef.current.send(
            JSON.stringify({
              type: 'audio',
              audio: base64Audio,
            })
          );
        };

        source.connect(processor);
        processor.connect(inCtx.destination);
      }
    } catch (err: any) {
      console.error('Live voice session init failed:', err);
      setErrorMessage(err.message || 'Failed to start microphone or audio interface');
      setStatus('error');
    }
  };

  const handleSendTextMessage = (overrideText?: string) => {
    const text = (overrideText ?? textInput).trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Record user text in transcript
    setTranscripts((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        speaker: 'user',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    // Send text to live session
    wsRef.current.send(
      JSON.stringify({
        type: 'text',
        text,
      })
    );

    setTextInput('');
    setShowTranscript(true);
  };

  const handleEditPrompt = (id: string, newText: string) => {
    // 1. Update the prompt in the transcript
    setTranscripts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, text: newText } : t))
    );
    // 2. Send the edited prompt to Fima session
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'text',
          text: newText,
        })
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      startLiveSession();
    } else {
      stopLiveSession();
    }
    return () => {
      stopLiveSession();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const latestFimaPhrase = transcripts.filter((t) => t.speaker === 'fima').slice(-1)[0]?.text;
  const latestUserPhrase = transcripts.filter((t) => t.speaker === 'user').slice(-1)[0]?.text;
  const currentSubtitle =
    status === 'speaking'
      ? latestFimaPhrase
      : status === 'listening' && latestUserPhrase
      ? latestUserPhrase
      : null;

  return (
    <div className="fixed inset-0 z-50 w-full h-[100dvh] max-h-[100dvh] bg-[#07090E] text-white flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-300">
      {/* Siri iOS 18 / Apple Intelligence Perimeter Flow Glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700 z-10"
        style={{
          boxShadow:
            status === 'speaking'
              ? 'inset 0 0 90px rgba(16, 185, 129, 0.35), inset 0 0 160px rgba(6, 182, 212, 0.2)'
              : status === 'listening' && audioLevel > 5
              ? 'inset 0 0 90px rgba(56, 189, 248, 0.35), inset 0 0 160px rgba(168, 85, 247, 0.2)'
              : 'inset 0 0 40px rgba(255, 255, 255, 0.04)',
          opacity: status === 'speaking' || (status === 'listening' && audioLevel > 5) ? 1 : 0.4,
        }}
      />

      {/* Ambient background glow effect */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700 opacity-70"
        style={{
          background:
            status === 'speaking'
              ? 'radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.15) 40%, rgba(7, 9, 14, 0) 70%)'
              : status === 'listening' && audioLevel > 5
              ? 'radial-gradient(circle at 50% 45%, rgba(56, 189, 248, 0.22) 0%, rgba(147, 51, 234, 0.12) 40%, rgba(7, 9, 14, 0) 70%)'
              : 'radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.04) 0%, rgba(7, 9, 14, 0) 65%)',
        }}
      />

      {/* Top Floating Bar: Responsive & Clean */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-3 sm:py-5 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-emerald-400 shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-display font-bold text-sm tracking-wide text-white">
                Voice Fima
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[11px] text-white/50 font-mono-num">
              {profileName} • {currency}
            </div>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Transcript Sidebar Toggle */}
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all backdrop-blur-xl border ${
              showTranscript
                ? 'bg-white text-[#0A0D12] border-white shadow-md font-semibold'
                : 'bg-white/10 hover:bg-white/15 text-white/80 border-white/10'
            }`}
            title={showTranscript ? 'Close transcript sidebar' : 'Open live transcript sidebar'}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Transcript</span>
            {transcripts.length > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  showTranscript
                    ? 'bg-[#0A0D12] text-white'
                    : 'bg-emerald-500 text-white animate-pulse'
                }`}
              >
                {transcripts.length}
              </span>
            )}
          </button>

          {/* Close Voice Session */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all backdrop-blur-xl border border-white/10 active:scale-95"
            title="Exit voice session"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Central Spatial Stage: Siri Spatial Sound Entity */}
      <main className={`relative z-20 flex-1 min-h-0 flex flex-col items-center justify-center px-4 text-center py-2 ${
        showTranscript ? 'overflow-hidden pointer-events-none' : 'overflow-y-auto'
      }`}>
        {/* Living Spatial Voice Orb */}
        <div className="my-auto py-2 sm:py-3">
          <SpatialVoiceOrb
            status={status}
            isMuted={isMuted}
            audioLevel={audioLevel}
            onOrbClick={() => setIsMuted(!isMuted)}
          />
        </div>

        {/* State Label */}
        <div className="mt-3 sm:mt-5 text-xs font-mono font-medium tracking-wide">
          {status === 'connecting' && (
            <span className="text-amber-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Connecting to Fima AI...</span>
            </span>
          )}
          {status === 'speaking' && (
            <span className="text-emerald-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Fima is speaking • Tap orb to mute</span>
            </span>
          )}
          {status === 'listening' && (
            <span className="text-white/80 flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${isMuted ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`} />
              <span>{isMuted ? 'Microphone muted • Tap orb to unmute' : 'Listening... speak naturally'}</span>
            </span>
          )}
          {status === 'disconnected' && (
            <span className="text-white/40">Voice session ended</span>
          )}
          {status === 'error' && (
            <span className="text-rose-400">{errorMessage || 'Connection paused'}</span>
          )}
        </div>

        {/* Live Spoken Subtitle (Siri / Assistant Style) */}
        <div className="mt-2 sm:mt-3 min-h-[36px] max-w-xl mx-auto px-4 flex items-center justify-center">
          {currentSubtitle ? (
            <p className="text-sm sm:text-base text-white/90 font-light leading-relaxed animate-in fade-in duration-200 line-clamp-2 italic drop-shadow-sm">
              "{currentSubtitle}"
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-1.5">
              {[
                'Audit my monthly spending',
                'What is my net balance?',
                'Review my savings vaults',
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTextInput(suggestion);
                    handleSendTextMessage(suggestion);
                  }}
                  className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10 transition-all backdrop-blur-md active:scale-95 shadow-xs"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Dedicated Opaque Transcript Sidebar & Backdrop */}
      <VoiceTranscriptSidebar
        isOpen={showTranscript}
        onClose={() => setShowTranscript(false)}
        transcripts={transcripts}
        onClearTranscripts={() => setTranscripts([])}
        status={status}
        onSendMessage={(text) => handleSendTextMessage(text)}
        onEditPrompt={handleEditPrompt}
      />

      {/* Siri Capsule Dock: Pinned and 100% Guaranteed Visible */}
      <footer className="relative z-30 shrink-0 w-full max-w-xl mx-auto px-3 sm:px-4 pb-3 sm:pb-6 pt-1 flex flex-col items-center">
        {/* Reconnect Prompt if Disconnected */}
        {status === 'disconnected' && (
          <button
            onClick={startLiveSession}
            className="mb-2.5 px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tap to Reconnect Fima</span>
          </button>
        )}

        {/* Siri Frosted Glass Dock */}
        <div className="w-full flex items-center bg-white/[0.08] hover:bg-white/[0.12] focus-within:bg-white/[0.14] border border-white/15 rounded-full p-1.5 sm:p-2 backdrop-blur-3xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] transition-all">
          {/* Left: Siri Voice Mic Toggle Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full shrink-0 flex items-center justify-center transition-all active:scale-95 shadow-md ${
              isMuted
                ? 'bg-rose-500/30 border border-rose-500 text-rose-300 ring-2 ring-rose-500/20'
                : status === 'speaking'
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white animate-pulse shadow-emerald-500/40'
                : status === 'listening'
                ? 'bg-white/15 hover:bg-white/20 text-emerald-400 border border-emerald-400/40 shadow-cyan-500/20'
                : 'bg-white/10 hover:bg-white/20 text-white/80 border border-white/10'
            }`}
            title={isMuted ? 'Microphone muted • Click to speak' : 'Microphone active • Click to mute'}
          >
            {isMuted ? (
              <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-rose-300" />
            ) : status === 'speaking' ? (
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            ) : (
              <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            )}
          </button>

          {/* Center: "Type to Siri" Input Field */}
          <div className="flex-1 px-3 min-w-0">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendTextMessage();
                }
              }}
              placeholder="Type to Fima..."
              className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-white/40 outline-hidden font-normal tracking-wide"
            />
          </div>

          {/* Right Controls: Send / WhatsApp Transcript / Dismiss */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0 pr-1">
            {/* Send Button (if user typed text) */}
            {textInput.trim() ? (
              <button
                onClick={() => handleSendTextMessage()}
                disabled={status === 'disconnected'}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-[#0A0D12] hover:scale-105 active:scale-95 flex items-center justify-center transition-all shadow-md cursor-pointer"
                title="Send text prompt"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            ) : null}

            {/* Transcript Sidebar Button */}
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                showTranscript
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10'
              }`}
              title={showTranscript ? 'Close transcript sidebar' : 'Open live transcript sidebar'}
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {transcripts.length > 0 && !showTranscript && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#0A0D12] animate-pulse" />
              )}
            </button>

            {/* Dismiss / Close Assistant (like swiping away Siri) */}
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-95 border border-white/10 cursor-pointer"
              title="Close Fima Assistant"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
