'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Package, FileText, LogOut } from 'lucide-react';

export default function Sidebar({ companyName, handleLogout }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Produits & Stock', href: '/products', icon: Package },
    { name: 'Facturation', href: '/invoices', icon: FileText },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between hidden md:flex shadow-sm h-screen sticky top-0">
      {/* En-tête Sidebar : Avatar & Nom de l'entreprise */}
      <div className="p-6 border-b border-gray-100 flex items-center space-x-3 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
          {companyName ? companyName.charAt(0).toUpperCase() : 'M'}
        </div>
        <div className="overflow-hidden">
          <h2 className="text-sm font-bold text-gray-800 truncate">{companyName}</h2>
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            En ligne
          </span>
        </div>
      </div>

      {/* Navigation Links (scrollable si l'écran est petit) */}
      <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
              }`}
            >
              <IconComponent className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bas de sidebar : Déconnexion (fixé en bas, au-dessus du badge de dev) */}
      <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0">
        <form action={handleLogout}>
          <button 
            type="submit" 
            className="w-full flex items-center justify-center space-x-2 bg-red-50 text-red-600 hover:bg-red-100 py-2.5 px-4 rounded-xl text-sm font-medium transition border border-red-100"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </form>
      </div>
    </aside>
  );
}