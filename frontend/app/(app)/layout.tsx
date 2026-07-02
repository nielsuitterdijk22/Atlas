import { AppProvider } from "../components/AppContext";
import { Sidebar } from "../components/Sidebar";
import { requireOrg } from "../lib/session";

// AppLayout is the authenticated shell: a fixed sidebar plus the page body.
// requireOrg gates every route in this group, redirecting to /login or
// /onboarding as needed, and resolves which org is active from the atlas_org
// cookie (see session.ts's resolveActiveOrg).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { me, org, token } = await requireOrg();
  const isPlatformEngineer = org.role === "platform-engineer";

  return (
    <AppProvider
      value={{
        user: me.user,
        memberships: me.memberships,
        orgId: org.orgId,
        orgName: org.orgName,
        role: org.role,
        isPlatformEngineer,
        token,
      }}
    >
      <div className="app">
        <Sidebar
          user={me.user}
          memberships={me.memberships}
          activeOrgId={org.orgId}
          isPlatformEngineer={isPlatformEngineer}
        />
        <main className="main">
          <div className="main-inner">{children}</div>
        </main>
      </div>
    </AppProvider>
  );
}
