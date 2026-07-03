"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { signOutAction } from "../lib/actions";
import type { Membership, User } from "../lib/api";
import { setActiveOrgId } from "../lib/org-client";
import { AppSwitcher } from "./AppSwitcher";
import { AppTile } from "./icons/AppMarks";

const icons: Record<string, string> = {
  home: "M2.25 12l8.954-8.955a1.5 1.5 0 012.122 0L21 12M4.5 9.75v9.75A.75.75 0 005.25 21h3.75v-6h6v6h3.75a.75.75 0 00.75-.75V9.75",
  catalog: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5",
  create: "M12 4.5v15m7.5-7.5h-15",
  requests:
    "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z",
  approvals: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  settings:
    "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  admin:
    "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6",
};

function Icon({ path }: { path: string }) {
  return (
    <svg className="ic" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d={path} />
    </svg>
  );
}

function NavItem({ href, icon, label, exact }: { href: string; icon: string; label: string; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link href={href} className={active ? "active" : ""}>
      <Icon path={icons[icon]} />
      {label}
    </Link>
  );
}

export function Sidebar({
  user,
  memberships,
  activeOrgId,
  isPlatformEngineer,
}: {
  user: User;
  memberships: Membership[];
  activeOrgId: string;
  isPlatformEngineer: boolean;
}) {
  const router = useRouter();

  const onOrgChange = (orgId: string) => {
    setActiveOrgId(orgId);
    router.refresh();
  };

  return (
    <aside className="side">
      <div className="brand">
        <AppSwitcher current="atlas" />
        <AppTile app="atlas" size={32} />
        <div>
          <div>Atlas</div>
          <div className="sub">Developer Portal</div>
        </div>
      </div>

      <div className="org-switch">
        <label htmlFor="org-select">Organization</label>
        <select id="org-select" value={activeOrgId} onChange={(e) => onOrgChange(e.target.value)}>
          {memberships.map((m) => (
            <option key={m.orgId} value={m.orgId}>
              {m.orgName}
            </option>
          ))}
        </select>
      </div>

      <div className="section-label">Workspace</div>
      <nav className="nav">
        <NavItem href="/" icon="home" label="Home" exact />
        <NavItem href="/catalog" icon="catalog" label="Catalog" />
        <NavItem href="/create" icon="create" label="Create" />
        <NavItem href="/requests" icon="requests" label="My Requests" />

        {isPlatformEngineer && (
          <>
            <div className="section-label">Governance</div>
            <NavItem href="/approvals" icon="approvals" label="Approvals" />
            <NavItem href="/settings/organization" icon="settings" label="Org Settings" />
            <NavItem href="/admin" icon="admin" label="Admin" />
          </>
        )}
      </nav>

      <div className="foot">
        <div className="avatar">{(user.displayName || user.username || "?").charAt(0).toUpperCase()}</div>
        <div className="who">
          <div className="name">{user.displayName}</div>
          <div className="login">@{user.username}</div>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="icon-btn" title="Sign out">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
              />
            </svg>
          </button>
        </form>
      </div>
    </aside>
  );
}
