import type {
  AiReport,
  AuthResponse,
  Budget,
  BudgetUsage,
  Category,
  CategoryType,
  CompoundInterestRequest,
  CompoundInterestResponse,
  InvestmentAsset,
  InvestmentAssetType,
  InvestmentOperation,
  InvestmentOperationType,
  InvestmentRiskLevel,
  MarketDataRefreshResponse,
  MonthlySummary,
  PortfolioSummary,
  SavingGoal,
  SavingGoalStatus,
  SpendingInsightsResponse,
  Transaction,
  TransactionType
} from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  } catch (error) {
    throw new Error(
      "Could not connect to the backend. Check that FastAPI is running at http://localhost:8000 and CORS is enabled."
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function register(email: string, password: string, fullName: string) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: fullName })
  });
}

export function getMonthlySummary(token: string, year: number, month: number) {
  return request<MonthlySummary>(`/dashboard/monthly-summary?year=${year}&month=${month}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getBudgets(token: string, year: number, month: number) {
  return request<Budget[]>(`/budgets?year=${year}&month=${month}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function createBudget(
  token: string,
  payload: {
    category_id: number;
    year: number;
    month: number;
    limit_amount: string;
    alert_threshold_percentage: number;
  }
) {
  return request<Budget>("/budgets", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function updateBudget(
  token: string,
  budgetId: number,
  payload: { limit_amount?: string; alert_threshold_percentage?: number }
) {
  return request<Budget>(`/budgets/${budgetId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function deleteBudget(token: string, budgetId: number) {
  return request<void>(`/budgets/${budgetId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getBudgetUsage(token: string, year: number, month: number) {
  return request<BudgetUsage[]>(`/budgets/usage?year=${year}&month=${month}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getCategories(token: string) {
  return request<Category[]>("/categories", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function createCategory(
  token: string,
  payload: { name: string; type: CategoryType; color: string; icon: string }
) {
  return request<Category>("/categories", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function updateCategory(
  token: string,
  categoryId: number,
  payload: { name?: string; color?: string; icon?: string }
) {
  return request<Category>(`/categories/${categoryId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function deleteCategory(token: string, categoryId: number) {
  return request<void>(`/categories/${categoryId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getTransactions(token: string) {
  return request<Transaction[]>("/transactions", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function createTransaction(
  token: string,
  payload: {
    category_id: number;
    type: TransactionType;
    amount: string;
    currency: string;
    description?: string;
    transaction_date: string;
  }
) {
  return request<Transaction>("/transactions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function updateTransaction(
  token: string,
  transactionId: number,
  payload: {
    category_id?: number;
    amount?: string;
    currency?: string;
    description?: string | null;
    transaction_date?: string;
  }
) {
  return request<Transaction>(`/transactions/${transactionId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function deleteTransaction(token: string, transactionId: number) {
  return request<void>(`/transactions/${transactionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getSavingGoals(token: string) {
  return request<SavingGoal[]>("/goals", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function createSavingGoal(
  token: string,
  payload: {
    name: string;
    target_amount: string;
    current_amount: string;
    target_date?: string | null;
    status: SavingGoalStatus;
  }
) {
  return request<SavingGoal>("/goals", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function updateSavingGoal(
  token: string,
  goalId: number,
  payload: {
    name?: string;
    target_amount?: string;
    current_amount?: string;
    target_date?: string | null;
    status?: SavingGoalStatus;
  }
) {
  return request<SavingGoal>(`/goals/${goalId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function addSavingGoalContribution(token: string, goalId: number, amount: string) {
  return request<SavingGoal>(`/goals/${goalId}/contributions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount })
  });
}

export function deleteSavingGoal(token: string, goalId: number) {
  return request<void>(`/goals/${goalId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getInvestmentAssets(token: string) {
  return request<InvestmentAsset[]>("/investments/assets", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function createInvestmentAsset(
  token: string,
  payload: {
    name: string;
    symbol: string;
    asset_type: InvestmentAssetType;
    currency: string;
    risk_level: InvestmentRiskLevel;
    current_price?: string | null;
  }
) {
  return request<InvestmentAsset>("/investments/assets", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function updateInvestmentAsset(
  token: string,
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
  return request<InvestmentAsset>(`/investments/assets/${assetId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function deleteInvestmentAsset(token: string, assetId: number) {
  return request<void>(`/investments/assets/${assetId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getInvestmentOperations(token: string) {
  return request<InvestmentOperation[]>("/investments/operations", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function createInvestmentOperation(
  token: string,
  payload: {
    asset_id: number;
    operation_type: InvestmentOperationType;
    quantity: string;
    unit_price: string;
    fees: string;
    operation_date: string;
  }
) {
  return request<InvestmentOperation>("/investments/operations", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function getPortfolioSummary(token: string) {
  return request<PortfolioSummary>("/investments/portfolio", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function refreshMarketPrices(token: string) {
  return request<MarketDataRefreshResponse>("/market-data/refresh-prices", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getSpendingInsights(token: string, year: number, month: number) {
  return request<SpendingInsightsResponse>(`/insights/spending?year=${year}&month=${month}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function simulateCompoundInterest(payload: CompoundInterestRequest) {
  return request<CompoundInterestResponse>("/simulations/compound-interest", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function generateMonthlyReport(token: string, year: number, month: number) {
  return request<AiReport>("/ai/monthly-report", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ year, month })
  });
}
