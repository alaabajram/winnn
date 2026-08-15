/**
 * Status colour tokens.
 *
 * Lives outside components/admin/ui.tsx deliberately. That file is
 * "use client", and a plain function exported from a client module cannot be
 * CALLED from a server component - only components can cross that boundary.
 * Server pages (admin dashboard, campaigns list) import this instead.
 */
export function statusTone(s: string) {
  const map: Record<string, string> = {
    LIVE: "bg-tertiary-fixed/40 text-on-tertiary-fixed",
    ACTIVE: "bg-tertiary-fixed/40 text-on-tertiary-fixed",
    PAID: "bg-tertiary-fixed/40 text-on-tertiary-fixed",
    PUBLISHED: "bg-tertiary-fixed/40 text-on-tertiary-fixed",
    CONFIRMED: "bg-tertiary-fixed/40 text-on-tertiary-fixed",
    DRAFT: "bg-surface-container text-on-surface-variant",
    GENERATED: "bg-surface-container text-on-surface-variant",
    SCHEDULED: "bg-primary-fixed text-on-primary-fixed",
    SENT: "bg-primary-fixed text-on-primary-fixed",
    PRINTED: "bg-primary-fixed text-on-primary-fixed",
    DISTRIBUTED: "bg-primary-fixed text-on-primary-fixed",
    SALES_CLOSED: "bg-secondary-container text-on-secondary-container",
    PAUSED: "bg-secondary-container text-on-secondary-container",
    PENDING: "bg-secondary-container text-on-secondary-container",
    RECORDED: "bg-secondary-container text-on-secondary-container",
    OVERDUE: "bg-error-container text-on-error-container",
    VOID: "bg-error-container text-on-error-container",
    CANCELLED: "bg-error-container text-on-error-container",
    DISABLED: "bg-error-container text-on-error-container",
    REFUNDED: "bg-error-container text-on-error-container",
    COMPLETED: "bg-primary-container text-on-primary",
    DRAWN: "bg-primary-container text-on-primary",
    ARCHIVED: "bg-surface-variant text-on-surface-variant",
  };
  return map[s] || "bg-surface-container text-on-surface-variant";
}
