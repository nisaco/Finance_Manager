import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LedgerProvider, useLedger } from './context/LedgerContext';
import { LandingPage } from './pages/LandingPage';
import { Navbar } from './components/Navbar';
import { Overview } from './pages/Overview';
import { TransactionsPage } from './pages/TransactionsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { GoalsPage } from './pages/GoalsPage';
import { DebtsPage } from './pages/DebtsPage';
import { ReportsPage } from './pages/ReportsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { AIAdvisorPage } from './pages/AIAdvisorPage';
import { AdminPage } from './pages/AdminPage';

// Modals
import { TransactionModal } from './components/Modals/TransactionModal';
import { GoalModal } from './components/Modals/GoalModal';
import { FundGoalModal } from './components/Modals/FundGoalModal';
import { BudgetModal } from './components/Modals/BudgetModal';
import { DebtModal } from './components/Modals/DebtModal';
import { CsvImportModal } from './components/Modals/CsvImportModal';
import { AuditLogModal } from './components/Modals/AuditLogModal';
import { ProfileModal } from './components/Modals/ProfileModal';
import { ProfileLockModal } from './components/Modals/ProfileLockModal';
import { LiveVoiceModal } from './components/Modals/LiveVoiceModal';
import { AdminGodModeModal } from './components/Modals/AdminGodModeModal';
import { TermsModal } from './components/TermsModal';
import { PrivacyModal } from './components/PrivacyModal';
import { APP_VERSION } from './version';
import { SplashLoader } from './components/SplashLoader';
import { SecuringWorkspaceLoader } from './components/SecuringWorkspaceLoader';
import { OverviewSkeleton, TableSkeleton, CardsGridSkeleton } from './components/SkeletonLoader';

import { Transaction, Goal, Budget, Debt } from './types';
import { CheckCircle2, AlertCircle, Info, X, Crown } from 'lucide-react';
import { api } from './api/client';

