import { LineChart } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Panel } from "@/components/ui";
import type { TranslationKey } from "@/i18n";

type Props = {
  data: Array<{ name: string; income: number; expenses: number }>;
  t: (key: TranslationKey) => string;
};

export function CashflowChart({ data, t }: Props) {
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text">{t("monthlyCashflow")}</h2>
          <p className="mt-1 text-sm text-muted">{t("cashflowSubtitle")}</p>
        </div>
        <LineChart size={18} className="text-cyan" />
      </div>
      <div className="mt-5 h-72 rounded-md border border-borderSoft/70 bg-background/35 p-3">
        {data.length === 0 ? (
          <div className="grid h-full place-items-center rounded-md border border-dashed border-borderSoft text-sm text-muted">
            {t("noMonthlyData")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ bottom: 0, left: 0, right: 8, top: 8 }}>
              <CartesianGrid className="chart-grid" vertical={false} />
              <XAxis dataKey="name" stroke="#9fb5c8" tickLine={false} axisLine={false} />
              <YAxis
                stroke="#9fb5c8"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${Number(value) / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  background: "#081018",
                  border: "1px solid rgba(56, 189, 248, 0.28)",
                  borderRadius: 8,
                  boxShadow: "0 18px 40px rgba(0, 0, 0, 0.35)",
                  color: "#f8fafc"
                }}
                cursor={{ fill: "rgba(56, 189, 248, 0.08)" }}
                labelStyle={{ color: "#bfdbfe", fontWeight: 700 }}
              />
              <Bar dataKey="income" fill="#16f2a4" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="expenses" fill="#fb7185" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}
