import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { WebSocket, WebSocketServer } from 'ws';

let aiClient: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface ChatMessagePayload {
  role: 'user' | 'model';
  content: string;
}

export interface GroundingWebSource {
  title?: string;
  uri?: string;
}

export interface ChatResponsePayload {
  text: string;
  modelUsed: string;
  groundingSources?: GroundingWebSource[];
  searchQueries?: string[];
}

export async function chatFinancialAdvisor(params: {
  messages: ChatMessagePayload[];
  model?: string;
  enableSearch?: boolean;
  profileContext?: {
    profileName?: string;
    currency?: string;
    profileType?: string;
    userName?: string;
    userEmail?: string;
    netBalance?: number;
    totalIncome?: number;
    totalExpense?: number;
    monthlyIncome?: number;
    monthlyExpenses?: number;
    savingsRate?: number;
    totalSavedInGoals?: number;
    totalIOwe?: number;
    totalOwedToMe?: number;
    budgetsSummary?: string;
    goalsSummary?: string;
    debtsSummary?: string;
    recentTransactionsSummary?: string;
  };
}): Promise<ChatResponsePayload> {
  const ai = getGenAI();

  // Model selection per requirements:
  // - gemini-3.1-pro-preview for particularly complex tasks
  // - gemini-3.5-flash for general tasks (and search grounding)
  // - gemini-3.1-flash-lite for tasks that should happen fast
  let selectedModel = params.model || 'gemini-3.5-flash';
  if (params.enableSearch) {
    // Search grounding requires gemini-3.5-flash per requirements
    selectedModel = 'gemini-3.5-flash';
  }

  // Validate allowed models
  const validModels = ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite'];
  if (!validModels.includes(selectedModel)) {
    selectedModel = 'gemini-3.5-flash';
  }

  const ctx = params.profileContext;
  const contextDescription = ctx
    ? `\nCURRENT USER & ACTIVE LEDGER DATA:
- Active Profile: ${ctx.profileName || 'Default'} (${ctx.currency || 'USD'}, Type: ${ctx.profileType || 'Personal'})
- User Name: ${ctx.userName || 'User'}
- User Email: ${ctx.userEmail || 'N/A'}
- Net Ledger Balance: ${ctx.currency || 'USD'} ${ctx.netBalance?.toLocaleString() ?? '0'}
- Total Income: ${ctx.currency || 'USD'} ${ctx.totalIncome?.toLocaleString() ?? '0'}
- Total Expense: ${ctx.currency || 'USD'} ${ctx.totalExpense?.toLocaleString() ?? '0'}
- Current Month Income: ${ctx.currency || 'USD'} ${ctx.monthlyIncome?.toLocaleString() ?? '0'}
- Current Month Expense: ${ctx.currency || 'USD'} ${ctx.monthlyExpenses?.toLocaleString() ?? '0'}
- Savings Rate: ${ctx.savingsRate != null ? `${ctx.savingsRate}%` : 'N/A'}
- Total Saved in Goals: ${ctx.currency || 'USD'} ${ctx.totalSavedInGoals?.toLocaleString() ?? '0'}
- Total Owed (Debts I Owe): ${ctx.currency || 'USD'} ${ctx.totalIOwe?.toLocaleString() ?? '0'}
- Total Owed to User: ${ctx.currency || 'USD'} ${ctx.totalOwedToMe?.toLocaleString() ?? '0'}
- Active Budgets: ${ctx.budgetsSummary || 'No active budgets set'}
- Savings Goals: ${ctx.goalsSummary || 'No savings goals configured'}
- Active Debts & Liabilities: ${ctx.debtsSummary || 'No debt obligations'}
- Recent Transactions: ${ctx.recentTransactionsSummary || 'None recently logged'}`
    : '';

  const systemInstruction = `You are Fima (Finance Manager AI), an extraordinary personal AI intelligence assistant and wealth strategist embedded directly inside the Ledger platform.
You are like a dedicated, deeply capable Mini Gemini built specifically for this application and for the user.

YOUR IDENTITY & KNOWLEDGE SCOPE:
1. Name: Fima (Finance Manager AI).
2. Comprehensive General & Financial Intelligence: You have deep, expert knowledge about LITERALLY EVERYTHING—not only personal finance, budgeting, investments, debt amortization, corporate accounting, and currency markets, but also general science, mathematics, coding, business strategy, creative writing, productivity, and everyday inquiries. You are not a narrow chatbot; you are a fully capable intelligence assistant.
3. Natural Language & Tone: Always respond in natural, clear, warm, and engaging language. Avoid robotic phrasing or superficial jargon. When explaining complex ideas, break them down intuitively like a brilliant mentor and partner.
4. Actual Mathematical Formulas: When presenting financial formulas, equations, or mathematical models (e.g. Compound Interest, Loan Amortization, Rule of 72, Net Present Value, Future Value of Annuity, Debt Payoff velocities, 50/30/20 breakdown, or statistical analysis), ALWAYS write the actual formal mathematical formulas using standard LaTeX notation ($...$ for inline formulas or $$...$$ for display formulas). Define each variable clearly (e.g. $P$ for principal, $r$ for rate, $n$ for compounding intervals, $t$ for time), and show step-by-step arithmetic substituting their actual ledger numbers so they can see the exact math and outcomes clearly.
5. Ledger Awareness: You have real-time access to the user's active financial ledger, account balances, budgets, savings goals, debts, and recent transactions. When they ask questions about their money, ALWAYS refer to their actual numbers and provide specific calculations.
6. Memory & Continuity: You maintain continuous conversation memory within the thread. Remember previous points the user raised, their ongoing strategies, and context.
7. Scannable Presentation: Use crisp markdown with clean headings, bold key figures, structured tables, and bullet points.
${contextDescription}`;

  const config: any = {
    systemInstruction,
  };

  if (params.enableSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  const contents = params.messages.map((m) => ({
    role: m.role === 'model' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  try {
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config,
    });

    const text = response.text || '';

    // Extract search grounding metadata if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const searchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries;

    const sources: GroundingWebSource[] = [];
    if (Array.isArray(groundingChunks)) {
      for (const chunk of groundingChunks) {
        if (chunk && (chunk as any).web) {
          const web = (chunk as any).web;
          if (web.uri) {
            sources.push({
              title: web.title || web.uri,
              uri: web.uri,
            });
          }
        }
      }
    }

    return {
      text,
      modelUsed: selectedModel,
      groundingSources: sources.length > 0 ? sources : undefined,
      searchQueries: Array.isArray(searchQueries) ? searchQueries : undefined,
    };
  } catch (err: any) {
    console.warn(`[Gemini API Warning with ${selectedModel}]:`, err.message);

    // If search tool was enabled and failed (e.g. rate limit/quota), retry without search tool
    if (params.enableSearch) {
      try {
        console.info('Retrying request without search grounding tool fallback...');
        const noSearchConfig = { ...config };
        delete noSearchConfig.tools;

        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents,
          config: noSearchConfig,
        });

        return {
          text: fallbackResponse.text || '',
          modelUsed: 'gemini-3.5-flash',
        };
      } catch (searchFallbackErr: any) {
        console.warn('Fallback on 3.5-flash failed, attempting with gemini-3.1-flash-lite...', searchFallbackErr.message);
        try {
          const liteResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents,
            config: { systemInstruction },
          });
          return {
            text: liteResponse.text || '',
            modelUsed: 'gemini-3.1-flash-lite',
          };
        } catch {}
      }
    }

    // If gemini-3.1-pro-preview failed due to quota/tier, fallback to gemini-3.5-flash
    if (selectedModel === 'gemini-3.1-pro-preview') {
      try {
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents,
          config: { systemInstruction },
        });
        return {
          text: fallbackResponse.text || '',
          modelUsed: 'gemini-3.5-flash',
        };
      } catch (proFallbackErr: any) {
        const liteResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: { systemInstruction },
        });
        return {
          text: liteResponse.text || '',
          modelUsed: 'gemini-3.1-flash-lite',
        };
      }
    }

    throw err;
  }
}