const MainShell: React.FC = () => {
  const { user } = useAuth();
  const {
    notification,
    clearNotification,
    notify,
    refreshData,
    profileModalOpen,
    closeProfileModal,
    editingProfile,
    pendingLockedProfile,
    setPendingLockedProfile,
    isLoading: isLedgerLoading,
  } = useLedger();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'transactions' | 'history' | 'budgets' | 'goals' | 'debts' | 'reports' | 'ai-advisor' | 'settings' | 'admin'
  >('overview');

  // Modal states
  const [liveVoiceModalOpen, setLiveVoiceModalOpen] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [fundGoalModalOpen, setFundGoalModalOpen] = useState(false);
  const [fundingGoal, setFundingGoal] = useState<Goal | null>(null);

  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [debtModalMode, setDebtModalMode] = useState<'create' | 'edit' | 'payment'>('create');

  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [auditLogModalOpen, setAuditLogModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(() => {
    return localStorage.getItem('ledger_open_admin_modal') === 'true';
  });
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  React.useEffect(() => {
    if (localStorage.getItem('ledger_open_admin_modal') === 'true') {
      localStorage.removeItem('ledger_open_admin_modal');
      setAdminModalOpen(true);
    }
  }, []);

  // Detect Paystack Return Redirect (e.g. ?reference=... or ?trxref=... or ?paystack_deposit_ref=...)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paystackRef = params.get('reference') || params.get('trxref');
    const depositGoalId = params.get('paystack_deposit_ref');

    // Also check cached pending deposit in sessionStorage
    let cachedPending: any = null;
    try {
      const raw = sessionStorage.getItem('pending_paystack_deposit');
      if (raw) cachedPending = JSON.parse(raw);
    } catch {
      // ignore
    }

    const refToVerify = paystackRef || (depositGoalId && cachedPending?.reference ? cachedPending.reference : null);

    if (refToVerify) {
      // Clear URL params cleanly without reloading the page
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      // Verify payment with Paystack
      api.verifyDeposit(refToVerify)
        .then(async (result) => {
          if (result.status === 'success') {
            notify(
              `🎉 Paystack payment confirmed! ${cachedPending?.amount ? `${cachedPending.currency || 'GH₵'} ${cachedPending.amount} ` : ''}credited directly to your vault.`,
              'success'
            );
            sessionStorage.removeItem('pending_paystack_deposit');
            await refreshData();
            setActiveTab('goals');
          } else if (result.status === 'pending') {
            notify('Paystack settlement is processing. Your vault balance will update shortly.', 'info');
          } else {
            notify(result.message || 'Payment verification failed or was canceled.', 'error');
          }
        })
        .catch((err) => {
          console.warn('Paystack verification error on return:', err);
          notify(err.message || 'Could not verify Paystack payment', 'error');
        });
    }
  }, [notify, refreshData]);

  // Handlers
  const handleOpenNewTx = () => {
    setEditingTx(null);
    setTxModalOpen(true);
  };

  const handleEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setTxModalOpen(true);
  };

  const handleOpenNewGoal = () => {
    setEditingGoal(null);
    setGoalModalOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalModalOpen(true);
  };

  const handleFundGoal = (goal: Goal) => {
    setFundingGoal(goal);
    setFundGoalModalOpen(true);
  };

  const handleOpenNewBudget = () => {
    setEditingBudget(null);
    setBudgetModalOpen(true);
  };

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    setBudgetModalOpen(true);
  };

  const handleOpenNewDebt = () => {
    setEditingDebt(null);
    setDebtModalMode('create');
    setDebtModalOpen(true);
  };

  const handleEditDebt = (debt: Debt) => {
    setEditingDebt(debt);
    setDebtModalMode('edit');
    setDebtModalOpen(true);
  };

  const handleRecordDebtPayment = (debt: Debt) => {
    setEditingDebt(debt);
    setDebtModalMode('payment');
    setDebtModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-canvas dark:bg-[#0F1115] text-ink dark:text-[#F3F4F6] flex flex-col font-sans selection:bg-[#1A1A1A] dark:selection:bg-[#F3F4F6] selection:text-[#FDFCFB] dark:selection:text-[#111317] transition-colors">
      
      {/* Top Fixed Header & Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
        onOpenNewTx={handleOpenNewTx}
        onOpenLiveVoice={() => setLiveVoiceModalOpen(true)}
        onOpenAdminModal={() => setAdminModalOpen(true)}
      />

      {/* Main Page Content Area with Fluid Transitions and Skeletons */}
      {/* lg-page carries the gutters and the measure cap; lg-page-bottom keeps the
          last card clear of the iOS home indicator. */}
      <main className="lg-page lg-page-bottom flex-1 py-5 sm:py-7">
        <div key={activeTab} className="animate-in fade-in-50 duration-200 ease-out">
          {activeTab === 'overview' && (
            isLedgerLoading ? (
              <OverviewSkeleton />
            ) : (
              <Overview
                onNavigateTab={(tab) => setActiveTab(tab as any)}
                onOpenNewTx={handleOpenNewTx}
                onOpenNewBudget={handleOpenNewBudget}
                onOpenNewGoal={handleOpenNewGoal}
                onFundGoal={handleFundGoal}
                onEditTx={handleEditTx}
              />
            )
          )}

          {activeTab === 'transactions' && (
            isLedgerLoading ? (
              <TableSkeleton />
            ) : (
              <TransactionsPage
                onOpenNewTx={handleOpenNewTx}
                onEditTx={handleEditTx}
                onOpenCsvImport={() => setCsvModalOpen(true)}
                onNavigateToHistory={() => setActiveTab('history')}
              />
            )
          )}

          {activeTab === 'history' && (
            <HistoryPage
              onEditTx={handleEditTx}
              onNavigateToSettings={() => setActiveTab('settings')}
            />
          )}

          {activeTab === 'budgets' && (
            isLedgerLoading ? (
              <CardsGridSkeleton count={6} />
            ) : (
              <BudgetsPage
                onOpenNewBudget={handleOpenNewBudget}
                onEditBudget={handleEditBudget}
              />
            )
          )}

          {activeTab === 'goals' && (
            isLedgerLoading ? (
              <CardsGridSkeleton count={4} />
            ) : (
              <GoalsPage
                onOpenNewGoal={handleOpenNewGoal}
                onEditGoal={handleEditGoal}
                onFundGoal={handleFundGoal}
              />
            )
          )}

          {activeTab === 'debts' && (
            isLedgerLoading ? (
              <CardsGridSkeleton count={3} />
            ) : (
              <DebtsPage
                onOpenNewDebt={handleOpenNewDebt}
                onEditDebt={handleEditDebt}
                onRecordPayment={handleRecordDebtPayment}
              />
            )
          )}

          {activeTab === 'reports' && (
            isLedgerLoading ? <OverviewSkeleton /> : <ReportsPage />
          )}

          {activeTab === 'ai-advisor' && <AIAdvisorPage />}

          {activeTab === 'settings' && (
            <SettingsPage
              onOpenAuditLogs={() => setAuditLogModalOpen(true)}
              onOpenAdminModal={() => setAdminModalOpen(true)}
              onNavigateToHistory={() => setActiveTab('history')}
            />
          )}

          {activeTab === 'admin' && (
            user?.role === 'admin' || user?.email?.toLowerCase() === 'jnkpappoe@gmail.com' ? (
              <AdminPage />
            ) : (
              <Overview
                onNavigateTab={(tab) => setActiveTab(tab as any)}
                onOpenNewTx={handleOpenNewTx}
                onOpenNewBudget={handleOpenNewBudget}
                onOpenNewGoal={handleOpenNewGoal}
                onFundGoal={handleFundGoal}
                onEditTx={handleEditTx}
              />
            )
          )}
        </div>
      </main>

      {/* Toast Notification Alert Banner */}
      {notification && (
        <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs font-medium backdrop-blur-md max-w-md ${
              notification.type === 'error'
                ? 'bg-[#DC2626] text-[#FFFFFF] border-[#DC2626]'
                : 'bg-[#1A1A1A] text-[#FDFCFB] border-[#1A1A1A]'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-[#FFFFFF] shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
            )}
            <span className="font-mono-num">{notification.message}</span>
            <button
              onClick={clearNotification}
              className="p-1 hover:opacity-75 rounded ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={closeProfileModal}
        initialData={editingProfile}
      />

      <ProfileLockModal
        isOpen={Boolean(pendingLockedProfile)}
        onClose={() => setPendingLockedProfile(null)}
        profile={pendingLockedProfile}
        onUnlockSuccess={() => setPendingLockedProfile(null)}
      />

      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        initialData={editingTx}
      />

      <GoalModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        initialData={editingGoal}
      />

      <FundGoalModal
        isOpen={fundGoalModalOpen}
        onClose={() => setFundGoalModalOpen(false)}
        goal={fundingGoal}
      />

      <BudgetModal
        isOpen={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        initialData={editingBudget}
      />

      <DebtModal
        isOpen={debtModalOpen}
        onClose={() => setDebtModalOpen(false)}
        initialData={editingDebt}
        mode={debtModalMode}
      />

      <CsvImportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
      />

      <AuditLogModal
        isOpen={auditLogModalOpen}
        onClose={() => setAuditLogModalOpen(false)}
      />

      <LiveVoiceModal
        isOpen={liveVoiceModalOpen}
        onClose={() => setLiveVoiceModalOpen(false)}
      />

      <AdminGodModeModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
      />

      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        isAccepted={true}
      />

      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        isAccepted={true}
      />

      {/* Footer: what this is, which build you are on, and the legal links. */}
      <footer className="border-t border-line">
        <div className="lg-page py-5 flex flex-col sm:flex-row items-center justify-between gap-x-4 gap-y-2 text-center sm:text-left">
          <span className="t-meta">
            Ledger · Personal and business financial management
            <span className="hidden sm:inline" aria-hidden="true"> · </span>
            <span className="block sm:inline">
              Version <span className="num">{APP_VERSION}</span>
            </span>
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowTermsModal(true)} className="lg-btn lg-btn-ghost lg-btn-sm">
              Terms and conditions
            </button>
            <button onClick={() => setShowPrivacyModal(true)} className="lg-btn lg-btn-ghost lg-btn-sm">
              Privacy policy
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
};

const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashLoader onComplete={() => setShowSplash(false)} />;
  }

  if (isAuthLoading) {
    return <SecuringWorkspaceLoader />;
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <LedgerProvider>
      <MainShell />
    </LedgerProvider>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
