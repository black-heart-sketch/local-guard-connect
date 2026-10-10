import { 
  Shield, LogOut, User, Menu, X, MapPin, AlertTriangle, Users, Phone,
  ChevronDown, LayoutDashboard 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { useLanguage } from "@/contexts/LanguageContext";

export const Header = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { locale, setLocale, t } = useLanguage();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ✅ Handle navigation with smooth scroll or route change
  const handleNavigation = (item: { id?: string; path?: string }) => {
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
    if (item.path) {
      navigate(item.path);
    } else if (item.id) {
      if (location.pathname !== "/") {
        navigate("/", { replace: false });
        setTimeout(() => {
          const el = document.querySelector(item.id!);
          el?.scrollIntoView({ behavior: "smooth" });
        }, 150);
      } else {
        const el = document.querySelector(item.id);
        el?.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const navigationItems = [
    { id: "#features", label: t('features'), icon: Shield },
    { id: "#how-it-works", label: t('how'), icon: Users },
    { path: "/community", label: t('community'), icon: Users },
    { path: "/partners", label: t('partners'), icon: Shield },
    { path: "/track", label: t('trackReport'), icon: MapPin },
    { id: "#emergency", label: t('emergency'), icon: AlertTriangle, isEmergency: true }
  ];

  return (
    <header 
    
      className={`sticky top-0 z-50 border-b transition-shadow duration-200 ${
        isScrolled 
          ? 'bg-background shadow-sm'
          : 'bg-background'
      }`}
    >
      {/* Emergency Banner */}
      <div className="bg-destructive pb-1.5 pt-1.5 text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.375rem)' }}>
        <div className="container mx-auto flex items-center justify-center gap-2 px-4 text-center">
          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-xs font-semibold">{t('emergencyBanner')}</span>
        </div>
      </div>

      <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          {/* Logo Section */}
          <Link to="/" className="min-w-0 shrink-0" aria-label="CrimeX home">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative shrink-0">
                <div className="rounded-lg border border-primary/20 bg-white p-1.5">
                  <img src="/favicon.jpeg" alt="CrimeX" className="h-8 w-8 rounded" />
                </div>
              </div>
              <div className="min-w-0">
                <span className="text-lg font-bold text-foreground sm:text-xl">
                  CrimeX
                </span>
                <div className="-mt-1 hidden text-xs text-slate-500 sm:block">{t('safetyNetwork')}</div>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const commonClasses = `group relative px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                item.isEmergency
                  ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`;

              const content = (
                <>
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.isEmergency && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                  <div className="absolute inset-x-4 bottom-0 h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-200 group-hover:scale-x-100"></div>
                </>
              );

              if (item.path) {
                return (
                  <Link to={item.path} key={item.path} className={commonClasses}>
                    {content}
                  </Link>
                );
              } else {
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item)}
                    className={commonClasses}
                  >
                    {content}
                  </button>
                );
              }
            })}
          </nav>

          {/* User Section */}
          <div className="flex min-w-0 items-center gap-1 sm:gap-3">
            <Button className="h-11 min-w-11 px-2 sm:h-9 sm:px-3" variant="ghost" size="sm" onClick={() => setLocale(locale === 'en' ? 'fr' : 'en')} aria-label="Change language">
              <span className="sm:hidden">{locale === 'en' ? 'FR' : 'EN'}</span>
              <span className="hidden sm:inline">{t('language')}</span>
            </Button>
            {user ? (
              <div className="flex items-center gap-3">
                {/* Dashboard Button */}
               
                
                {/* Notifications */}
                <NotificationDropdown />

                {/* User Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors cursor-pointer group">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-slate-800">
                          {profile?.full_name || user.email?.split('@')[0] || 'User'}
                        </div>
                        <div className="text-xs text-slate-500">Community Member</div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t('profile')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      {t('dashboard')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      {t('profile')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      {t('logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Sign Out Button - Mobile fallback */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="md:hidden items-center text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/auth">
                  <Button variant="ghost" className="hidden sm:flex">
                    {t('signIn')}
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button className="h-11 w-11 bg-primary p-0 text-primary-foreground hover:bg-primary/90 sm:w-auto sm:px-4">
                    <Shield className="h-5 w-5 sm:mr-2 sm:h-4 sm:w-4" />
                    <span className="sr-only sm:not-sr-only">{t('getStarted')}</span>
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-11 w-11 p-2 lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-background border-b shadow-lg">
            <div className="container mx-auto px-4 py-4">
              <nav className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const commonClasses = `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    item.isEmergency
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`;
                  const content = (
                    <>
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                      {item.isEmergency && (
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse ml-auto"></div>
                      )}
                    </>
                  );

                  if (item.path) {
                    return (
                      <Link to={item.path} key={item.path} className={commonClasses} onClick={() => setIsMobileMenuOpen(false)}>
                        {content}
                      </Link>
                    );
                  } else {
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigation(item)}
                        className={commonClasses}
                      >
                        {content}
                      </button>
                    );
                  }
                })}
                
                {user && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center space-x-3 px-4 py-2">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">
                          {profile?.full_name || user.email?.split('@')[0] || 'User'}
                        </div>
                        <div className="text-sm text-slate-500">Community Member</div>
                      </div>
                    </div>
                    <Link to="/dashboard" className="block w-full">
                      <Button
                        variant="ghost"
                        className="w-full justify-start mt-2 text-slate-600 hover:bg-slate-50"
                      >
                        <LayoutDashboard className="h-4 w-4 mr-3" />
                        Dashboard
                      </Button>
                    </Link>
                    <Link to="/profile" className="block w-full">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-slate-600 hover:bg-slate-50"
                      >
                        <User className="h-4 w-4 mr-3" />
                        Profile
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={handleSignOut}
                      className="w-full justify-start text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </Button>
                  </div>
                )}
              </nav>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
