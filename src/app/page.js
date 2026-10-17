import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-50 dark:bg-black">
      <div className="text-center max-w-xl">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          SaaS ERP - Gestion d'Entreprise
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">
          Gérez vos factures, clients et paiements en toute simplicité.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link 
            href="/login" 
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Se connecter
          </Link>
          <Link 
            href="/register" 
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
          >
            S'inscrire
          </Link>
          <Link 
            href="/dashboard" 
            className="px-6 py-3 bg-white text-gray-700 dark:bg-zinc-800 dark:text-white font-medium rounded-lg border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-700 transition"
          >
            Tableau de bord
          </Link>
        </div>
      </div>
    </main>
  );
}