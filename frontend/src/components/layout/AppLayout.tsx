import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { MobileNav } from './MobileNav';
import { AIChatbot } from '../chat/AIChatbot';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/reconciliation': 'Reconciliation',
  '/upload': 'Upload Invoices',
  '/fraud': 'Fraud Intelligence',
  '/notices': 'Notices',
  '/settings': 'Settings',
  '/reports': 'Reports',
};

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const title = pageTitles[pathname] ?? 'Recontiq';

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-primary">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main area shifts with sidebar width */}
      <div
        className="flex min-h-screen flex-1 flex-col transition-all duration-300"
        style={{ marginLeft: collapsed ? 68 : 260 }}
      >
        <TopBar title={title} onMenuClick={() => setMobileOpen(true)} />

        <main className="page-transition mx-auto w-full max-w-content flex-1 p-6 md:p-8">
          <Outlet />
        </main>

        <MobileNav />
        <AIChatbot />
      </div>
    </div>
  );
}
