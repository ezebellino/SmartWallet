import { Activity } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { TranslationKey } from "@/i18n";
import type { InvestmentAsset, InvestmentPriceSnapshot } from "@/types/api";

type Props = {
  assets: InvestmentAsset[];
  isDisabled: boolean;
  onLoadPriceHistory: (assetId: number, limit?: number) => Promise<InvestmentPriceSnapshot[]>;
  t: (key: TranslationKey) => string;
};

type ChartPoint = {
  label: string;
  price: number;
  fullDate: string;
};

function formatMoney(value: number, currency: string) {
  return `${currency} ${value.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  })}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  })}%`;
}

export function InvestmentPerformancePanel({ assets, isDisabled, onLoadPriceHistory, t }: Props) {
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(assets[0]?.id ?? null);
  const [history, setHistory] = useState<InvestmentPriceSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (assets.length === 0) {
      setSelectedAssetId(null);
      setHistory([]);
      return;
    }

    if (!selectedAssetId || !assets.some((asset) => asset.id === selectedAssetId)) {
      setSelectedAssetId(assets[0].id);
    }
  }, [assets, selectedAssetId]);

  useEffect(() => {
    if (isDisabled || selectedAssetId == null) {
      setHistory([]);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    onLoadPriceHistory(selectedAssetId, 30)
      .then((response) => {
        if (isActive) {
          setHistory(response);
        }
      })
      .catch(() => {
        if (isActive) {
          setHistory([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isDisabled, onLoadPriceHistory, selectedAssetId]);

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? null;
  const chronologicalHistory = useMemo(
    () => [...history].sort((left, right) => left.fetched_at.localeCompare(right.fetched_at)),
    [history]
  );
  const chartData = useMemo<ChartPoint[]>(
    () =>
      chronologicalHistory.map((snapshot) => ({
        label: formatDateTime(snapshot.fetched_at),
        price: Number(snapshot.price),
        fullDate: new Intl.DateTimeFormat("es-AR", {
          dateStyle: "medium",
          timeStyle: "short"
        }).format(new Date(snapshot.fetched_at))
      })),
    [chronologicalHistory]
  );
  const firstSnapshot = chronologicalHistory[0] ?? null;
  const lastSnapshot = chronologicalHistory[chronologicalHistory.length - 1] ?? null;
  const variation = useMemo(() => {
    if (!firstSnapshot || !lastSnapshot) {
      return null;
    }
    const firstPrice = Number(firstSnapshot.price);
    const lastPrice = Number(lastSnapshot.price);
    if (!Number.isFinite(firstPrice) || firstPrice === 0 || !Number.isFinite(lastPrice)) {
      return null;
    }

    return {
      amount: lastPrice - firstPrice,
      percent: ((lastPrice - firstPrice) / firstPrice) * 100
    };
  }, [firstSnapshot, lastSnapshot]);
  const currency = lastSnapshot?.currency ?? selectedAsset?.currency ?? "USD";

  return (
    <div className="mt-5 rounded-md border border-borderSoft bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-text">
            <Activity size={16} className="text-cyan" />
            {t("investmentPerformance")}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">{t("investmentPerformanceSubtitle")}</p>
        </div>
        <select
          className="min-h-10 min-w-[180px] rounded-md border border-borderSoft bg-panel px-3 py-2 text-sm text-text outline-none transition focus:border-cyan disabled:opacity-55"
          disabled={isDisabled || assets.length === 0}
          onChange={(event) => setSelectedAssetId(Number(event.target.value))}
          value={selectedAssetId ?? ""}
        >
          {assets.length === 0 ? (
            <option value="">{t("createAssetFirst")}</option>
          ) : (
            assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.symbol} - {asset.name}
              </option>
            ))
          )}
        </select>
      </div>

      {isDisabled ? (
        <p className="mt-4 rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
          {t("signInToManageData")}
        </p>
      ) : assets.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
          {t("noInvestmentAssets")}
        </p>
      ) : isLoading ? (
        <p className="mt-4 rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
          {t("loadingPriceHistory")}
        </p>
      ) : history.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
          {t("noPriceHistory")}
        </p>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-md border border-borderSoft bg-panel px-3 py-2">
                <div className="text-xs text-muted">{t("firstPrice")}</div>
                <div className="mt-1 font-semibold text-text">
                  {firstSnapshot ? formatMoney(Number(firstSnapshot.price), firstSnapshot.currency) : "-"}
                </div>
              </div>
              <div className="rounded-md border border-borderSoft bg-panel px-3 py-2">
                <div className="text-xs text-muted">{t("lastPrice")}</div>
                <div className="mt-1 font-semibold text-text">
                  {lastSnapshot ? formatMoney(Number(lastSnapshot.price), lastSnapshot.currency) : "-"}
                </div>
              </div>
              <div className="rounded-md border border-borderSoft bg-panel px-3 py-2">
                <div className="text-xs text-muted">{t("priceVariation")}</div>
                <div className={variation && variation.amount < 0 ? "mt-1 font-semibold text-rose" : "mt-1 font-semibold text-emerald"}>
                  {variation ? `${formatMoney(variation.amount, currency)} (${formatPercent(variation.percent)})` : "-"}
                </div>
              </div>
            </div>

            {chartData.length >= 2 ? (
              <div className="mt-4 h-64 min-w-0 rounded-md border border-borderSoft bg-panel p-2">
                <ResponsiveContainer height="100%" width="100%">
                  <RechartsLineChart data={chartData} margin={{ bottom: 8, left: 0, right: 10, top: 10 }}>
                    <CartesianGrid stroke="rgba(148, 163, 184, 0.16)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      minTickGap={28}
                      stroke="#8b949e"
                      tick={{ fill: "#8b949e", fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={["dataMin", "dataMax"]}
                      stroke="#8b949e"
                      tick={{ fill: "#8b949e", fontSize: 11 }}
                      tickFormatter={(value) => Number(value).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                      tickLine={false}
                      width={54}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#101820",
                        border: "1px solid rgba(148, 163, 184, 0.24)",
                        borderRadius: 6,
                        color: "#f8fafc"
                      }}
                      formatter={(value) => [formatMoney(Number(value), currency), t("currentPrice")]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ""}
                    />
                    <Line
                      dataKey="price"
                      dot={{ fill: "#22d3ee", r: 3, strokeWidth: 0 }}
                      isAnimationActive={false}
                      stroke="#22d3ee"
                      strokeWidth={2}
                      type="monotone"
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-4 rounded-md border border-dashed border-borderSoft px-3 py-4 text-sm text-muted">
                {t("notEnoughPriceHistory")}
              </p>
            )}
          </div>

          <div className="rounded-md border border-borderSoft bg-panel p-3">
            <div className="text-sm font-medium text-text">{t("latestPrices")}</div>
            <div className="mt-3 space-y-2">
              {history.slice(0, 5).map((snapshot) => (
                <div className="flex items-center justify-between gap-3 text-xs" key={snapshot.id}>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-text">{formatMoney(Number(snapshot.price), snapshot.currency)}</div>
                    <div className="mt-1 truncate text-muted">{formatDateTime(snapshot.fetched_at)}</div>
                  </div>
                  <span className="shrink-0 rounded border border-borderSoft px-2 py-1 text-muted">
                    {snapshot.provider.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
