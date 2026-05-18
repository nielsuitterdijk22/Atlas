import React, { useState, useMemo } from "react";
import {
  Home, Boxes, Plus, ListChecks, Server, GitBranch, Shield, Check, X,
  ChevronRight, ChevronLeft, Lock, Search, Activity, Database, Globe,
  Box, Cloud, AlertTriangle, Clock, ArrowRight, FileText, Users,
  BarChart3, ExternalLink, Sparkles, CircleDot,
} from "lucide-react";

/* ---------- design tokens ---------- */
const C = {
  paper: "#F4F3EF",
  card: "#FFFFFF",
  ink: "#1A1C1A",
  sub: "#5F635D",
  faint: "#8C908A",
  line: "#E3E2DC",
  sidebar: "#16201C",
  sidebarSub: "#8FA39A",
  accent: "#1F6F5C",
  accentSoft: "#E4EFEA",
  amber: "#B7791F",
  amberSoft: "#F6ECD8",
  danger: "#B5443A",
  dangerSoft: "#F4E1DF",
};

const fontStack = `'IBM Plex Sans', sans-serif`;
const dispStack = `'Bricolage Grotesque', sans-serif`;
const monoStack = `'IBM Plex Mono', monospace`;

/* ---------- mock data ---------- */
const TEAMS = ["Claims", "Policy & Onboarding", "Customer Portal", "Data Platform", "Identity"];

const SERVICES = [
  { id: "claims-api", name: "claims-api", type: "Microservice", team: "Claims", life: "production", health: "healthy", desc: "Core REST API handling claim intake, triage and status.", owner: "marit.devries@das.nl", checks: { pass: 7, fail: 0 }, rg: "rg-claims-prod", sub: "sub-claims-prod" },
  { id: "policy-portal", name: "policy-portal", type: "Web App", team: "Policy & Onboarding", life: "production", health: "warning", desc: "Customer-facing portal for policy management.", owner: "thomas.bakker@das.nl", checks: { pass: 5, fail: 2 }, rg: "rg-policy-prod", sub: "sub-policy-prod" },
  { id: "claims-events", name: "claims-events", type: "Function App", team: "Claims", life: "production", health: "healthy", desc: "Event processor for claim lifecycle messages.", owner: "marit.devries@das.nl", checks: { pass: 7, fail: 0 }, rg: "rg-claims-prod", sub: "sub-claims-prod" },
  { id: "onboarding-svc", name: "onboarding-svc", type: "Microservice", team: "Policy & Onboarding", life: "staging", health: "healthy", desc: "Customer onboarding workflow service.", owner: "thomas.bakker@das.nl", checks: { pass: 6, fail: 1 }, rg: "rg-onboard-tst", sub: "sub-policy-test" },
  { id: "doc-store", name: "doc-store", type: "Storage", team: "Claims", life: "production", health: "healthy", desc: "Blob storage for claim documents and attachments.", owner: "niels@das.nl", checks: { pass: 7, fail: 0 }, rg: "rg-claims-prod", sub: "sub-claims-prod" },
  { id: "analytics-lh", name: "analytics-lakehouse", type: "Data", team: "Data Platform", life: "experimental", health: "warning", desc: "Fabric lakehouse for claims analytics (Direct Lake).", owner: "david.jansen@das.nl", checks: { pass: 4, fail: 1 }, rg: "rg-data-dev", sub: "sub-data-dev" },
];

