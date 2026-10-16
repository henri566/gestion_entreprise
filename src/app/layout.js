import './globals.css';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import pool from './lib/db';
import Sidebar from './components/Sidebar';

export const metadata = {
  title: 'SaaS ERP Multi-tenant',
  description: 'Application de gestion d’entreprise multi-tenant',
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const companyIdCookie = cookieStore.get('company_id');
  const isLoggedIn = !!companyIdCookie;

  let companyName = "Mon Entreprise";

  if (isLoggedIn) {
    try {
      const res = await pool.query('SELECT name FROM companies WHERE id = $1', [companyIdCookie.value]);
      if (res.rows.length > 0) {
        companyName = res.rows[0].name;
      }
    } catch (err) {
      console.error("Erreur récupération entreprise:", err);
    }
  }

  // Action de déconnexion
  async function handleLogout() {
    'use server';
    const cookieStore = await cookies();
    cookieStore.delete('company_id');
    redirect('/login');
  }

  return (
    <html lang="fr">
      <body className="bg-gray-50 min-h-screen font-sans">
        {isLoggedIn ? (
          <div className="flex min-h-screen">
            {/* Sidebar Client pour la mise en surbrillance automatique */}
            <Sidebar companyName={companyName} handleLogout={handleLogout} />

            {/* Contenu principal */}
            <main className="flex-1 bg-gray-50 min-h-screen overflow-y-auto">
              {children}
            </main>
          </div>
        ) : (
          <main>{children}</main>
        )}
      </body>
    </html>
  );
}