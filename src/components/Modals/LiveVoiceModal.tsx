import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Radio,
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

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TranscriptItem {
  id: string;
  speaker: 'fima' | 'user';
  text: string;
  timestamp: string;
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
  const [showTranscript, setShowTranscript] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [copiedTranscript, setCopiedTranscript] = useState(false);

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
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll transcripts
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [transcripts]);

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

      const userLedgerContext = `User: ${user?.name || user?.username || 'User'}. Profile: ${profileName} (${currency}). Net Balance: ${currency} ${netBalance.toLocaleString()}. Month Income: ${currency} ${monthIncome.toLocaleString()}. Month Expenses: ${currency} ${monthExpense.toLocaleString()}. Budgets: ${budgetsText}. Goals: ${goalsText}. Debts: ${debtsText}. Recent transactions: ${recentTxText}.`;

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
        setErrorMessage('Voice connection encountered an error.');
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
  };

  const handleCopyTranscript = () => {
    const full = transcripts
      .map((t) => `[${t.timestamp}] ${t.speaker === 'fima' ? 'Fima' : 'You'}: ${t.text}`)
      .join('\n');
    navigator.clipboard.writeText(full);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
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
    <div className="fixed inset-0 z-50 bg-[#0A0D12] text-white flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-300">
      {/* Ambient background glow effect */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700 opacity-60"
        style={{
          background:
            status === 'speaking'
              ? 'radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.22) 0%, rgba(10, 13, 18, 0) 65%)'
              : status === 'listening' && audioLevel > 5
              ? 'radial-gradient(circle at 50% 45%, rgba(59, 130, 246, 0.18) 0%, rgba(10, 13, 18, 0) 65%)'
              : 'radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.05) 0%, rgba(10, 13, 18, 0) 65%)',
        }}
      />

      {/* Top Floating Bar: Minimalist & Borderless */}
      <header className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-5 sm:py-6">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-400">
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
          {/* Transcript Drawer Toggle */}
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all backdrop-blur-md ${
              showTranscript
                ? 'bg-white text-[#0A0D12]'
                : 'bg-white/10 hover:bg-white/15 text-white/80'
            }`}
            title="Toggle full transcript"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Transcript</span>
            {transcripts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                {transcripts.length}
              </span>
            )}
          </button>

          {/* Close Voice Session */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors backdrop-blur-md"
            title="Exit voice session"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Central Audio Stage & ChatGPT-Style Living Sound Orb */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Dynamic Fluid Sound Orb */}
        <div className="relative flex items-center justify-center w-64 h-64 sm:w-80 sm:h-80 my-auto">
          {/* Outer Ambient Ripple 1 */}
          <div
            className={`absolute rounded-full transition-all duration-500 ease-out ${
              status === 'speaking'
                ? 'w-72 h-72 sm:w-96 sm:h-96 bg-emerald-500/20 blur-xl animate-pulse scale-110'
                : status === 'listening' && audioLevel > 5
                ? 'w-64 h-64 sm:w-80 sm:h-80 bg-cyan-500/15 blur-lg scale-105'
                : 'w-48 h-48 sm:w-60 sm:h-60 bg-white/5 blur-md'
            }`}
          />

          {/* Outer Ambient Ripple 2 */}
          <div
            className={`absolute rounded-full transition-all duration-300 ease-out ${
              status === 'speaking'
                ? 'w-56 h-56 sm:w-72 sm:h-72 bg-teal-400/25 blur-md scale-105'
                : status === 'listening' && audioLevel > 12
                ? 'w-52 h-52 sm:w-64 sm:h-64 bg-emerald-500/20 blur-sm scale-102'
                : 'w-40 h-40 sm:w-48 sm:h-48 bg-transparent'
            }`}
          />

          {/* Core ChatGPT-Style Spherical Orb */}
          <div
            className={`relative z-10 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl ${
              status === 'speaking'
                ? 'w-36 h-36 sm:w-44 sm:h-44 bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 text-white scale-105 shadow-emerald-500/40 ring-4 ring-emerald-400/30'
                : isMuted
                ? 'w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-tr from-rose-900 to-rose-700 text-white shadow-rose-900/30 ring-2 ring-rose-500/30'
                : status === 'listening'
                ? 'w-36 h-36 sm:w-44 sm:h-44 bg-gradient-to-tr from-[#1E232F] via-[#2A3142] to-[#394258] text-white shadow-cyan-900/20 ring-2 ring-white/20 scale-100'
                : 'w-32 h-32 sm:w-40 sm:h-40 bg-[#1A1D24] text-white/60 ring-1 ring-white/10'
            }`}
            style={{
              transform:
                status === 'listening' && !isMuted && audioLevel > 5
                  ? `scale(${1 + Math.min(0.2, audioLevel / 250)})`
                  : undefined,
            }}
          >
            {status === 'speaking' ? (
              <Volume2 className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse" />
            ) : isMuted ? (
              <MicOff className="w-10 h-10 sm:w-12 sm:h-12 text-rose-300" />
            ) : status === 'connecting' ? (
              <Radio className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-amber-400" />
            ) : (
              <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-white/90" />
            )}
          </div>
        </div>

        {/* Live Visualizer Waves */}
        <div className="flex items-center justify-center space-x-1.5 h-8 my-2">
          {[...Array(16)].map((_, i) => {
            const barHeight =
              status === 'speaking'
                ? Math.sin(Date.now() / 150 + i * 0.5) * 12 + 16
                : status === 'listening' && !isMuted
                ? Math.max(4, Math.min(28, (audioLevel / 100) * (14 + (i % 4) * 4)))
                : 4;

            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-75 ${
                  status === 'speaking'
                    ? 'bg-emerald-400'
                    : status === 'listening' && !isMuted && audioLevel > 5
                    ? 'bg-white'
                    : 'bg-white/15'
                }`}
                style={{ height: `${barHeight}px` }}
              />
            );
          })}
        </div>

        {/* State Label */}
        <div className="mt-2 text-xs font-mono font-medium tracking-wide">
          {status === 'connecting' && (
            <span className="text-amber-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Connecting to Fima AI...</span>
            </span>
          )}
          {status === 'speaking' && (
            <span className="text-emerald-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Fima is speaking</span>
            </span>
          )}
          {status === 'listening' && (
            <span className="text-white/80 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{isMuted ? 'Microphone muted' : 'Listening... speak naturally'}</span>
            </span>
          )}
          {status === 'disconnected' && (
            <span className="text-white/40">Voice session ended</span>
          )}
          {status === 'error' && (
            <span className="text-rose-400">{errorMessage || 'Connection paused'}</span>
          )}
        </div>

        {/* Live Spoken Subtitle (ChatGPT-Style) */}
        <div className="mt-4 min-h-[44px] max-w-xl mx-auto px-4 flex items-center justify-center">
          {currentSubtitle ? (
            <p className="text-sm sm:text-base text-white/90 font-light leading-relaxed animate-in fade-in duration-200 line-clamp-2 italic">
              "{currentSubtitle}"
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-2">
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
                  className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs border border-white/10 transition-colors backdrop-blur-xs"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Slide-Up Full Transcript Sheet (When Toggled) */}
      {showTranscript && (
        <div className="relative z-30 w-full max-w-2xl mx-auto px-4 mb-3 animate-in slide-in-from-bottom duration-200">
          <div className="bg-[#141820]/95 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl max-h-56 sm:max-h-64 flex flex-col">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10 text-xs">
              <div className="flex items-center space-x-2 font-bold text-white/90">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Conversation Transcript</span>
              </div>
              <div className="flex items-center space-x-2">
                {transcripts.length > 0 && (
                  <>
                    <button
                      onClick={handleCopyTranscript}
                      className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/70 text-[11px] flex items-center space-x-1"
                    >
                      {copiedTranscript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedTranscript ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={() => setTranscripts([])}
                      className="p-1 rounded-md bg-white/5 hover:bg-rose-950/40 text-white/50 hover:text-rose-400"
                      title="Clear transcript"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowTranscript(false)}
                  className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-white/70"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div
              ref={transcriptContainerRef}
              className="overflow-y-auto flex-1 mt-2 space-y-2 pr-1 text-xs scrollbar-thin"
            >
              {transcripts.length === 0 ? (
                <div className="py-6 text-center text-white/40">
                  No speech recorded yet. Speak or type below.
                </div>
              ) : (
                transcripts.map((t) => (
                  <div
                    key={t.id}
                    className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                      t.speaker === 'user'
                        ? 'bg-white/10 text-white/90 ml-4'
                        : 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-200 mr-4'
                    }`}
                  >
                    <div className="flex justify-between text-[10px] text-white/40 mb-1 font-mono-num">
                      <span className="font-bold text-white/70">
                        {t.speaker === 'fima' ? 'Fima' : 'You'}
                      </span>
                      <span>{t.timestamp}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{t.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Control Bar: Borderless & Circular (ChatGPT Voice Style) */}
      <footer className="relative z-20 pb-8 sm:pb-10 pt-2 flex flex-col items-center space-y-4">
        {/* Sleek Optional Text Input Pill */}
        <div className="w-full max-w-md px-4">
          <div className="flex items-center bg-white/10 hover:bg-white/15 focus-within:bg-white/15 border border-white/10 rounded-full px-3.5 py-1.5 backdrop-blur-md transition-all">
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
              placeholder="Type message to Fima..."
              className="flex-1 bg-transparent text-xs text-white placeholder-white/40 outline-hidden"
            />
            <button
              onClick={() => handleSendTextMessage()}
              disabled={!textInput.trim() || status === 'disconnected'}
              className="p-1.5 rounded-full bg-white text-[#0A0D12] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Circular Action Buttons */}
        <div className="flex items-center justify-center space-x-5 sm:space-x-8">
          {/* Mute Mic Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg backdrop-blur-md ${
              isMuted
                ? 'bg-rose-600/30 border border-rose-500 text-rose-300 ring-2 ring-rose-500/30'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? (
              <MicOff className="w-5 h-5 sm:w-6 sm:h-6 text-rose-300" />
            ) : (
              <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </button>

          {/* Transcript Panel Button */}
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg backdrop-blur-md ${
              showTranscript
                ? 'bg-white text-[#0A0D12]'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
            }`}
            title={showTranscript ? 'Hide transcript' : 'Show transcript'}
          >
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Speaker Mute Button */}
          <button
            onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg backdrop-blur-md ${
              isSpeakerMuted
                ? 'bg-amber-600/30 border border-amber-500 text-amber-300 ring-2 ring-amber-500/30'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
            }`}
            title={isSpeakerMuted ? 'Unmute audio output' : 'Mute audio output'}
          >
            {isSpeakerMuted ? (
              <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
            ) : (
              <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </button>

          {/* End Call Button */}
          {status === 'disconnected' ? (
            <button
              onClick={startLiveSession}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 active:scale-95 transition-all"
              title="Reconnect to Fima"
            >
              <Radio className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 active:scale-95 transition-all"
              title="End Voice Call"
            >
              <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
