"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createInvestmentAsset,
  createInvestmentOperation,
  createAccountTransfer,
  createCategory,
  createBudget,
  createDollarSaving,
  createFinancialAccount,
  createSavingGoal,
  createTransaction,
  deleteBudget,
  deleteCategory,
  deleteDollarSaving,
  deleteInvestmentAsset,
  deleteSavingGoal,
  deleteTransaction,
  generateMonthlyReport,
  generateNotifications,
  getAiReports,
  getAccountTransfers,
  getBinanceAccount,
  getBinanceBalanceSnapshots,
  getBinanceIntegration,
  getBinancePortfolioSummary,
  getBudgets,
  getBudgetUsage,
  getCategoryExpenseIncrease,
  getCategories,
  getDollarSavings,
  getFinancialAccounts,
  getInvestmentAlerts,
  getInvestmentAssets,
  getInvestmentOperations,
  getInvestmentPriceHistory,
  getJobRuns,
  getMercadoPagoSyncJobStatus,
  getPortfolioRefreshJobStatus,
  getMarketDataIntegrations,
  getMercadoPagoIntegration,
  getMonthlyComparison,
  getMonthlyProjection,
  getMonthlySummary,
  getNotifications,
  getPortfolioSummary,
  getSavingGoals,
  getSpendingInsights,
  getTransactions,
  addSavingGoalContribution,
  markAllNotificationsRead,
  markNotificationRead,
  refreshMarketPrices,
  runMercadoPagoSyncJob,
  runPortfolioRefreshJob,
  simulateCompoundInterest,
  syncBinanceBalances,
  updateBinanceIntegration,
  updateBudget,
  updateCategory,
  updateDollarSaving,
  updateInvestmentAsset,
  updateInvestmentOperation,
  updateMarketDataIntegration,
  updateSavingGoal,
  updateTransaction
} from "@/services/api";
import type { Language, TranslationKey } from "@/i18n";
import { translations } from "@/i18n";
import type {
  AccountTransfer,
  AccountType,
  AppNotification,
  AiReport,
  BinanceAccount,
  BinanceBalanceSnapshot,
  BinanceIntegration,
  BinancePortfolioSummary,
  BinanceSyncResponse,
  Budget,
  BudgetUsage,
  Category,
  CategoryExpenseIncrease,
  CategoryType,
  CompoundInterestRequest,
  CompoundInterestResponse,
  DollarSaving,
  DollarSavingSource,
  FinancialAccount,
  InvestmentAlertsResponse,
  InvestmentAsset,
  InvestmentAssetType,
  InvestmentOperation,
  InvestmentOperationType,
  InvestmentPriceSnapshot,
  InvestmentRiskLevel,
  JobRun,
  JobStatus,
  MarketDataIntegrationsResponse,
  MarketDataIntegrationUpdate,
  MarketDataRefreshResponse,
  MercadoPagoIntegration,
  MonthlyComparison,
  MonthlyProjection,
  MonthlySummary,
  PortfolioSummary,
  SavingGoal,
  SavingGoalStatus,
  SpendingInsightsResponse,
  Transaction,
  TransactionType
} from "@/types/api";
import { AiAssistantBubble } from "@/components/dashboard/AiAssistantBubble";
import { AccountsManager } from "@/components/dashboard/AccountsManager";
import { AiReportPanel } from "@/components/dashboard/AiReportPanel";
import { BiggestExpenseIncreasePanel } from "@/components/dashboard/BiggestExpenseIncreasePanel";
import { BudgetManager } from "@/components/dashboard/BudgetManager";
import { CashflowChart } from "@/components/dashboard/CashflowChart";
import { CategoryManager } from "@/components/dashboard/CategoryManager";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSectionNav, type DashboardSection } from "@/components/dashboard/DashboardSectionNav";
import { DashboardSectionHero } from "@/components/dashboard/DashboardSectionHero";
import { DollarSavingsManager, buildDollarSavingsSnapshot } from "@/components/dashboard/DollarSavingsManager";
import { ExpenseCategories } from "@/components/dashboard/ExpenseCategories";
import { ExecutiveFocus, focusIcons } from "@/components/dashboard/ExecutiveFocus";
import { FinancialHealthPanel } from "@/components/dashboard/FinancialHealthPanel";
import { GoalsManager } from "@/components/dashboard/GoalsManager";
import { InvestmentsManager } from "@/components/dashboard/InvestmentsManager";
import { MercadoPagoWalletPanel } from "@/components/dashboard/MercadoPagoWalletPanel";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { MonthlyComparisonPanel } from "@/components/dashboard/MonthlyComparisonPanel";
import { MonthlyProjectionPanel } from "@/components/dashboard/MonthlyProjectionPanel";
import { NotificationsInbox } from "@/components/dashboard/NotificationsInbox";
import { PlanningPanel } from "@/components/dashboard/PlanningPanel";
import { PrioritizedAlertsPanel } from "@/components/dashboard/PrioritizedAlertsPanel";
import { QuickActionsBar, quickActionIcons } from "@/components/dashboard/QuickActionsBar";
import { QuickTransactionPanel } from "@/components/dashboard/QuickTransactionPanel";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { StatusToast } from "@/components/dashboard/StatusToast";
import { TopExpenseCategoriesPanel } from "@/components/dashboard/TopExpenseCategoriesPanel";
import { TransactionManager } from "@/components/dashboard/TransactionManager";
import { formatMoney } from "@/lib/format";

type Props = {
  token: string | null;
  userName: string;
  sessionRemainingMs: number;
  onLogout: () => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
};

