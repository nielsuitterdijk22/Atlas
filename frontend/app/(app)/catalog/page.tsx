"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useApp } from "../../components/AppContext";
import { EmptyState, ErrorState, LifecycleBadge, Pagination, PrimaryLink, Spinner } from "../../components/ui";
import { TEAMS } from "../../constants";
import { ApiError, fetchServices, type ServiceListResponse } from "../../lib/api";

const PAGE_SIZE = 12;

export default function CatalogPage() {
  const { orgId, token } = useApp();
  const [data, setData] = useState<ServiceListResponse>({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [team, setTeam] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, team]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchServices({ search: debouncedSearch, team, page, pageSize: PAGE_SIZE }, { orgId, token })
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [debouncedSearch, team, page, orgId]);

  const totalPages = Math.ceil(data.total / PAGE_SIZE);
  const hasFilters = debouncedSearch || team;

  return (
    <>
      <div className="top">
        <div>
          <div className="kicker">Software Catalog</div>
          <h1>Catalog</h1>
          <p className="desc">
            Every service created through Atlas, with ownership and lifecycle. Populated automatically — nothing is
            hand-registered.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services…" />
        <select value={team} onChange={(e) => setTeam(e.target.value)} style={{ width: 220 }}>
          <option value="">All teams</option>
          {TEAMS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={() => setPage((p) => p)} />}

      {!loading && !error && (
        data.items.length === 0 ? (
          <EmptyState
            icon="📦"
            title={hasFilters ? "No matching services" : "No services yet"}
            description={hasFilters ? "Try a different search or team filter." : "Create your first service to populate the catalog."}
            action={!hasFilters && <PrimaryLink href="/create">Create a service</PrimaryLink>}
          />
        ) : (
          <>
            <div className="svc-grid">
              {data.items.map((s) => (
                <Link key={s.id} href={`/catalog/${s.id}`} className="svc-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span className="svc-name">{s.name}</span>
                    <span style={{ marginLeft: "auto" }}>
                      <LifecycleBadge lifecycle={s.lifecycle} />
                    </span>
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: 13, minHeight: "2.5rem" }}>
                    {s.description || "No description provided."}
                  </p>
                  <div style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                    <span>{s.serviceType}</span>
                    <span>·</span>
                    <span>{s.team || "Unassigned"}</span>
                  </div>
                </Link>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} total={data.total} noun="services" onPage={setPage} />
          </>
        )
      )}
    </>
  );
}
