import { useTheme } from 'next-themes';
import { Bell, Menu, Moon, Search, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TopBarProps {
  title: string;
  onMenuClick?: () => void;
}

export default function TopBar({ title, onMenuClick }: TopBarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [profileName, setProfileName] = useState(() => localStorage.getItem('user_profile_name') || 'Priya Sharma');

  useEffect(() => {
    setMounted(true);
    const handleUpdate = () => {
      setProfileName(localStorage.getItem('user_profile_name') || 'Priya Sharma');
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

  return (
    <header className="sticky top-0 z-30 flex h-topbar shrink-0 items-center justify-between border-b border-gray-200 bg-white px-24 dark:border-border-dark dark:bg-primary">
      <div className="flex items-center gap-16">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-button p-8 text-gray-600 hover:bg-gray-50 lg:hidden dark:hover:bg-surface-dark"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-[22px] font-semibold text-primary dark:text-primary-light">{title}</h1>
      </div>

      <div className="flex items-center gap-8">
        <button
          type="button"
          className="rounded-button p-10 text-gray-600 transition-colors hover:bg-gray-50 dark:hover:bg-surface-dark"
          aria-label="Search"
        >
          <Search size={20} />
        </button>
        <button
          type="button"
          className="relative rounded-button p-10 text-gray-600 transition-colors hover:bg-gray-50 dark:hover:bg-surface-dark"
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="absolute right-8 top-8 h-2 w-2 rounded-full bg-error" />
        </button>
        {mounted ? (
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-button p-10 text-gray-600 transition-colors hover:bg-gray-50 dark:hover:bg-surface-dark"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        ) : (
          <span className="h-10 w-10" />
        )}
        <div className="ml-8 hidden h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white sm:flex">
          {getInitials(profileName)}
        </div>
      </div>
    </header>
  );
}
