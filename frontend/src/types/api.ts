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

export type AiReport = {
  id: number;
  period_year: number;
  period_month: number;
  provider: string;
  summary: string;
  recommendations: string;
  risk_warnings: string;
};
