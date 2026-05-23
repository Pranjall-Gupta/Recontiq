import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  FileText,
  LayoutDashboard,
  Scale,
  Settings,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'workspace' },
  { to: '/reconciliation', label: 'Reconciliation', icon: Scale, group: 'workspace' },
  { to: '/upload', label: 'Upload Invoices', icon: Upload, group: 'workspace' },
  { to: '/fraud', label: 'Fraud Intelligence', icon: AlertTriangle, group: 'workspace' },
  { to: '/vendor-portal', label: 'Vendor AI Copilot', icon: Sparkles, group: 'workspace' },
  { to: '/notices', label: 'Notices', icon: FileText, group: 'manage' },
  { to: '/reports', label: 'Reports', icon: BarChart3, group: 'manage' },
  { to: '/settings', label: 'Settings', icon: Settings, group: 'manage' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const [profileName, setProfileName] = useState(() => localStorage.getItem('user_profile_name') || 'Priya Sharma');
  const [profileEmail, setProfileEmail] = useState(() => localStorage.getItem('user_profile_email') || 'priya@acmecorp.in');

  useEffect(() => {
    const handleUpdate = () => {
      setProfileName(localStorage.getItem('user_profile_name') || 'Priya Sharma');
      setProfileEmail(localStorage.getItem('user_profile_email') || 'priya@acmecorp.in');
    };
    window.addEventListener('profileUpdate', handleUpdate);
    return () => window.removeEventListener('profileUpdate', handleUpdate);
  }, []);

  const getInitials = (nameStr: string) => {
    return nameStr
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const workspaceItems = navItems.filter(i => i.group === 'workspace');
  const manageItems = navItems.filter(i => i.group === 'manage');

  const NavItem = ({ to, label, icon: Icon }: typeof navItems[0]) => (
    <div className="relative group">
      <NavLink
        to={to}
        onClick={onMobileClose}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150 border-l-[3px]',
            collapsed ? 'justify-center px-2' : '',
            isActive
              ? 'bg-white/10 text-white border-l-[#06B6D4]'
              : 'text-indigo-200 hover:bg-white/5 hover:text-white border-l-transparent',
          )
        }
      >
        <Icon size={18} className="shrink-0" />
        {/* Label — slides in/out */}
        <span
          className={cn(
            'text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300',
            collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
          )}
        >
          {label}
        </span>
      </NavLink>

      {/* Floating tooltip when collapsed */}
      {collapsed && (
        <div className="
          pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[200]
          bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl
          opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap
          before:content-[''] before:absolute before:top-1/2 before:-translate-y-1/2
          before:right-full before:border-4 before:border-transparent before:border-r-slate-900
        ">
          {label}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col transition-all duration-300 ease-in-out',
          'bg-[#1E1B4B] border-r border-white/5',
          /* Width toggle */
          collapsed ? 'w-[68px]' : 'w-[260px]',
          /* Mobile slide */
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* ── Brand header ── */}
        <div className="flex h-[64px] items-center border-b border-white/10 px-3 shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-400 to-indigo-400 flex items-center justify-center font-bold text-white text-sm shadow-lg shrink-0">
              R
            </div>
            <span
              className={cn(
                'text-base font-bold text-white tracking-tight overflow-hidden transition-all duration-300 whitespace-nowrap',
                collapsed ? 'w-0 opacity-0' : 'opacity-100',
              )}
            >
              Recontiq
            </span>
          </div>

          {/* Mobile close */}
          <button
            type="button"
            className="rounded-lg p-1.5 lg:hidden text-white/50 hover:text-white hover:bg-white/10 shrink-0"
            onClick={onMobileClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-1">
          {/* Workspace group */}
          <p className={cn(
            'px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400/60 transition-all duration-300 overflow-hidden',
            collapsed ? 'opacity-0 h-0 mb-0' : 'opacity-100 h-auto',
          )}>
            Workspace
          </p>
          {workspaceItems.map(item => <NavItem key={item.to} {...item} />)}

          {/* Manage group */}
          <p className={cn(
            'px-3 pt-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400/60 transition-all duration-300 overflow-hidden',
            collapsed ? 'opacity-0 h-0 pt-0 mb-0' : 'opacity-100 h-auto',
          )}>
            Manage
          </p>
          {manageItems.map(item => <NavItem key={item.to} {...item} />)}
        </nav>

        {/* ── User footer ── */}
        <div className="border-t border-white/10 p-3 shrink-0">
          <div className={cn(
            'flex items-center rounded-lg px-2 py-2 hover:bg-white/5 transition-colors cursor-pointer',
            collapsed ? 'justify-center' : 'gap-3',
          )}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-teal-400 to-indigo-500 text-xs font-bold text-white shadow">
              {getInitials(profileName)}
            </div>
            <div className={cn(
              'min-w-0 flex-1 overflow-hidden transition-all duration-300',
              collapsed ? 'w-0 opacity-0' : 'opacity-100',
            )}>
              <p className="truncate text-sm font-semibold text-white">{profileName}</p>
              <p className="truncate text-xs text-indigo-300/60">{profileEmail}</p>
            </div>
          </div>
        </div>

        {/* ── Collapse toggle button — floats on the right edge ── */}
        <button
          onClick={onToggle}
          className={cn(
            'absolute -right-3.5 top-[76px] z-[60]',
            'flex h-7 w-7 items-center justify-center',
            'rounded-full bg-[#1E1B4B] border border-white/20',
            'text-indigo-200 hover:text-white hover:border-white/40 transition-all shadow-lg',
            'hidden lg:flex',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight size={13} />
            : <ChevronLeft size={13} />
          }
        </button>
      </aside>
    </>
  );
}
