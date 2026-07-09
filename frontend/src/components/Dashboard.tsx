"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createInvestmentAsset,
  createInvestmentOperation,
  createCategory,
  createBudget,
  createDollarSaving,
  createSavingGoal,
  createTransaction,
  deleteBudget,
  deleteCategory,
  deleteDollarSaving,
  deleteInvestmentAsset,
  deleteSavingGoal,
  deleteTransaction,
  generateMonthlyReport,
  getAiReports,
  getBudgets,
  getBudgetUsage,
  getCategories,
  getDollarSavings,
  getInvestmentAlerts,
  getInvestmentAssets,
  getInvestmentOperations,
  getInvestmentPriceHistory,
  getMarketDataIntegrations,
  getMonthlySummary,
  getPortfolioSummary,
  getSavingGoals,
  getSpendingInsights,
  getTransactions,
  addSavingGoalContribution,
  refreshMarketPrices,
  simulateCompoundInterest,
  updateBudget,
  updateCategory,
  updateDollarSaving,
  updateInvestmentAsset,
  updateMarketDataIntegration,
  updateSavingGoal,
  updateTransaction
} from "@/services/api";
import type { Language, TranslationKey } from "@/i18n";
import { translations } from "@/i18n";
import type {
  AiReport,
  Budget,
  BudgetUsage,
  Category,
  CategoryType,
  CompoundInterestRequest,
  CompoundInterestResponse,
  DollarSaving,
  DollarSavingSource,
  InvestmentAlertsResponse,
  InvestmentAsset,
  InvestmentAssetType,
  InvestmentOperation,
  InvestmentOperationType,
  InvestmentPriceSnapshot,
  InvestmentRiskLevel,
  MarketDataIntegrationsResponse,
  MarketDataIntegrationUpdate,
  MarketDataRefreshResponse,
  MonthlySummary,
  PortfolioSummary,
  SavingGoal,
  SavingGoalStatus,
  SpendingInsightsResponse,
  Transaction,
  TransactionType
} from "@/types/api";
import { AiAssistantBubble } from "@/components/dashboard/AiAssistantBubble";
import { AiReportPanel } from "@/components/dashboard/AiReportPanel";
import { BudgetManager } from "@/components/dashboard/BudgetManager";
import { CashflowChart } from "@/components/dashboard/CashflowChart";
import { CategoryManager } from "@/components/dashboard/CategoryManager";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSectionNav, type DashboardSection } from "@/components/dashboard/DashboardSectionNav";
import { DashboardSectionHero } from "@/components/dashboard/DashboardSectionHero";
import { DollarSavingsManager, buildDollarSavingsSnapshot } from "@/components/dashboard/DollarSavingsManager";
import { ExpenseCategories } from "@/components/dashboard/ExpenseCategories";
import { ExecutiveFocus, focusIcons } from "@/components/dashboard/ExecutiveFocus";
import { GoalsManager } from "@/components/dashboard/GoalsManager";
import { InvestmentsManager } from "@/components/dashboard/InvestmentsManager";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { PlanningPanel } from "@/components/dashboard/PlanningPanel";
import { QuickActionsBar, quickActionIcons } from "@/components/dashboard/QuickActionsBar";
import { QuickTransactionPanel } from "@/components/dashboard/QuickTransactionPanel";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { StatusToast } from "@/components/dashboard/StatusToast";
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
  const [report, setReport] = useState<AiReport | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetUsage, setBudgetUsage] = useState<BudgetUsage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dollarSavings, setDollarSavings] = useState<DollarSaving[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [investmentAssets, setInvestmentAssets] = useState<InvestmentAsset[]>([]);
  const [investmentAlerts, setInvestmentAlerts] = useState<InvestmentAlertsResponse | null>(null);
  const [investmentOperations, setInvestmentOperations] = useState<InvestmentOperation[]>([]);
  const [marketDataIntegrations, setMarketDataIntegrations] = useState<MarketDataIntegrationsResponse | null>(null);
  const [marketDataRefresh, setMarketDataRefresh] = useState<MarketDataRefreshResponse | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [spendingInsights, setSpendingInsights] = useState<SpendingInsightsResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeSection, setActiveSection] = useState<DashboardSection>("dashboard");
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
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
        { label: t("summaryCurrentMonth"), value: `${new Date().getMonth() + 1}/${new Date().getFullYear()}`, tone: "neutral" as const }
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
        descriptionKey: "quickAiReportDescription" as const,
        icon: quickActionIcons.ai,
        labelKey: "quickAiReport" as const,
        section: "aiReports" as const,
        type: "section" as const,
        value: report ? t("reportReady") : t("reportPending")
      }
    ],
    [categories.length, dollarSavingsSnapshot.totalUsd, language, report, transactions.length]
  );

  const refreshFromApi = useCallback(async () => {
    if (!token) {
      setStatus(t("signInToSync"));
      return;
    }

    setIsSyncing(true);

    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const [
        summaryResponse,
        reportsResponse,
        budgetsResponse,
        budgetUsageResponse,
        categoriesResponse,
        dollarSavingsResponse,
        goalsResponse,
        investmentAlertsResponse,
        investmentAssetsResponse,
        investmentOperationsResponse,
        marketDataIntegrationsResponse,
        portfolioResponse,
        spendingInsightsResponse,
        transactionsResponse
      ] = await Promise.all([
        getMonthlySummary(token, year, month),
        getAiReports(token),
        getBudgets(token, year, month),
        getBudgetUsage(token, year, month),
        getCategories(token),
        getDollarSavings(token),
        getSavingGoals(token),
        getInvestmentAlerts(token),
        getInvestmentAssets(token),
        getInvestmentOperations(token),
        getMarketDataIntegrations(token),
        getPortfolioSummary(token),
        getSpendingInsights(token, year, month),
        getTransactions(token)
      ]);
      setSummary(summaryResponse);
      setReport(reportsResponse[0] ?? null);
      setBudgets(budgetsResponse);
      setBudgetUsage(budgetUsageResponse);
      setCategories(categoriesResponse);
      setDollarSavings(dollarSavingsResponse);
      setGoals(goalsResponse);
      setInvestmentAlerts(investmentAlertsResponse);
      setInvestmentAssets(investmentAssetsResponse);
      setInvestmentOperations(investmentOperationsResponse);
      setMarketDataIntegrations(marketDataIntegrationsResponse);
      setPortfolio(portfolioResponse);
      setSpendingInsights(spendingInsightsResponse);
      setTransactions(transactionsResponse);
      setStatus(t("backendSynced"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("networkError");
      setStatus(message.includes("Could not connect") ? t("networkError") : message);
    } finally {
      setIsSyncing(false);
    }
  }, [token, language]);

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
      const now = new Date();
      const reportResponse = await generateMonthlyReport(token, now.getFullYear(), now.getMonth() + 1, language);
      setReport(reportResponse);
      setStatus(t("reportReady"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("authFailed"));
      throw error;
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function refreshCurrentMonth(tokenValue: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const [summaryResponse, budgetsResponse, budgetUsageResponse, spendingInsightsResponse] = await Promise.all([
      getMonthlySummary(tokenValue, year, month),
      getBudgets(tokenValue, year, month),
      getBudgetUsage(tokenValue, year, month),
      getSpendingInsights(tokenValue, year, month)
    ]);
    setSummary(summaryResponse);
    setBudgets(budgetsResponse);
    setBudgetUsage(budgetUsageResponse);
    setSpendingInsights(spendingInsightsResponse);
  }

  async function refreshInvestments(tokenValue: string) {
    const [alertsResponse, assetsResponse, integrationsResponse, operationsResponse, portfolioResponse] = await Promise.all([
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
            sessionRemainingMs={sessionRemainingMs}
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
              <CashflowChart data={cashflowData} t={t} />
              <ExpenseCategories data={expenseCategoryData} t={t} />
            </div>

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
              currentMonth={new Date().getMonth() + 1}
              currentYear={new Date().getFullYear()}
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
              isDisabled={!token}
              investmentAlerts={investmentAlerts}
              marketDataIntegrations={marketDataIntegrations}
              marketDataRefresh={marketDataRefresh}
              onCreateAsset={handleCreateInvestmentAsset}
              onCreateOperation={handleCreateInvestmentOperation}
              onDeleteAsset={handleDeleteInvestmentAsset}
              onLoadPriceHistory={handleLoadInvestmentPriceHistory}
              onRefreshMarketPrices={handleRefreshMarketPrices}
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
              isDisabled={!token}
              isGenerating={isGeneratingReport}
              onGenerate={handleGenerateMonthlyReport}
              report={report}
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
