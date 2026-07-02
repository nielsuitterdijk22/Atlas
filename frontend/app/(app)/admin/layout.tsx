"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useApp } from "../../components/AppContext";

const navItems = [
  { path: "/admin/executions", label: "Executions" },
  { path: "/admin/presets", label: "Output Presets" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isPlatformEngineer } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  // Admin is platform-engineer territory — developers get bounced home.
  useEffect(() => {
    if (!isPlatformEngineer) router.replace("/");
  }, [isPlatformEngineer, router]);

  if (!isPlatformEngineer) return null;

  return (
    <div style={{ display: "flex", gap: 28 }}>
      <aside style={{ width: 200, flex: "none" }}>
        <div className="section-label" style={{ padding: "0 0 8px" }}>
          Administration
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map((item) => (
            <Link key={item.path} href={item.path} className={pathname.startsWith(item.path) ? "active" : ""} style={navLinkStyle(pathname.startsWith(item.path))}>
              {item.label}
            </Link>
          ))}
          <Link href="/" style={navLinkStyle(false)}>
            ← Back to Home
          </Link>
        </nav>
      </aside>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function navLinkStyle(active: boolean): React.CSSProperties {
  return {
    display: "block",
    padding: "9px 11px",
    borderRadius: 8,
    fontSize: 13,
    color: active ? "#fff" : "var(--muted)",
    background: active ? "var(--accent)" : "transparent",
    fontWeight: active ? 600 : 400,
  };
}
