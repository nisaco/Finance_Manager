import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Globe,
  Mic,
  Trash2,
  ExternalLink,
  Search,
  AlertCircle,
  TrendingUp,
  Scale,
  PiggyBank,
  Wallet,
  Zap,
  BrainCircuit,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  RotateCcw,
  MessageSquare,
  ShieldCheck,
  Info,
  Volume2,
  VolumeX,
  Layers,
  ChevronDown,
  ChevronUp,
  Clock,
  X,
  ArrowRight,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { AIMessageQuota } from '../types';
import { LiveVoiceModal } from '../components/Modals/LiveVoiceModal';
import { FormattedMessage } from '../components/FormattedMessage';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
  groundingSources?: { title?: string; uri?: string }[];
  searchQueries?: string[];
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
    title: 'Real-Time FX & Economic Data',
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
    profiles,
    transactions,
    budgets,
    goals,
    debts,
    summary,
    isLoading: isLedgerLoading,
  } = useLedger();
  const { user } = useAuth();

  // Model selection per requirements:
  // - gemini-3.5-flash for general tasks (and search grounding)
  // - gemini-3.1-pro-preview for particularly complex tasks
  // - gemini-3.1-flash-lite for tasks that should happen fast
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [enableSearch, setEnableSearch] = useState<boolean>(false);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState<boolean>(false);
  const [includeFinancialContext, setIncludeFinancialContext] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [showLedgerSidebar, setShowLedgerSidebar] = useState<boolean>(false);
  const [quota, setQuota] = useState<AIMessageQuota | null>(null);

  useEffect(() => {
    api.getAIQuota().then(setQuota).catch((err) => {
      console.warn('Could not load initial AI quota:', err);
    });
  }, []);

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
  const totalOwedToMe =
    summary?.totalOwedToMe ??
    debts
      .filter((d) => d.direction === 'owed_to_me')
      .reduce((acc, d) => acc + Math.max(0, d.amount - (d.paid || 0)), 0);

  const storageKey = `fima_chat_${user?.id || 'anon'}_${activeProfile?.id || 'default'}`;

  // Initial welcome message per requirement: "Hi I'm Fima....."
  const getInitialGreeting = (pName: string, pCurr: string): Message => ({
    id: 'fima-welcome',
    role: 'model',
    content: `Hi I'm Fima, your dedicated Finance Manager AI assistant.\n\nI have real-time access to your **${pName}** ledger (${pCurr}). I can analyze your spending velocity, audit budgets, build debt payoff strategies, track savings milestones, or answer literally any question under the sun—from your finances to global markets, business models, or general curiosity.\n\nHow can I help you today?`,
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

  // Auto-scroll to bottom of thread
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Persist conversation thread per profile
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      }
    } catch (err) {
      console.warn('Failed to save chat memory:', err);
    }
  }, [messages, storageKey]);

  // If profile changes, re-hydrate from storage or reset to initial greeting
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {}
    setMessages([getInitialGreeting(profileName, currency)]);
  }, [activeProfile?.id]);

  // Build complete financial ledger context payload
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
      totalOwedToMe,
      budgetsSummary,
      goalsSummary,
      debtsSummary,
      recentTransactionsSummary,
    };
  };

  const handleSendMessage = async (customText?: string, forceSearch?: boolean) => {
    const textToSend = (customText || inputPrompt).trim();
    if (!textToSend || isLoading) return;

    const shouldSearch = forceSearch !== undefined ? forceSearch : enableSearch;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Build conversation payload with memory retention (last 20 messages)
      const apiMessages = newMessages
        .filter((m) => m.id !== 'fima-welcome')
        .slice(-20)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // Search grounding requires gemini-3.5-flash per requirements
      const modelToSend = shouldSearch ? 'gemini-3.5-flash' : selectedModel;

      const response = await api.sendAIChat({
        messages: apiMessages.length > 0 ? apiMessages : [{ role: 'user', content: textToSend }],
        model: modelToSend,
        enableSearch: shouldSearch,
        profileContext: buildProfileContext(),
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
      } else {
        api.getAIQuota().then(setQuota).catch(() => {});
      }

      const errorMessage: Message = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'model',
        content: isRateLimit
          ? `⏳ **AI Rate Limit Reached (40 messages / 8 hours)**\n\nYou have used your allocated 40 advisory messages for this 8-hour window to ensure stable service for all users. Please wait for your quota to reset before sending further prompts.`
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

  // Text-to-speech reading for natural voice experience
  const handleToggleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingMessageId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown/latex symbols for clear speech
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

  // Quick mathematical & strategic formula shortcuts
  const FORMULA_SHORTCUTS = [
    {
      label: 'Compound Interest',
      prompt:
        'Explain the Compound Interest formula using LaTeX ($$A = P(1 + r/n)^{nt}$$). Define every variable and calculate what my current net balance will grow to in 5 years at 8% annual return.',
    },
    {
      label: 'Debt Payoff Velocity',
      prompt:
        'Provide the Debt Amortization formula in LaTeX and calculate the exact monthly payment needed to eliminate my current debts in 12 months.',
    },
    {
      label: 'Rule of 72 Doubling',
      prompt:
        'Demonstrate the Rule of 72 formula ($$T \\approx \\frac{72}{r}$$) in LaTeX and estimate how many years it will take for my savings vaults to double at 7%, 10%, and 12% returns.',
    },
    {
      label: '50/30/20 Budget Model',
      prompt:
        'Audit my monthly income and expenses against the 50/30/20 budget framework. Show the exact breakdown with formulas and identify any category overages.',
    },
    {
      label: 'Savings Annuity Projection',
      prompt:
        'Write the Future Value of an Ordinary Annuity formula in LaTeX ($$\\text{FV} = \\text{PMT} \\left[\\frac{(1 + r)^t - 1}{r}\\right]$$) and project my savings if I invest 15% of my monthly income every month for 10 years at 9% CAGR.',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Top Header: Gemini-Style Navigation & Intelligence Controls */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E5DF] dark:border-[#2D323F] pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#1A1A1A] to-[#3B4252] text-white dark:from-[#F3F4F6] dark:to-[#D1D5DB] dark:text-[#111317] flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-display text-lg sm:text-xl font-bold text-[#1A1A1A] dark:text-[#F3F4F6] tracking-tight">
                Fima AI
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-semibold">
                Finance Strategist
              </span>
            </div>
            <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] hidden sm:block">
              Full-context financial advisory powered by Gemini intelligence
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 flex-wrap">
          {/* Intelligence Model Selector */}
          <div className="flex items-center bg-[#F7F5F2] dark:bg-[#1E222C] p-0.5 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F]">
            <button
              onClick={() => setSelectedModel('gemini-3.5-flash')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                selectedModel === 'gemini-3.5-flash'
                  ? 'bg-white text-[#1A1A1A] dark:bg-[#2B303E] dark:text-white shadow-xs font-semibold'
                  : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white'
              }`}
              title="Balanced model for general reasoning & web search"
            >
              Balanced
            </button>
            <button
              onClick={() => setSelectedModel('gemini-3.1-pro-preview')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                selectedModel === 'gemini-3.1-pro-preview'
                  ? 'bg-white text-[#1A1A1A] dark:bg-[#2B303E] dark:text-white shadow-xs font-semibold'
                  : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white'
              }`}
              title="Deep strategic reasoning & complex financial math"
            >
              Deep Reasoning
            </button>
            <button
              onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
              className={`hidden sm:block px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                selectedModel === 'gemini-3.1-flash-lite'
                  ? 'bg-white text-[#1A1A1A] dark:bg-[#2B303E] dark:text-white shadow-xs font-semibold'
                  : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white'
              }`}
              title="Fast calculations & quick answers"
            >
              Fast
            </button>
          </div>

          {/* Search Grounding Toggle */}
          <button
            onClick={() => setEnableSearch(!enableSearch)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              enableSearch
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-2xs'
                : 'bg-white dark:bg-[#1E222C] text-[#6B7280] dark:text-[#9CA3AF] border-[#E8E5DF] dark:border-[#2D323F] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6]'
            }`}
            title="Ground answers with live Google Search data"
          >
            <Globe
              className={`w-3.5 h-3.5 ${
                enableSearch ? 'text-blue-600 dark:text-blue-400 animate-pulse' : ''
              }`}
            />
            <span className="hidden sm:inline">Search</span>
            {enableSearch && (
              <span className="px-1 py-0.2 rounded bg-blue-600 text-white text-[9px] font-bold">
                ON
              </span>
            )}
          </button>

          {/* Ledger Scope Drawer Trigger */}
          <button
            onClick={() => setShowLedgerSidebar(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#1E222C] text-xs font-semibold text-[#1A1A1A] dark:text-[#F3F4F6] hover:bg-[#F7F5F2] dark:hover:bg-[#262B37] transition-all shadow-xs"
            title="Inspect active ledger figures & metrics"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline font-mono-num">
              {profileName} • {currency} {netBalance.toLocaleString()}
            </span>
            <span className="md:hidden">Ledger</span>
          </button>

          {/* Voice Fima Launcher Button */}
          <button
            onClick={() => setIsLiveVoiceOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
            title="Start borderless voice dialogue with Fima"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
          </button>

          {/* New Chat Session */}
          <button
            onClick={handleResetConversation}
            className="p-2 rounded-xl bg-white dark:bg-[#1E222C] border border-[#E8E5DF] dark:border-[#2D323F] text-[#6B7280] hover:text-[#1A1A1A] dark:text-[#9CA3AF] dark:hover:text-[#F3F4F6] transition-colors"
            title="Start new conversation thread"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Full-Width Gemini-Style Context Window */}
      <div className="w-full bg-white dark:bg-[#13161F] border border-[#E8E5DF] dark:border-[#252935] rounded-3xl shadow-xs h-[calc(100vh-190px)] min-h-[620px] flex flex-col overflow-hidden relative">
        {/* Messages Stream (Centered max-w-4xl like Gemini) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 space-y-7">
            {/* Gemini Hero Greeting (Rendered when fresh or on welcome) */}
            {messages.length <= 1 && (
              <div className="pt-4 pb-6 text-center max-w-2xl mx-auto space-y-4 animate-in fade-in duration-300">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shadow-2xs">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight text-[#1A1A1A] dark:text-[#F3F4F6]">
                    Hello, {user?.name?.split(' ')[0] || profileName}
                  </h2>
                  <p className="text-sm sm:text-base text-[#6B7280] dark:text-[#9CA3AF] mt-1 font-normal">
                    How can I assist with your finances or answer questions today?
                  </p>
                </div>

                {/* 4 Gemini Prompt Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-left">
                  {QUICK_PROMPTS.map((qp, idx) => {
                    const Icon = qp.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (qp.enableSearch) setEnableSearch(true);
                          handleSendMessage(qp.prompt, qp.enableSearch);
                        }}
                        className="p-3.5 rounded-2xl border border-[#E8E5DF] dark:border-[#252A36] bg-[#FDFCFB] dark:bg-[#1A1E29] hover:bg-[#F7F5F2] dark:hover:bg-[#232836] transition-all group shadow-2xs hover:shadow-xs active:scale-[0.99]"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F3F4F6] group-hover:underline">
                              {qp.title}
                            </span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#1A1A1A] dark:group-hover:text-white transition-colors" />
                        </div>
                        <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] line-clamp-2 leading-relaxed">
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

              if (isUser) {
                return (
                  <div key={msg.id} className="flex justify-end animate-in fade-in duration-150">
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-tr-md bg-[#1A1A1A] dark:bg-[#F3F4F6] text-white dark:text-[#111317] px-5 py-3.5 text-sm leading-relaxed shadow-xs">
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <div className="text-[10px] text-white/50 dark:text-[#111317]/50 text-right mt-1.5 font-mono-num">
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className="flex items-start space-x-3 sm:space-x-4 max-w-full animate-in fade-in duration-200"
                >
                  {/* Fima Sparkle Avatar */}
                  <div className="w-8 h-8 rounded-full bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20 shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>

                  {/* Fima Content Presentation */}
                  <div className="flex-1 space-y-2.5 overflow-hidden">
                    {/* Header info */}
                    <div className="flex items-center space-x-2 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                      <span className="font-bold text-[#1A1A1A] dark:text-[#F3F4F6]">
                        Fima
                      </span>
                      {msg.modelUsed && (
                        <>
                          <span>•</span>
                          <span className="px-1.5 py-0.2 rounded bg-[#F7F5F2] dark:bg-[#222734] text-[10px] font-mono-num">
                            {msg.modelUsed}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="font-mono-num">{msg.timestamp}</span>
                    </div>

                    {/* Markdown Body */}
                    <div className="text-sm leading-relaxed text-[#1A1A1A] dark:text-[#E5E7EB] space-y-2">
                      <FormattedMessage content={msg.content} className="text-sm" />
                    </div>

                    {/* Search Queries if executed */}
                    {msg.searchQueries && msg.searchQueries.length > 0 && (
                      <div className="pt-2 border-t border-[#E8E5DF] dark:border-[#252A36] space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7280] dark:text-[#9CA3AF] flex items-center space-x-1">
                          <Search className="w-3 h-3 text-blue-500" />
                          <span>Web Grounding Inquiries:</span>
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.searchQueries.map((q, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-mono-num"
                            >
                              "{q}"
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Web Grounding Citations */}
                    {msg.groundingSources && msg.groundingSources.length > 0 && (
                      <div className="pt-2 border-t border-[#E8E5DF] dark:border-[#252A36] space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center space-x-1">
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
                              className="flex items-center justify-between p-2 rounded-xl bg-[#F7F5F2] dark:bg-[#1C202B] hover:bg-[#E8E5DF] dark:hover:bg-[#252A38] border border-[#E8E5DF] dark:border-[#252A36] text-xs text-[#1A1A1A] dark:text-[#F3F4F6] transition-colors truncate group"
                            >
                              <span className="truncate pr-2 font-medium group-hover:underline">
                                {src.title || src.uri}
                              </span>
                              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[#6B7280]" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Row Under Response */}
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={() => handleToggleSpeak(msg.id, msg.content)}
                        className={`px-2.5 py-1 rounded-lg text-xs flex items-center space-x-1 transition-colors ${
                          speakingMessageId === msg.id
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 font-semibold'
                            : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white hover:bg-[#F7F5F2] dark:hover:bg-[#1E232F]'
                        }`}
                        title={speakingMessageId === msg.id ? 'Stop audio playback' : 'Read aloud'}
                      >
                        {speakingMessageId === msg.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
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
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="px-2.5 py-1 rounded-lg text-xs text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-white hover:bg-[#F7F5F2] dark:hover:bg-[#1E232F] flex items-center space-x-1 transition-colors"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">Copied</span>
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

            {/* Gemini Thinking / Loading State */}
            {isLoading && (
              <div className="flex items-start space-x-3 sm:space-x-4 animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-full bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                  <Sparkles className="w-4 h-4 animate-spin text-emerald-500" />
                </div>
                <div className="space-y-2 py-1">
                  <div className="flex items-center space-x-2 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                    <span>
                      {enableSearch
                        ? 'Searching live web data & analyzing ledger context...'
                        : 'Thinking and formulating response...'}
                    </span>
                  </div>
                  <div className="flex space-x-1.5 pt-0.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Formulas Carousel */}
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 pb-2 flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-bold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider shrink-0 flex items-center space-x-1 mr-1">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Formulas:</span>
          </span>
          {FORMULA_SHORTCUTS.map((fs, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(fs.prompt)}
              disabled={isLoading}
              className="shrink-0 px-2.5 py-1 rounded-full bg-[#F7F5F2] dark:bg-[#1E232E] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[#1A1A1A] dark:text-[#F3F4F6] hover:text-emerald-700 dark:hover:text-emerald-300 border border-[#E8E5DF] dark:border-[#292F3E] text-[11px] font-medium transition-all shadow-2xs whitespace-nowrap active:scale-95 disabled:opacity-40"
            >
              {fs.label}
            </button>
          ))}
        </div>

        {/* Gemini Floating Input Bar Capsule */}
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 pb-4">
          <div className="rounded-3xl bg-[#FDFCFB] dark:bg-[#1A1E28] border border-[#E8E5DF] dark:border-[#2C3242] shadow-md focus-within:border-[#1A1A1A] dark:focus-within:border-white focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all p-3 space-y-2">
            {/* Rate limit warning banner */}
            {quota && quota.remainingMessages <= 0 && (
              <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>Rate Limit Active:</strong> You have used your 40 messages for this 8-hour window.
                  </span>
                </div>
                <span className="text-[11px] font-mono-num text-amber-700 dark:text-amber-300">
                  Resets in rolling window
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
                  ? 'Hourly quota reached. Please wait for the window to reset...'
                  : 'Ask Fima anything: budget audit, compound formulas, debt payoffs, or financial advice...'
              }
              className="w-full bg-transparent text-xs sm:text-sm text-[#1A1A1A] dark:text-[#F3F4F6] placeholder-[#9CA3AF] resize-none outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed px-1"
            />

            {/* Controls Bar Inside Capsule */}
            <div className="flex items-center justify-between pt-1 border-t border-[#E8E5DF]/60 dark:border-[#2C3242]/60">
              {/* Left Capsule Controls */}
              <div className="flex items-center space-x-3 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeFinancialContext}
                    onChange={(e) => setIncludeFinancialContext(e.target.checked)}
                    className="rounded text-[#1A1A1A] dark:text-emerald-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-medium hidden sm:inline">
                    Sync Active Ledger
                  </span>
                </label>

                {enableSearch && (
                  <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center space-x-1 text-[11px]">
                    <Globe className="w-3 h-3" />
                    <span>Search On</span>
                  </span>
                )}
              </div>

              {/* Right Capsule Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsLiveVoiceOpen(true)}
                  className="p-2 rounded-full hover:bg-[#F7F5F2] dark:hover:bg-[#252A38] text-[#6B7280] hover:text-[#1A1A1A] dark:text-[#9CA3AF] dark:hover:text-white transition-colors"
                  title="Speak with Fima in borderless voice mode"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputPrompt.trim() || isLoading || (quota !== null && quota.remainingMessages <= 0)}
                  className="p-2 sm:px-3 sm:py-2 bg-[#1A1A1A] hover:bg-[#333333] dark:bg-[#F3F4F6] dark:hover:bg-white text-white dark:text-[#111317] rounded-full sm:rounded-xl font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xs active:scale-95 flex items-center space-x-1.5"
                  title="Send prompt to Fima"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="text-xs hidden sm:inline">Send</span>
                </button>
              </div>
            </div>
          </div>

          {/* Micro Footer Status & Disclaimer */}
          <div className="flex items-center justify-between text-[11px] text-[#6B7280] dark:text-[#9CA3AF] px-2 pt-1.5">
            <div className="flex items-center space-x-2 font-mono-num">
              <Clock className="w-3 h-3 text-amber-500" />
              <span>
                Quota: <strong>{quota ? quota.remainingMessages : 40}</strong>/40 msgs
              </span>
            </div>
            <p className="text-[10px] text-[#9CA3AF] text-right truncate">
              Fima is an AI financial assistant. Verify financial decisions.
            </p>
          </div>
        </div>
      </div>

      {/* Slide-Over Drawer: Active Ledger Financial Scope */}
      {showLedgerSidebar && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            onClick={() => setShowLedgerSidebar(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Panel */}
          <aside className="relative z-10 w-full max-w-md bg-white dark:bg-[#1A1D24] h-full shadow-2xl p-6 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200 border-l border-[#E8E5DF] dark:border-[#2D323F]">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DF] dark:border-[#2D323F]">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-[#1A1A1A] dark:text-[#F3F4F6]">
                    Live Ledger Scope
                  </h3>
                  <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {profileName} ({currency})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowLedgerSidebar(false)}
                className="p-1.5 rounded-xl hover:bg-[#F7F5F2] dark:hover:bg-[#22252E] text-[#6B7280] dark:text-[#9CA3AF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Financial Metrics */}
            <div className="space-y-2 text-xs font-mono-num bg-[#FDFCFB] dark:bg-[#14161B] p-4 rounded-2xl border border-[#E8E5DF] dark:border-[#2D323F]">
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] dark:text-[#9CA3AF]">Net Balance:</span>
                <span
                  className={`font-bold text-sm ${
                    netBalance >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'
                  }`}
                >
                  {currency} {netBalance.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] dark:text-[#9CA3AF]">Month Income:</span>
                <span className="font-semibold text-[#15803D]">
                  +{currency} {monthIncome.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] dark:text-[#9CA3AF]">Month Expenses:</span>
                <span className="font-semibold text-[#DC2626]">
                  -{currency} {monthExpense.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] dark:text-[#9CA3AF]">Savings Rate:</span>
                <span className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">
                  {savingsRate}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] dark:text-[#9CA3AF]">Savings Vaults:</span>
                <span className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">
                  {goals.length} goals ({currency} {totalSavedInGoals.toLocaleString()})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] dark:text-[#9CA3AF]">Debts Balance:</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {currency} {totalIOwe.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Quick Inquiries */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F3F4F6] block">
                Suggested Financial Audits
              </span>
              <div className="space-y-2">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setShowLedgerSidebar(false);
                      if (qp.enableSearch) setEnableSearch(true);
                      handleSendMessage(qp.prompt, qp.enableSearch);
                    }}
                    className="w-full text-left p-2.5 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] hover:border-[#1A1A1A] dark:hover:border-[#F3F4F6] bg-[#FDFCFB] dark:bg-[#14161B] hover:bg-[#F7F5F2] dark:hover:bg-[#22252E] transition-all group"
                  >
                    <div className="text-xs font-bold text-[#1A1A1A] dark:text-[#F3F4F6] group-hover:underline">
                      {qp.title}
                    </div>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] line-clamp-2 mt-0.5">
                      {qp.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Mode Callout */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                <Mic className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                <span>Switch to Voice Fima</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 leading-relaxed">
                Connect hands-free with an immersive, full-screen borderless voice interface.
              </p>
              <button
                onClick={() => {
                  setShowLedgerSidebar(false);
                  setIsLiveVoiceOpen(true);
                }}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs"
              >
                Launch Voice Session
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Live Voice Modal (ChatGPT-Style Full-Screen Borderless) */}
      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
      />
    </div>
  );
};
