
// File: components/Nav.tsx
'use client';

import React, { CSSProperties, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Search, User, Bell, Mail, Icon, Settings, LogOut, Menu } from 'lucide-react';
import { NotificationBadge } from '@/components/Notifications/NotificationBell';


interface User {
  uid?: string;
  photoURL?: string;
  displayName?: string;
}

interface NavBarProps {
  user: import('firebase/auth').User | import('@/app/types/index').User | null;
  onSignOut: () => void;
  className?: string;
  style?: CSSProperties;
}

type NavItem = {
  icon: React.ComponentType<any>;
  label: string;
  route: string;
};
const OnQuestIcon = ({ isActive }: { isActive: boolean }) => (
  <img
    src="/oq_logo.svg"
    className={`w-6 h-6 ${isActive ? '' : 'filter invert'}`}
    alt="OnQuest Icon"
  />
);

const AITripPlannerIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
);

const NavBar = ({ user, onSignOut, className = '', style }: NavBarProps) => {
  const router = useRouter();
  const [activeRoute, setActiveRoute] = useState('feed');
  const [isExpanded, setIsExpanded] = useState(true);
  const [screenWidth, setScreenWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
      // Collapse sidebar only on smaller screens (below 768px / tablet)
      if (window.innerWidth < 768) {
        setIsExpanded(false);
      } else {
        setIsExpanded(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // derive activeRoute from pathname for better UX
  useEffect(() => {
    try {
      const path = window.location.pathname.split('/')[1] || 'feed';
      setActiveRoute(path || 'feed');
    } catch (e) {
      // ignore on SSR
    }
  }, []);

  const navItems: NavItem[] = [
    { icon: Home, label: 'Feed', route: 'feed' },
    { icon: Search, label: 'Explore', route: 'explore' },
    {
      icon: OnQuestIcon,
      label: 'Quest',
      route: 'quest',
    },
    {
      icon: AITripPlannerIcon,
      label: 'AI Trip Planner',
      route: 'aitrip'
    },
    { icon: Bell, label: 'Notifications', route: 'notifications' },
    { icon: Mail, label: 'Messages', route: 'chats' },
    { icon: User, label: 'Profile', route: 'account' },
    { icon: Settings, label: 'Settings', route: 'settings' },
  ];

  const handleNavClick = (route: string) => {
    setActiveRoute(route);
    if (route === 'explore') router.push('/explore');
    else if (route === 'account') router.push(`/account`);
    else if (route === 'quest') router.push('/quest');
    else if (route === 'aitrip') router.push('/aitrip');
    else if (route === 'settings') router.push('/settings');
    else if (route === 'notifications') router.push('/notifications');
    else if (route === 'chats') router.push('/chats');
    else if (route === 'feed') router.push('/feed');
    else router.push('/');
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen border-r border-gray-700 bg-black p-4 flex flex-col transition-all duration-300 z-50 ${isExpanded ? 'w-[280px]' : 'w-[80px]'
        } ${className}`}
      style={style}
      aria-label="Main navigation"
    >
      <div className=" flex items-center justify-between">
        {isExpanded ? (
          <img src='/OQ_LOGO_MAIN.svg' className="w-[130px] mb-3" alt="OnQuest" />
        ) : (
          <img src='/oq_logo.svg' className="w-[40px] filter invert m-2" alt="OnQuest" />
        )}
        {screenWidth >= 768 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-900 transition-colors"
            aria-label="Toggle navigation"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-2" role="navigation">

        {navItems.map((item) => {
          const isActive = activeRoute === item.route;
          const Icon = item.icon;
          return (
            <button
              key={item.route}
              onClick={() => handleNavClick(item.route)}
              className={`w-full flex items-center gap-4 px-2 py-2 rounded-full transition-colors relative group ${isActive
                ? 'bg-[#ff6900] text-black font-medium'
                : 'text-white hover:bg-gray-900'
                }`}
              title={!isExpanded ? item.label : ''}
            >
              <span className="shrink-0 w-6 h-6 flex items-center justify-center relative">
                {item.route === 'quest' ? (
                  <OnQuestIcon isActive={isActive} />
                ) : (
                  <Icon />
                )}
                {item.route === 'notifications' && user?.uid && (
                  <NotificationBadge userId={user.uid} />
                )}
              </span>
              {isExpanded && <span className="text-lg">{item.label}</span>}

              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-gray-700 pt-4">
        <div className={`flex items-center ${isExpanded ? 'jusjtify-between' : 'justify-center'}`}>
          {isExpanded ? (
            <>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <img
                  src={user?.photoURL || '/default-avatar.png'}
                  alt={user?.displayName || 'User'}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 overflow-hidden">
                  <p className="text-white text-sm font-medium truncate">
                    {user?.displayName || 'User'}
                  </p>
                  <p className="text-gray-400 text-xs truncate">
                    @{user?.displayName?.toLowerCase().replace(/\s/g, '') || 'user'}
                  </p>
                </div>
              </div>
              <button
                onClick={onSignOut}
                className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-900 shrink-0"
                aria-label="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="relative group">
              <button
                onClick={onSignOut}
                className="w-10 h-10 rounded-full overflow-hidden hover:ring-2 hover:ring-[#EA6100] transition-all"
                aria-label="Sign out"
              >
                <img
                  src={user?.photoURL || '/default-avatar.png'}
                  alt={user?.displayName || 'User'}
                  className="w-full h-full object-cover"
                />
              </button>
              <div className="absolute left-full ml-2 bottom-0 px-3 py-2 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                <p className="font-medium">{user?.displayName || 'User'}</p>
                <p className="text-xs text-gray-400">Click to sign out</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default NavBar;