import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Globe,
  Mic,
  ExternalLink,
  Search,
  AlertCircle,
  TrendingUp,
  Scale,
  PiggyBank,
  BrainCircuit,
  RefreshCw,
  Copy,
  Check,
  RotateCcw,
  Wallet,
  Volume2,
  VolumeX,
  X,
  ArrowRight,
  Paperclip,
  FileText,
  Pencil,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { AIMessageQuota } from '../types';
import { LiveVoiceModal } from '../components/Modals/LiveVoiceModal';
import { FormattedMessage } from '../components/FormattedMessage';

export interface AttachedFile {
  name: string;
  type: string;
  size?: number;
  data: string; // base64 data URL
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
  groundingSources?: { title?: string; uri?: string }[];
  searchQueries?: string[];
  attachments?: AttachedFile[];
}

const QUICK_PROMPTS = [
  {
    title: 'Audit Budgets vs Spending',
    prompt: 'Please review my current net balance, monthly income, expenses, and active budgets. Identify any overspending velocity and suggest practical adjustments.',
    icon: Scale,
    category: 'Budgeting',
  },
  {
    title: 'Debt Payoff Optimization',
    prompt: 'Evaluate my current debts and liabilities. Provide a clear comparison of the Debt Avalanche vs Debt Snowball methods tailored to my balances.',
    icon: TrendingUp,
    category: 'Debt Strategy',
  },
  {
    title: 'Real-Time FX & Market Data',
    prompt: 'Use Google Search to find current USD to GHS, EUR to USD exchange rates, and recent interest rate or inflation trends.',
    icon: Globe,
    enableSearch: true,
    category: 'Market Research',
  },
  {
    title: 'Savings Vault Trajectory',
    prompt: 'Analyze my savings goals and determine what monthly contribution velocity is required to reach my targets.',
    icon: PiggyBank,
    category: 'Wealth Building',
  },
  {
    title: 'Deep Strategic Assessment',
    prompt: 'Act as a Senior Wealth Strategist. Perform an end-to-end audit of my financial profile and deliver a 90-day actionable roadmap.',
    icon: BrainCircuit,
    category: 'Strategy',
  },
];

