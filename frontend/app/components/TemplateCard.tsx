import Link from "next/link";

import type { TemplateDefinition } from "../lib/api";

const icons: Record<string, string> = {
  rocket: "🚀",
  settings: "⚙️",
  database: "🗄️",
  code: "💻",
  file: "📄",
  cloud: "☁️",
  shield: "🛡️",
  globe: "🌐",
  key: "🔑",
};

export default function TemplateCard({ template }: { template: TemplateDefinition }) {
  const { metadata, spec } = template;
  const icon = icons[metadata.icon] || icons.file;

  return (
    <Link href={`/create/${metadata.name}`} className="tpl-card">
      <div className="tpl-card-body">
        <div className="tpl-icon">{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="tpl-title">
            {metadata.title}
            {spec.approvalRequired && <span className="badge amber">needs approval</span>}
          </h3>
          <p className="tpl-desc">{metadata.description}</p>
          <div className="tpl-meta">
            <span className="badge gray">{metadata.serviceType || "Service"}</span>
            <span className="badge accent">
              {spec.inputs.length} {spec.inputs.length === 1 ? "input" : "inputs"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