/**
 * Setup Live API WebSocket bridge for real-time voice conversations
 * Uses model: gemini-3.1-flash-live-preview
 */
export function setupLiveWebSocket(wss: WebSocketServer) {
  wss.on('connection', async (clientWs: WebSocket) => {
    let session: any = null;
    let isConnected = false;

    const cleanup = () => {
      if (session) {
        try {
          session.close();
        } catch {}
        session = null;
      }
      isConnected = false;
    };

    clientWs.on('close', () => {
      cleanup();
    });

    clientWs.on('error', (err) => {
      console.error('[Live WebSocket client error]:', err);
      cleanup();
    });

    try {
      const ai = getGenAI();

      session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
          systemInstruction: `You are Fima (Finance Manager AI), the voice assistant and intelligence partner for the Ledger platform.
You are like a dedicated Mini Gemini built specifically for this app and for the user.
You have real-time access to the user's current profile, balance, income, expenses, budgets, savings goals, debts, and recent transactions.
You also have deep, comprehensive knowledge about literally everything—finance, business, investing, technology, mathematics, life, culture, and general inquiries.
When speaking:
- Keep spoken responses conversational, engaging, warm, and concise (1-3 sentences per turn), like a brilliant advisor and friend.
- If greeting the user for the first time, say: "Hi, I'm Fima, your Finance Manager AI. I'm here with your live ledger ready. How can I help you today?"
- Refer directly to their financial numbers and profile details whenever relevant.
- The user can talk to you using voice or type messages directly in the session.`,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;

            // Model audio chunk
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ type: 'audio', audio }));
            }

            // Model interruption
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }

            // Text transcription if emitted by server
            const textPart = message.serverContent?.modelTurn?.parts?.find((p: any) => p.text);
            if (textPart?.text) {
              clientWs.send(JSON.stringify({ type: 'text', text: textPart.text }));
            }
          },
          onerror: (err: any) => {
            console.error('[Gemini Live API error]:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  error: err?.message || 'Live API session error occurred',
                })
              );
            }
          },
          onclose: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'closed' }));
            }
          },
        },
      });

      isConnected = true;
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'ready' }));
      }
    } catch (err: any) {
      console.error('Failed to initialize Gemini Live session:', err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            error: err.message || 'Failed to initialize voice session with Gemini Live API',
          })
        );
        clientWs.close();
      }
      return;
    }

    clientWs.on('message', (raw: any) => {
      if (!session || !isConnected) return;
      try {
        const payload = JSON.parse(raw.toString());

        // Client PCM Audio Chunk
        if (payload.type === 'audio' && payload.audio) {
          session.sendRealtimeInput({
            audio: {
              data: payload.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        }
        // Client Context Initialization
        else if (payload.type === 'init_context' && payload.context) {
          session.sendRealtimeInput({
            text: `[Context Update: ${payload.context}]`,
          });
        }
        // Client Text Input (optional conversational steering)
        else if (payload.type === 'text' && payload.text) {
          session.sendRealtimeInput({
            text: payload.text,
          });
        }
        // Client Close Signal
        else if (payload.type === 'close') {
          cleanup();
        }
      } catch (err) {
        console.error('[Error handling client message in Live WS]:', err);
      }
    });
  });
}
