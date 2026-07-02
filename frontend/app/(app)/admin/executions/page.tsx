"use client";

import { useEffect, useState } from "react";

import { useApp } from "../../../components/AppContext";
import { timeAgo } from "../../../lib/format";
import { ApiError, fetchExecutions, type ExecutionListResponse } from "../../../lib/api";

const statusBadge: Record<string, string> = {
  success: "green",
  failed: "red",
  pending: "amber",
};

function parseValues(valuesJson: string | null): string | null {
  if (!valuesJson) return null;
  try {
    return JSON.stringify(JSON.parse(valuesJson), null, 2);
  } catch {
    return valuesJson;
  }
}

export default function ExecutionsPage() {
  const { orgId, token } = useApp();
  const [data, setData] = useState<ExecutionListResponse>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    const filters: { status?: string; template?: string } = {};
    if (statusFilter) filters.status = statusFilter;
    if (templateFilter.trim()) filters.template = templateFilter.trim();
    fetchExecutions(page, 20, filters, { orgId, token }).then(setData).catch(setError).finally(() => setLoading(false));
  };

  useEffect(load, [page, statusFilter, templateFilter, orgId]);

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, margin: 0 }}>Executions</h1>
          <p className="hint">History of all template executions</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="text"
            value={templateFilter}
            onChange={(e) => {
              setTemplateFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by template"
            style={{ width: 200 }}
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: 160 }}
          >
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
          <button onClick={load} className="icon-btn" title="Refresh">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {error && <div className="banner error">{error.message}</div>}

      <div className="panel">
        {loading ? (
          <div className="spinner" />
        ) : data.items.length === 0 ? (
          <div className="empty">
            <div className="title">No executions yet</div>
            <p className="desc">Run a template from the catalog to see it here.</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Template</th>
                  <th>Output</th>
                  <th>Commit</th>
                  <th>When</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((exec) => (
                  <tr key={exec.id}>
                    <td>
                      <span className={`badge ${statusBadge[exec.status] || "gray"}`}>{exec.status}</span>
                    </td>
                    <td>
                      <button onClick={() => setExpanded(expanded === exec.id ? null : exec.id)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", textAlign: "left", padding: 0 }}>
                        <div style={{ fontWeight: 500 }}>{exec.templateTitle || exec.templateName}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{exec.templateName}</div>
                      </button>
                    </td>
                    <td style={{ color: "var(--muted)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: exec.outputTarget === "github" ? "#c084fc" : "var(--blue)",
                            display: "inline-block",
                          }}
                        />
                        {exec.outputTarget || "local"}
                      </span>
                      {exec.outputRepo && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{exec.outputRepo}</div>}
                    </td>
                    <td>
                      {exec.commitSha ? (
                        exec.commitUrl ? (
                          <a href={exec.commitUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--accent-soft)" }}>
                            {exec.commitSha.substring(0, 8)}
                          </a>
                        ) : (
                          <code style={{ fontSize: 12 }}>{exec.commitSha.substring(0, 8)}</code>
                        )
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                    <td style={{ color: "var(--muted)" }} title={new Date(exec.executedAt).toLocaleString()}>
                      {timeAgo(exec.executedAt)}
                    </td>
                    <td style={{ color: "var(--muted)" }}>{exec.durationMs ? `${Math.round(exec.durationMs)}ms` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {expanded &&
              (() => {
                const exec = data.items.find((item) => item.id === expanded);
                if (!exec) return null;
                return (
                  <div style={{ borderTop: "1px solid var(--line)", background: "var(--panel2)", padding: "16px 18px" }}>
                    <div className="grid-2">
                      {exec.valuesJson && (
                        <div>
                          <h4 style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Input Values</h4>
                          <pre style={{ fontSize: 12, background: "#10131a", border: "1px solid var(--line)", borderRadius: 8, padding: 10, overflowX: "auto" }}>
                            {parseValues(exec.valuesJson)}
                          </pre>
                        </div>
                      )}
                      <div>
                        {exec.filesCreated?.length > 0 && (
                          <div>
                            <h4 style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Files Created</h4>
                            <ul style={{ margin: 0, paddingLeft: 16 }}>
                              {exec.filesCreated.map((file) => (
                                <li key={file} style={{ fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                                  {file}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {exec.errorMessage && (
                          <div style={{ marginTop: 12 }}>
                            <h4 style={{ fontSize: 11, color: "var(--red)", textTransform: "uppercase" }}>Error</h4>
                            <p className="banner error">{exec.errorMessage}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

            {totalPages > 1 && (
              <div className="pagination" style={{ padding: "12px 18px" }}>
                <span className="info">{data.total} total executions</span>
                <div className="controls">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn sm">
                    Previous
                  </button>
                  <span className="info">
                    Page {page} of {totalPages}
                  </span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn sm">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