export function Dashboard({ token, userName, sessionRemainingMs, onLogout, language, onLanguageChange }: Props) {
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparison | null>(null);
  const [monthlyProjection, setMonthlyProjection] = useState<MonthlyProjection | null>(null);
  const [categoryExpenseIncrease, setCategoryExpenseIncrease] = useState<CategoryExpenseIncrease | null>(null);
  const [aiReports, setAiReports] = useState<AiReport[]>([]);
  const [binanceAccount, setBinanceAccount] = useState<BinanceAccount | null>(null);
  const [binanceIntegration, setBinanceIntegration] = useState<BinanceIntegration | null>(null);
  const [binancePortfolioSummary, setBinancePortfolioSummary] = useState<BinancePortfolioSummary | null>(null);
  const [binanceSnapshots, setBinanceSnapshots] = useState<BinanceBalanceSnapshot[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [accountTransfers, setAccountTransfers] = useState<AccountTransfer[]>([]);
  const [report, setReport] = useState<AiReport | null>(null);
  const [selectedReportPeriod, setSelectedReportPeriod] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [selectedDashboardPeriod, setSelectedDashboardPeriod] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetUsage, setBudgetUsage] = useState<BudgetUsage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dollarSavings, setDollarSavings] = useState<DollarSaving[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [investmentAssets, setInvestmentAssets] = useState<InvestmentAsset[]>([]);
  const [investmentAlerts, setInvestmentAlerts] = useState<InvestmentAlertsResponse | null>(null);
  const [investmentOperations, setInvestmentOperations] = useState<InvestmentOperation[]>([]);
  const [jobRuns, setJobRuns] = useState<JobRun[]>([]);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [mercadoPagoJobRuns, setMercadoPagoJobRuns] = useState<JobRun[]>([]);
  const [mercadoPagoJobStatus, setMercadoPagoJobStatus] = useState<JobStatus | null>(null);
  const [marketDataIntegrations, setMarketDataIntegrations] = useState<MarketDataIntegrationsResponse | null>(null);
  const [marketDataRefresh, setMarketDataRefresh] = useState<MarketDataRefreshResponse | null>(null);
  const [mercadoPagoIntegration, setMercadoPagoIntegration] = useState<MercadoPagoIntegration | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [spendingInsights, setSpendingInsights] = useState<SpendingInsightsResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeSection, setActiveSection] = useState<DashboardSection>("dashboard");
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isGeneratingNotifications, setIsGeneratingNotifications] = useState(false);
  const [isRunningPortfolioWorker, setIsRunningPortfolioWorker] = useState(false);
  const [isRunningMercadoPagoWorker, setIsRunningMercadoPagoWorker] = useState(false);
  const [isQuickTransactionOpen, setIsQuickTransactionOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const t = (key: TranslationKey) => translations[language][key];
  const [status, setStatus] = useState(t("localPreviewData"));

  const metrics = useMemo(() => {
    if (!summary) {
      return {
        balance: 0,
        income: 0,
        expenses: 0,
        savingsRate: 0
      };
    }

    return {
      balance: Number(summary.net_balance),
      income: Number(summary.total_income),
      expenses: Number(summary.total_expense),
      savingsRate: summary.savings_rate
    };
  }, [summary]);

  const cashflowData = useMemo(() => {
    if (!summary) {
      return [];
    }

    return [
      {
        name: `${summary.month}/${summary.year}`,
        income: Number(summary.total_income),
        expenses: Number(summary.total_expense)
      }
    ];
  }, [summary]);

  const expenseCategoryData = useMemo(
    () =>
      summary?.expense_by_category.map((category) => ({
        name: category.category_name,
        value: Number(category.total)
      })) ?? [],
    [summary]
  );

  const dollarSavingsSnapshot = useMemo(
    () =>
      buildDollarSavingsSnapshot({
        categories,
        manualAmount: dollarSavings.reduce((total, saving) => total + Number(saving.amount), 0),
        transactions
      }),
    [categories, dollarSavings, transactions]
  );

  const sectionSummaryItems = useMemo(() => {
    const activeBudgetAlerts = budgetUsage.filter((budget) => budget.is_over_budget || budget.is_near_limit).length;
    const activeGoals = goals.filter((goal) => goal.status === "active").length;
    const investmentAlertCount = investmentAlerts?.alerts.length ?? 0;
    const insightCount = spendingInsights?.insights.length ?? 0;

    const itemsBySection = {
      dashboard: [
        { label: t("summaryMovements"), value: String(transactions.length), tone: "neutral" as const },
        { label: t("summaryCategories"), value: String(categories.length), tone: "neutral" as const },
        {
          label: t("summaryBudgetAlerts"),
          value: String(activeBudgetAlerts),
          tone: activeBudgetAlerts > 0 ? ("warn" as const) : ("good" as const)
        },
        {
          label: t("summaryInvestmentAlerts"),
          value: String(investmentAlertCount),
          tone: investmentAlertCount > 0 ? ("warn" as const) : ("good" as const)
        }
      ],
      movements: [
        { label: t("summaryMovements"), value: String(transactions.length), tone: "neutral" as const },
        { label: t("summaryCategories"), value: String(categories.length), tone: "neutral" as const },
        { label: t("summaryIncomeCategories"), value: String(categories.filter((category) => category.type === "income").length), tone: "good" as const },
        { label: t("summaryExpenseCategories"), value: String(categories.filter((category) => category.type === "expense").length), tone: "bad" as const }
      ],
      budgets: [
        { label: t("summaryActiveBudgets"), value: String(budgets.length), tone: "neutral" as const },
        {
          label: t("summaryBudgetAlerts"),
          value: String(activeBudgetAlerts),
          tone: activeBudgetAlerts > 0 ? ("warn" as const) : ("good" as const)
        },
        { label: t("summaryExpenseCategories"), value: String(categories.filter((category) => category.type === "expense").length), tone: "neutral" as const },
        { label: t("summaryCurrentMonth"), value: `${selectedDashboardPeriod.month}/${selectedDashboardPeriod.year}`, tone: "neutral" as const }
      ],
      goals: [
        { label: t("summaryGoals"), value: String(goals.length), tone: "neutral" as const },
        { label: t("summaryActiveGoals"), value: String(activeGoals), tone: "good" as const },
        { label: t("summaryCompletedGoals"), value: String(goals.filter((goal) => goal.status === "completed").length), tone: "good" as const },
        { label: t("summaryPausedGoals"), value: String(goals.filter((goal) => goal.status === "paused").length), tone: "warn" as const }
      ],
      dollars: [
        { label: t("summaryDollarTotal"), value: `USD ${dollarSavingsSnapshot.totalUsd.toFixed(2)}`, tone: "good" as const },
        { label: t("manualDollarStock"), value: `USD ${dollarSavingsSnapshot.manualAmount.toFixed(2)}`, tone: "neutral" as const },
        { label: t("detectedDollarPurchases"), value: `USD ${dollarSavingsSnapshot.totalPurchased.toFixed(2)}`, tone: "good" as const },
        { label: t("detectedMovements"), value: String(dollarSavingsSnapshot.detectedMovements.length), tone: "neutral" as const }
      ],
      investments: [
        { label: t("summaryAssets"), value: String(investmentAssets.length), tone: "neutral" as const },
        { label: t("summaryOperations"), value: String(investmentOperations.length), tone: "neutral" as const },
        {
          label: t("summaryInvestmentAlerts"),
          value: String(investmentAlertCount),
          tone: investmentAlertCount > 0 ? ("warn" as const) : ("good" as const)
        },
        { label: t("summaryMarketRefresh"), value: marketDataRefresh ? t("marketPricesUpdatedShort") : t("neverUpdated"), tone: marketDataRefresh ? ("good" as const) : ("warn" as const) }
      ],
      aiReports: [
        { label: t("summaryReport"), value: report ? t("reportReady") : t("reportPending"), tone: report ? ("good" as const) : ("warn" as const) },
        { label: t("summaryInsights"), value: String(insightCount), tone: insightCount > 0 ? ("warn" as const) : ("good" as const) },
        { label: t("summaryBudgetAlerts"), value: String(activeBudgetAlerts), tone: activeBudgetAlerts > 0 ? ("warn" as const) : ("good" as const) },
        { label: t("summarySimulations"), value: t("available"), tone: "neutral" as const }
      ]
    };

    return itemsBySection[activeSection];
  }, [
    activeSection,
    budgetUsage,
    budgets.length,
    categories,
    goals,
    investmentAlerts,
    investmentAssets.length,
    investmentOperations.length,
    language,
    selectedDashboardPeriod,
    dollarSavingsSnapshot,
    marketDataRefresh,
    report,
    spendingInsights,
    transactions.length
  ]);

  const executiveFocusItems = useMemo(() => {
    const activeBudgetAlerts = budgetUsage.filter((budget) => budget.is_over_budget || budget.is_near_limit).length;
    const activeGoals = goals.filter((goal) => goal.status === "active").length;
    const items = [];

    if (transactions.length === 0) {
      items.push({
        actionKey: "focusAddMovementAction" as const,
        bodyKey: "focusAddMovementBody" as const,
        icon: focusIcons.movement,
        section: "movements" as const,
        titleKey: "focusAddMovementTitle" as const,
        tone: "cyan" as const
      });
    }

    if (activeBudgetAlerts > 0) {
      items.push({
        actionKey: "focusBudgetAlertAction" as const,
        bodyKey: "focusBudgetAlertBody" as const,
        icon: focusIcons.budget,
        section: "budgets" as const,
        titleKey: "focusBudgetAlertTitle" as const,
        tone: "amber" as const
      });
    } else if (budgets.length === 0) {
      items.push({
        actionKey: "focusCreateBudgetAction" as const,
        bodyKey: "focusCreateBudgetBody" as const,
        icon: focusIcons.budget,
        section: "budgets" as const,
        titleKey: "focusCreateBudgetTitle" as const,
        tone: "cyan" as const
      });
    }

    if (activeGoals === 0) {
      items.push({
        actionKey: "focusGoalAction" as const,
        bodyKey: "focusGoalBody" as const,
        icon: focusIcons.goal,
        section: "goals" as const,
        titleKey: "focusGoalTitle" as const,
        tone: "emerald" as const
      });
    }

    if (!report) {
      items.push({
        actionKey: "focusAiReportAction" as const,
        bodyKey: "focusAiReportBody" as const,
        icon: focusIcons.ai,
        section: "aiReports" as const,
        titleKey: "focusAiReportTitle" as const,
        tone: "cyan" as const
      });
    }

    if (items.length === 0) {
      items.push({
        actionKey: "focusHealthyAction" as const,
        bodyKey: "focusHealthyBody" as const,
        icon: focusIcons.healthy,
        section: "dashboard" as const,
        titleKey: "focusHealthyTitle" as const,
        tone: "emerald" as const
      });
    }

    return items.slice(0, 3);
  }, [budgetUsage, budgets.length, goals, report, transactions.length]);

  const assistantItems = useMemo(() => {
    const activeBudgetAlerts = budgetUsage.filter((budget) => budget.is_over_budget || budget.is_near_limit);
    const activeGoals = goals.filter((goal) => goal.status === "active");
    const sortedExpenseCategories = [...expenseCategoryData].sort((left, right) => right.value - left.value);
    const topExpenseCategory = sortedExpenseCategories[0];
    const items = [];

    if (metrics.balance < 0) {
      items.push({
        actionKey: "aiAssistantReviewMovementsAction" as const,
        bodyKey: "aiAssistantNegativeBalanceBody" as const,
        detail: formatMoney(metrics.balance),
        icon: focusIcons.movement,
        section: "movements" as const,
        titleKey: "aiAssistantNegativeBalanceTitle" as const,
        tone: "rose" as const
      });
    }

    if (activeBudgetAlerts.length > 0) {
      items.push({
        actionKey: "focusBudgetAlertAction" as const,
        bodyKey: "aiAssistantBudgetAlertBody" as const,
        detail: `${activeBudgetAlerts.length} ${t("summaryBudgetAlerts").toLowerCase()}`,
        icon: focusIcons.budget,
        section: "budgets" as const,
        titleKey: "aiAssistantBudgetAlertTitle" as const,
        tone: "amber" as const
      });
    }

    if (topExpenseCategory) {
      items.push({
        actionKey: "aiAssistantReviewMovementsAction" as const,
        bodyKey: "aiAssistantTopExpenseBody" as const,
        detail: `${topExpenseCategory.name} - ${formatMoney(topExpenseCategory.value)}`,
        icon: focusIcons.movement,
        section: "movements" as const,
        titleKey: "aiAssistantTopExpenseTitle" as const,
        tone: "cyan" as const
      });
    }

    if (activeGoals.length === 0) {
      items.push({
        actionKey: "focusGoalAction" as const,
        bodyKey: "focusGoalBody" as const,
        icon: focusIcons.goal,
        section: "goals" as const,
        titleKey: "focusGoalTitle" as const,
        tone: "emerald" as const
      });
    }

    if (!report) {
      items.push({
        actionKey: "focusAiReportAction" as const,
        bodyKey: "focusAiReportBody" as const,
        icon: focusIcons.ai,
        section: "aiReports" as const,
        titleKey: "focusAiReportTitle" as const,
        tone: "cyan" as const
      });
    }

    if (items.length === 0) {
      items.push({
        actionKey: "focusHealthyAction" as const,
        bodyKey: "aiAssistantHealthyBody" as const,
        detail: `${t("savingsRate")}: ${Math.round(metrics.savingsRate)}%`,
        icon: focusIcons.healthy,
        section: "dashboard" as const,
        titleKey: "focusHealthyTitle" as const,
        tone: "emerald" as const
      });
    }

    return items.slice(0, 4);
  }, [budgetUsage, expenseCategoryData, goals, metrics, report, language]);

  const quickActionItems = useMemo(
    () => [
      {
        descriptionKey: "quickAddMovementDescription" as const,
        icon: quickActionIcons.movement,
        labelKey: "quickAddMovement" as const,
        type: "quickTransaction" as const,
        value: String(transactions.length)
      },
      {
        descriptionKey: "quickReviewCategoriesDescription" as const,
        icon: quickActionIcons.wallet,
        labelKey: "quickReviewCategories" as const,
        section: "movements" as const,
        type: "section" as const,
        value: String(categories.length)
      },
      {
        descriptionKey: "quickTrackDollarsDescription" as const,
        icon: quickActionIcons.dollars,
        labelKey: "quickTrackDollars" as const,
        section: "dollars" as const,
        type: "section" as const,
        value: `USD ${dollarSavingsSnapshot.totalUsd.toFixed(0)}`
      },
      {
        descriptionKey: "quickRegisterInvestmentDescription" as const,
        icon: quickActionIcons.investment,
        labelKey: "quickRegisterInvestment" as const,
        section: "investments" as const,
        type: "section" as const,
        value: String(investmentAssets.length)
      },
      {
        descriptionKey: "quickAiReportDescription" as const,
        icon: quickActionIcons.ai,
        labelKey: "quickAiReport" as const,
        section: "aiReports" as const,
        type: "section" as const,
        value: report ? t("reportReady") : t("reportPending")
      }
    ],
    [categories.length, dollarSavingsSnapshot.totalUsd, investmentAssets.length, language, report, transactions.length]
  );

  function handleDashboardPeriodChange(direction: "previous" | "next" | "current") {
    if (direction === "current") {
      const now = new Date();
      setSelectedDashboardPeriod({ year: now.getFullYear(), month: now.getMonth() + 1 });
      return;
    }

    setSelectedDashboardPeriod((current) => {
      const date = new Date(current.year, current.month - 1 + (direction === "previous" ? -1 : 1), 1);
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    });
  }

  const refreshFromApi = useCallback(async () => {
    if (!token) {
      setStatus(t("signInToSync"));
      return;
    }

    setIsSyncing(true);

    try {
      const year = selectedDashboardPeriod.year;
      const month = selectedDashboardPeriod.month;
      const [
        summaryResponse,
        accountTransfersResponse,
        accountsResponse,
        binanceIntegrationResponse,
        binancePortfolioSummaryResponse,
        binanceSnapshotsResponse,
        monthlyComparisonResponse,
        monthlyProjectionResponse,
        categoryExpenseIncreaseResponse,
        reportsResponse,
        budgetsResponse,
        budgetUsageResponse,
        categoriesResponse,
        dollarSavingsResponse,
        goalsResponse,
        investmentAlertsResponse,
        investmentAssetsResponse,
        investmentOperationsResponse,
        jobRunsResponse,
        jobStatusResponse,
        mercadoPagoJobRunsResponse,
        mercadoPagoJobStatusResponse,
        marketDataIntegrationsResponse,
        mercadoPagoIntegrationResponse,
        notificationsResponse,
        portfolioResponse,
        spendingInsightsResponse,
        transactionsResponse
      ] = await Promise.all([
        getMonthlySummary(token, year, month),
        getAccountTransfers(token),
        getFinancialAccounts(token),
        getBinanceIntegration(token),
        getBinancePortfolioSummary(token),
        getBinanceBalanceSnapshots(token),
        getMonthlyComparison(token, year, month),
        getMonthlyProjection(token, year, month),
        getCategoryExpenseIncrease(token, year, month),
        getAiReports(token),
        getBudgets(token, year, month),
        getBudgetUsage(token, year, month),
        getCategories(token),
        getDollarSavings(token),
        getSavingGoals(token),
        getInvestmentAlerts(token),
        getInvestmentAssets(token),
        getInvestmentOperations(token),
        getJobRuns(token, "portfolio_refresh"),
        getPortfolioRefreshJobStatus(token),
        getJobRuns(token, "mercado_pago_sync"),
        getMercadoPagoSyncJobStatus(token),
        getMarketDataIntegrations(token),
        getMercadoPagoIntegration(token),
        getNotifications(token),
        getPortfolioSummary(token),
        getSpendingInsights(token, year, month),
        getTransactions(token)
      ]);
      setSummary(summaryResponse);
      setAccountTransfers(accountTransfersResponse);
      setAccounts(accountsResponse);
      setBinanceIntegration(binanceIntegrationResponse);
      setBinancePortfolioSummary(binancePortfolioSummaryResponse);
      setBinanceSnapshots(binanceSnapshotsResponse);
      setMonthlyComparison(monthlyComparisonResponse);
      setMonthlyProjection(monthlyProjectionResponse);
      setCategoryExpenseIncrease(categoryExpenseIncreaseResponse);
      setAiReports(reportsResponse);
      const selectedReport =
        reportsResponse.find(
          (item) =>
            item.period_year === selectedReportPeriod.year && item.period_month === selectedReportPeriod.month
        ) ?? null;
      setReport(selectedReport);
      setBudgets(budgetsResponse);
      setBudgetUsage(budgetUsageResponse);
      setCategories(categoriesResponse);
      setDollarSavings(dollarSavingsResponse);
      setGoals(goalsResponse);
      setInvestmentAlerts(investmentAlertsResponse);
      setInvestmentAssets(investmentAssetsResponse);
      setInvestmentOperations(investmentOperationsResponse);
      setJobRuns(jobRunsResponse);
      setJobStatus(jobStatusResponse);
      setMercadoPagoJobRuns(mercadoPagoJobRunsResponse);
      setMercadoPagoJobStatus(mercadoPagoJobStatusResponse);
      setMarketDataIntegrations(marketDataIntegrationsResponse);
      setMercadoPagoIntegration(mercadoPagoIntegrationResponse);
      setNotifications(notificationsResponse);
      setPortfolio(portfolioResponse);
      setSpendingInsights(spendingInsightsResponse);
      setTransactions(transactionsResponse);
      setStatus(t("backendSynced"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("networkError");
      if (message.includes("Could not validate credentials") || message.includes("Not authenticated")) {
        onLogout();
        return;
      }
      setStatus(message.includes("Could not connect") ? t("networkError") : message);
    } finally {
      setIsSyncing(false);
    }
  }, [
    token,
    language,
    selectedDashboardPeriod.month,
    selectedDashboardPeriod.year,
    selectedReportPeriod.month,
    selectedReportPeriod.year
  ]);

  async function refreshDollarSavings(tokenValue: string) {
    const dollarSavingsResponse = await getDollarSavings(tokenValue);
    setDollarSavings(dollarSavingsResponse);
  }

  async function handleGenerateMonthlyReport() {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    setIsGeneratingReport(true);

    try {
      const reportResponse = await generateMonthlyReport(
        token,
        selectedReportPeriod.year,
        selectedReportPeriod.month,
        language
      );
      setReport(reportResponse);
      setAiReports((current) =>
        [reportResponse, ...current.filter((item) => item.id !== reportResponse.id)].sort((left, right) =>
          right.period_year === left.period_year
            ? right.period_month - left.period_month
            : right.period_year - left.period_year
        )
      );
      setStatus(t("reportReady"));
      const notificationsResponse = await getNotifications(token);
      setNotifications(notificationsResponse);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    } finally {
      setIsGeneratingReport(false);
    }
  }

  function handleSelectReportPeriod(year: number, month: number) {
    setSelectedReportPeriod({ year, month });
    setReport(aiReports.find((item) => item.period_year === year && item.period_month === month) ?? null);
  }

  async function handleGenerateNotifications() {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    setIsGeneratingNotifications(true);

    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const response = await generateNotifications(token, year, month);
      const notificationsResponse = await getNotifications(token);
      setNotifications(notificationsResponse);
      setStatus(
        response.generated_count > 0
          ? `${response.generated_count} ${t("notificationsGenerated")}`
          : t("notificationsNoNew")
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    } finally {
      setIsGeneratingNotifications(false);
    }
  }

  async function handleMarkNotificationRead(notificationId: number) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      const notification = await markNotificationRead(token, notificationId);
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? notification : item))
      );
      setStatus(t("notificationRead"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleMarkAllNotificationsRead() {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      await markAllNotificationsRead(token);
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
      setStatus(t("notificationsReadAll"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function refreshCurrentMonth(tokenValue: string) {
    const year = selectedDashboardPeriod.year;
    const month = selectedDashboardPeriod.month;
    const [
      summaryResponse,
      monthlyComparisonResponse,
      monthlyProjectionResponse,
      categoryExpenseIncreaseResponse,
      budgetsResponse,
      budgetUsageResponse,
      spendingInsightsResponse
    ] = await Promise.all([
      getMonthlySummary(tokenValue, year, month),
      getMonthlyComparison(tokenValue, year, month),
      getMonthlyProjection(tokenValue, year, month),
      getCategoryExpenseIncrease(tokenValue, year, month),
      getBudgets(tokenValue, year, month),
      getBudgetUsage(tokenValue, year, month),
      getSpendingInsights(tokenValue, year, month)
    ]);
    setSummary(summaryResponse);
    setMonthlyComparison(monthlyComparisonResponse);
    setMonthlyProjection(monthlyProjectionResponse);
    setCategoryExpenseIncrease(categoryExpenseIncreaseResponse);
    setBudgets(budgetsResponse);
    setBudgetUsage(budgetUsageResponse);
    setSpendingInsights(spendingInsightsResponse);
  }

  async function refreshInvestments(tokenValue: string) {
    const [
      alertsResponse,
      assetsResponse,
      integrationsResponse,
      operationsResponse,
      portfolioResponse
    ] = await Promise.all([
      getInvestmentAlerts(tokenValue),
      getInvestmentAssets(tokenValue),
      getMarketDataIntegrations(tokenValue),
      getInvestmentOperations(tokenValue),
      getPortfolioSummary(tokenValue)
    ]);
    setInvestmentAlerts(alertsResponse);
    setInvestmentAssets(assetsResponse);
    setMarketDataIntegrations(integrationsResponse);
    setInvestmentOperations(operationsResponse);
    setPortfolio(portfolioResponse);

    const optionalResults = await Promise.allSettled([
      getBinanceIntegration(tokenValue),
      getBinancePortfolioSummary(tokenValue),
      getBinanceBalanceSnapshots(tokenValue),
      getJobRuns(tokenValue, "portfolio_refresh"),
      getPortfolioRefreshJobStatus(tokenValue)
    ]);
    const [
      binanceIntegrationResponse,
      binancePortfolioSummaryResponse,
      binanceSnapshotsResponse,
      jobRunsResponse,
      jobStatusResponse
    ] = optionalResults;

    if (binanceIntegrationResponse.status === "fulfilled") {
      setBinanceIntegration(binanceIntegrationResponse.value);
    }
    if (binancePortfolioSummaryResponse.status === "fulfilled") {
      setBinancePortfolioSummary(binancePortfolioSummaryResponse.value);
    }
    if (binanceSnapshotsResponse.status === "fulfilled") {
      setBinanceSnapshots(binanceSnapshotsResponse.value);
    }
    if (jobRunsResponse.status === "fulfilled") {
      setJobRuns(jobRunsResponse.value);
    }
    if (jobStatusResponse.status === "fulfilled") {
      setJobStatus(jobStatusResponse.value);
    }
  }

  useEffect(() => {
    void refreshFromApi();
  }, [refreshFromApi]);

  async function handleCreateCategory(payload: { name: string; type: CategoryType; color: string; icon: string }) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return undefined;
    }

    try {
      const category = await createCategory(token, payload);
      setCategories((current) => [...current, category].sort((left, right) => left.name.localeCompare(right.name)));
      setStatus(t("categoryCreated"));
      return category;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleUpdateCategory(categoryId: number, payload: { name?: string; color?: string; icon?: string }) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      const category = await updateCategory(token, categoryId, payload);
      setCategories((current) =>
        current
          .map((item) => (item.id === category.id ? category : item))
          .sort((left, right) => left.name.localeCompare(right.name))
      );

      await refreshCurrentMonth(token);
      setStatus(t("categoryUpdated"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleDeleteCategory(categoryId: number) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      await deleteCategory(token, categoryId);
      setCategories((current) => current.filter((item) => item.id !== categoryId));
      await refreshCurrentMonth(token);
      setStatus(t("categoryDeleted"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleCreateBudget(payload: {
    category_id: number;
    year: number;
    month: number;
    limit_amount: string;
    alert_threshold_percentage: number;
  }) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      await createBudget(token, payload);
      await refreshCurrentMonth(token);
      setStatus(t("budgetCreated"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleUpdateBudget(
    budgetId: number,
    payload: { limit_amount?: string; alert_threshold_percentage?: number }
  ) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      await updateBudget(token, budgetId, payload);
      await refreshCurrentMonth(token);
      setStatus(t("budgetUpdated"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleDeleteBudget(budgetId: number) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      await deleteBudget(token, budgetId);
      await refreshCurrentMonth(token);
      setStatus(t("budgetDeleted"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleCreateGoal(payload: {
    name: string;
    target_amount: string;
    current_amount: string;
    target_date?: string | null;
    status: SavingGoalStatus;
  }) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      const goal = await createSavingGoal(token, payload);
      setGoals((current) => [...current, goal]);
      setStatus(t("goalCreated"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleUpdateGoal(
    goalId: number,
    payload: {
      name?: string;
      target_amount?: string;
      current_amount?: string;
      target_date?: string | null;
      status?: SavingGoalStatus;
    }
  ) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      const goal = await updateSavingGoal(token, goalId, payload);
      setGoals((current) => current.map((item) => (item.id === goal.id ? goal : item)));
      setStatus(t("goalUpdated"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleGoalContribution(goalId: number, amount: string) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      const goal = await addSavingGoalContribution(token, goalId, amount);
      setGoals((current) => current.map((item) => (item.id === goal.id ? goal : item)));
      setStatus(t("goalContributionAdded"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleDeleteGoal(goalId: number) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      await deleteSavingGoal(token, goalId);
      setGoals((current) => current.filter((item) => item.id !== goalId));
      setStatus(t("goalDeleted"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleCreateDollarSaving(payload: {
    amount: string;
    source: DollarSavingSource;
    notes?: string | null;
    saved_at?: string | null;
  }) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      await createDollarSaving(token, payload);
      await refreshDollarSavings(token);
      setStatus(t("dollarSavingCreated"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleCreateAccount(payload: {
    name: string;
    type: AccountType;
    currency: string;
    institution?: string | null;
    color: string;
    icon: string;
    initial_balance: string;
    notes?: string | null;
  }) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      const account = await createFinancialAccount(token, payload);
      setAccounts((current) => [...current, account].sort((left, right) => left.name.localeCompare(right.name)));
      setStatus("Cuenta creada");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleCreateAccountTransfer(payload: {
    from_account_id: number;
    to_account_id: number;
    amount: string;
    currency: string;
    description?: string | null;
    transfer_date: string;
  }) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      const transfer = await createAccountTransfer(token, payload);
      setAccountTransfers((current) =>
        [transfer, ...current].sort((left, right) => right.transfer_date.localeCompare(left.transfer_date))
      );
      setStatus("Transferencia interna registrada");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleUpdateDollarSaving(
    dollarSavingId: number,
    payload: {
      amount?: string;
      source?: DollarSavingSource;
      notes?: string | null;
      saved_at?: string | null;
    }
  ) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      await updateDollarSaving(token, dollarSavingId, payload);
      await refreshDollarSavings(token);
      setStatus(t("dollarSavingUpdated"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleDeleteDollarSaving(dollarSavingId: number) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      await deleteDollarSaving(token, dollarSavingId);
      await refreshDollarSavings(token);
      setStatus(t("dollarSavingDeleted"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleCreateInvestmentAsset(payload: {
    name: string;
    symbol: string;
    asset_type: InvestmentAssetType;
    currency: string;
    risk_level: InvestmentRiskLevel;
    current_price?: string | null;
  }) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      await createInvestmentAsset(token, payload);
      await refreshInvestments(token);
      setStatus(t("investmentAssetCreated"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleUpdateInvestmentAsset(
    assetId: number,
    payload: {
      name?: string;
      symbol?: string;
      asset_type?: InvestmentAssetType;
      currency?: string;
      risk_level?: InvestmentRiskLevel;
      current_price?: string | null;
    }
  ) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      await updateInvestmentAsset(token, assetId, payload);
      await refreshInvestments(token);
      setStatus(t("investmentAssetUpdated"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleDeleteInvestmentAsset(assetId: number) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      await deleteInvestmentAsset(token, assetId);
      await refreshInvestments(token);
      setStatus(t("investmentAssetDeleted"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleCreateInvestmentOperation(payload: {
    asset_id: number;
    operation_type: InvestmentOperationType;
    quantity: string;
    unit_price: string;
    fees: string;
    operation_date: string;
  }) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      await createInvestmentOperation(token, payload);
      await refreshInvestments(token);
      setStatus(t("investmentOperationCreated"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleUpdateInvestmentOperation(
    operationId: number,
    payload: {
      asset_id?: number;
      operation_type?: InvestmentOperationType;
      quantity?: string;
      unit_price?: string;
      fees?: string;
      operation_date?: string;
    }
  ) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      const operation = await updateInvestmentOperation(token, operationId, payload);
      setInvestmentOperations((current) =>
        current
          .map((item) => (item.id === operation.id ? operation : item))
          .sort((left, right) => right.operation_date.localeCompare(left.operation_date))
      );
      await refreshInvestments(token);
      setStatus(t("investmentOperationUpdated"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleRefreshMarketPrices() {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      const response = await refreshMarketPrices(token);
      setMarketDataRefresh(response);
      await refreshInvestments(token);
      setStatus(t(response.failed_count > 0 ? "marketPricesPartiallyUpdated" : "marketPricesUpdated"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleUpdateMarketIntegration(providerKey: string, payload: MarketDataIntegrationUpdate) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      const integration = await updateMarketDataIntegration(token, providerKey, payload);
      setMarketDataIntegrations((current) => ({
        integrations:
          current?.integrations.map((item) => (item.key === integration.key ? integration : item)) ?? [integration]
      }));
      setStatus(t("integrationUpdated"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleUpdateBinanceIntegration(payload: {
    enabled?: boolean;
    api_key?: string;
    api_secret?: string;
    clear_credentials?: boolean;
  }) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      const integration = await updateBinanceIntegration(token, payload);
      setBinanceIntegration(integration);
      if (payload.clear_credentials) {
        setBinanceAccount(null);
      }
      setStatus(t("binanceIntegrationUpdated"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleLoadBinanceAccount() {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      const account = await getBinanceAccount(token);
      setBinanceAccount(account);
      setStatus(t("binanceConnectionOk"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleSyncBinanceBalances(): Promise<BinanceSyncResponse | null> {
    if (!token) {
      setStatus(t("signInToManageData"));
      return null;
    }

    try {
      const response = await syncBinanceBalances(token);
      const [integrationResponse, notificationsResponse, portfolioSummaryResponse, snapshotsResponse] = await Promise.all([
        getBinanceIntegration(token),
        getNotifications(token),
        getBinancePortfolioSummary(token),
        getBinanceBalanceSnapshots(token)
      ]);
      setBinanceIntegration(integrationResponse);
      setNotifications(notificationsResponse);
      setBinancePortfolioSummary(portfolioSummaryResponse);
      setBinanceSnapshots(snapshotsResponse);
      const notificationDetail =
        response.notifications_generated_count > 0
          ? ` - ${response.notifications_generated_count} ${t("binanceAlertsGenerated")}`
          : "";
      setStatus(`${response.synced_count} ${t("binanceBalancesSynced")}${notificationDetail}`);
      return response;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleRunPortfolioWorker() {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    setIsRunningPortfolioWorker(true);
    try {
      const run = await runPortfolioRefreshJob(token);
      setIsRunningPortfolioWorker(false);
      setStatus(`${t("workerRunCompleted")}: ${run.status}`);

      const refreshResults = await Promise.allSettled([
        getBinanceIntegration(token),
        getBinancePortfolioSummary(token),
        getBinanceBalanceSnapshots(token),
        getJobRuns(token, "portfolio_refresh"),
        getPortfolioRefreshJobStatus(token),
        getNotifications(token)
      ]);

      const [
        binanceIntegrationResponse,
        binancePortfolioSummaryResponse,
        binanceSnapshotsResponse,
        jobRunsResponse,
        jobStatusResponse,
        notificationsResponse
      ] = refreshResults;

      if (binanceIntegrationResponse.status === "fulfilled") {
        setBinanceIntegration(binanceIntegrationResponse.value);
      }
      if (binancePortfolioSummaryResponse.status === "fulfilled") {
        setBinancePortfolioSummary(binancePortfolioSummaryResponse.value);
      }
      if (binanceSnapshotsResponse.status === "fulfilled") {
        setBinanceSnapshots(binanceSnapshotsResponse.value);
      }
      if (jobRunsResponse.status === "fulfilled") {
        setJobRuns(jobRunsResponse.value);
      } else {
        setJobRuns((current) => [run, ...current.filter((item) => item.id !== run.id)]);
      }
      if (jobStatusResponse.status === "fulfilled") {
        setJobStatus(jobStatusResponse.value);
      }
      if (notificationsResponse.status === "fulfilled") {
        setNotifications(notificationsResponse.value);
      }

      if (refreshResults.some((result) => result.status === "rejected")) {
        setStatus(`${t("workerRunCompleted")}: ${run.status}. ${t("workerRefreshPartial")}`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
    } finally {
      setIsRunningPortfolioWorker(false);
    }
  }

  async function handleRunMercadoPagoWorker() {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    setIsRunningMercadoPagoWorker(true);
    try {
      const run = await runMercadoPagoSyncJob(token);
      setMercadoPagoJobRuns((current) => [run, ...current.filter((item) => item.id !== run.id)]);
      await refreshFromApi();
      setStatus(`${t("workerRunCompleted")}: ${run.status}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
    } finally {
      setIsRunningMercadoPagoWorker(false);
    }
  }

  const handleLoadInvestmentPriceHistory = useCallback(async (assetId: number, limit = 30): Promise<InvestmentPriceSnapshot[]> => {
    if (!token) {
      setStatus(t("signInToManageData"));
      return [];
    }

    try {
      return await getInvestmentPriceHistory(token, assetId, limit);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }, [token, language]);

  async function handleSimulateCompoundInterest(
    payload: CompoundInterestRequest
  ): Promise<CompoundInterestResponse> {
    try {
      const result = await simulateCompoundInterest(payload);
      setStatus(t("simulationReady"));
      return result;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleCreateTransaction(payload: {
    account_id?: number | null;
    category_id: number;
    type: TransactionType;
    amount: string;
    currency: string;
    description?: string;
    transaction_date: string;
  }) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      const transaction = await createTransaction(token, payload);
      setTransactions((current) =>
        [transaction, ...current].sort((left, right) => right.transaction_date.localeCompare(left.transaction_date))
      );

      await refreshCurrentMonth(token);
      setStatus(t("movementCreated"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleUpdateTransaction(
    transactionId: number,
    payload: {
      category_id?: number;
      account_id?: number | null;
      amount?: string;
      currency?: string;
      description?: string | null;
      transaction_date?: string;
    }
  ) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      const transaction = await updateTransaction(token, transactionId, payload);
      setTransactions((current) =>
        current
          .map((item) => (item.id === transaction.id ? transaction : item))
          .sort((left, right) => right.transaction_date.localeCompare(left.transaction_date))
      );

      await refreshCurrentMonth(token);
      setStatus(t("movementUpdated"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  async function handleDeleteTransaction(transactionId: number) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      await deleteTransaction(token, transactionId);
      setTransactions((current) => current.filter((item) => item.id !== transactionId));

      await refreshCurrentMonth(token);
      setStatus(t("movementDeleted"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeSection={activeSection}
        budgetUsage={budgetUsage}
        onSectionChange={setActiveSection}
        t={t}
      />

      <main className="min-w-0 flex-1 px-4 py-5 md:px-6 xl:px-8">
        <div className="mx-auto max-w-[1480px]">
          <DashboardHeader
            isSyncing={isSyncing}
            language={language}
            onLanguageChange={onLanguageChange}
            onPeriodChange={handleDashboardPeriodChange}
            sessionRemainingMs={sessionRemainingMs}
            selectedMonth={selectedDashboardPeriod.month}
            selectedYear={selectedDashboardPeriod.year}
            status={status}
            t={t}
            userName={userName}
            onSync={refreshFromApi}
            onLogout={onLogout}
          />
          <QuickActionsBar
            isSyncing={isSyncing}
            items={quickActionItems}
            onQuickTransactionOpen={() => setIsQuickTransactionOpen(true)}
            onSectionChange={setActiveSection}
            onSync={refreshFromApi}
            t={t}
          />
          <ExecutiveFocus items={executiveFocusItems} onSectionChange={setActiveSection} t={t} />
          <MetricsGrid metrics={metrics} onSectionChange={setActiveSection} t={t} />
          <DashboardSectionNav activeSection={activeSection} onChange={setActiveSection} t={t} />
          <DashboardSectionHero activeSection={activeSection} items={sectionSummaryItems} t={t} />

        {activeSection === "dashboard" ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-4">
              <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
                <PrioritizedAlertsPanel
                  budgetUsage={budgetUsage}
                  categoryExpenseIncrease={categoryExpenseIncrease}
                  investmentAlerts={investmentAlerts}
                  monthlyProjection={monthlyProjection}
                  onSectionChange={setActiveSection}
                  reportReady={Boolean(report)}
                  t={t}
                />
                <FinancialHealthPanel
                  budgetCount={budgets.length}
                  budgetUsage={budgetUsage}
                  categoryExpenseIncrease={categoryExpenseIncrease}
                  monthlyProjection={monthlyProjection}
                  onReviewPlan={() => setActiveSection("budgets")}
                  savingsRate={metrics.savingsRate}
                  t={t}
                />
              </div>
              <div className="grid gap-4 2xl:grid-cols-2">
                <MonthlyComparisonPanel comparison={monthlyComparison} t={t} />
                <MonthlyProjectionPanel
                  onReviewMovements={() => setActiveSection("movements")}
                  projection={monthlyProjection}
                  t={t}
                />
              </div>
              <CashflowChart data={cashflowData} t={t} />
              <ExpenseCategories data={expenseCategoryData} t={t} />
            </div>

            <aside className="space-y-4">
              <TopExpenseCategoriesPanel
                categories={summary?.expense_by_category ?? []}
                onReviewMovements={() => setActiveSection("movements")}
                t={t}
              />
              <BiggestExpenseIncreasePanel
                increase={categoryExpenseIncrease}
                onReviewMovements={() => setActiveSection("movements")}
                t={t}
              />
              <NotificationsInbox
                isGenerating={isGeneratingNotifications}
                notifications={notifications}
                onGenerate={handleGenerateNotifications}
                onMarkAllRead={handleMarkAllNotificationsRead}
                onMarkRead={handleMarkNotificationRead}
                onSectionChange={setActiveSection}
                t={t}
              />
            </aside>
          </div>
        ) : null}

        {activeSection === "movements" ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <TransactionManager
              categories={categories}
              isDisabled={!token}
              onCreate={handleCreateTransaction}
              onCreateCategory={handleCreateCategory}
              onDelete={handleDeleteTransaction}
              onUpdate={handleUpdateTransaction}
              transactions={transactions}
              t={t}
            />
            <aside className="space-y-4">
              <AccountsManager
                accounts={accounts}
                isDisabled={!token}
                transfers={accountTransfers}
                onCreateAccount={handleCreateAccount}
                onCreateTransfer={handleCreateAccountTransfer}
              />
              <MercadoPagoWalletPanel
                initialIntegration={mercadoPagoIntegration}
                isRunningMercadoPagoWorker={isRunningMercadoPagoWorker}
                language={language}
                mercadoPagoJobRuns={mercadoPagoJobRuns}
                mercadoPagoJobStatus={mercadoPagoJobStatus}
                selectedMonth={selectedDashboardPeriod.month}
                selectedYear={selectedDashboardPeriod.year}
                token={token}
                onImported={refreshFromApi}
                onRunMercadoPagoWorker={handleRunMercadoPagoWorker}
                onStatusChange={setStatus}
                t={t}
              />
              <CategoryManager
                categories={categories}
                isDisabled={!token}
                onCreate={handleCreateCategory}
                onDelete={handleDeleteCategory}
                onUpdate={handleUpdateCategory}
                t={t}
              />
            </aside>
          </div>
        ) : null}

        {activeSection === "budgets" ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <BudgetManager
              budgetUsage={budgetUsage}
              budgets={budgets}
              categories={categories}
              currentMonth={selectedDashboardPeriod.month}
              currentYear={selectedDashboardPeriod.year}
              isDisabled={!token}
              onCreate={handleCreateBudget}
              onDelete={handleDeleteBudget}
              onUpdate={handleUpdateBudget}
              t={t}
            />
            <aside className="space-y-4">
              <CategoryManager
                categories={categories}
                isDisabled={!token}
                onCreate={handleCreateCategory}
                onDelete={handleDeleteCategory}
                onUpdate={handleUpdateCategory}
                t={t}
              />
            </aside>
          </div>
        ) : null}

        {activeSection === "goals" ? (
          <div className="mt-4">
            <GoalsManager
              goals={goals}
              isDisabled={!token}
              onContribute={handleGoalContribution}
              onCreate={handleCreateGoal}
              onDelete={handleDeleteGoal}
              onUpdate={handleUpdateGoal}
              t={t}
            />
          </div>
        ) : null}

        {activeSection === "dollars" ? (
          <div className="mt-4">
            <DollarSavingsManager
              categories={categories}
              dollarSavings={dollarSavings}
              isDisabled={!token}
              onCreate={handleCreateDollarSaving}
              onDelete={handleDeleteDollarSaving}
              onUpdate={handleUpdateDollarSaving}
              t={t}
              transactions={transactions}
            />
          </div>
        ) : null}

        {activeSection === "investments" ? (
          <div className="mt-4">
            <InvestmentsManager
              assets={investmentAssets}
              binanceAccount={binanceAccount}
              binanceIntegration={binanceIntegration}
              binancePortfolioSummary={binancePortfolioSummary}
              binanceSnapshots={binanceSnapshots}
              isDisabled={!token}
              isRunningPortfolioWorker={isRunningPortfolioWorker}
              investmentAlerts={investmentAlerts}
              jobRuns={jobRuns}
              jobStatus={jobStatus}
              marketDataIntegrations={marketDataIntegrations}
              marketDataRefresh={marketDataRefresh}
              onCreateAsset={handleCreateInvestmentAsset}
              onCreateOperation={handleCreateInvestmentOperation}
              onDeleteAsset={handleDeleteInvestmentAsset}
              onLoadPriceHistory={handleLoadInvestmentPriceHistory}
              onLoadBinanceAccount={handleLoadBinanceAccount}
              onRefreshMarketPrices={handleRefreshMarketPrices}
              onRunPortfolioWorker={handleRunPortfolioWorker}
              onSyncBinanceBalances={handleSyncBinanceBalances}
              onUpdateBinanceIntegration={handleUpdateBinanceIntegration}
              onUpdateOperation={handleUpdateInvestmentOperation}
              onUpdateMarketIntegration={handleUpdateMarketIntegration}
              onUpdateAsset={handleUpdateInvestmentAsset}
              operations={investmentOperations}
              portfolio={portfolio}
              t={t}
            />
          </div>
        ) : null}

        {activeSection === "aiReports" ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
            <AiReportPanel
              reports={aiReports}
              isDisabled={!token}
              isGenerating={isGeneratingReport}
              onGenerate={handleGenerateMonthlyReport}
              onPeriodChange={handleSelectReportPeriod}
              report={report}
              selectedMonth={selectedReportPeriod.month}
              selectedYear={selectedReportPeriod.year}
              t={t}
            />
            <PlanningPanel
              insights={spendingInsights}
              isDisabled={!token}
              onSimulate={handleSimulateCompoundInterest}
              t={t}
            />
          </div>
        ) : null}
        <StatusToast message={status} mutedMessage={t("localPreviewData")} />
        <AiAssistantBubble
          isOpen={isAssistantOpen}
          items={assistantItems}
          onOpenChange={setIsAssistantOpen}
          onSectionChange={setActiveSection}
          t={t}
        />
        <QuickTransactionPanel
          categories={categories}
          isDisabled={!token}
          isOpen={isQuickTransactionOpen}
          onClose={() => setIsQuickTransactionOpen(false)}
          onCreate={handleCreateTransaction}
          onCreateCategory={handleCreateCategory}
          t={t}
          transactions={transactions}
        />
        </div>
      </main>
    </div>
  );
}
