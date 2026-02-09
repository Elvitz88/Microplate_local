import { NavLink } from 'react-router-dom';
import { MdLogout, MdSettings, MdDashboard, MdScience, MdDescription, MdPerson, MdExpandMore, MdSearch, MdClose, MdAccessTime, MdHelp } from 'react-icons/md';
import { useEffect, useState, type ComponentType } from 'react';
import { authService } from '../../services/auth.service';
import { searchService } from '../../services/search.service';
import type { SearchResult } from '../../services/search.service';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { logger } from '../../utils/logger';

type NavigationLink = {
  key: 'dashboard' | 'results' | 'userGuide';
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const navigationLinks: NavigationLink[] = [
  { key: 'dashboard', href: '/capture', icon: MdDashboard },
  { key: 'results', href: '/results', icon: MdScience },
  { key: 'userGuide', href: '/user-guide', icon: MdHelp },
];






function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Navbar() {
  const { t } = useTranslation();
  
  const handleSignOut = () => {
    authService.logout();
    window.location.href = '/auth';
  };


  
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  
  
  const [userInfo, setUserInfo] = useState<{ email?: string; username?: string; avatarUrl?: string | null }>({});
  
  
  
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  useEffect(() => {
    const token = authService.getCurrentToken();
    if (!token) return;
    const setFromToken = () => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserInfo(prev => ({
          ...prev,
          email: payload.email || payload.sub,
          username: payload.username || payload.name
        }));
      } catch (error) {
        logger.error('Error parsing token:', error);
      }
    };
    authService.getProfile()
      .then((data) => {
        if (data) {
          setUserInfo({
            email: data.email,
            username: data.username,
            avatarUrl: data.avatarUrl ?? null
          });
        } else {
          setFromToken();
        }
      })
      .catch(() => setFromToken());
  }, []);


  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      const timeoutId = setTimeout(async () => {
        try {
          const response = await searchService.search(searchQuery);
          setSearchResults(response.data.results);
        } catch (error) {
          logger.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isProfileOpen && !(event.target as Element).closest('.profile-dropdown')) {
        setIsProfileOpen(false);
      }
      if (isSearchOpen && !(event.target as Element).closest('.search-dropdown')) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen, isSearchOpen]);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="container-page">
        <div className="flex h-16 items-center">
          {}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <img 
                src="/HAIlytics.png" 
                alt="HAIlytics Logo" 
                className="h-8 w-8 object-contain"
              />
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">HAIlytics</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Analytics-first HI</span>
              </div>
            </div>
          </div>

          {}
          <nav className="flex-1 hidden md:flex justify-center">
            <div className="flex items-baseline space-x-4">
              {navigationLinks.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.href}
                  className={({ isActive }) =>
                    classNames(
                      isActive
                        ? 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
                      'rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2'
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {t(`navbar.links.${item.key}`)}
                </NavLink>
              ))}
            </div>
          </nav>

          {}
          <div className="ml-4 flex items-center gap-3">
            {}
            <div className="relative search-dropdown">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                title={t('navbar.actions.search')}
              >
                <MdSearch className="h-5 w-5" />
              </button>

              {}
              {isSearchOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-gray-200 dark:border-gray-700">
                  <div className="p-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t('navbar.search.placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 pl-10 pr-4 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                      />
                      <MdSearch className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 hover:text-gray-600"
                        >
                          <MdClose />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {isSearching && (
                    <div className="px-4 pb-4">
                      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                        {t('navbar.search.searching')}
                      </div>
                    </div>
                  )}
                  
                  {searchQuery && !isSearching && (
                    <div className="max-h-64 overflow-y-auto border-t border-gray-200 dark:border-gray-700">
                      {searchResults.length > 0 ? (
                        searchResults.map((result) => (
                          <NavLink
                            key={result.id}
                            to={result.url}
                            onClick={() => {
                              setIsSearchOpen(false);
                              setSearchQuery('');
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            <div className="flex-shrink-0">
                              {result.type === 'sample' && <MdScience className="h-4 w-4 text-blue-500" />}
                              {result.type === 'result' && <MdDescription className="h-4 w-4 text-green-500" />}
                              {result.type === 'log' && <MdAccessTime className="h-4 w-4 text-yellow-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {result.title}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {result.description}
                              </div>
                            </div>
                          </NavLink>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          {t('navbar.search.noResults', { query: searchQuery })}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!searchQuery && (
                    <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      {t('navbar.search.start')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {}
          
            {}

            {}
            <div className="relative profile-dropdown">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 rounded-full bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm overflow-hidden">
                  {userInfo.avatarUrl ? (
                    <img src={userInfo.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <MdPerson className="h-5 w-5 text-white" />
                  )}
                </div>
                <MdExpandMore className={`h-4 w-4 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-gray-200 dark:border-gray-700">
                  <div className="py-2">
                    {}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm overflow-hidden">
                          {userInfo.avatarUrl ? (
                            <img src={userInfo.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <MdPerson className="h-6 w-6 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {userInfo.username || t('navbar.profile.defaultName')}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {userInfo.email || t('navbar.profile.defaultEmail')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {}
                    <NavLink
                      to="/profile"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <MdPerson className="h-4 w-4" />
                      {t('navbar.profile.profileLink')}
                    </NavLink>
                    
                    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                      <LanguageSwitcher />
                    </div>
                    <NavLink
                      to="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <MdSettings className="h-4 w-4" />
                      {t('navbar.profile.settingsLink')}
                    </NavLink>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                    
                    {}
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleSignOut();
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <MdLogout className="h-4 w-4" />
                      {t('navbar.profile.logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
