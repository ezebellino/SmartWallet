export type AuthResponse = {
  user: {
    id: number;
    email: string;
    full_name: string;
  };
  token: {
    access_token: string;
    token_type: string;
  };
};

export type MonthlySummary = {
  year: number;
  month: number;
  total_income: string;
  total_expense: string;
  net_balance: string;
  savings_rate: number;
  expense_by_category: Array<{
    category_id: number;
    category_name: string;
    total: string;
    percentage: number;
  }>;
};

export type MonthlyComparisonMetric = {
  current: string | number;
  previous: string | number;
  delta: string | number;
  delta_percentage: number | null;
};

export type MonthlyComparison = {
  year: number;
  month: number;
  previous_year: number;
  previous_month: number;
  total_income: MonthlyComparisonMetric;
  total_expense: MonthlyComparisonMetric;
  net_balance: MonthlyComparisonMetric;
  savings_rate: MonthlyComparisonMetric;
};

export type CategoryExpenseIncrease = {
  year: number;
  month: number;
  previous_year: number;
  previous_month: number;
  category: {
    category_id: number;
    category_name: string;
    current_total: string;
    previous_total: string;
    delta: string;
    delta_percentage: number | null;
  } | null;
};

export type CategoryType = "income" | "expense";

export type Category = {
  id: number;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
};

export type TransactionType = "income" | "expense";

export type Transaction = {
  id: number;
  category_id: number;
  type: TransactionType;
  amount: string;
  currency: string;
  description: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
};

export type Budget = {
  id: number;
  category_id: number;
  year: number;
  month: number;
  limit_amount: string;
  alert_threshold_percentage: number;
  created_at: string;
  updated_at: string;
};

export type BudgetUsage = {
  budget_id: number;
  category_id: number;
  category_name: string;
  year: number;
  month: number;
  limit_amount: string;
  spent_amount: string;
  remaining_amount: string;
  usage_percentage: number;
  is_over_budget: boolean;
  is_near_limit: boolean;
};

export type SavingGoalStatus = "active" | "completed" | "paused" | "cancelled";

export type SavingGoal = {
  id: number;
  name: string;
  target_amount: string;
  current_amount: string;
  target_date: string | null;
  status: SavingGoalStatus;
  progress_percentage: number;
  remaining_amount: string;
  created_at: string;
  updated_at: string;
};

export type DollarSavingSource = "manual" | "bank" | "mercado_pago" | "cash" | "other";

export type DollarSaving = {
  id: number;
  amount: string;
  source: DollarSavingSource;
  notes: string | null;
  saved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InvestmentAssetType =
  | "stock"
  | "crypto"
  | "bond"
  | "cedear"
  | "mutual_fund"
  | "index"
  | "etf"
  | "fixed_term"
  | "other";

export type InvestmentRiskLevel = "low" | "medium" | "high";

export type InvestmentOperationType = "buy" | "sell";

export type InvestmentAsset = {
  id: number;
  name: string;
  symbol: string;
  asset_type: InvestmentAssetType;
  currency: string;
  risk_level: InvestmentRiskLevel;
  current_price: string | null;
  price_source: string | null;
  price_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InvestmentOperation = {
  id: number;
  asset_id: number;
  operation_type: InvestmentOperationType;
  quantity: string;
  unit_price: string;
  fees: string;
  operation_date: string;
  created_at: string;
  updated_at: string;
};

export type PortfolioPosition = {
  asset_id: number;
  name: string;
  symbol: string;
  asset_type: InvestmentAssetType;
  risk_level: InvestmentRiskLevel;
  currency: string;
  quantity: string;
  average_cost: string;
  invested_amount: string;
  estimated_value: string | null;
  unrealized_gain_loss: string | null;
};

export type PortfolioSummary = {
  total_invested: string;
  total_estimated_value: string;
  total_unrealized_gain_loss: string;
  positions: PortfolioPosition[];
  risk_warning: string;
};

export type MarketQuoteResult = {
  asset_id: number;
  symbol: string;
  provider: string | null;
  price: string | null;
  currency: string;
  fetched_at: string | null;
  status: "updated" | "skipped" | "failed" | string;
  message: string;
};

export type MarketDataRefreshResponse = {
  updated_count: number;
  skipped_count: number;
  failed_count: number;
  quotes: MarketQuoteResult[];
  refresh_plan: MarketRefreshPlanItem[];
};

export type MarketRefreshPlanItem = {
  provider: string;
  limit: number | null;
  updated_symbols: string[];
  skipped_symbols: string[];
  next_symbol: string | null;
  message: string;
};

export type MarketDataIntegration = {
  key: string;
  name: string;
  status: "active" | "needs_key" | "disabled" | string;
  enabled: boolean;
  auth_required: boolean;
  has_api_key: boolean;
  api_key_last4: string | null;
  coverage: string;
  supported_asset_types: string[];
  supported_symbols: string[];
  configured_assets_count: number;
  last_refresh_at: string | null;
};

export type MarketDataIntegrationsResponse = {
  integrations: MarketDataIntegration[];
};

export type MarketDataIntegrationUpdate = {
  enabled?: boolean;
  api_key?: string | null;
  clear_api_key?: boolean;
};

export type InvestmentPriceSnapshot = {
  id: number;
  asset_id: number;
  provider: string;
  price: string;
  currency: string;
  fetched_at: string;
  created_at: string;
};

export type InvestmentAlert = {
  type: string;
  severity: "low" | "medium" | "high" | string;
  title: string;
  description: string;
  asset_id: number | null;
  symbol: string | null;
  value: string | null;
  percentage: string | null;
};

export type InvestmentAlertsResponse = {
  alerts: InvestmentAlert[];
};

export type SpendingInsight = {
  type: string;
  severity: "low" | "medium" | "high" | string;
  title: string;
  description: string;
  category_id: number | null;
  category_name: string | null;
  amount: string | null;
  percentage: number | null;
};

export type SpendingInsightsResponse = {
  year: number;
  month: number;
  insights: SpendingInsight[];
};

export type CompoundInterestRequest = {
  initial_amount: string;
  monthly_contribution: string;
  annual_interest_rate: string;
  years: number;
};

export type CompoundInterestPoint = {
  month: number;
  contributed_amount: string;
  interest_earned: string;
  balance: string;
};

export type CompoundInterestResponse = {
  final_balance: string;
  total_contributions: string;
  total_interest: string;
  points: CompoundInterestPoint[];
};

export type AiReport = {
  id: number;
  period_year: number;
  period_month: number;
  provider: string;
  summary: string;
  recommendations: string;
  risk_warnings: string;
};
