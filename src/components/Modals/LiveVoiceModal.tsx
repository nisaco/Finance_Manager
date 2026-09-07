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
            setErrorMessage(data.error);
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

  const handleSendTextMessage = () => {
    const text = textInput.trim();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#111317]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1A1D24] border border-[#E8E5DF] dark:border-[#2D323F] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header: Clean, Elegant Fima Branding */}
        <div className="px-5 py-4 border-b border-[#E8E5DF] dark:border-[#2D323F] flex items-center justify-between bg-[#FDFCFB] dark:bg-[#14161B]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] text-white dark:bg-[#F3F4F6] dark:text-[#111317] flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-display font-bold text-sm text-[#1A1A1A] dark:text-[#F3F4F6]">
                  Fima Voice &amp; Live Assistant
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                Active: <span className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">{profileName}</span> ({currency})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#6B7280] hover:text-[#1A1A1A] dark:text-[#9CA3AF] dark:hover:text-[#F3F4F6] rounded-xl hover:bg-[#F7F5F2] dark:hover:bg-[#22252E] transition-colors"
            title="Close conversation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Central Audio Stage & Orb Visualizer */}
        <div className="p-6 flex flex-col items-center justify-center text-center space-y-5 bg-gradient-to-b from-[#FDFCFB] via-[#FAF9F6] to-[#F7F5F2] dark:from-[#14161B] dark:via-[#171920] dark:to-[#1A1D24]">
          {/* Status Capsule */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full border border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#22252E] text-xs font-mono font-medium shadow-2xs">
            {status === 'connecting' && (
              <span className="flex items-center text-amber-600 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping mr-2" />
                Connecting to Fima...
              </span>
            )}
            {status === 'speaking' && (
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
                Fima is speaking...
              </span>
            )}
            {status === 'listening' && (
              <span className="flex items-center text-[#1A1A1A] dark:text-[#F3F4F6]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                Listening to you...
              </span>
            )}
            {status === 'error' && (
              <span className="flex items-center text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                Connection Note
              </span>
            )}
            {status === 'disconnected' && (
              <span className="flex items-center text-[#6B7280]">Session Paused</span>
            )}
          </div>

          {/* Luxury Fluid Wave Orb Visualizer */}
          <div className="relative flex items-center justify-center w-36 h-36">
            {/* Outer pulsating wave ring */}
            <div
              className={`absolute inset-0 rounded-full transition-all duration-300 ${
                status === 'speaking'
                  ? 'bg-emerald-500/20 dark:bg-emerald-500/30 scale-125 blur-sm animate-pulse'
                  : status === 'listening' && audioLevel > 5
                  ? 'bg-emerald-500/15 scale-110'
                  : 'bg-black/5 dark:bg-white/5 scale-95'
              }`}
            />
            <div
              className={`absolute inset-3 rounded-full transition-all duration-300 ${
                status === 'speaking'
                  ? 'bg-teal-500/30 dark:bg-teal-400/20 animate-ping'
                  : status === 'listening' && audioLevel > 10
                  ? 'bg-emerald-500/20'
                  : 'bg-transparent'
              }`}
            />

            {/* Core Orb Button */}
            <div
              className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-lg transition-transform ${
                status === 'speaking'
                  ? 'bg-emerald-600 text-white scale-105 shadow-emerald-500/30'
                  : status === 'listening'
                  ? 'bg-[#1A1A1A] dark:bg-[#F3F4F6] text-white dark:text-[#111317]'
                  : 'bg-[#6B7280] text-white'
              }`}
            >
              {status === 'speaking' ? (
                <Volume2 className="w-8 h-8 animate-bounce" />
              ) : isMuted ? (
                <MicOff className="w-8 h-8 text-rose-400" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </div>
          </div>

          {/* Audio Waves Frequency Visualizer */}
          <div className="flex items-center space-x-1 h-7">
            {[...Array(14)].map((_, i) => {
              const height =
                status === 'speaking'
                  ? Math.sin(Date.now() / 180 + i) * 12 + 14
                  : status === 'listening' && !isMuted
                  ? Math.max(4, Math.min(26, (audioLevel / 100) * (18 + (i % 4) * 4)))
                  : 4;

              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    status === 'speaking'
                      ? 'bg-emerald-500'
                      : status === 'listening' && !isMuted && audioLevel > 5
                      ? 'bg-[#1A1A1A] dark:bg-[#F3F4F6]'
                      : 'bg-[#E8E5DF] dark:bg-[#2D323F]'
                  }`}
                  style={{ height: `${height}px` }}
                />
              );
            })}
          </div>

          {/* Guidance / Suggestion */}
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] max-w-sm leading-relaxed">
            {status === 'listening' ? (
              <span>
                Speak naturally or type below: <span className="italic text-[#1A1A1A] dark:text-[#F3F4F6] font-medium">"What is my net balance?"</span>, <span className="italic text-[#1A1A1A] dark:text-[#F3F4F6] font-medium">"Audit my budgets"</span>, or ask anything.
              </span>
            ) : status === 'speaking' ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                Fima is speaking. Speak or type anytime to interrupt.
              </span>
            ) : (
              <span>Ready with your live ledger context.</span>
            )}
          </p>

          {errorMessage && (
            <div className="w-full p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs text-left flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Connection status</span>
                <span>{errorMessage}</span>
                <button
                  onClick={startLiveSession}
                  className="mt-2 block px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700 transition-colors"
                >
                  Reconnect
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Spoken & Typed Transcript Stream */}
        <div className="border-t border-[#E8E5DF] dark:border-[#2D323F] p-3.5 bg-white dark:bg-[#1A1D24] flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F3F4F6] flex items-center space-x-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Live Transcription</span>
              </span>
              {transcripts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono-num font-bold">
                  {transcripts.length}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5">
              {transcripts.length > 0 && (
                <>
                  <button
                    onClick={handleCopyTranscript}
                    className="px-2 py-1 rounded-lg hover:bg-[#F7F5F2] dark:hover:bg-[#22252E] text-[11px] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] flex items-center space-x-1 transition-colors"
                    title="Copy transcript"
                  >
                    {copiedTranscript ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedTranscript ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => setTranscripts([])}
                    className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[#6B7280] dark:text-[#9CA3AF] hover:text-rose-600 transition-colors"
                    title="Clear transcript"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {/* Prominent Show / Hide Toggle Button */}
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs ${
                  showTranscript
                    ? 'bg-[#1A1A1A] text-white dark:bg-[#F3F4F6] dark:text-[#111317]'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}
                title={showTranscript ? 'Hide live transcription' : 'Show live transcription'}
              >
                {showTranscript ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Show Transcription</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {showTranscript ? (
            <div
              ref={transcriptContainerRef}
              className="overflow-y-auto max-h-48 sm:max-h-56 min-h-[140px] space-y-2.5 pr-1 text-xs scrollbar-thin transition-all"
            >
              {transcripts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-[#9CA3AF] space-y-2">
                  <div className="w-8 h-8 rounded-full bg-[#F7F5F2] dark:bg-[#22252E] flex items-center justify-center">
                    <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    Speak into your microphone or type below.
                  </p>
                  <span className="text-[10px] text-[#9CA3AF]">
                    Live transcriptions and Fima's spoken answers will stream here clearly.
                  </span>
                </div>
              ) : (
                transcripts.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border leading-relaxed shadow-2xs transition-all ${
                      t.speaker === 'user'
                        ? 'bg-[#F7F5F2] dark:bg-[#22252E] text-[#1A1A1A] dark:text-[#F3F4F6] border-[#E8E5DF] dark:border-[#2D323F] ml-3'
                        : 'bg-emerald-50/80 dark:bg-[#1C2522] text-[#1A1A1A] dark:text-[#F3F4F6] border-emerald-200 dark:border-emerald-800/80 mr-3'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] text-[#6B7280] dark:text-[#9CA3AF] mb-1.5 font-mono-num">
                      <span className="font-bold flex items-center space-x-1.5">
                        {t.speaker === 'fima' ? (
                          <>
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px]">
                              <Sparkles className="w-2.5 h-2.5" />
                            </span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              Fima
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="w-4 h-4 rounded-full bg-slate-600 text-white flex items-center justify-center text-[9px]">
                              <User className="w-2.5 h-2.5" />
                            </span>
                            <span className="text-[#4B5563] dark:text-[#9CA3AF] font-semibold">
                              You
                            </span>
                          </>
                        )}
                      </span>
                      <span>{t.timestamp}</span>
                    </div>
                    <p className="text-xs font-normal whitespace-pre-wrap leading-relaxed">
                      {t.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="p-3 my-auto rounded-xl bg-[#F7F5F2] dark:bg-[#22252E] border border-[#E8E5DF] dark:border-[#2D323F] flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-[#6B7280] dark:text-[#9CA3AF]">
                <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse shrink-0" />
                <span>Transcription is hidden • Audio and voice are active</span>
              </div>
              <button
                onClick={() => setShowTranscript(true)}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors shadow-2xs shrink-0"
              >
                Show Transcript
              </button>
            </div>
          )}
        </div>

        {/* Text Input Row: Text with Fima seamlessly */}
        <div className="px-3.5 py-2.5 bg-[#FDFCFB] dark:bg-[#14161B] border-t border-[#E8E5DF] dark:border-[#2D323F] flex items-center space-x-2">
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
            placeholder="Type to Fima or speak aloud..."
            className="flex-1 bg-white dark:bg-[#22252E] border border-[#E8E5DF] dark:border-[#2D323F] focus:border-[#1A1A1A] dark:focus:border-[#F3F4F6] text-xs px-3 py-2 rounded-xl text-[#1A1A1A] dark:text-[#F3F4F6] placeholder-[#9CA3AF] outline-none transition-all"
          />
          <button
            onClick={handleSendTextMessage}
            disabled={!textInput.trim() || status === 'disconnected'}
            className="p-2 bg-[#1A1A1A] hover:bg-[#333333] text-white dark:bg-[#F3F4F6] dark:hover:bg-[#E5E7EB] dark:text-[#111317] rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            title="Send text message to Fima"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Footer Voice & Call Controls */}
        <div className="px-4 py-3 border-t border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#1A1D24] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Mic Mute Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-xl border transition-all ${
                isMuted
                  ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                  : 'bg-[#F7F5F2] text-[#1A1A1A] border-[#E8E5DF] dark:bg-[#22252E] dark:text-[#F3F4F6] dark:border-[#2D323F] hover:bg-[#E8E5DF]'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Speaker Mute Toggle */}
            <button
              onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
              className={`p-2 rounded-xl border transition-all ${
                isSpeakerMuted
                  ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                  : 'bg-[#F7F5F2] text-[#1A1A1A] border-[#E8E5DF] dark:bg-[#22252E] dark:text-[#F3F4F6] dark:border-[#2D323F] hover:bg-[#E8E5DF]'
              }`}
              title={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
            >
              {isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {status === 'disconnected' ? (
              <button
                onClick={startLiveSession}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-2xs"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Reconnect</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-2xs"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>End Call</span>
              </button>
            )}
          </div>
        </div>

        {/* Faint, minimal attribution at the very bottom */}
        <div className="py-1.5 bg-[#FAF9F6] dark:bg-[#14161B] text-center border-t border-[#E8E5DF]/50 dark:border-[#2D323F]/50">
          <span className="text-[10px] text-[#9CA3AF]/60 dark:text-[#6B7280]/60 tracking-wider">
            Fima • Finance Manager AI • powered by gemini
          </span>
        </div>
      </div>
    </div>
  );
};
