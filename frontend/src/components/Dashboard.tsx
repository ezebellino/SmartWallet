"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCategory,
  createBudget,
  createSavingGoal,
  createTransaction,
  deleteBudget,
  deleteCategory,
  deleteSavingGoal,
  deleteTransaction,
  generateMonthlyReport,
  getBudgets,
  getBudgetUsage,
  getCategories,
  getMonthlySummary,
  getSavingGoals,
  getTransactions,
  addSavingGoalContribution,
  updateBudget,
  updateCategory,
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
  MonthlySummary,
  SavingGoal,
  SavingGoalStatus,
  Transaction,
  TransactionType
} from "@/types/api";
import { AiReportPanel } from "@/components/dashboard/AiReportPanel";
import { BudgetManager } from "@/components/dashboard/BudgetManager";
import { CashflowChart } from "@/components/dashboard/CashflowChart";
import { CategoryManager } from "@/components/dashboard/CategoryManager";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ExpenseCategories } from "@/components/dashboard/ExpenseCategories";
import { GoalsManager } from "@/components/dashboard/GoalsManager";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TransactionManager } from "@/components/dashboard/TransactionManager";

type Props = {
  token: string | null;
  userName: string;
  onLogout: () => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
};

export function Dashboard({ token, userName, onLogout, language, onLanguageChange }: Props) {
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [report, setReport] = useState<AiReport | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetUsage, setBudgetUsage] = useState<BudgetUsage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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

  const refreshFromApi = useCallback(async () => {
    if (!token) {
      setStatus(t("signInToSync"));
      return;
    }

    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const [
        summaryResponse,
        reportResponse,
        budgetsResponse,
        budgetUsageResponse,
        categoriesResponse,
        goalsResponse,
        transactionsResponse
      ] = await Promise.all([
        getMonthlySummary(token, year, month),
        generateMonthlyReport(token, year, month),
        getBudgets(token, year, month),
        getBudgetUsage(token, year, month),
        getCategories(token),
        getSavingGoals(token),
        getTransactions(token)
      ]);
      setSummary(summaryResponse);
      setReport(reportResponse);
      setBudgets(budgetsResponse);
      setBudgetUsage(budgetUsageResponse);
      setCategories(categoriesResponse);
      setGoals(goalsResponse);
      setTransactions(transactionsResponse);
      setStatus(t("backendSynced"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("networkError");
      setStatus(message.includes("Could not connect") ? t("networkError") : message);
    }
  }, [token, language]);

  async function refreshCurrentMonth(tokenValue: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const [summaryResponse, budgetsResponse, budgetUsageResponse] = await Promise.all([
      getMonthlySummary(tokenValue, year, month),
      getBudgets(tokenValue, year, month),
      getBudgetUsage(tokenValue, year, month)
    ]);
    setSummary(summaryResponse);
    setBudgets(budgetsResponse);
    setBudgetUsage(budgetUsageResponse);
  }

  useEffect(() => {
    void refreshFromApi();
  }, [refreshFromApi]);

  async function handleCreateCategory(payload: { name: string; type: CategoryType; color: string; icon: string }) {
    if (!token) {
      setStatus(t("signInToManageData"));
      return;
    }

    try {
      const category = await createCategory(token, payload);
      setCategories((current) => [...current, category].sort((left, right) => left.name.localeCompare(right.name)));
      setStatus(t("categoryCreated"));
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
      <Sidebar budgetUsage={budgetUsage} t={t} />

      <main className="min-w-0 flex-1 px-4 py-5 md:px-6 xl:px-8">
        <DashboardHeader
          language={language}
          onLanguageChange={onLanguageChange}
          status={status}
          t={t}
          userName={userName}
          onSync={refreshFromApi}
          onLogout={onLogout}
        />
        <MetricsGrid metrics={metrics} t={t} />

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <CashflowChart data={cashflowData} t={t} />
            <div className="grid gap-4 xl:grid-cols-2">
              <ExpenseCategories data={expenseCategoryData} t={t} />
              <CategoryManager
                categories={categories}
                isDisabled={!token}
                onCreate={handleCreateCategory}
                onDelete={handleDeleteCategory}
                onUpdate={handleUpdateCategory}
                t={t}
              />
            </div>
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

          <aside className="space-y-4">
            <TransactionManager
              categories={categories}
              isDisabled={!token}
              onCreate={handleCreateTransaction}
              onDelete={handleDeleteTransaction}
              onUpdate={handleUpdateTransaction}
              transactions={transactions}
              t={t}
            />
            <AiReportPanel report={report} t={t} />
          </aside>
        </div>
      </main>
    </div>
  );
}
