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
import { SplashLoader } from './components/SplashLoader';
import { OverviewSkeleton, TableSkeleton, CardsGridSkeleton } from './components/SkeletonLoader';

import { Transaction, Goal, Budget, Debt } from './types';
import { CheckCircle2, AlertCircle, Info, X, Crown } from 'lucide-react';

const MainShell: React.FC = () => {
  const { user } = useAuth();
  const {
    notification,
    clearNotification,
    profileModalOpen,
    closeProfileModal,
    editingProfile,
    pendingLockedProfile,
    setPendingLockedProfile,
    isLoading: isLedgerLoading,
  } = useLedger();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'transactions' | 'budgets' | 'goals' | 'debts' | 'reports' | 'ai-advisor' | 'settings' | 'admin'
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
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-[#0F1115] text-[#1A1A1A] dark:text-[#F3F4F6] flex flex-col font-sans selection:bg-[#1A1A1A] dark:selection:bg-[#F3F4F6] selection:text-[#FDFCFB] dark:selection:text-[#111317] transition-colors">
      
      {/* Top Fixed Header & Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
        onOpenNewTx={handleOpenNewTx}
        onOpenLiveVoice={() => setLiveVoiceModalOpen(true)}
        onOpenAdminModal={() => setAdminModalOpen(true)}
      />

      {/* Main Page Content Area with Fluid Transitions and Skeletons */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
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
              />
            )
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

      {/* Footer info banner with legal links */}
      <footer className="border-t border-[#E8E5DF] dark:border-[#2D323F] py-4 px-6 text-center text-[11px] text-[#6B7280] dark:text-[#9CA3AF] font-mono-num transition-colors flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <div>
          Ledger • Personal &amp; Business Financial Management
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowTermsModal(true)}
            className="hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] underline transition-colors"
          >
            Terms &amp; Conditions
          </button>
          <span>•</span>
          <button
            onClick={() => setShowPrivacyModal(true)}
            className="hover:text-[#1A1A1A] dark:hover:text-[#F3F4F6] underline transition-colors"
          >
            Privacy Policy
          </button>
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
    return (
      <div className="min-h-screen bg-[#FDFCFB] dark:bg-[#0B0D11] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#252830] to-[#121418] text-white dark:from-[#FFFFFF] dark:to-[#E5E7EB] dark:text-[#111317] flex items-center justify-center font-bold text-lg mb-4 shadow-xl border border-white/10 dark:border-white/40 animate-pulse">
          L
        </div>
        <div className="text-[11px] font-mono tracking-[0.2em] text-[#6B7280] dark:text-[#9CA3AF] uppercase">
          Securing Workspace...
        </div>
      </div>
    );
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
