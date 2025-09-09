import { Shield, LogOut, User, Menu, X, Bell, MapPin, AlertTriangle, Users, ChevronDown, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";

export const Header = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const navigationItems = [
    { href: "./#features", label: "Features", icon: Shield },
    { href: "./#how-it-works", label: "How It Works", icon: Users },
    { href: "./#community", label: "Community", icon: MapPin },
    { href: "./#emergency", label: "Emergency", icon: AlertTriangle, isEmergency: true }
  ];

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-slate-200/50' 
          : 'bg-white/80 backdrop-blur-sm border-b border-slate-100'
      }`}
    >
      {/* Emergency Banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-500 text-white py-1">
        <div className="container mx-auto px-4 text-center">
          <span className="text-xs font-medium">
            🚨 Emergency? Call 911 immediately | Non-emergency reports welcome 24/7
          </span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo Section */}
          <Link to="/">
  <div className="flex items-center space-x-3">
    <div className="relative">
      <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg"></div>
      <div className="relative p-2 bg-gradient-to-br from-primary to-blue-600 rounded-xl shadow-lg">
        <Shield className="h-6 w-6 text-white" />
      </div>
    </div>
    <div>
      <span className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
        Local Guard Connect
      </span>
      <div className="text-xs text-slate-500 -mt-1">Community Safety Network</div>
    </div>
  </div>
</Link>


          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`group relative px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                    item.isEmergency 
                      ? 'text-red-600 hover:bg-red-50 hover:text-red-700' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.isEmergency && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></div>
                </a>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Dashboard Button */}
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="p-2" title="Dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                  </Button>
                </Link>
                
                {/* Notifications */}
                <NotificationDropdown />

                {/* User Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors cursor-pointer group">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center">
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
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      Log out
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
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                    <Shield className="h-4 w-4 mr-2" />
                    Get Started
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md border-b shadow-lg">
            <div className="container mx-auto px-4 py-4">
              <nav className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        item.isEmergency
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                      {item.isEmergency && (
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse ml-auto"></div>
                      )}
                    </a>
                  );
                })}
                
                {user && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center space-x-3 px-4 py-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center">
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