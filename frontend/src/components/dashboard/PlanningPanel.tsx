import { Calculator, Lightbulb, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Panel } from "@/components/ui";
import type { TranslationKey } from "@/i18n";
import { formatMoney } from "@/lib/format";
import type {
  CompoundInterestRequest,
  CompoundInterestResponse,
  SpendingInsightsResponse
} from "@/types/api";

type Props = {
  insights: SpendingInsightsResponse | null;
  isDisabled: boolean;
  onSimulate: (payload: CompoundInterestRequest) => Promise<CompoundInterestResponse>;
  t: (key: TranslationKey) => string;
};

function insightTone(severity: string) {
  if (severity === "high") {
    return "border-rose/30 bg-rose/8 text-rose";
  }

  if (severity === "medium") {
    return "border-amber/30 bg-amber/8 text-amber";
  }

  return "border-cyan/30 bg-cyan/8 text-cyan";
}

export function PlanningPanel({ insights, isDisabled, onSimulate, t }: Props) {
  const [initialAmount, setInitialAmount] = useState("100000");
  const [monthlyContribution, setMonthlyContribution] = useState("25000");
  const [annualRate, setAnnualRate] = useState("30");
  const [years, setYears] = useState("5");
  const [result, setResult] = useState<CompoundInterestResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const chartData = useMemo(
    () =>
      result?.points
        .filter((point) => point.month % 12 === 0 || point.month === result.points.length)
        .map((point) => ({
          month: point.month,
          balance: Number(point.balance),
          contributions: Number(point.contributed_amount)
        })) ?? [],
    [result]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!initialAmount || !annualRate || !years) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await onSimulate({
        initial_amount: initialAmount,
        monthly_contribution: monthlyContribution || "0",
        annual_interest_rate: annualRate,
        years: Number(years)
      });
      setResult(response);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text">{t("planningCenter")}</h2>
          <p className="mt-1 text-sm text-muted">{t("planningCenterSubtitle")}</p>
        </div>
        <Lightbulb size={18} className="text-amber" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-md border border-borderSoft bg-background p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-text">{t("spendingInsights")}</div>
            <TrendingUp size={16} className="text-cyan" />
          </div>

          <div className="mt-3 space-y-2">
            {insights?.insights.length ? (
              insights.insights.map((insight, index) => (
                <div
                  className={`rounded-md border px-3 py-2.5 ${insightTone(insight.severity)}`}
                  key={`${insight.type}-${insight.category_id ?? index}`}
                >
                  <div className="text-sm font-semibold text-text">{insight.title}</div>
                  <p className="mt-1 text-xs leading-5 text-muted">{insight.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {insight.category_name ? (
                      <span className="rounded border border-borderSoft px-2 py-1 text-muted">
                        {insight.category_name}
                      </span>
                    ) : null}
                    {insight.percentage != null ? (
                      <span className="rounded border border-borderSoft px-2 py-1 text-muted">
                        {Math.round(insight.percentage)}%
                      </span>
                    ) : null}
                    {insight.amount != null ? (
                      <span className="rounded border border-borderSoft px-2 py-1 text-muted">
                        {formatMoney(Number(insight.amount))}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
                {t(isDisabled ? "signInToManageData" : "noSpendingInsights")}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-borderSoft bg-background p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-text">{t("compoundSimulator")}</div>
            <Calculator size={16} className="text-emerald" />
          </div>

          <form className="mt-3 grid gap-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-md border border-borderSoft bg-panel px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
                disabled={isSaving}
                min="0"
                onChange={(event) => setInitialAmount(event.target.value)}
                placeholder={t("initialAmount")}
                step="0.01"
                type="number"
                value={initialAmount}
              />
              <input
                className="rounded-md border border-borderSoft bg-panel px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
                disabled={isSaving}
                min="0"
                onChange={(event) => setMonthlyContribution(event.target.value)}
                placeholder={t("monthlyContribution")}
                step="0.01"
                type="number"
                value={monthlyContribution}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-md border border-borderSoft bg-panel px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
                disabled={isSaving}
                max="300"
                min="0"
                onChange={(event) => setAnnualRate(event.target.value)}
                placeholder={t("annualRate")}
                step="0.01"
                type="number"
                value={annualRate}
              />
              <input
                className="rounded-md border border-borderSoft bg-panel px-3 py-2.5 text-sm text-text outline-none transition placeholder:text-muted focus:border-cyan"
                disabled={isSaving}
                max="60"
                min="1"
                onChange={(event) => setYears(event.target.value)}
                placeholder={t("years")}
                type="number"
                value={years}
              />
            </div>

            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald px-4 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isSaving || !initialAmount || !annualRate || !years}
              type="submit"
            >
              <Calculator size={16} />
              {isSaving ? t("saving") : t("runSimulation")}
            </button>
          </form>

          {result ? (
            <div className="mt-4 grid gap-3">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between gap-3 text-muted">
                  <span>{t("finalBalance")}</span>
                  <span className="font-semibold text-text">{formatMoney(Number(result.final_balance))}</span>
                </div>
                <div className="flex justify-between gap-3 text-muted">
                  <span>{t("totalContributions")}</span>
                  <span className="font-medium text-text">{formatMoney(Number(result.total_contributions))}</span>
                </div>
                <div className="flex justify-between gap-3 text-muted">
                  <span>{t("totalInterest")}</span>
                  <span className="font-medium text-emerald">{formatMoney(Number(result.total_interest))}</span>
                </div>
              </div>

              <div className="h-44 rounded-md border border-borderSoft bg-panel p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={chartData}>
                    <XAxis dataKey="month" tick={{ fill: "#7d8597", fontSize: 11 }} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value) => formatMoney(Number(value ?? 0))}
                      labelFormatter={(label) => `${t("month")} ${label}`}
                      contentStyle={{
                        background: "#111827",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        color: "#f8fafc"
                      }}
                    />
                    <Line
                      dataKey="contributions"
                      dot={false}
                      name={t("totalContributions")}
                      stroke="#38bdf8"
                      strokeWidth={2}
                    />
                    <Line
                      dataKey="balance"
                      dot={false}
                      name={t("finalBalance")}
                      stroke="#16f2a4"
                      strokeWidth={2}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
              {t("noSimulationYet")}
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}
