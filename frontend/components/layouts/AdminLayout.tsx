'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

type AdminLayoutProps = {
  children: ReactNode;
};

const adminMenuItems = [
  {
    title: 'Tableau de bord',
    href: '/admin',
    icon: '📊',
  },
  {
    title: 'Gestion des produits',
    items: [
      { title: 'Tous les produits', href: '/admin' },
      { title: 'Créer un produit', href: '/products/create' },
      { title: 'Importer CSV', href: '/products/upload' },
    ],
    icon: '📦',
  },
  {
    title: 'Gestion des utilisateurs',
    href: '/admin/users',
    icon: '👥',
  },
  {
    title: 'Configuration AdSense',
    href: '/admin/adsense',
    icon: '💰',
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    // For /admin/users, also match /admin/users/[id]
    if (href === '/admin/users') {
      return pathname.startsWith('/admin/users');
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } fixed left-0 top-0 z-50 h-screen bg-primary border-r border-primary-dark/30 transition-all duration-300 flex flex-col shadow-lg`}
      >
        {/* Logo Section */}
        <div className="flex h-24 items-center justify-between border-b border-primary-dark/30 px-4">
          <Link 
            href="/" 
            className={`flex items-center ${sidebarOpen ? 'justify-start' : 'justify-center'} flex-1`}
          >
            <Image
              src="/images/avito-colors.jpeg"
              alt="Avita"
              width={sidebarOpen ? 180 : 50}
              height={sidebarOpen ? 60 : 50}
              className={`${sidebarOpen ? 'h-16 w-auto' : 'h-12 w-12'} object-contain transition-all`}
              priority
            />
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-2 text-white/80 hover:bg-primary-dark/30 hover:text-white transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {adminMenuItems.map((item, index) => {
              if (item.items) {
                // Menu item with submenu
                return (
                  <li key={index}>
                    <div className={`flex items-center gap-3 px-3 py-2 text-sm font-medium text-white/90 ${!sidebarOpen && 'justify-center'}`}>
                      <span className="text-lg">{item.icon}</span>
                      {sidebarOpen && <span>{item.title}</span>}
                    </div>
                    {sidebarOpen && (
                      <ul className="ml-6 mt-1 space-y-1">
                        {item.items.map((subItem) => (
                          <li key={subItem.href}>
                            <Link
                              href={subItem.href}
                              className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                                isActive(subItem.href)
                                  ? 'bg-white/20 text-white font-medium'
                                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {subItem.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }
              // Regular menu item
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-white/20 text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    } ${!sidebarOpen && 'justify-center'}`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {sidebarOpen && <span>{item.title}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer - User Info */}
        {sidebarOpen && user && (
          <div className="border-t border-primary-dark/30 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white font-semibold">
                {(user.first_name?.[0] || user.username?.[0] || user.email[0] || 'U').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user.username || user.email}
                </p>
                <p className="truncate text-xs text-white/70">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div 
        className={`flex-1 w-full h-screen overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}
        style={{ marginTop: 0 }}
      >
        <div className="h-full w-full">{children}</div>
      </div>
    </div>
  );
}