const TEMPLATES = [
  {
    id: "microservice", name: ".NET Microservice", icon: Box, eta: "~8 min", approval: false,
    desc: "Containerised API on App Service with pipeline and infra.",
    gives: ["Git repo from template", "CI/CD pipeline", "App Service + Key Vault", "App Insights wired up"],
    fields: [
      { key: "env", label: "Environment", type: "radio", options: ["dev", "test", "prod"], def: "dev", help: "Target lifecycle stage. Subscription is chosen automatically." },
      { key: "runtime", label: "Runtime", type: "select", options: [".NET 8", ".NET 9"], def: ".NET 8", help: "Base image for the container." },
      { key: "ingress", label: "Public ingress", type: "locked", value: "Front Door + WAF only", help: "Direct public access is disabled by CCoE policy." },
    ],
  },
  {
    id: "webapp", name: "Static Web App", icon: Globe, eta: "~5 min", approval: false,
    desc: "SPA hosting with global CDN and preview environments.",
    gives: ["Git repo from template", "CI/CD pipeline", "Static Web App + custom domain", "Preview environments per PR"],
    fields: [
      { key: "env", label: "Environment", type: "radio", options: ["dev", "test", "prod"], def: "dev", help: "Target lifecycle stage." },
      { key: "framework", label: "Framework", type: "select", options: ["React", "Vue", "Plain HTML"], def: "React", help: "Build preset for the pipeline." },
    ],
  },
  {
    id: "storage", name: "Storage Account", icon: Database, eta: "~3 min", approval: false,
    desc: "Compliant blob/file storage in your team's subscription.",
    gives: ["Storage account", "Private endpoint + DNS", "Diagnostic settings", "Standard tag set applied"],
    fields: [
      { key: "env", label: "Environment", type: "radio", options: ["dev", "test", "prod"], def: "dev", help: "Subscription is selected automatically from team + environment." },
      { key: "redundancy", label: "Redundancy", type: "select", options: ["LRS", "ZRS", "GZRS"], def: "ZRS", help: "ZRS is the CCoE default for resilience without cross-region cost." },
      { key: "access", label: "Public network access", type: "locked", value: "Disabled (private endpoint only)", help: "Enforced by Azure Policy. Access is via private endpoint." },
    ],
  },
  {
    id: "sqldb", name: "Azure SQL Database", icon: Server, eta: "~6 min", approval: true,
    desc: "Managed SQL database with backup policy and private link.",
    gives: ["SQL database on shared logical server", "LTR/STR backup policy", "Private endpoint + DNS", "Entra-only authentication"],
    fields: [
      { key: "env", label: "Environment", type: "radio", options: ["dev", "test", "prod"], def: "dev", help: "Prod databases require platform team approval." },
      { key: "tier", label: "Service tier", type: "select", options: ["Basic", "S1", "S3"], def: "S1", help: "Compute + storage sizing. Can be scaled later." },
      { key: "auth", label: "Authentication", type: "locked", value: "Microsoft Entra ID only", help: "SQL authentication is disabled by policy." },
    ],
  },
  {
    id: "landingzone", name: "Subscription / Landing Zone", icon: Cloud, eta: "~1 day", approval: true,
    desc: "A new application landing zone for a team or large initiative.",
    gives: ["New Azure subscription", "VNet peered to Virtual WAN", "Baseline policy assignment", "RBAC + budget alerts"],
    fields: [
      { key: "purpose", label: "Purpose", type: "text", def: "", help: "Briefly describe what this landing zone is for." },
      { key: "budget", label: "Monthly budget (EUR)", type: "select", options: ["500", "1000", "2500", "5000"], def: "1000", help: "Budget alert thresholds are set at 50/80/100%." },
    ],
  },
];

const INIT_REQUESTS = [
  { id: "REQ-1042", name: "fraud-scoring-api", template: ".NET Microservice", status: "provisioning", when: "4 min ago", by: "niels@das.nl" },
  { id: "REQ-1041", name: "analytics sql db (prod)", template: "Azure SQL Database", status: "approval", when: "1 hour ago", by: "david.jansen@das.nl" },
  { id: "REQ-1038", name: "claim-exports", template: "Storage Account", status: "completed", when: "yesterday", by: "marit.devries@das.nl" },
  { id: "REQ-1031", name: "legacy-import-job", template: "Function App", status: "failed", when: "2 days ago", by: "niels@das.nl" },
];

const COST = { microservice: 74, webapp: 22, storage: 9, sqldb: 41, landingzone: 0 };

/* ---------- small ui helpers ---------- */
const lifeColor = (l) =>
  l === "production" ? C.accent : l === "staging" ? C.amber : l === "experimental" ? C.faint : C.danger;
const healthColor = (h) => (h === "healthy" ? C.accent : h === "warning" ? C.amber : C.danger);

function Badge({ children, color, bg }) {
  return (
    <span style={{
      color, background: bg, fontFamily: monoStack, fontSize: 11, fontWeight: 500,
      padding: "3px 8px", borderRadius: 5, letterSpacing: "0.02em",
    }}>
      {children}
    </span>
  );
}

function Pill({ icon: Icon, label, active, onClick, sub }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left"
      style={{
        background: active ? "rgba(255,255,255,0.08)" : "transparent",
        color: active ? "#fff" : C.sidebarSub,
      }}>
      <Icon size={18} strokeWidth={2} />
      <span style={{ fontSize: 14, fontWeight: active ? 600 : 500 }}>{label}</span>
      {sub != null && (
        <span className="ml-auto" style={{
          fontFamily: monoStack, fontSize: 11, background: C.accent, color: "#fff",
          borderRadius: 20, padding: "1px 7px",
        }}>{sub}</span>
      )}
    </button>
  );
}

