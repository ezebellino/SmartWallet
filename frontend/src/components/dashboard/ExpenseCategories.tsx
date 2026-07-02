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
      <div className="mt-5 h-56">
        {data.length === 0 ? (
          <div className="grid h-full place-items-center rounded-md border border-dashed border-borderSoft text-sm text-muted">
            {t("noExpenseCategories")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid className="chart-grid" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={112} stroke="#94a3b8" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#10161d", border: "1px solid #26313d", borderRadius: 8 }} />
              <Bar dataKey="value" fill="#38bdf8" radius={[0, 6, 6, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}
