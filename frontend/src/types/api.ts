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

export type MonthlyProjection = {
  year: number;
  month: number;
  as_of_date: string;
  elapsed_days: number;
  days_in_month: number;
  current_income: string;
  current_expense: string;
  current_net_balance: string;
  projected_income: string;
  projected_expense: string;
  projected_net_balance: string;
  daily_net_average: string;
  confidence: "low" | "medium" | "high" | string;
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
  account_id: number | null;
  category_id: number;
  type: TransactionType;
  amount: string;
  currency: string;
  description: string | null;
  transaction_date: string;
  external_source: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AccountType = "bank" | "wallet" | "cash" | "investment" | "other";

export type FinancialAccount = {
  id: number;
  name: string;
  type: AccountType;
  currency: string;
  institution: string | null;
  color: string;
  icon: string;
  initial_balance: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AccountTransfer = {
  id: number;
  from_account_id: number;
  to_account_id: number;
  amount: string;
  currency: string;
  description: string | null;
  transfer_date: string;
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

export type PortfolioCurrencyTotal = {
  currency: string;
  total_invested: string;
  total_estimated_value: string;
  total_unrealized_gain_loss: string;
};

export type PortfolioSummary = {
  total_invested: string;
  total_estimated_value: string;
  total_unrealized_gain_loss: string;
  totals_by_currency: PortfolioCurrencyTotal[];
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
  username?: string | null;
  password?: string | null;
  clear_api_key?: boolean;
};

export type MercadoPagoIntegration = {
  enabled: boolean;
  status: "active" | "needs_token" | "disabled" | string;
  has_access_token: boolean;
  access_token_last4: string | null;
};

export type MercadoPagoReport = {
  id: number | string | null;
  begin_date: string | null;
  end_date: string | null;
  file_name: string;
  created_from: string | null;
  date_created: string | null;
};

export type MercadoPagoImportMovement = {
  external_id: string;
  transaction_id: number | null;
  type: TransactionType | "unknown" | string;
  amount: string;
  currency: string;
  date: string;
  status: "imported" | "skipped" | "failed" | string;
  description: string;
};

export type MercadoPagoImportResponse = {
  imported_count: number;
  skipped_count: number;
  failed_count: number;
  file_name: string | null;
  movements: MercadoPagoImportMovement[];
};

export type MercadoPagoSyncResponse = {
  status: "imported" | "pending" | string;
  message: string;
  report_requested: boolean;
  available_reports: number;
  import_result: MercadoPagoImportResponse | null;
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
  prompt_version: string;
  summary: string;
  recommendations: string;
  risk_warnings: string;
  created_at: string;
  updated_at: string;
};

export type NotificationPriority = "low" | "medium" | "high";

export type NotificationType =
  | "budget_near_limit"
  | "budget_exceeded"
  | "ai_report_pending"
  | "goal_without_contribution"
  | "binance_portfolio_alert";

export type AppNotification = {
  id: number;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  action_label: string | null;
  action_section: string | null;
  period_year: number | null;
  period_month: number | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
};

export type NotificationGenerateResponse = {
  generated_count: number;
  notifications: AppNotification[];
};

export type JobRun = {
  id: number;
  job_key: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  users_processed: number;
  success_count: number;
  failure_count: number;
  message: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type JobStatus = {
  heartbeat_is_alive: boolean;
  heartbeat_last_seen_at: string | null;
  heartbeat_message: string | null;
  heartbeat_status: string | null;
  interval_minutes: number;
  is_overdue: boolean;
  job_key: string;
  latest_run: JobRun | null;
  message: string;
  next_run_at: string | null;
  state: "alive" | "never_run" | "running" | "scheduled" | "overdue" | string;
};

export type BinanceIntegration = {
  enabled: boolean;
  status: "active" | "needs_key" | "disabled" | string;
  has_api_key: boolean;
  api_key_last4: string | null;
  last_sync_at: string | null;
};

export type BinanceBalance = {
  asset: string;
  free: string;
  locked: string;
  total: string;
};

export type BinanceAccount = {
  account_type: string | null;
  can_trade: boolean | null;
  can_deposit: boolean | null;
  can_withdraw: boolean | null;
  permissions: string[];
  balances: BinanceBalance[];
  fetched_at: string;
};

export type BinanceBalanceSnapshot = BinanceBalance & {
  id: number;
  fetched_at: string;
  created_at: string;
};

export type BinanceSyncResponse = {
  synced_count: number;
  balances: BinanceBalanceSnapshot[];
  notifications_generated_count: number;
};

export type BinancePortfolioHolding = BinanceBalance & {
  price_usd: string | null;
  estimated_value_usd: string | null;
  allocation_percentage: number | null;
  price_source: string | null;
};

export type BinancePortfolioAlert = {
  type: string;
  severity: "low" | "medium" | "high" | string;
  title: string;
  message: string;
  asset: string | null;
  value: string | null;
  percentage: number | null;
};

export type BinancePortfolioSummary = {
  total_estimated_value_usd: string;
  asset_count: number;
  priced_asset_count: number;
  unpriced_asset_count: number;
  latest_sync_at: string | null;
  holdings: BinancePortfolioHolding[];
  alerts: BinancePortfolioAlert[];
};