export const AIAdvisorPage: React.FC = () => {
  const {
    activeProfile,
    transactions,
    budgets,
    goals,
    debts,
    summary,
  } = useLedger();
  const { user } = useAuth();

  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-flash-lite');
  const [enableSearch, setEnableSearch] = useState<boolean>(false);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState<boolean>(false);
  const [includeFinancialContext] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when editing a prompt
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.setSelectionRange(
        editInputRef.current.value.length,
        editInputRef.current.value.length
      );
    }
  }, [editingId]);

  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [showLedgerSidebar, setShowLedgerSidebar] = useState<boolean>(false);
  const [quota, setQuota] = useState<AIMessageQuota | null>(null);

  // Lock body scroll when ledger sidebar is active
  useEffect(() => {
    if (showLedgerSidebar) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev === 'hidden' ? '' : prev;
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [showLedgerSidebar]);

  // File attachment state: max 2 files/pictures/documents per prompt
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeProfile?.id) {
      api.getAIQuota(activeProfile.id).then(setQuota).catch((err) => {
        console.warn('Could not load initial AI quota:', err);
      });
    } else {
      api.getAIQuota().then(setQuota).catch(() => {});
    }
  }, [activeProfile?.id]);

  // Safe calculated ledger metrics
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
  const savingsRate =
    summary?.savingsRate ??
    (monthIncome > 0
      ? Math.max(0, Math.round(((monthIncome - monthExpense) / monthIncome) * 100))
      : 0);
  const totalSavedInGoals =
    summary?.totalSavedInGoals ?? goals.reduce((acc, g) => acc + (g.current || 0), 0);
  const totalIOwe =
    summary?.totalIOwe ??
    debts
      .filter((d) => d.direction === 'i_owe')
      .reduce((acc, d) => acc + Math.max(0, d.amount - (d.paid || 0)), 0);

  const storageKey = `fima_chat_${user?.id || 'anon'}_${activeProfile?.id || 'default'}`;

  const getInitialGreeting = (pName: string, pCurr: string): Message => ({
    id: 'fima-welcome',
    role: 'model',
    content: `Hi, I'm Fima, your dedicated Finance Manager AI assistant.\n\nI have real-time access to your **${pName}** ledger (${pCurr}). I can audit your budget velocity, optimize debt payoffs, track goal trajectories, or assist with financial and economic research.\n\nHow can I help you today?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    modelUsed: 'Fima Intelligence',
  });

  // Load persisted chat memory
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [getInitialGreeting(profileName, currency)];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToLastUserPrompt = (msgList: Message[] = messages, behavior: ScrollBehavior = 'smooth') => {
    const lastUser = [...msgList].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      const el = document.getElementById(`message-${lastUser.id}`);
      if (el) {
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const containerRect = container.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const targetScrollTop = container.scrollTop + (elRect.top - containerRect.top) - 24;
          container.scrollTo({ top: Math.max(0, targetScrollTop), behavior });
        } else {
          el.scrollIntoView({ behavior, block: 'start' });
        }
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    const t1 = setTimeout(() => {
      scrollToLastUserPrompt(messages, 'auto');
    }, 60);

    const t2 = setTimeout(() => {
      const scrolled = scrollToLastUserPrompt(messages, 'smooth');
      if (!scrolled && messages.length <= 1) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }, 280);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      }
    } catch (err) {
      console.warn('Failed to save chat memory:', err);
    }
  }, [messages, storageKey]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setTimeout(() => {
            scrollToLastUserPrompt(parsed, 'smooth');
          }, 150);
          return;
        }
      }
    } catch {}
    setMessages([getInitialGreeting(profileName, currency)]);
  }, [activeProfile?.id]);

  const buildProfileContext = () => {
    if (!includeFinancialContext) return undefined;

    const budgetsSummary =
      budgets.length > 0
        ? budgets
            .map(
              (b) =>
                `${b.category}: Limit ${currency} ${b.limit.toLocaleString()} (Spent: ${currency} ${(
                  b.spent || 0
                ).toLocaleString()})`
            )
            .join('; ')
        : 'No active budgets configured';

    const goalsSummary =
      goals.length > 0
        ? goals
            .map(
              (g) =>
                `${g.name}: Target ${currency} ${g.target.toLocaleString()} (Saved: ${currency} ${(
                  g.current || 0
                ).toLocaleString()}${g.deadline ? `, Target Date: ${g.deadline}` : ''})`
            )
            .join('; ')
        : 'No savings goals set';

    const debtsSummary =
      debts.length > 0
        ? debts
            .map(
              (d) =>
                `${d.direction === 'i_owe' ? 'I owe' : 'Owed to me'} ${d.person}: ${currency} ${Math.max(
                  0,
                  d.amount - (d.paid || 0)
                ).toLocaleString()}${d.note ? ` (${d.note})` : ''}`
            )
            .join('; ')
        : 'No active debts';

    const recentTransactionsSummary =
      transactions.length > 0
        ? transactions
            .slice(0, 8)
            .map(
              (t) =>
                `${t.date}: ${t.type.toUpperCase()} ${currency} ${t.amount.toLocaleString()} [${
                  t.category
                }] "${t.description || 'Transaction'}"`
            )
            .join('; ')
        : 'No transactions recorded yet';

    return {
      profileName,
      currency,
      profileType: activeProfile?.type || 'Personal',
      userName: user?.name || user?.username || 'Ledger User',
      userEmail: user?.email || '',
      netBalance,
      totalIncome,
      totalExpense,
      monthlyIncome: monthIncome,
      monthlyExpenses: monthExpense,
      savingsRate,
      totalSavedInGoals,
      totalIOwe,
      totalOwedToMe: summary?.totalOwedToMe ?? 0,
      budgetsSummary,
      goalsSummary,
      debtsSummary,
      recentTransactionsSummary,
    };
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remainingSlots = 2 - attachments.length;
    if (remainingSlots <= 0) {
      alert('Maximum of 2 files, pictures, or documents allowed per prompt.');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    filesToProcess.forEach((file) => {
      if (file.size > 8 * 1024 * 1024) {
        alert(`"${file.name}" exceeds the 8MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setAttachments((prev) => {
          if (prev.length >= 2) return prev;
          return [
            ...prev,
            {
              name: file.name,
              type: file.type || 'application/octet-stream',
              size: file.size,
              data: base64Data,
            },
          ];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (customText?: string, forceSearch?: boolean) => {
    const textToSend = (customText || inputPrompt).trim();
    if ((!textToSend && attachments.length === 0) || isLoading) return;

    const shouldSearch = forceSearch !== undefined ? forceSearch : enableSearch;
    const sentAttachments = [...attachments];

    const userMessage: Message = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      content: textToSend || (sentAttachments.length > 0 ? 'Please inspect and analyze the attached document / image.' : ''),
      attachments: sentAttachments.length > 0 ? sentAttachments : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');
    setAttachments([]);
    setIsLoading(true);

    setTimeout(() => {
      const el = document.getElementById(`message-${userMessage.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);

    try {
      const apiMessages = newMessages
        .filter((m) => m.id !== 'fima-welcome')
        .slice(-20)
        .map((m) => ({
          role: m.role,
          content: m.content,
          attachments: m.attachments,
        }));

      const modelToSend = shouldSearch ? 'gemini-3.5-flash' : selectedModel;

      const response = await api.sendAIChat({
        messages: apiMessages.length > 0 ? apiMessages : [{
          role: 'user',
          content: textToSend,
          attachments: sentAttachments,
        }],
        model: modelToSend,
        enableSearch: shouldSearch,
        profileContext: buildProfileContext(),
        profileId: activeProfile?.id,
      });

      if (response.quota) {
        setQuota(response.quota);
      }

      const modelMessage: Message = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'model',
        content: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: response.modelUsed || modelToSend,
        groundingSources: response.groundingSources,
        searchQueries: response.searchQueries,
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.toLowerCase().includes('rate limit') || err.message?.toLowerCase().includes('quota');
      
      if (err.quota) {
        setQuota(err.quota);
      } else if (activeProfile?.id) {
        api.getAIQuota(activeProfile.id).then(setQuota).catch(() => {});
      }

      const errorMessage: Message = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'model',
        content: isRateLimit
          ? `⏳ **Profile Limit Reached (40 messages in 8 hours)**\n\nYour profile has reached the allocated 40 advisory messages. To ensure uninterrupted service, the limit will automatically reset 4 hours later.`
          : `I ran into an issue retrieving that: ${
              err.message || 'There was a temporary service error.'
            }\n\nPlease try again or switch to another model tier.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const startEditPrompt = (msg: Message) => {
    setEditingId(msg.id);
    setEditText(msg.content);
  };

  const handleSaveEdit = async (id: string) => {
    const trimmed = editText.trim();
    if (!trimmed || isLoading) return;

    const targetIdx = messages.findIndex((m) => m.id === id);
    if (targetIdx === -1) return;

    const existingMsg = messages[targetIdx];
    const updatedUserMessage: Message = {
      ...existingMsg,
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const truncated = [...messages.slice(0, targetIdx), updatedUserMessage];
    setMessages(truncated);
    setEditingId(null);
    setEditText('');
    setIsLoading(true);

    setTimeout(() => {
      const el = document.getElementById(`message-${id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);

    try {
      const apiMessages = truncated
        .filter((m) => m.id !== 'fima-welcome')
        .slice(-20)
        .map((m) => ({
          role: m.role,
          content: m.content,
          attachments: m.attachments,
        }));

      const shouldSearch = enableSearch;
      const modelToSend = shouldSearch ? 'gemini-3.5-flash' : selectedModel;

      const response = await api.sendAIChat({
        messages:
          apiMessages.length > 0
            ? apiMessages
            : [
                {
                  role: 'user',
                  content: trimmed,
                  attachments: existingMsg.attachments,
                },
              ],
        model: modelToSend,
        enableSearch: shouldSearch,
        profileContext: buildProfileContext(),
        profileId: activeProfile?.id,
      });

      if (response.quota) {
        setQuota(response.quota);
      }

      const modelMessage: Message = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'model',
        content: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: response.modelUsed || modelToSend,
        groundingSources: response.groundingSources,
        searchQueries: response.searchQueries,
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      console.error('Chat error on edited prompt:', err);
      const isRateLimit =
        err.status === 429 ||
        err.message?.includes('429') ||
        err.message?.toLowerCase().includes('rate limit') ||
        err.message?.toLowerCase().includes('quota');

      if (err.quota) {
        setQuota(err.quota);
      } else if (activeProfile?.id) {
        api.getAIQuota(activeProfile.id).then(setQuota).catch(() => {});
      }

      const errorMessage: Message = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'model',
        content: isRateLimit
          ? `⏳ **Profile Limit Reached (40 messages in 8 hours)**\n\nYour profile has reached the allocated 40 advisory messages. To ensure uninterrupted service, the limit will automatically reset 4 hours later.`
          : `I ran into an issue retrieving that: ${
              err.message || 'There was a temporary service error.'
            }\n\nPlease try again or switch to another model tier.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleResetConversation = () => {
    if (confirm('Start a fresh conversation with Fima?')) {
      const initial = getInitialGreeting(profileName, currency);
      setMessages([initial]);
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingMessageId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanSpeechText = text
      .replace(/\$\$[\s\S]*?\$\$/g, ' mathematical formula ')
      .replace(/\$([^\$]+?)\$/g, '$1')
      .replace(/[*#`_~>]/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(id);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-3 pb-6">
      {/* Top Header: Model Selector & Actions */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-line pb-3">
        {/* Model Selector */}
        <div className="lg-seg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
            className={`lg-seg-btn ${selectedModel === 'gemini-3.1-flash-lite' ? 'active' : ''}`}
            title="Fast calculations & quick answers (Default)"
          >
            Fast
          </button>
          <button
            type="button"
            onClick={() => setSelectedModel('gemini-3.5-flash')}
            className={`lg-seg-btn ${selectedModel === 'gemini-3.5-flash' ? 'active' : ''}`}
            title="Balanced reasoning & search"
          >
            Balanced
          </button>
          <button
            type="button"
            onClick={() => setSelectedModel('gemini-3.1-pro-preview')}
            className={`lg-seg-btn ${selectedModel === 'gemini-3.1-pro-preview' ? 'active' : ''}`}
            title="Deep strategic reasoning & complex financial math"
          >
            Deep
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
          {/* Search Grounding Toggle */}
          <button
            type="button"
            onClick={() => setEnableSearch(!enableSearch)}
            className={`lg-btn-quiet text-xs ${enableSearch ? 'border-accent text-accent bg-accent/10' : ''}`}
            title="Ground answers with live Google Search data"
          >
            <Globe className={`w-3.5 h-3.5 ${enableSearch ? 'text-accent' : 'text-ink-muted'}`} />
            <span>Search</span>
            {enableSearch && (
              <span className="lg-pill lg-pill-accent text-[9px] py-0 px-1 font-bold">
                ON
              </span>
            )}
          </button>

          {/* Ledger Scope Drawer Trigger */}
          <button
            type="button"
            onClick={() => setShowLedgerSidebar(true)}
            className="lg-btn-quiet text-xs"
            title="Inspect active ledger figures & metrics"
          >
            <Wallet className="w-3.5 h-3.5 text-accent" />
            <span className="hidden md:inline font-mono-num num font-semibold">
              {profileName} • {currency} {netBalance.toLocaleString()}
            </span>
            <span className="md:hidden">Ledger</span>
          </button>

          {/* Voice Fima Launcher Button */}
          <button
            type="button"
            onClick={() => setIsLiveVoiceOpen(true)}
            className="lg-btn-solid text-xs flex items-center space-x-1.5"
            title="Start borderless voice dialogue with Fima"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice</span>
          </button>

          {/* New Chat Session */}
          <button
            type="button"
            onClick={handleResetConversation}
            className="lg-btn-quiet p-2 text-ink-muted hover:text-ink"
            title="Start new conversation thread"
            aria-label="Start new conversation thread"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Full-Width Advisor Window */}
      <div className="w-full lg-card p-0 h-[calc(100vh-210px)] min-h-[580px] flex flex-col overflow-hidden relative">
        {/* Messages Stream */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
            {/* Hero Greeting (Rendered when fresh) */}
            {messages.length <= 1 && (
              <div className="pt-4 pb-6 text-center max-w-2xl mx-auto space-y-4 animate-in fade-in duration-300">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/15 text-accent">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-display text-xl sm:text-3xl font-bold tracking-tight text-ink">
                    Hello, {user?.name?.split(' ')[0] || profileName}
                  </h2>
                  <p className="text-xs sm:text-sm text-ink-muted mt-1">
                    How can I assist with your finances or strategic planning today?
                  </p>
                </div>

                {/* Prompt Suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-left">
                  {QUICK_PROMPTS.map((qp, idx) => {
                    const Icon = qp.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (qp.enableSearch) setEnableSearch(true);
                          handleSendMessage(qp.prompt, qp.enableSearch);
                        }}
                        className="p-4 rounded-xl border border-line bg-sunken hover:border-ink/20 transition-all group text-left"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 rounded-lg bg-accent/15 text-accent">
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-ink group-hover:underline">
                              {qp.title}
                            </span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-ink-muted group-hover:text-ink transition-colors" />
                        </div>
                        <p className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
                          {qp.prompt}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isEditing = editingId === msg.id;

              if (isUser) {
                return (
                  <div
                    key={msg.id}
                    id={`message-${msg.id}`}
                    className="flex justify-end animate-in fade-in duration-150"
                  >
                    <div className="max-w-[85%] sm:max-w-[75%] space-y-1.5 flex flex-col items-end">
                      {isEditing ? (
                        <div className="w-full sm:w-[480px] max-w-full bg-surface border border-accent rounded-2xl p-4 shadow-lg space-y-3">
                          <div className="flex items-center justify-between text-xs text-ink-muted">
                            <span className="font-semibold text-accent flex items-center space-x-1.5">
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit Prompt</span>
                            </span>
                            <span className="text-[10px] font-mono-num opacity-70">Esc to cancel</span>
                          </div>
                          <textarea
                            ref={editInputRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveEdit(msg.id);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setEditingId(null);
                              }
                            }}
                            rows={3}
                            className="w-full lg-input text-xs resize-none"
                            placeholder="Edit your prompt..."
                          />
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="lg-btn-quiet text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(msg.id)}
                              disabled={!editText.trim() || isLoading}
                              className="lg-btn-solid text-xs"
                            >
                              <Send className="w-3 h-3" />
                              <span>Update &amp; Send</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-full rounded-2xl rounded-tr-xs bg-ink text-canvas px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs space-y-2">
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 pb-1">
                                {msg.attachments.map((att, attIdx) => (
                                  <div
                                    key={attIdx}
                                    className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-canvas/15 text-inherit border border-canvas/20"
                                  >
                                    {att.type.startsWith('image/') ? (
                                      <img
                                        src={att.data}
                                        alt={att.name}
                                        className="w-7 h-7 object-cover rounded"
                                      />
                                    ) : (
                                      <FileText className="w-4 h-4 shrink-0 text-canvas" />
                                    )}
                                    <div className="flex flex-col min-w-0 max-w-[140px]">
                                      <span className="text-[11px] font-semibold truncate leading-tight">
                                        {att.name}
                                      </span>
                                      {att.size && (
                                        <span className="text-[9px] opacity-70 font-mono-num num">
                                          {(att.size / 1024).toFixed(0)} KB
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <div className="text-[10px] text-canvas/60 text-right mt-1 font-mono-num num">
                              {msg.timestamp}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 pr-1">
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(msg.id, msg.content)}
                              className="p-1 text-ink-muted hover:text-ink transition-colors"
                              title="Copy prompt"
                              aria-label="Copy prompt"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3.5 h-3.5 text-pos" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => startEditPrompt(msg)}
                              className="p-1 text-ink-muted hover:text-accent transition-colors"
                              title="Edit prompt"
                              aria-label="Edit prompt"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  id={`message-${msg.id}`}
                  className="flex items-start space-x-3 sm:space-x-4 max-w-full animate-in fade-in duration-200"
                >
                  {/* Fima Sparkle Avatar */}
                  <div className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0 mt-0.5 border border-accent/20">
                    <Sparkles className="w-4 h-4" />
                  </div>

                  {/* Fima Content Presentation */}
                  <div className="flex-1 space-y-2 overflow-hidden">
                    <div className="flex items-center space-x-2 text-[11px] text-ink-muted">
                      <span className="font-bold text-ink">Fima</span>
                      <span>•</span>
                      <span className="font-mono-num num">{msg.timestamp}</span>
                    </div>

                    <div className="text-xs sm:text-sm leading-relaxed text-ink space-y-2">
                      <FormattedMessage content={msg.content} className="text-xs sm:text-sm" />
                    </div>

                    {/* Search Queries */}
                    {msg.searchQueries && msg.searchQueries.length > 0 && (
                      <div className="pt-2 border-t border-line space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-ink-muted flex items-center space-x-1">
                          <Search className="w-3 h-3 text-accent" />
                          <span>Web Grounding Inquiries:</span>
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.searchQueries.map((q, idx) => (
                            <span
                              key={idx}
                              className="lg-pill lg-pill-accent text-[11px] font-mono-num"
                            >
                              "{q}"
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grounded Sources */}
                    {msg.groundingSources && msg.groundingSources.length > 0 && (
                      <div className="pt-2 border-t border-line space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent flex items-center space-x-1">
                          <Globe className="w-3 h-3" />
                          <span>Grounded Sources:</span>
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.groundingSources.map((src, idx) => (
                            <a
                              key={idx}
                              href={src.uri}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="flex items-center justify-between p-2.5 rounded-xl bg-sunken hover:bg-surface border border-line text-xs text-ink transition-colors truncate group"
                            >
                              <span className="truncate pr-2 font-medium group-hover:underline">
                                {src.title || src.uri}
                              </span>
                              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-ink-muted" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Row Under Response */}
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleSpeak(msg.id, msg.content)}
                        className={`px-2.5 py-1 rounded-lg text-xs flex items-center space-x-1 transition-colors ${
                          speakingMessageId === msg.id
                            ? 'text-accent bg-accent/15 font-semibold'
                            : 'text-ink-muted hover:text-ink hover:bg-sunken'
                        }`}
                        title={speakingMessageId === msg.id ? 'Stop audio playback' : 'Read aloud'}
                      >
                        {speakingMessageId === msg.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-accent animate-pulse" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Listen</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="px-2.5 py-1 rounded-lg text-xs text-ink-muted hover:text-ink hover:bg-sunken flex items-center space-x-1 transition-colors"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-pos" />
                            <span className="text-pos font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Thinking / Loading State */}
            {isLoading && (
              <div className="flex items-start space-x-3 sm:space-x-4 animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0 mt-0.5 border border-accent/20">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="space-y-1.5 py-1">
                  <div className="flex items-center space-x-2 text-xs text-ink-muted">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" />
                    <span>
                      {enableSearch
                        ? 'Searching live data & analyzing context...'
                        : 'Thinking and analyzing...'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Bar */}
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 pb-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              if (e.target) e.target.value = '';
            }}
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDraggingFile(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingFile(false);
              if (e.dataTransfer.files) {
                handleFiles(e.dataTransfer.files);
              }
            }}
            className={`rounded-2xl bg-sunken border shadow-xs transition-all p-3 space-y-2 ${
              isDraggingFile
                ? 'border-accent ring-1 ring-accent'
                : 'border-line focus-within:border-ink/40'
            }`}
          >
            {/* Quota limit warning banner */}
            {quota && quota.remainingMessages <= 0 && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Profile Limit Reached:</strong> 40 messages limit reached. Automatically resets 4 hours later.
                  </span>
                </div>
                <span className="text-[11px] font-mono-num num font-semibold">
                  Cooldown active
                </span>
              </div>
            )}

            {/* Attachments Chips Preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 p-1.5 bg-surface rounded-xl border border-line">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-2 pl-2 pr-1.5 py-1 rounded-lg bg-sunken border border-line text-xs"
                  >
                    {att.type.startsWith('image/') ? (
                      <img
                        src={att.data}
                        alt={att.name}
                        className="w-6 h-6 object-cover rounded"
                      />
                    ) : (
                      <FileText className="w-4 h-4 text-accent shrink-0" />
                    )}
                    <div className="flex flex-col min-w-0 max-w-[130px]">
                      <span className="truncate text-[11px] font-semibold text-ink">
                        {att.name}
                      </span>
                      <span className="text-[9px] text-ink-muted font-mono-num num">
                        {att.size ? `${(att.size / 1024).toFixed(0)} KB` : 'File'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="p-1 rounded text-ink-muted hover:text-neg"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <span className="text-[10px] text-ink-muted self-center px-1 font-mono-num num">
                  {attachments.length}/2 attached
                </span>
              </div>
            )}

            {/* Input Textarea */}
            <textarea
              ref={textareaRef}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              disabled={quota !== null && quota.remainingMessages <= 0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={2}
              placeholder={
                quota && quota.remainingMessages <= 0
                  ? 'Profile quota reached. Please wait for the window to reset...'
                  : attachments.length > 0
                  ? 'Add your question or instructions for attached files...'
                  : 'Ask Fima: budget analysis, debt strategy, savings planning, or economic questions...'
              }
              className="w-full bg-transparent text-xs sm:text-sm text-ink placeholder-ink-muted resize-none outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed px-1"
            />

            {/* Controls Bar Inside Capsule */}
            <div className="flex items-center justify-between pt-1 border-t border-line">
              <div className="flex items-center space-x-2 text-xs text-ink-muted">
                {enableSearch && (
                  <span className="lg-pill lg-pill-accent text-[10px] py-0 px-1.5 font-semibold">
                    <Globe className="w-3 h-3 mr-1 inline" />
                    Search On
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={attachments.length >= 2 || isLoading || (quota !== null && quota.remainingMessages <= 0)}
                  className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface transition-colors disabled:opacity-30"
                  title="Attach documents or pictures (Max 2)"
                  aria-label="Attach documents or pictures"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsLiveVoiceOpen(true)}
                  className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface transition-colors"
                  title="Speak with Fima in voice mode"
                  aria-label="Speak with Fima in voice mode"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={(!inputPrompt.trim() && attachments.length === 0) || isLoading || (quota !== null && quota.remainingMessages <= 0)}
                  className="lg-btn-solid text-xs p-2 sm:px-3 sm:py-2"
                  title="Send prompt"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-ink-muted px-2 pt-1.5">
            <span className="text-[10px]">Max 2 attachments (PDF, images, docs, CSV)</span>
            <span className="text-[10px] text-right truncate">Fima is an AI financial assistant. Verify financial decisions.</span>
          </div>
        </div>
      </div>

      {/* Slide-Over Drawer: Active Ledger Scope */}
      {showLedgerSidebar && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          <div
            onClick={() => setShowLedgerSidebar(false)}
            className="absolute inset-0 bg-ink/50 backdrop-blur-xs transition-opacity"
          />

          <aside className="relative z-10 w-full max-w-md bg-surface h-full shadow-2xl p-6 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200 border-l border-line">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-accent/15 text-accent">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-ink">
                    Live Ledger Scope
                  </h3>
                  <span className="text-xs text-ink-muted">
                    {profileName} ({currency})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLedgerSidebar(false)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-sunken"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Financial Metrics */}
            <div className="space-y-2.5 text-xs font-mono-num num bg-sunken p-4 rounded-xl border border-line">
              <div className="flex justify-between items-center">
                <span className="text-ink-muted font-normal">Net Balance:</span>
                <span className={`font-bold text-sm ${netBalance >= 0 ? 'text-pos' : 'text-neg'}`}>
                  {currency} {netBalance.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted font-normal">Month Income:</span>
                <span className="font-semibold text-pos">
                  +{currency} {monthIncome.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted font-normal">Month Expenses:</span>
                <span className="font-semibold text-neg">
                  -{currency} {monthExpense.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted font-normal">Savings Rate:</span>
                <span className="font-semibold text-ink">
                  {savingsRate}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted font-normal">Savings Vaults:</span>
                <span className="font-semibold text-ink">
                  {goals.length} goals ({currency} {totalSavedInGoals.toLocaleString()})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted font-normal">Debts Balance:</span>
                <span className="font-semibold text-neg">
                  {currency} {totalIOwe.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Quick Inquiries */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-ink block uppercase tracking-wider">
                Suggested Financial Audits
              </span>
              <div className="space-y-2">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setShowLedgerSidebar(false);
                      if (qp.enableSearch) setEnableSearch(true);
                      handleSendMessage(qp.prompt, qp.enableSearch);
                    }}
                    className="w-full text-left p-3 rounded-xl border border-line bg-sunken hover:border-ink/20 transition-all group"
                  >
                    <div className="text-xs font-bold text-ink group-hover:underline">
                      {qp.title}
                    </div>
                    <p className="text-[11px] text-ink-muted line-clamp-2 mt-0.5">
                      {qp.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Mode Callout */}
            <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 space-y-2">
              <div className="flex items-center space-x-2 text-ink font-bold text-xs">
                <Mic className="w-4 h-4 text-accent" />
                <span>Switch to Voice Fima</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Connect hands-free with an immersive full-screen voice dialogue.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowLedgerSidebar(false);
                  setIsLiveVoiceOpen(true);
                }}
                className="w-full py-2 rounded-xl lg-btn-solid text-xs"
              >
                Launch Voice Session
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Live Voice Modal */}
      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
      />
    </div>
  );
};
