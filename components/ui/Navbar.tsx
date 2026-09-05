// components/ui/Navbar.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from '@/components/ui/ThemeToggle';

const appNavItems = [
  { href: '/dashboard',  label: 'Dashboard',   icon: DashboardIcon },
  { href: '/exceptions', label: 'Exceptions',  icon: AlertIcon     },
  { href: '/chat',       label: 'Ask AI',      icon: ChatIcon      },
  { href: '/export',     label: 'GST Export',  icon: ExportIcon    },
  { href: '/sync',       label: 'Sync Hub',    icon: SyncIcon      },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [merchant, setMerchant] = useState<{ name: string; gstin: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();
  const isLandingPage = pathname === '/';
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const d = await res.json();
          if (d?.merchant) {
            setMerchant(d.merchant);
            return;
          }
        }
      } catch {}

      if (user?.user_metadata?.name) {
        setMerchant({
          name: user.user_metadata.name,
          gstin: user.user_metadata.gstin || '27AABCP1234Q1Z5',
        });
      }
    }

    loadUser();

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pathname]);

  // Navbar for Login Page
  if (isLoginPage) {
    return (
      <nav style={{
        height: 56,
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-card)',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: 'var(--card-shadow)',
      }}>
        <div style={{
          maxWidth: 1240, margin: '0 auto', height: '100%',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: 28, height: 28,
              background: 'var(--accent-primary)',
              borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2.5">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1Z"/>
              </svg>
            </div>
            <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>ReconCopilot</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ThemeToggle />
            <Link href="/" className="btn-secondary" style={{ fontSize: '13px', padding: '6px 12px' }}>
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  // Navbar for Landing Page (Website Homepage)
  if (isLandingPage) {
    return (
      <nav style={{
        height: 60,
        background: 'var(--bg-card)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-card)',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: 'var(--card-shadow)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', height: '100%',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Brand Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: 28, height: 28,
              background: 'var(--accent-primary)',
              borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1Z"/>
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                <path d="M12 6v12"/>
              </svg>
            </div>
            <span style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              ReconCopilot
            </span>
          </Link>

          {/* Marketing Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <a href="#how-it-works" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none' }}>
              How It Works
            </a>
            <a href="#features" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none' }}>
              Features
            </a>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ThemeToggle />
            <Link href="/login" className="btn-secondary">
              Merchant Sign In
            </Link>
            <Link href="/login" className="btn-primary">
              Get Started →
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  // Navbar for Internal App Pages (/dashboard, /exceptions, /chat, /export, /sync)
  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await supabase.auth.signOut();
    } catch {}
    setMenuOpen(false);
    setUser(null);
    router.push('/');
  }

  return (
    <nav style={{
      height: 56,
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-card)',
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: 'var(--card-shadow)',
    }}>
      <div style={{
        maxWidth: 1240, margin: '0 auto', height: '100%',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        {/* Brand Mark */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', marginRight: '20px' }}>
          <div style={{
            width: 28, height: 28,
            background: 'var(--accent-primary)',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1Z"/>
              <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
              <path d="M12 6v12"/>
            </svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            ReconCopilot
          </span>
        </Link>

        {/* Separator */}
        <div style={{ width: 1, height: 18, background: 'var(--border-card)', marginRight: '8px' }} />

        {/* Internal App Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {appNavItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className={`nav-tab ${active ? 'active' : ''}`}>
                <Icon size={14} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right Controls: Theme Toggle & Merchant Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Theme Switcher Toggle */}
          <ThemeToggle />

          {/* User Session Chip & Dropdown */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 12px',
                background: menuOpen ? 'var(--bg-hover)' : 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: 6,
                cursor: 'pointer',
                color: 'var(--text-primary)',
                transition: 'background-color 0.15s ease',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <span className="dot dot-teal" />
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {merchant?.name || 'Priya Crafts Store'}
              </span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M2.5 4.5L6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 6px)',
                width: 240,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: 8,
                padding: '12px',
                boxShadow: 'var(--dropdown-shadow)',
                zIndex: 200,
              }}>
                <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border-card)', marginBottom: '8px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {merchant?.name || 'Priya Crafts Store'}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                    GSTIN: {merchant?.gstin || '27AABCP1234Q1Z5'}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {user?.email ? user.email : 'Demo Mode Active'}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Link
                    href="/sync"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 8px',
                      borderRadius: 6,
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <SyncIcon size={14} />
                    <span>Sync Statement Sources</span>
                  </Link>

                  <Link
                    href="/"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 8px',
                      borderRadius: 6,
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <HomeIcon size={14} />
                    <span>Product Home</span>
                  </Link>

                  <div style={{ height: 1, background: 'var(--border-card)', margin: '4px 0' }} />

                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 8px',
                      borderRadius: 6,
                      fontSize: '13px',
                      color: 'var(--critical)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--critical-dim)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <SignOutIcon size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function DashboardIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1"/>
      <rect x="14" y="3" width="7" height="5" rx="1"/>
      <rect x="14" y="12" width="7" height="9" rx="1"/>
      <rect x="3" y="16" width="7" height="5" rx="1"/>
    </svg>
  );
}

function AlertIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}

function ChatIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function ExportIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function SyncIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
    </svg>
  );
}

function HomeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function SignOutIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
