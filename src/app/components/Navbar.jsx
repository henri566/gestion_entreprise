import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Navbar() {
  
  // Action serveur pour se déconnecter
  async function handleLogout() {
    'use server';
    const cookieStore = await cookies();
    cookieStore.delete('company_id');
    redirect('/login');
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex space-x-8 items-center">
            <span className="font-bold text-xl text-blue-600">SaaS ERP</span>
            <div className="hidden md:flex space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                Tableau de bord
              </Link>
              <Link href="/clients" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                Clients
              </Link>
              <Link href="/products" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                Produits & Stock
              </Link>
              <Link href="/invoices" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                Facturation
              </Link>
            </div>
          </div>

          <div className="flex items-center">
            <form action={handleLogout}>
              <button 
                type="submit" 
                className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium transition border border-red-200"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}