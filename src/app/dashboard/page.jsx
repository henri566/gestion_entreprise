import pool from '../lib/db';
import { cookies } from 'next/headers';
import CurrencyConverter from '../components/CurrencyConverter';
import { Users, Package, FileText, TrendingUp, AlertTriangle, ArrowRight, DollarSign, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const companyIdCookie = cookieStore.get('company_id');
  const company_id = companyIdCookie ? parseInt(companyIdCookie.value, 10) : null;

  let totalClients = 0;
  let totalProducts = 0;
  let totalInvoices = 0;
  let monthlyRevenue = 0;
  let unpaidTotal = 0;
  let paidTotal = 0;
  let lowStockProducts = [];
  let recentInvoices = [];
  let errorMessage = '';

  try {
    if (!company_id) {
      throw new Error("Aucune entreprise connectée. Veuillez vous reconnecter.");
    }

    const clientsRes = await pool.query('SELECT COUNT(*) FROM clients WHERE company_id = $1', [company_id]);
    totalClients = parseInt(clientsRes.rows[0].count, 10);

    const productsRes = await pool.query('SELECT * FROM products WHERE company_id = $1 ORDER BY id DESC', [company_id]);
    totalProducts = productsRes.rows.length;
    lowStockProducts = productsRes.rows.filter(p => parseInt(p.stock, 10) <= 5);

    // Récupération de toutes les factures de l'entreprise
    const invoicesRes = await pool.query(
      `SELECT invoices.*, clients.name AS client_name 
       FROM invoices 
       LEFT JOIN clients ON invoices.client_id = clients.id 
       WHERE invoices.company_id = $1 
       ORDER BY invoices.id DESC`,
      [company_id]
    );
    
    const allInvoices = invoicesRes.rows;
    totalInvoices = allInvoices.length;
    recentInvoices = allInvoices.slice(0, 5); // Les 5 dernières pour l'affichage

    // Calculs financiers (Chiffre d'affaires du mois, Impayés, Payés)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    allInvoices.forEach(inv => {
      const amount = parseFloat(inv.total_amount) || 0;
      const invDate = inv.created_at ? new Date(inv.created_at) : null;

      // CA du mois en cours (basé sur les factures émises ce mois-ci, peu importe le statut ou filtré sur payées selon la logique souhaitée)
      if (invDate && invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
        monthlyRevenue += amount;
      }

      // Total impayés (En attente ou En retard)
      if (inv.status === 'En attente' || inv.status === 'En retard') {
        unpaidTotal += amount;
      }

      // Total payés
      if (inv.status === 'Payée') {
        paidTotal += amount;
      }
    });

  } catch (err) {
    errorMessage = `Erreur lors du chargement des données du tableau de bord : ${err.message}`;
  }

  function formatInvoiceNumber(invoiceNumber, id, createdAt) {
    if (invoiceNumber) return invoiceNumber;
    const year = createdAt ? new Date(createdAt).getFullYear() : 2026;
    const paddedId = String(id).padStart(3, '0');
    return `FAC-${year}-${paddedId}`;
  }

  function formatMoney(amount, currency = 'Ar') {
    const num = parseFloat(amount) || 0;
    const formattedNumber = num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    if (currency === 'EUR') return `${formattedNumber} €`;
    if (currency === 'USD') return `$${formattedNumber}`;
    return `${formattedNumber} Ar`;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 mt-1">Indicateurs financiers, suivi de trésorerie et état de vos activités.</p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200">
          {errorMessage}
        </div>
      )}

      {/* CARTES FINANCIÈRES ET STATISTIQUES ENRICHIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CA du mois */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">CA du mois</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{formatMoney(monthlyRevenue)}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Factures Impayées */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total impayés</p>
            <h3 className="text-2xl font-extrabold text-amber-600 mt-1">{formatMoney(unpaidTotal)}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Factures Payées */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total encaissé</p>
            <h3 className="text-2xl font-extrabold text-green-600 mt-1">{formatMoney(paidTotal)}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Total Clients / Produits */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Base active</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-bold text-gray-900">{totalClients} clients</span>
              <span className="text-gray-300">•</span>
              <span className="text-lg font-bold text-gray-900">{totalProducts} prod.</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      <CurrencyConverter />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GRAPHIQUE / RÉPARTITION DES REVENUS (Visuel épuré) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span>Répartition de la trésorerie</span>
            </h3>
            
            <div className="space-y-4 my-6">
              <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span className="text-gray-600">Montant Encaissé (Payé)</span>
                  <span className="text-green-600 font-bold">{formatMoney(paidTotal)}</span>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${(paidTotal + unpaidTotal) > 0 ? (paidTotal / (paidTotal + unpaidTotal)) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span className="text-gray-600">Montant en attente / Impayé</span>
                  <span className="text-amber-600 font-bold">{formatMoney(unpaidTotal)}</span>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${(paidTotal + unpaidTotal) > 0 ? (unpaidTotal / (paidTotal + unpaidTotal)) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Ce graphique compare dynamiquement les montants réglés par rapport aux factures en cours de règlement.
            </p>
          </div>
        </div>

        {/* Alertes de Stock Bas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Alertes de stock ({lowStockProducts.length})</span>
              </h3>
              <Link href="/products" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <span>Voir tout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                Tous les stocks sont à un niveau confortable 👍
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((product) => {
                  const stock = parseInt(product.stock, 10);
                  const isZero = stock === 0;
                  return (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{product.name}</h4>
                        <p className="text-xs text-gray-500">{product.description || 'Aucune description'}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                        isZero ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isZero ? 'Rupture' : `${stock} en stock`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dernières factures */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Dernières factures émises</span>
          </h3>
          <Link href="/invoices" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
            <span>Gérer la facturation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            Aucune facture enregistrée pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {recentInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    {formatInvoiceNumber(inv.invoice_number, inv.id, inv.created_at)}
                  </h4>
                  <p className="text-xs text-gray-500">Client : <span className="font-medium text-gray-700">{inv.client_name || 'Client inconnu'}</span></p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900 block">
                    {formatMoney(inv.total_amount, inv.currency || 'Ar')}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    inv.status === 'Payée' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {inv.status || 'En attente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}