/* ---------- main ---------- */
export default function DeveloperPortal() {
  const [view, setView] = useState("home");
  const [service, setService] = useState(null);
  const [requests, setRequests] = useState(INIT_REQUESTS);
  const [wizard, setWizard] = useState(null); // { template, step, form }
  const [query, setQuery] = useState("");

  const myServices = SERVICES.filter((s) => s.owner === "niels@das.nl" || s.team === "Claims");
  const openReqs = requests.filter((r) => r.status === "provisioning" || r.status === "approval");

  const go = (v) => { setView(v); setService(null); setWizard(null); };

  /* ----- wizard control ----- */
  const startWizard = (tpl) => {
    const form = { name: "", team: "Claims", owner: "niels@das.nl" };
    tpl.fields.forEach((f) => { if (f.def !== undefined) form[f.key] = f.def; });
    setWizard({ template: tpl, step: 0, form });
    setView("wizard");
  };
  const setForm = (k, v) => setWizard((w) => ({ ...w, form: { ...w.form, [k]: v } }));
  const submitWizard = () => {
    const w = wizard;
    const newReq = {
      id: "REQ-" + (1043 + requests.length),
      name: w.form.name || w.template.name.toLowerCase(),
      template: w.template.name,
      status: w.template.approval ? "approval" : "provisioning",
      when: "just now",
      by: w.form.owner,
    };
    setRequests([newReq, ...requests]);
    setWizard(null);
    setView("requests");
  };

  return (
    <div className="flex w-full" style={{ minHeight: 720, background: C.paper, fontFamily: fontStack, color: C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');`}</style>

      {/* ---------- sidebar ---------- */}
      <aside className="flex flex-col shrink-0" style={{ width: 248, background: C.sidebar, padding: "22px 14px" }}>
        <div className="flex items-center gap-2.5 px-2 mb-7">
          <div className="flex items-center justify-center" style={{ width: 32, height: 32, background: C.accent, borderRadius: 8 }}>
            <Sparkles size={17} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: dispStack, fontWeight: 700, fontSize: 16, color: "#fff", lineHeight: 1 }}>Liftoff</div>
            <div style={{ fontSize: 10.5, color: C.sidebarSub, letterSpacing: "0.08em" }}>DAS · DEVELOPER PORTAL</div>
          </div>
        </div>

        <div style={{ fontSize: 10.5, color: C.sidebarSub, letterSpacing: "0.1em", padding: "0 8px 8px" }}>WORKSPACE</div>
        <nav className="flex flex-col gap-1">
          <Pill icon={Home} label="Home" active={view === "home"} onClick={() => go("home")} />
          <Pill icon={Boxes} label="Catalog" active={view === "catalog" || view === "service"} onClick={() => go("catalog")} />
          <Pill icon={Plus} label="Create" active={view === "create" || view === "wizard"} onClick={() => go("create")} />
          <Pill icon={ListChecks} label="My requests" active={view === "requests"} onClick={() => go("requests")} sub={openReqs.length || null} />
        </nav>

        <div style={{ fontSize: 10.5, color: C.sidebarSub, letterSpacing: "0.1em", padding: "20px 8px 8px" }}>GOVERNANCE</div>
        <nav className="flex flex-col gap-1">
          <Pill icon={BarChart3} label="Scorecards" active={false} onClick={() => go("home")} />
          <Pill icon={Shield} label="Templates" active={false} onClick={() => go("create")} />
        </nav>

        <div className="mt-auto flex items-center gap-2.5 px-2 pt-4" style={{ borderTop: `1px solid rgba(255,255,255,0.07)` }}>
          <div className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: 999, background: C.accentSoft, color: C.accent, fontWeight: 600, fontSize: 12 }}>NB</div>
          <div>
            <div style={{ fontSize: 12.5, color: "#fff", fontWeight: 500 }}>Niels Bakker</div>
            <div style={{ fontSize: 10.5, color: C.sidebarSub }}>Cloud Architect · CCoE</div>
          </div>
        </div>
      </aside>

      {/* ---------- main ---------- */}
      <main className="flex-1 overflow-auto" style={{ maxHeight: 760 }}>
        <div style={{ padding: "30px 38px 48px", maxWidth: 1000, margin: "0 auto" }}>
          {view === "home" && <HomeView go={go} startCreate={() => go("create")} myServices={myServices} openReqs={openReqs} openService={(s) => { setService(s); setView("service"); }} />}
          {view === "catalog" && <CatalogView query={query} setQuery={setQuery} openService={(s) => { setService(s); setView("service"); }} />}
          {view === "service" && service && <ServiceView s={service} back={() => go("catalog")} />}
          {view === "create" && <CreateView start={startWizard} />}
          {view === "wizard" && wizard && (
            <Wizard wizard={wizard} setWizard={setWizard} setForm={setForm} submit={submitWizard} cancel={() => go("create")} />
          )}
          {view === "requests" && <RequestsView requests={requests} create={() => go("create")} />}
        </div>
      </main>
    </div>
  );
}

