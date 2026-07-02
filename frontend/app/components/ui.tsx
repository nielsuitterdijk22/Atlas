import Link from "next/link";

import type { ApiError } from "../lib/api";

export function Spinner() {
  return <div className="spinner" />;
}

export function ErrorState({ error, onRetry }: { error: ApiError | Error | null; onRetry?: () => void }) {
  const detail = error && "detail" in error ? (error as ApiError).detail : undefined;
  return (
    <div className="empty">
      <div className="title">{error?.message || "Something went wrong"}</div>
      {detail && <p className="desc">{detail}</p>}
      {onRetry && (
        <button onClick={onRetry} className="btn primary" style={{ marginTop: 12 }}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon = "📭",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="icon">{icon}</div>
      <div className="title">{title}</div>
      {description && <p className="desc">{description}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  "pending-approval": { label: "Awaiting approval", cls: "amber" },
  provisioning: { label: "Provisioning", cls: "blue" },
  completed: { label: "Completed", cls: "green" },
  failed: { label: "Failed", cls: "red" },
  rejected: { label: "Rejected", cls: "gray" },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_STYLES[status] || { label: status, cls: "gray" };
  return <span className={`badge ${meta.cls}`}>{meta.label}</span>;
}

const LIFECYCLE_STYLES: Record<string, string> = {
  production: "green",
  staging: "amber",
  development: "blue",
  experimental: "gray",
};

export function LifecycleBadge({ lifecycle }: { lifecycle: string }) {
  return <span className={`badge ${LIFECYCLE_STYLES[lifecycle] || "gray"}`}>{lifecycle}</span>;
}

export function Pagination({
  page,
  totalPages,
  total,
  noun = "items",
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  noun?: string;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <span className="info">
        {total} {noun}
      </span>
      <div className="controls">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="btn sm">
          Previous
        </button>
        <span className="info">
          Page {page} of {totalPages}
        </span>
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} className="btn sm">
          Next
        </button>
      </div>
    </div>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="btn primary">
      {children}
    </Link>
  );
}
