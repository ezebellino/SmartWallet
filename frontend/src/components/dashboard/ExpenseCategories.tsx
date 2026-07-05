import { PieChart } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel } from "@/components/ui";
import type { TranslationKey } from "@/i18n";

type Props = {
  data: Array<{ name: string; value: number }>;
  t: (key: TranslationKey) => string;
};

export function ExpenseCategories({ data, t }: Props) {
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-text">{t("expenseCategories")}</h2>
        <PieChart size={18} className="text-emerald" />
      </div>
      <div className="mt-5 h-56 rounded-md border border-borderSoft/70 bg-background/35 p-3">
        {data.length === 0 ? (
          <div className="grid h-full place-items-center rounded-md border border-dashed border-borderSoft text-sm text-muted">
            {t("noExpenseCategories")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ bottom: 0, left: 0, right: 8, top: 8 }}>
              <CartesianGrid className="chart-grid" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={112} stroke="#9fb5c8" tickLine={false} axisLine={false} />
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
              <Bar dataKey="value" fill="#38bdf8" radius={[0, 6, 6, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}