/* ---------- shared header ---------- */
function PageHead({ kicker, title, desc, action }) {
  return (
    <div className="flex items-end justify-between mb-7">
      <div>
        {kicker && <div style={{ fontFamily: monoStack, fontSize: 11.5, color: C.accent, letterSpacing: "0.08em", marginBottom: 6 }}>{kicker}</div>}
        <h1 style={{ fontFamily: dispStack, fontWeight: 700, fontSize: 30, lineHeight: 1.1 }}>{title}</h1>
        {desc && <p style={{ fontSize: 14, color: C.sub, marginTop: 7, maxWidth: 560 }}>{desc}</p>}
      </div>
      {action}
    </div>
  );
}

function PrimaryBtn({ children, onClick, icon: Icon }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 transition-opacity hover:opacity-90"
      style={{ background: C.accent, color: "#fff", fontSize: 13.5, fontWeight: 600, padding: "10px 16px", borderRadius: 8 }}>
      {Icon && <Icon size={16} />}{children}
    </button>
  );
}

/* ---------- HOME ---------- */
function HomeView({ startCreate, myServices, openReqs, openService }) {
  const violations = myServices.reduce((a, s) => a + s.checks.fail, 0);
  return (
    <div>
      <PageHead kicker="WELCOME BACK" title="Hi Niels 👋"
        desc="Self-service infrastructure for DAS teams. Ship from a golden path — governance is built in."
        action={<PrimaryBtn icon={Plus} onClick={startCreate}>Create</PrimaryBtn>} />

      {/* stat row */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        <Stat label="Services you own" value={myServices.length} icon={Boxes} tone={C.accent} />
        <Stat label="Open requests" value={openReqs.length} icon={Clock} tone={C.amber} />
        <Stat label="Policy violations" value={violations} icon={Shield} tone={violations ? C.danger : C.accent} />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Panel title="Your services">
          {myServices.map((s) => (
            <button key={s.id} onClick={() => openService(s)}
              className="w-full flex items-center gap-3 py-2.5 transition-colors hover:opacity-70"
              style={{ borderBottom: `1px solid ${C.line}` }}>
              <CircleDot size={9} color={healthColor(s.health)} fill={healthColor(s.health)} />
              <span style={{ fontFamily: monoStack, fontSize: 13, fontWeight: 500 }}>{s.name}</span>
              <span className="ml-auto" style={{ fontSize: 12, color: C.faint }}>{s.type}</span>
              <ChevronRight size={15} color={C.faint} />
            </button>
          ))}
        </Panel>

        <Panel title="Open requests">
          {openReqs.length === 0 && <Empty text="Nothing in flight." />}
          {openReqs.map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: `1px solid ${C.line}` }}>
              <StatusDot status={r.status} />
              <div>
                <div style={{ fontFamily: monoStack, fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                <div style={{ fontSize: 11.5, color: C.faint }}>{r.template} · {r.when}</div>
              </div>
              <span className="ml-auto"><StatusBadge status={r.status} /></span>
            </div>
          ))}
        </Panel>
      </div>

      <div className="mt-5 flex items-center gap-3 p-4 rounded-xl"
        style={{ background: C.accentSoft, border: `1px solid ${C.line}` }}>
        <FileText size={18} color={C.accent} />
        <span style={{ fontSize: 13, color: C.sub }}>
          New to Liftoff? Every "Create" starts from an approved template — naming, tags, network and policy are filled in for you.
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }) {
  return (
    <div className="p-4 rounded-xl" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: 12.5, color: C.sub }}>{label}</span>
        <Icon size={16} color={tone} />
      </div>
      <div style={{ fontFamily: dispStack, fontWeight: 700, fontSize: 32, color: tone, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="p-5 rounded-xl" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ fontSize: 12.5, color: C.faint, padding: "16px 0" }}>{text}</div>;
}

