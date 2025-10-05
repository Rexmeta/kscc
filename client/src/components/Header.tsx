import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import LanguageSwitcher from './LanguageSwitcher';
import { t } from '@/lib/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header() {
  const [location] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.about'), href: '/about' },
    { name: t('nav.news'), href: '/news' },
    { name: t('nav.events'), href: '/events' },
    { name: t('nav.members'), href: '/members' },
    { name: t('nav.resources'), href: '/resources' },
    { name: t('nav.contact'), href: '/contact' },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return location === '/';
    }
    return location.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full nav-shadow">
      <div className="container">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <span className="text-xl font-bold text-white">KSCC</span>
              </div>
              <div className="hidden md:block">
                <div className="font-bold leading-tight text-foreground">
                  한국 사천-충칭 총상회
                </div>
                <div className="text-xs text-muted-foreground lang-en">
                  Korea Sichuan-Chongqing Chamber
                </div>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`
                    ${isActive(item.href) 
                      ? 'bg-muted text-primary font-medium' 
                      : 'text-foreground hover:text-primary'
                    }
                  `}
                >
                  {item.name}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="hidden md:flex">
                    <User className="h-4 w-4" />
                    {user?.name}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href="/dashboard">
                    <DropdownMenuItem>
                      {t('nav.dashboard')}
                    </DropdownMenuItem>
                  </Link>
                  {user?.role === 'admin' && (
                    <Link href="/admin">
                      <DropdownMenuItem>
                        {t('nav.admin')}
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login" className="hidden md:inline-flex">
                  <Button variant="outline">
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button>
                    {t('nav.register')}
                  </Button>
                </Link>
              </>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-4 mt-8">
                  {navigation.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Button
                        variant="ghost"
                        className={`
                          w-full justify-start
                          ${isActive(item.href) 
                            ? 'bg-muted text-primary font-medium' 
                            : 'text-foreground'
                          }
                        `}
                      >
                        {item.name}
                      </Button>
                    </Link>
                  ))}
                  
                  <hr />
                  
                  {isAuthenticated ? (
                    <>
                      <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">
                          <User className="h-4 w-4" />
                          {t('nav.dashboard')}
                        </Button>
                      </Link>
                      {user?.role === 'admin' && (
                        <Link href="/admin" onClick={() => setMobileOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">
                            {t('nav.admin')}
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-4 w-4" />
                        {t('nav.logout')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setMobileOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">
                          {t('nav.login')}
                        </Button>
                      </Link>
                      <Link href="/register" onClick={() => setMobileOpen(false)}>
                        <Button className="w-full">
                          {t('nav.register')}
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
