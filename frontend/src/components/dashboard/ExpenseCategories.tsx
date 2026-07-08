import { PieChart } from "lucide-react";
import { useMemo } from "react";
import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Panel } from "@/components/ui";
import type { TranslationKey } from "@/i18n";
import { formatMoney } from "@/lib/format";

type Props = {
  data: Array<{ name: string; value: number }>;
  t: (key: TranslationKey) => string;
};

const chartColors = ["#38bdf8", "#16f2a4", "#fbbf24", "#fb7185", "#a78bfa", "#22d3ee"];

export function ExpenseCategories({ data, t }: Props) {
  const chartData = useMemo(() => {
    const sorted = data
      .filter((item) => item.value > 0)
      .sort((left, right) => right.value - left.value);
    const total = sorted.reduce((sum, item) => sum + item.value, 0);

    return sorted.slice(0, 6).map((item, index) => ({
      ...item,
      color: chartColors[index % chartColors.length],
      percentage: total > 0 ? (item.value / total) * 100 : 0
    }));
  }, [data]);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const topCategory = chartData[0];

  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text">{t("expenseCategories")}</h2>
          <p className="mt-1 text-sm text-muted">{t("expenseCategoriesSubtitle")}</p>
        </div>
        <PieChart size={18} className="text-emerald" />
      </div>
      <div className="mt-5 rounded-md border border-borderSoft/70 bg-background/35 p-3">
        {chartData.length === 0 ? (
          <div className="grid h-full place-items-center rounded-md border border-dashed border-borderSoft text-sm text-muted">
            {t("noExpenseCategories")}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="relative h-56 min-h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    cx="50%"
                    cy="50%"
                    data={chartData}
                    dataKey="value"
                    innerRadius={66}
                    isAnimationActive={false}
                    nameKey="name"
                    outerRadius={98}
                    paddingAngle={2}
                    stroke="#10161d"
                    strokeWidth={3}
                  >
                    {chartData.map((entry) => (
                      <Cell fill={entry.color} key={entry.name} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#081018",
                      border: "1px solid rgba(56, 189, 248, 0.28)",
                      borderRadius: 8,
                      boxShadow: "0 18px 40px rgba(0, 0, 0, 0.35)",
                      color: "#f8fafc"
                    }}
                    formatter={(value) => formatMoney(Number(value))}
                    labelStyle={{ color: "#bfdbfe", fontWeight: 700 }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-xs font-semibold uppercase text-muted">{t("totalExpenses")}</div>
                  <div className="mt-1 text-lg font-semibold text-text">{formatMoney(total)}</div>
                </div>
              </div>
            </div>

            <div className="min-w-0">
              {topCategory ? (
                <div className="rounded-md border border-cyan/20 bg-cyan/10 p-3">
                  <div className="text-xs font-semibold uppercase text-cyan">{t("topExpenseCategory")}</div>
                  <div className="mt-1 truncate text-sm font-semibold text-text">{topCategory.name}</div>
                  <div className="mt-1 text-sm text-muted">
                    {formatMoney(topCategory.value)} - {Math.round(topCategory.percentage)}%
                  </div>
                </div>
              ) : null}

              <div className="mt-3 space-y-2">
                {chartData.map((item) => (
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-borderSoft bg-panel/70 px-3 py-2" key={item.name}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="truncate text-sm font-medium text-text">{item.name}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
                        <div className="h-full rounded-full" style={{ backgroundColor: item.color, width: `${Math.min(item.percentage, 100)}%` }} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-text">{Math.round(item.percentage)}%</div>
                      <div className="text-xs text-muted">{formatMoney(item.value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