/* ---------- CATALOG ---------- */
function CatalogView({ query, setQuery, openService }) {
  const [team, setTeam] = useState("All");
  const list = SERVICES.filter((s) =>
    (team === "All" || s.team === team) &&
    (s.name.toLowerCase().includes(query.toLowerCase()) || s.desc.toLowerCase().includes(query.toLowerCase()))
  );
  return (
    <div>
      <PageHead kicker="SOFTWARE CATALOG" title="Catalog"
        desc="Every service running at DAS, with ownership and compliance. Populated automatically from what teams create." />

      <div className="flex gap-3 mb-5">
        <div className="flex items-center gap-2 px-3 rounded-lg flex-1" style={{ background: C.card, border: `1px solid ${C.line}` }}>
          <Search size={15} color={C.faint} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services…"
            className="flex-1 py-2.5 outline-none" style={{ fontSize: 13, background: "transparent", fontFamily: fontStack }} />
        </div>
        <select value={team} onChange={(e) => setTeam(e.target.value)}
          className="px-3 rounded-lg outline-none" style={{ fontSize: 13, background: C.card, border: `1px solid ${C.line}`, fontFamily: fontStack }}>
          <option>All</option>
          {TEAMS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {list.map((s) => (
          <button key={s.id} onClick={() => openService(s)}
            className="text-left p-4 rounded-xl transition-shadow hover:shadow-md"
            style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <div className="flex items-center gap-2 mb-2">
              <CircleDot size={9} color={healthColor(s.health)} fill={healthColor(s.health)} />
              <span style={{ fontFamily: monoStack, fontSize: 14, fontWeight: 500 }}>{s.name}</span>
              <span className="ml-auto"><Badge color={lifeColor(s.life)} bg={C.paper}>{s.life}</Badge></span>
            </div>
            <p style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.5, minHeight: 38 }}>{s.desc}</p>
            <div className="flex items-center gap-3 mt-3" style={{ fontSize: 11.5, color: C.faint }}>
              <span className="flex items-center gap-1"><Box size={12} />{s.type}</span>
              <span className="flex items-center gap-1"><Users size={12} />{s.team}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- SERVICE DETAIL ---------- */
function ServiceView({ s, back }) {
  const Link = ({ icon: Icon, label }) => (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:opacity-70"
      style={{ background: C.paper, border: `1px solid ${C.line}`, fontSize: 12.5, cursor: "pointer" }}>
      <Icon size={14} color={C.accent} />{label}<ExternalLink size={11} color={C.faint} className="ml-auto" />
    </div>
  );
  return (
    <div>
      <button onClick={back} className="flex items-center gap-1.5 mb-5" style={{ fontSize: 13, color: C.sub }}>
        <ChevronLeft size={15} /> Catalog
      </button>

      <div className="flex items-start gap-3 mb-2">
        <h1 style={{ fontFamily: dispStack, fontWeight: 700, fontSize: 30 }}>{s.name}</h1>
        <span className="mt-2"><Badge color={lifeColor(s.life)} bg={C.card}>{s.life}</Badge></span>
      </div>
      <p style={{ fontSize: 14, color: C.sub, marginBottom: 22, maxWidth: 600 }}>{s.desc}</p>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <Field label="Owner" value={s.owner} />
        <Field label="Team" value={s.team} />
        <Field label="Type" value={s.type} />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="p-5 rounded-xl" style={{ background: C.card, border: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Quick links</div>
          <div className="flex flex-col gap-2">
            <Link icon={GitBranch} label="Source repository" />
            <Link icon={Activity} label="CI/CD pipeline" />
            <Link icon={BarChart3} label="Dashboards" />
            <Link icon={FileText} label="TechDocs" />
          </div>
        </div>

        <div className="p-5 rounded-xl" style={{ background: C.card, border: `1px solid ${C.line}` }}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: 13, fontWeight: 600 }}>Scorecard</span>
            <Badge color={s.checks.fail ? C.amber : C.accent} bg={s.checks.fail ? C.amberSoft : C.accentSoft}>
              {s.checks.pass}/{s.checks.pass + s.checks.fail} passing
            </Badge>
          </div>
          {[
            { l: "Resource tagging compliant", ok: true },
            { l: "Owner & on-call defined", ok: true },
            { l: "Private endpoints enforced", ok: s.checks.fail < 2 },
            { l: "Diagnostic settings enabled", ok: s.checks.fail < 1 },
          ].map((c) => (
            <div key={c.l} className="flex items-center gap-2 py-1.5" style={{ fontSize: 12.5 }}>
              {c.ok
                ? <Check size={14} color={C.accent} />
                : <X size={14} color={C.danger} />}
              <span style={{ color: c.ok ? C.ink : C.danger }}>{c.l}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 p-5 rounded-xl" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Azure resources</div>
        <div className="flex items-center gap-3" style={{ fontFamily: monoStack, fontSize: 12.5 }}>
          <Cloud size={14} color={C.accent} />
          <span>{s.sub}</span><ChevronRight size={13} color={C.faint} /><span style={{ color: C.sub }}>{s.rg}</span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="p-3.5 rounded-lg" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 11, color: C.faint, letterSpacing: "0.04em", marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: monoStack, fontSize: 12.5 }}>{value}</div>
    </div>
  );
}

/* ---------- CREATE (template gallery) ---------- */
function CreateView({ start }) {
  return (
    <div>
      <PageHead kicker="GOLDEN PATHS" title="Create something"
        desc="Pick a template. Each one provisions compliant infrastructure — no Bicep, no tickets, no waiting." />
      <div className="grid grid-cols-2 gap-4">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.id} className="p-5 rounded-xl flex flex-col" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center" style={{ width: 38, height: 38, background: C.accentSoft, borderRadius: 9 }}>
                  <Icon size={19} color={C.accent} />
                </div>
                <div style={{ fontFamily: dispStack, fontWeight: 700, fontSize: 16 }}>{t.name}</div>
                {t.approval && <span className="ml-auto"><Badge color={C.amber} bg={C.amberSoft}>needs approval</Badge></span>}
              </div>
              <p style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.5, marginBottom: 10 }}>{t.desc}</p>
              <div className="mb-4">
                {t.gives.map((g) => (
                  <div key={g} className="flex items-center gap-2 py-0.5" style={{ fontSize: 12, color: C.sub }}>
                    <Check size={12} color={C.accent} />{g}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-auto pt-2">
                <span style={{ fontFamily: monoStack, fontSize: 11.5, color: C.faint }}>{t.eta}</span>
                <button onClick={() => start(t)} className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                  style={{ background: C.ink, color: "#fff", fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 7 }}>
                  Use template <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- WIZARD ---------- */
const STEPS = ["Basics", "Configure", "Review & launch"];

function Wizard({ wizard, setWizard, setForm, submit, cancel }) {
  const { template: t, step, form } = wizard;
  const naming = `das-${(form.name || "service").toLowerCase().replace(/[^a-z0-9]/g, "-")}-${form.env || "dev"}`;
  const subMap = { dev: `sub-${form.team?.split(" ")[0].toLowerCase()}-dev`, test: `sub-${form.team?.split(" ")[0].toLowerCase()}-test`, prod: `sub-${form.team?.split(" ")[0].toLowerCase()}-prod` };
  const targetSub = subMap[form.env] || subMap.dev;
  const canNext = step === 0 ? form.name.trim().length > 1 : true;

  return (
    <div>
      <button onClick={cancel} className="flex items-center gap-1.5 mb-5" style={{ fontSize: 13, color: C.sub }}>
        <ChevronLeft size={15} /> Templates
      </button>

      <div className="flex items-center gap-3 mb-1">
        <t.icon size={22} color={C.accent} />
        <h1 style={{ fontFamily: dispStack, fontWeight: 700, fontSize: 26 }}>New {t.name}</h1>
      </div>

      {/* stepper */}
      <div className="flex items-center gap-2 mb-7 mt-4">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center" style={{
                width: 24, height: 24, borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: i <= step ? C.accent : C.line, color: i <= step ? "#fff" : C.faint,
              }}>{i < step ? <Check size={13} /> : i + 1}</div>
              <span style={{ fontSize: 12.5, fontWeight: i === step ? 600 : 500, color: i === step ? C.ink : C.faint }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: C.line }} />}
          </React.Fragment>
        ))}
      </div>

      <div className="p-6 rounded-xl" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        {/* STEP 1 — basics */}
        {step === 0 && (
          <div className="flex flex-col gap-5">
            <WField label="Service name" help="Lowercase, hyphenated. This drives the repo name and Azure naming convention.">
              <input value={form.name} onChange={(e) => setForm("name", e.target.value)} placeholder="e.g. fraud-scoring-api"
                className="w-full px-3 py-2.5 rounded-lg outline-none"
                style={{ fontFamily: monoStack, fontSize: 13, border: `1px solid ${C.line}`, background: C.paper }} />
              {form.name && (
                <div style={{ fontFamily: monoStack, fontSize: 11.5, color: C.accent, marginTop: 6 }}>
                  → resources will be named {naming}-*
                </div>
              )}
            </WField>
            <div className="grid grid-cols-2 gap-4">
              <WField label="Owning team" help="Determines the target subscription and RBAC.">
                <select value={form.team} onChange={(e) => setForm("team", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg outline-none" style={{ fontSize: 13, border: `1px solid ${C.line}`, background: C.paper }}>
                  {TEAMS.map((tm) => <option key={tm}>{tm}</option>)}
                </select>
              </WField>
              <WField label="Owner" help="Required. Prevents orphaned services — they get the alerts.">
                <input value={form.owner} onChange={(e) => setForm("owner", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg outline-none" style={{ fontFamily: monoStack, fontSize: 12.5, border: `1px solid ${C.line}`, background: C.paper }} />
              </WField>
            </div>
          </div>
        )}

        {/* STEP 2 — configure */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            {t.fields.map((f) => (
              <WField key={f.key} label={f.label} help={f.help} locked={f.type === "locked"}>
                {f.type === "radio" && (
                  <div className="flex gap-2">
                    {f.options.map((o) => (
                      <button key={o} onClick={() => setForm(f.key, o)}
                        style={{
                          fontFamily: monoStack, fontSize: 12.5, padding: "7px 14px", borderRadius: 7,
                          border: `1px solid ${form[f.key] === o ? C.accent : C.line}`,
                          background: form[f.key] === o ? C.accentSoft : C.paper,
                          color: form[f.key] === o ? C.accent : C.sub, fontWeight: 500,
                        }}>{o}</button>
                    ))}
                  </div>
                )}
                {f.type === "select" && (
                  <select value={form[f.key]} onChange={(e) => setForm(f.key, e.target.value)}
                    className="px-3 py-2.5 rounded-lg outline-none" style={{ fontSize: 13, border: `1px solid ${C.line}`, background: C.paper, minWidth: 200 }}>
                    {f.options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                )}
                {f.type === "text" && (
                  <input value={form[f.key] || ""} onChange={(e) => setForm(f.key, e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg outline-none" style={{ fontSize: 13, border: `1px solid ${C.line}`, background: C.paper }} />
                )}
                {f.type === "locked" && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                    style={{ background: C.paper, border: `1px dashed ${C.line}`, fontFamily: monoStack, fontSize: 12.5, color: C.sub }}>
                    <Lock size={13} color={C.faint} />{f.value}
                  </div>
                )}
              </WField>
            ))}
            {!t.fields.some((f) => f.type === "locked") && (
              <div style={{ fontSize: 12, color: C.faint }}>Defaults follow the DAS landing-zone baseline. Advanced overrides are available after creation.</div>
            )}
          </div>
        )}

        {/* STEP 3 — review */}
        {step === 2 && (
          <div>
            {t.approval && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-lg mb-5"
                style={{ background: C.amberSoft, border: `1px solid ${C.line}` }}>
                <AlertTriangle size={16} color={C.amber} className="mt-0.5" />
                <span style={{ fontSize: 12.5, color: C.sub }}>
                  This template needs <strong>platform team approval</strong>. It will be queued for review before provisioning starts.
                </span>
              </div>
            )}
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Provisioning plan</div>
            <div className="rounded-lg overflow-hidden mb-5" style={{ border: `1px solid ${C.line}` }}>
              {[
                ["Service", form.name || "—"],
                ["Owning team", form.team],
                ["Owner", form.owner],
                ["Target subscription", targetSub],
                ["Naming prefix", `${naming}-*`],
                ...t.fields.filter((f) => f.type !== "locked").map((f) => [f.label, String(form[f.key] || "—")]),
              ].map(([k, v], i) => (
                <div key={k} className="flex justify-between px-3.5 py-2.5"
                  style={{ background: i % 2 ? C.paper : C.card, fontSize: 12.5 }}>
                  <span style={{ color: C.sub }}>{k}</span>
                  <span style={{ fontFamily: monoStack }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Resources to be created</div>
            <div className="flex flex-wrap gap-2 mb-5">
              {t.gives.map((g) => <Badge key={g} color={C.accent} bg={C.accentSoft}>{g}</Badge>)}
            </div>

            <div className="flex items-center gap-4 p-3.5 rounded-lg" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
              <div>
                <div style={{ fontSize: 11, color: C.faint }}>EST. MONTHLY COST</div>
                <div style={{ fontFamily: dispStack, fontWeight: 700, fontSize: 22, color: C.accent }}>€{COST[t.id]}</div>
              </div>
              <div style={{ width: 1, height: 32, background: C.line }} />
              <div style={{ fontSize: 12, color: C.sub }}>
                Standard tag set (<span style={{ fontFamily: monoStack }}>team, owner, costcenter, env</span>) applied automatically.
                Charged to {form.team}.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* footer nav */}
      <div className="flex justify-between mt-5">
        <button onClick={() => (step === 0 ? cancel() : setWizard({ ...wizard, step: step - 1 }))}
          className="flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: 600, color: C.sub, padding: "10px 14px" }}>
          <ChevronLeft size={15} />{step === 0 ? "Cancel" : "Back"}
        </button>
        {step < 2 ? (
          <button onClick={() => canNext && setWizard({ ...wizard, step: step + 1 })}
            className="flex items-center gap-1.5 transition-opacity"
            style={{ background: canNext ? C.accent : C.line, color: canNext ? "#fff" : C.faint, fontSize: 13.5, fontWeight: 600, padding: "10px 18px", borderRadius: 8, cursor: canNext ? "pointer" : "not-allowed" }}>
            Continue <ChevronRight size={15} />
          </button>
        ) : (
          <button onClick={submit} className="flex items-center gap-1.5 transition-opacity hover:opacity-90"
            style={{ background: C.accent, color: "#fff", fontSize: 13.5, fontWeight: 600, padding: "10px 18px", borderRadius: 8 }}>
            {t.approval ? "Submit for approval" : "Launch"} <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

function WField({ label, help, children, locked }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        {locked && <Lock size={12} color={C.faint} />}
      </div>
      {help && <div style={{ fontSize: 11.5, color: C.faint, marginBottom: 8, lineHeight: 1.5 }}>{help}</div>}
      {children}
    </div>
  );
}

/* ---------- REQUESTS ---------- */
function statusMeta(status) {
  return {
    provisioning: { label: "Provisioning", color: C.accent, bg: C.accentSoft },
    approval: { label: "Awaiting approval", color: C.amber, bg: C.amberSoft },
    completed: { label: "Completed", color: C.accent, bg: C.accentSoft },
    failed: { label: "Failed", color: C.danger, bg: C.dangerSoft },
  }[status];
}
function StatusBadge({ status }) {
  const m = statusMeta(status);
  return <Badge color={m.color} bg={m.bg}>{m.label}</Badge>;
}
function StatusDot({ status }) {
  const m = statusMeta(status);
  return <CircleDot size={10} color={m.color} fill={status === "completed" ? m.color : "none"} />;
}

function RequestsView({ requests, create }) {
  return (
    <div>
      <PageHead kicker="ACTIVITY" title="My requests"
        desc="Provisioning runs and approvals. Nothing blocks — submit, then track."
        action={<PrimaryBtn icon={Plus} onClick={create}>Create</PrimaryBtn>} />

      <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        <div className="flex px-4 py-2.5" style={{ borderBottom: `1px solid ${C.line}`, fontSize: 11, color: C.faint, letterSpacing: "0.04em" }}>
          <span style={{ width: 90 }}>REQUEST</span>
          <span className="flex-1">NAME</span>
          <span style={{ width: 160 }}>TEMPLATE</span>
          <span style={{ width: 150 }}>STATUS</span>
          <span style={{ width: 80, textAlign: "right" }}>WHEN</span>
        </div>
        {requests.map((r) => (
          <div key={r.id} className="flex items-center px-4 py-3 transition-colors hover:opacity-70"
            style={{ borderBottom: `1px solid ${C.line}`, fontSize: 13, cursor: "pointer" }}>
            <span style={{ width: 90, fontFamily: monoStack, fontSize: 11.5, color: C.faint }}>{r.id}</span>
            <span className="flex-1 flex items-center gap-2" style={{ fontFamily: monoStack, fontWeight: 500 }}>
              <StatusDot status={r.status} />{r.name}
            </span>
            <span style={{ width: 160, fontSize: 12.5, color: C.sub }}>{r.template}</span>
            <span style={{ width: 150 }}><StatusBadge status={r.status} /></span>
            <span style={{ width: 80, textAlign: "right", fontSize: 11.5, color: C.faint }}>{r.when}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2.5" style={{ fontSize: 12, color: C.faint }}>
        <Activity size={14} /> Status updates stream from the deployment pipeline — provisioning typically completes within the template's stated time.
      </div>
    </div>
  );
}
