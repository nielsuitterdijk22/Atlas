"use client";

import { useEffect, useState } from "react";

import { useApp } from "../../components/AppContext";
import TemplateCard from "../../components/TemplateCard";
import { EmptyState, ErrorState, Pagination, Spinner } from "../../components/ui";
import { ApiError, fetchTemplates, type TemplateDefinition } from "../../lib/api";

const PAGE_SIZE = 6;

export default function CreatePage() {
  const { orgId, token } = useApp();
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [page, setPage] = useState(1);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchTemplates({ orgId, token })
      .then((t) => {
        setTemplates(t);
        setPage(1);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(load, [orgId]);

  const totalPages = Math.ceil(templates.length / PAGE_SIZE);
  const pageItems = templates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="top">
        <div>
          <div className="kicker">Golden Paths</div>
          <h1>Create something</h1>
          <p className="desc">
            Pick a template. Each one scaffolds a compliant service — fill in a short guided form and Yaly commits
            the result for you.
          </p>
        </div>
      </div>

      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={load} />}

      {!loading && !error && (
        templates.length === 0 ? (
          <EmptyState title="No templates found" description="Add YAML definitions to the catalog folder to get started." />
        ) : (
          <>
            <div className="tpl-grid">
              {pageItems.map((t) => (
                <TemplateCard key={t.metadata.name} template={t} />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} total={templates.length} noun="templates" onPage={setPage} />
          </>
        )
      )}
    </>
  );
}
