import { NavLink } from 'react-router-dom';
import { AlertTriangle, BarChart3, FileText, LayoutDashboard, Scale } from 'lucide-react';
import { cn } from '../../lib/utils';

const items = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/reconciliation', label: 'Reconcile', icon: Scale },
  { to: '/notices', label: 'Notices', icon: FileText },
  { to: '/fraud', label: 'Fraud', icon: AlertTriangle },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-gray-200 bg-white px-4 py-6 md:hidden dark:border-border-dark dark:bg-primary">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-6 text-[11px] font-medium',
              isActive ? 'text-accent' : 'text-gray-600 dark:text-[#A0A0A0]',
            )
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
