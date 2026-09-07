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
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
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
      const errorMessage: Message = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'model',
        content: `I ran into an issue retrieving that: ${
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
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E5DF] dark:border-[#2D323F] pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] text-white dark:bg-[#F3F4F6] dark:text-[#111317] flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-display text-xl font-bold text-[#1A1A1A] dark:text-[#F3F4F6] tracking-tight">
                Fima
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-semibold">
                Finance Manager AI
              </span>
            </div>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Intelligent wealth strategist, full ledger analyst &amp; comprehensive knowledge assistant
            </p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center space-x-2">
          {/* Mobile Ledger Scope Toggle */}
          <button
            onClick={() => setShowLedgerSidebar(!showLedgerSidebar)}
            className="lg:hidden flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#1A1D24] text-xs font-semibold text-[#1A1A1A] dark:text-[#F3F4F6] shadow-xs"
            title="Toggle ledger metrics panel"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>{showLedgerSidebar ? 'Hide Scope' : 'Ledger Scope'}</span>
          </button>

          {/* Voice Launcher Button */}
          <button
            onClick={() => setIsLiveVoiceOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
            title="Start real-time voice dialogue with Fima"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Fima</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
          </button>

          {/* Search Grounding Toggle */}
          <button
            onClick={() => setEnableSearch(!enableSearch)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              enableSearch
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-2xs'
                : 'bg-white dark:bg-[#1A1D24] text-[#6B7280] dark:text-[#9CA3AF] border-[#E8E5DF] dark:border-[#2D323F] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6]'
            }`}
            title="Ground answers with live Google Search data"
          >
            <Globe
              className={`w-3.5 h-3.5 ${
                enableSearch ? 'text-blue-600 dark:text-blue-400 animate-pulse' : ''
              }`}
            />
            <span>Search</span>
            {enableSearch && (
              <span className="px-1 py-0.2 rounded bg-blue-600 text-white text-[9px] font-bold">
                ON
              </span>
            )}
          </button>

          {/* Reset / New Thread */}
          <button
            onClick={handleResetConversation}
            className="p-2 rounded-xl bg-white dark:bg-[#1A1D24] border border-[#E8E5DF] dark:border-[#2D323F] text-[#6B7280] hover:text-[#1A1A1A] dark:text-[#9CA3AF] dark:hover:text-[#F3F4F6] transition-colors"
            title="Start a new chat session with Fima"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Container: Chat Thread + Scope Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Chat Area (3 Columns) */}
        <div className="lg:col-span-3 flex flex-col bg-white dark:bg-[#1A1D24] border border-[#E8E5DF] dark:border-[#2D323F] rounded-2xl shadow-xs h-[calc(100vh-210px)] min-h-[580px] max-h-[820px] overflow-hidden">
          {/* Subheader: Model & Intelligence Modes */}
          <div className="p-3 border-b border-[#E8E5DF] dark:border-[#2D323F] bg-[#FDFCFB] dark:bg-[#14161B] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-[#6B7280] dark:text-[#9CA3AF] font-bold text-[10px] tracking-wider uppercase">
                Intelligence:
              </span>
              <div className="flex items-center space-x-1 bg-[#F7F5F2] dark:bg-[#22252E] p-0.5 rounded-lg border border-[#E8E5DF] dark:border-[#2D323F]">
                <button
                  onClick={() => setSelectedModel('gemini-3.5-flash')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    selectedModel === 'gemini-3.5-flash'
                      ? 'bg-[#1A1A1A] text-white dark:bg-[#F3F4F6] dark:text-[#111317] shadow-2xs font-semibold'
                      : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6]'
                  }`}
                  title="General intelligence & search grounding"
                >
                  Balanced
                </button>
                <button
                  onClick={() => setSelectedModel('gemini-3.1-pro-preview')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    selectedModel === 'gemini-3.1-pro-preview'
                      ? 'bg-[#1A1A1A] text-white dark:bg-[#F3F4F6] dark:text-[#111317] shadow-2xs font-semibold'
                      : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6]'
                  }`}
                  title="Deep strategic reasoning & complex financial math"
                >
                  Deep Reasoning
                </button>
                <button
                  onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    selectedModel === 'gemini-3.1-flash-lite'
                      ? 'bg-[#1A1A1A] text-white dark:bg-[#F3F4F6] dark:text-[#111317] shadow-2xs font-semibold'
                      : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6]'
                  }`}
                  title="Ultra-fast calculations and quick answers"
                >
                  Fast Mode
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
              <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeFinancialContext}
                  onChange={(e) => setIncludeFinancialContext(e.target.checked)}
                  className="rounded text-[#1A1A1A] focus:ring-0 w-3.5 h-3.5"
                />
                <span>Sync Active Ledger Data</span>
              </label>
            </div>
          </div>

          {/* Messages Scroll View */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FDFCFB]/50 dark:bg-[#14161B]/30 scrollbar-thin">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-[#1A1A1A] dark:bg-[#F3F4F6] text-white dark:text-[#111317] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                    </div>
                  )}

                  <div className="max-w-[88%] sm:max-w-[80%] space-y-1">
                    {/* Header bar of bubble */}
                    <div
                      className={`flex items-center space-x-1.5 text-[10px] text-[#6B7280] dark:text-[#9CA3AF] ${
                        isUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <span className="font-bold">
                        {isUser ? 'You' : 'Fima'}
                      </span>
                      <span>•</span>
                      <span className="font-mono-num">{msg.timestamp}</span>
                      {!isUser && (
                        <div className="flex items-center space-x-1 ml-1">
                          <button
                            onClick={() => handleToggleSpeak(msg.id, msg.content)}
                            className={`p-1 rounded-md transition-colors ${
                              speakingMessageId === msg.id
                                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60'
                                : 'hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6]'
                            }`}
                            title={
                              speakingMessageId === msg.id ? 'Stop reading aloud' : 'Read answer aloud'
                            }
                          >
                            {speakingMessageId === msg.id ? (
                              <VolumeX className="w-3 h-3 text-emerald-600 animate-pulse" />
                            ) : (
                              <Volume2 className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="p-1 hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] transition-colors"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Message Bubble with Formatted Math & Markdown */}
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? 'bg-[#1A1A1A] text-white dark:bg-[#F3F4F6] dark:text-[#111317] rounded-tr-none'
                          : 'bg-white dark:bg-[#22252E] text-[#1A1A1A] dark:text-[#F3F4F6] border border-[#E8E5DF] dark:border-[#2D323F] rounded-tl-none shadow-2xs'
                      }`}
                    >
                      <FormattedMessage content={msg.content} className="text-xs" />

                      {/* Google Search Queries if executed */}
                      {msg.searchQueries && msg.searchQueries.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-[#E8E5DF] dark:border-[#2D323F] space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7280] dark:text-[#9CA3AF] flex items-center space-x-1">
                            <Search className="w-3 h-3 text-blue-500" />
                            <span>Live Web Research:</span>
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {msg.searchQueries.map((q, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-mono-num"
                              >
                                "{q}"
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Web Grounding Citations */}
                      {msg.groundingSources && msg.groundingSources.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[#E8E5DF] dark:border-[#2D323F] space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center space-x-1">
                            <Globe className="w-3 h-3" />
                            <span>Grounded Web Citations:</span>
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {msg.groundingSources.map((src, idx) => (
                              <a
                                key={idx}
                                href={src.uri}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="flex items-center justify-between p-1.5 rounded-lg bg-[#F7F5F2] dark:bg-[#1A1D24] hover:bg-[#E8E5DF] dark:hover:bg-[#2D323F] border border-[#E8E5DF] dark:border-[#2D323F] text-[11px] text-[#1A1A1A] dark:text-[#F3F4F6] transition-colors truncate group"
                              >
                                <span className="truncate pr-1 font-medium group-hover:underline">
                                  {src.title || src.uri}
                                </span>
                                <ExternalLink className="w-3 h-3 shrink-0 text-[#6B7280]" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#1A1A1A] text-white dark:bg-[#F3F4F6] dark:text-[#111317] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 animate-spin" />
                </div>
                <div className="p-3.5 rounded-2xl rounded-tl-none bg-white dark:bg-[#22252E] border border-[#E8E5DF] dark:border-[#2D323F] text-xs shadow-2xs space-y-2">
                  <div className="flex items-center space-x-2 text-[#6B7280] dark:text-[#9CA3AF]">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                    <span>
                      {enableSearch
                        ? 'Fima is searching live web data & evaluating ledger context...'
                        : 'Fima is calculating formulas and formulating insights...'}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Mathematical Formulas Carousel */}
          <div className="px-3 py-1.5 border-t border-[#E8E5DF]/70 dark:border-[#2D323F]/70 bg-[#FAF9F7] dark:bg-[#16181F] flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[10px] font-bold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider shrink-0 flex items-center space-x-1">
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Formulas:</span>
            </span>
            {FORMULA_SHORTCUTS.map((fs, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(fs.prompt)}
                disabled={isLoading}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-white dark:bg-[#22252E] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[#1A1A1A] dark:text-[#F3F4F6] hover:text-emerald-700 dark:hover:text-emerald-300 border border-[#E8E5DF] dark:border-[#2D323F] text-[11px] font-medium transition-all shadow-2xs whitespace-nowrap active:scale-95 disabled:opacity-40"
              >
                {fs.label}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 border-t border-[#E8E5DF] dark:border-[#2D323F] bg-white dark:bg-[#1A1D24] space-y-2">
            <div className="flex items-center space-x-2">
              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={2}
                placeholder={`Ask Fima anything: formulas, budget audit, debt payoffs, or general knowledge... (Press Enter)`}
                className="flex-1 bg-[#F7F5F2] dark:bg-[#22252E] border border-[#E8E5DF] dark:border-[#2D323F] focus:border-[#1A1A1A] dark:focus:border-[#F3F4F6] rounded-xl p-2.5 text-xs text-[#1A1A1A] dark:text-[#F3F4F6] placeholder-[#9CA3AF] resize-none outline-none transition-all"
              />

              <div className="flex flex-col space-y-1.5 shrink-0">
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputPrompt.trim() || isLoading}
                  className="p-3 bg-[#1A1A1A] hover:bg-[#333333] dark:bg-[#F3F4F6] dark:hover:bg-[#E5E7EB] text-white dark:text-[#111317] rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95 flex items-center justify-center"
                  title="Send message to Fima"
                >
                  <Send className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsLiveVoiceOpen(true)}
                  className="p-2 bg-[#F7F5F2] dark:bg-[#22252E] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[#6B7280] hover:text-emerald-600 dark:text-[#9CA3AF] dark:hover:text-emerald-400 border border-[#E8E5DF] dark:border-[#2D323F] rounded-xl transition-all flex items-center justify-center"
                  title="Open Fima Voice Dialogue"
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Micro Status Bar */}
            <div className="flex items-center justify-between text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>
                    Profile: <strong>{profileName}</strong> ({currency})
                  </span>
                </span>
                {enableSearch && (
                  <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center space-x-1">
                    <Globe className="w-3 h-3" />
                    <span>Search Grounding</span>
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-[10px] font-mono-num text-[#9CA3AF]">
                Shift + Enter for line break
              </span>
            </div>

            {/* Faint subtle footer */}
            <p className="text-[10px] text-[#9CA3AF]/60 dark:text-[#6B7280]/60 text-center tracking-wider pt-1 border-t border-[#E8E5DF]/50 dark:border-[#2D323F]/50">
              Fima • Finance Manager AI • powered by gemini
            </p>
          </div>
        </div>

        {/* Right Column: Ledger Financial Scope & Quick Inquiries (Collapsible on mobile) */}
        <div className={`space-y-4 ${showLedgerSidebar ? 'block' : 'hidden lg:block'}`}>
          {/* Active Financial Scope Card */}
          <div className="bg-white dark:bg-[#1A1D24] border border-[#E8E5DF] dark:border-[#2D323F] rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] dark:border-[#2D323F] pb-2.5">
              <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F3F4F6] flex items-center space-x-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live Ledger Scope</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#F7F5F2] dark:bg-[#22252E] text-[10px] font-mono-num font-bold text-[#6B7280]">
                {currency}
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono-num">
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] dark:text-[#9CA3AF]">Net Balance:</span>
                <span
                  className={`font-bold ${netBalance >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}
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
                <span className="text-[#6B7280] dark:text-[#9CA3AF]">Active Budgets:</span>
                <span className="font-semibold text-[#1A1A1A] dark:text-[#F3F4F6]">
                  {budgets.length} categories
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

            <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed pt-2 border-t border-[#E8E5DF] dark:border-[#2D323F]">
              Fima has direct visibility into these figures to compute exact budgets and payoff
              projections.
            </p>
          </div>

          {/* Suggested Inquiries Card */}
          <div className="bg-white dark:bg-[#1A1D24] border border-[#E8E5DF] dark:border-[#2D323F] rounded-2xl p-4 shadow-xs space-y-3">
            <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F3F4F6] block border-b border-[#E8E5DF] dark:border-[#2D323F] pb-2">
              Explore with Fima
            </span>

            <div className="space-y-2">
              {QUICK_PROMPTS.map((qp, idx) => {
                const Icon = qp.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (qp.enableSearch) setEnableSearch(true);
                      handleSendMessage(qp.prompt, qp.enableSearch);
                    }}
                    className="w-full text-left p-2.5 rounded-xl border border-[#E8E5DF] dark:border-[#2D323F] hover:border-[#1A1A1A] dark:hover:border-[#F3F4F6] bg-[#FDFCFB] dark:bg-[#14161B] hover:bg-[#F7F5F2] dark:hover:bg-[#22252E] transition-all group"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F3F4F6] group-hover:underline truncate">
                        {qp.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] line-clamp-2">
                      {qp.prompt}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voice Feature Quick Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
              <Mic className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span>Fima Live Voice &amp; Text</span>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 leading-relaxed">
              Prefer speaking? Connect directly to talk with Fima aloud or text in real-time with continuous speech playback.
            </p>
            <button
              onClick={() => setIsLiveVoiceOpen(true)}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              Open Voice Session
            </button>
          </div>
        </div>
      </div>

      {/* Live Voice Modal */}
      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
      />
    </div>
  );
};
