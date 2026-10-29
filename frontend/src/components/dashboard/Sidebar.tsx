import { useEffect, useState } from "react";
import { Banknote, BarChart3, Bot, CreditCard, Gauge, LineChart, PanelLeftClose, PanelLeftOpen, RefreshCw, Target, UserRound, WalletCards } from "lucide-react";
import type { TranslationKey } from "@/i18n";
import type { DashboardSection } from "@/components/dashboard/DashboardSectionNav";

const groups: Array<{
  label: TranslationKey;
  items: Array<{ section: DashboardSection; label: TranslationKey; icon: typeof Gauge }>;
}> = [
  { label: "navHome", items: [{ section: "dashboard", label: "dashboard", icon: Gauge }] },
  { label: "navMoney", items: [
    { section: "movements", label: "movements", icon: CreditCard },
    { section: "budgets", label: "budgets", icon: BarChart3 },
    { section: "goals", label: "goals", icon: Target }
  ] },
  { label: "navWealth", items: [
    { section: "dollars", label: "dollarSavings", icon: Banknote },
    { section: "investments", label: "investments", icon: LineChart }
  ] },
  { label: "navAnalysis", items: [{ section: "aiReports", label: "aiReports", icon: Bot }] }
];

export function Sidebar({
  activeSection,
  isSyncing,
  onSectionChange,
  onSync,
  userName,
  t
}: {
  activeSection: DashboardSection;
  isSyncing: boolean;
  onSectionChange: (section: DashboardSection) => void;
  onSync: () => void;
  userName: string;
  t: (key: TranslationKey) => string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem("smartwallet-sidebar-collapsed") === "true");
    } catch {
      // Storage can be unavailable in private browsing.
    }
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem("smartwallet-sidebar-collapsed", String(next));
    } catch {
      // Navigation still works without persistence.
    }
  }

  function navButton(section: DashboardSection, label: TranslationKey, Icon: typeof Gauge) {
    const active = activeSection === section;
    return (
      <button
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? t(label) : undefined}
        className={`flex h-10 w-full items-center rounded-md text-left text-sm font-medium transition-colors ${collapsed ? "justify-center px-0" : "gap-3 px-3"} ${active ? "bg-cyan/10 text-cyan" : "text-muted hover:bg-panelSoft hover:text-text"}`}
        key={section}
        onClick={() => onSectionChange(section)}
        title={collapsed ? t(label) : undefined}
        type="button"
      >
        <Icon className="shrink-0" size={18} />
        {!collapsed ? <span className="truncate">{t(label)}</span> : null}
      </button>
    );
  }

  return (
    <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-borderSoft bg-background transition-[width] duration-200 lg:flex ${collapsed ? "w-[72px] px-3" : "w-60 px-4"}`}>
      <div className={`flex h-20 shrink-0 items-center ${collapsed ? "justify-center" : "justify-between gap-2"}`}>
        {!collapsed ? <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-emerald/25 bg-emerald/10 text-emerald"><WalletCards size={19} /></div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-text">Smart Wallet AI</div>
            <div className="truncate text-xs text-muted">{t("personalFinance")}</div>
          </div>
        </div> : null}
        <button
          aria-label={t(collapsed ? "expandSidebar" : "collapseSidebar")}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-panelSoft hover:text-text"
          onClick={toggleCollapsed}
          title={t(collapsed ? "expandSidebar" : "collapseSidebar")}
          type="button"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav aria-label={t("navigation")} className="min-h-0 flex-1 space-y-4 overflow-y-auto py-3">
        {groups.map((group, index) => (
          <div className={collapsed && index > 0 ? "border-t border-borderSoft pt-4" : ""} key={group.label}>
            {!collapsed ? <div className="mb-1 px-3 text-[11px] font-semibold uppercase text-muted">{t(group.label)}</div> : null}
            <div className="space-y-1">{group.items.map(({ section, label, icon }) => navButton(section, label, icon))}</div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-borderSoft py-3">
        <button
          aria-current={activeSection === "profile" ? "page" : undefined}
          aria-label={collapsed ? t("profile") : undefined}
          className={`flex h-12 w-full items-center rounded-md text-left text-sm transition-colors ${collapsed ? "justify-center" : "gap-3 px-3"} ${activeSection === "profile" ? "bg-cyan/10 text-cyan" : "text-muted hover:bg-panelSoft hover:text-text"}`}
          onClick={() => onSectionChange("profile")}
          title={collapsed ? t("profile") : undefined}
          type="button"
        >
          <UserRound className="shrink-0" size={18} />
          {!collapsed ? <span className="min-w-0"><span className="block truncate font-medium text-text">{userName}</span><span className="block text-xs">{t("profile")}</span></span> : null}
        </button>
        <button
          aria-label={collapsed ? t(isSyncing ? "syncingBackend" : "syncBackend") : undefined}
          className={`flex h-10 w-full items-center rounded-md text-left text-sm text-muted transition-colors hover:bg-panelSoft hover:text-text disabled:opacity-50 ${collapsed ? "justify-center" : "gap-3 px-3"}`}
          disabled={isSyncing}
          onClick={onSync}
          title={t(isSyncing ? "syncingBackend" : "syncBackend")}
          type="button"
        >
          <RefreshCw className={isSyncing ? "animate-spin" : undefined} size={18} />
          {!collapsed ? <span className="truncate">{t(isSyncing ? "syncingBackend" : "syncBackend")}</span> : null}
        </button>
      </div>
    </aside>
  );
}
