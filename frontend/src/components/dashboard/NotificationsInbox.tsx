import { Bell, Bot, CheckCheck, CheckCircle2, PiggyBank, RefreshCw, ShieldAlert, TriangleAlert, WalletCards } from "lucide-react";
import type { ReactNode } from "react";
import { Panel } from "@/components/ui";
import type { TranslationKey } from "@/i18n";
import type { AppNotification, NotificationPriority, NotificationType } from "@/types/api";
import type { DashboardSection } from "@/components/dashboard/DashboardSectionNav";

const priorityStyles = {
  high: {
    border: "border-rose/30 bg-rose/10",
    icon: "bg-rose/15 text-rose",
    pill: "border-rose/30 text-rose"
  },
  medium: {
    border: "border-amber/30 bg-amber/10",
    icon: "bg-amber/15 text-amber",
    pill: "border-amber/30 text-amber"
  },
  low: {
    border: "border-cyan/25 bg-cyan/10",
    icon: "bg-cyan/15 text-cyan",
    pill: "border-cyan/30 text-cyan"
  }
} satisfies Record<NotificationPriority, { border: string; icon: string; pill: string }>;

function priorityIcon(priority: NotificationPriority) {
  if (priority === "high") {
    return <ShieldAlert size={15} />;
  }
  if (priority === "medium") {
    return <TriangleAlert size={15} />;
  }
  return <Bell size={15} />;
}

function isDashboardSection(section: string | null): section is DashboardSection {
  return ["dashboard", "movements", "budgets", "goals", "dollars", "investments", "aiReports"].includes(section ?? "");
}

function notificationSource(type: NotificationType): {
  icon: ReactNode;
  labelKey: TranslationKey;
  className: string;
} {
  if (type === "binance_portfolio_alert") {
    return {
      className: "border-cyan/30 bg-cyan/10 text-cyan",
      icon: <WalletCards size={12} />,
      labelKey: "notificationSourceBinance"
    };
  }
  if (type === "ai_report_pending") {
    return {
      className: "border-cyan/30 bg-cyan/10 text-cyan",
      icon: <Bot size={12} />,
      labelKey: "notificationSourceAi"
    };
  }
  if (type === "goal_without_contribution") {
    return {
      className: "border-emerald/30 bg-emerald/10 text-emerald",
      icon: <PiggyBank size={12} />,
      labelKey: "notificationSourceGoals"
    };
  }
  return {
    className: "border-amber/30 bg-amber/10 text-amber",
    icon: <ShieldAlert size={12} />,
    labelKey: "notificationSourceBudgets"
  };
}

export function NotificationsInbox({
  isGenerating,
  notifications,
  onGenerate,
  onMarkAllRead,
  onMarkRead,
  onSectionChange,
  t
}: {
  isGenerating: boolean;
  notifications: AppNotification[];
  onGenerate: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (notificationId: number) => void;
  onSectionChange: (section: DashboardSection) => void;
  t: (key: TranslationKey) => string;
}) {
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  const visibleNotifications = notifications.slice(0, 4);

  return (
    <Panel className="p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan">{t("notificationsEyebrow")}</p>
          <h2 className="mt-1 text-lg font-semibold text-text">{t("notificationsTitle")}</h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border border-borderSoft px-2.5 py-1 text-xs font-semibold text-muted">
          <Bell size={14} />
          {unreadCount} {t("notificationsUnread")}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-md border border-cyan/35 bg-cyan/10 px-3 py-2 text-xs font-semibold text-cyan transition hover:bg-cyan/15 disabled:cursor-wait disabled:opacity-60"
          disabled={isGenerating}
          onClick={onGenerate}
          type="button"
        >
          <RefreshCw className={isGenerating ? "animate-spin" : undefined} size={14} />
          {isGenerating ? t("notificationsGenerating") : t("notificationsGenerate")}
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-borderSoft bg-background/55 px-3 py-2 text-xs font-semibold text-muted transition hover:border-emerald/35 hover:text-emerald disabled:opacity-50"
          disabled={unreadCount === 0}
          onClick={onMarkAllRead}
          type="button"
        >
          <CheckCheck size={14} />
          {t("notificationsMarkAllRead")}
        </button>
      </div>

      {visibleNotifications.length === 0 ? (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald/25 bg-emerald/10 p-4 text-sm text-muted">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald" />
          <div>
            <p className="font-semibold text-text">{t("notificationsEmptyTitle")}</p>
            <p className="mt-1">{t("notificationsEmptyBody")}</p>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {visibleNotifications.map((notification) => {
            const styles = priorityStyles[notification.priority];
            const actionSection = isDashboardSection(notification.action_section) ? notification.action_section : null;
            const source = notificationSource(notification.type);
            return (
              <div
                className={`rounded-lg border p-2.5 ${styles.border} ${notification.is_read ? "opacity-70" : ""}`}
                key={notification.id}
              >
                <div className="flex items-start gap-2">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${styles.icon}`}>
                    {priorityIcon(notification.priority)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-text">{notification.title}</p>
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase ${styles.pill}`}>
                        {t(`prioritySeverity${notification.priority}` as TranslationKey)}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase ${source.className}`}>
                        {source.icon}
                        {t(source.labelKey)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted">{notification.message}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <button
                    className="text-xs font-semibold text-muted transition hover:text-emerald disabled:cursor-default disabled:text-muted/60"
                    disabled={notification.is_read}
                    onClick={() => onMarkRead(notification.id)}
                    type="button"
                  >
                    {notification.is_read ? t("notificationsRead") : t("notificationsMarkRead")}
                  </button>
                  {actionSection ? (
                    <button
                      className="text-xs font-semibold text-cyan transition hover:text-text"
                      onClick={() => onSectionChange(actionSection)}
                      type="button"
                    >
                      {notification.action_label ?? t("priorityAlertOpenAction")}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
