import pool from '../lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import InvoiceStatusSelect from '../components/InvoiceStatusSelect';
import DeleteActionButton from '../components/DeleteActionButton';
import Button from '../components/UI/Button';
import { Search, Plus, Printer, FileText, Filter, Calendar } from 'lucide-react';

export default async function InvoicesPage({ searchParams }) {
  let invoices = [];
  let clients = [];
  let products = [];
  let errorMessage = '';

  const cookieStore = await cookies();
  const companyIdCookie = cookieStore.get('company_id');
  const company_id = companyIdCookie ? parseInt(companyIdCookie.value, 10) : null;

  const params = await searchParams;
  const searchQuery = params?.q ? params.q.toLowerCase().trim() : '';
  const statusFilter = params?.status || 'ALL';
  const dateFilter = params?.dateRange || 'ALL';

  try {
    if (!company_id) {
      throw new Error("Aucune entreprise connectée. Veuillez vous reconnecter.");
    }

    const clientsRes = await pool.query('SELECT * FROM clients WHERE company_id = $1 ORDER BY name ASC', [company_id]);
    clients = clientsRes.rows;

    const productsRes = await pool.query('SELECT * FROM products WHERE company_id = $1 ORDER BY name ASC', [company_id]);
    products = productsRes.rows;

    const invoicesRes = await pool.query(
      `SELECT invoices.*, clients.name AS client_name 
       FROM invoices 
       LEFT JOIN clients ON invoices.client_id = clients.id 
       WHERE invoices.company_id = $1 
       ORDER BY invoices.id DESC`,
      [company_id]
    );
    invoices = invoicesRes.rows;

  } catch (err) {
    errorMessage = `Erreur lors du chargement des factures : ${err.message}`;
  }

  const filteredInvoices = invoices.filter(inv => {
    const clientMatch = inv.client_name?.toLowerCase().includes(searchQuery);
    const idMatch = String(inv.id).includes(searchQuery);
    const numMatch = inv.invoice_number?.toLowerCase().includes(searchQuery);
    const matchesQuery = !searchQuery || clientMatch || idMatch || numMatch;

    const isOverdue = inv.status !== 'Payée' && inv.due_date && new Date(inv.due_date) < new Date();
    const effectiveStatus = isOverdue ? 'En retard' : (inv.status || 'En attente');
    const matchesStatus = statusFilter === 'ALL' || effectiveStatus === statusFilter;

    let matchesDate = true;
    if (dateFilter !== 'ALL' && inv.created_at) {
      const invDate = new Date(inv.created_at);
      const today = new Date();
      
      if (dateFilter === 'TODAY') {
        matchesDate = invDate.toDateString() === today.toDateString();
      } else if (dateFilter === 'THIS_MONTH') {
        matchesDate = invDate.getMonth() === today.getMonth() && invDate.getFullYear() === today.getFullYear();
      } else if (dateFilter === 'THIS_YEAR') {
        matchesDate = invDate.getFullYear() === today.getFullYear();
      }
    }

    return matchesQuery && matchesStatus && matchesDate;
  });

  function formatMoney(amount, currency = 'Ar') {
    const num = parseFloat(amount) || 0;
    const formattedNumber = num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    if (currency === 'EUR') return `${formattedNumber} €`;
    if (currency === 'USD') return `$${formattedNumber}`;
    return `${formattedNumber} Ar`;
  }

  function formatInvoiceNumber(invoiceNumber, id, createdAt) {
    if (invoiceNumber) return invoiceNumber;
    const year = createdAt ? new Date(createdAt).getFullYear() : 2026;
    const paddedId = String(id).padStart(3, '0');
    return `FAC-${year}-${paddedId}`;
  }

  async function createInvoice(formData) {
    'use server';
    const clientId = formData.get('clientId');
    const productId = formData.get('productId');
    const quantity = parseInt(formData.get('quantity'), 10) || 1;
    const currency = formData.get('currency') || 'Ar';

    const cookieStore = await cookies();
    const currentCompanyId = parseInt(cookieStore.get('company_id')?.value, 10);
    if (!currentCompanyId) return;

    try {
      const prodRes = await pool.query('SELECT price FROM products WHERE id = $1 AND company_id = $2', [productId, currentCompanyId]);
      if (prodRes.rows.length === 0) return;

      const unitPrice = parseFloat(prodRes.rows[0].price);
      const totalAmount = unitPrice * quantity;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const lastInvoiceRes = await pool.query('SELECT MAX(id) as max_id FROM invoices WHERE company_id = $1', [currentCompanyId]);
      const nextId = (lastInvoiceRes.rows[0]?.max_id || 0) + 1;
      const year = new Date().getFullYear();
      const invoiceNumber = `FAC-${year}-${String(nextId).padStart(3, '0')}`;

      await pool.query(
        'INSERT INTO invoices (company_id, client_id, invoice_number, total_amount, currency, status, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [currentCompanyId, clientId, invoiceNumber, totalAmount, currency, 'En attente', dueDate]
      );

      await pool.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2 AND company_id = $3',
        [quantity, productId, currentCompanyId]
      );

      revalidatePath('/invoices');
      revalidatePath('/dashboard');
      revalidatePath('/products');
    } catch (err) {
      console.error("Erreur lors de la création de la facture :", err.message);
    }
  }

  async function updateInvoiceStatus(formData) {
    'use server';
    const invoiceId = formData.get('invoiceId');
    const status = formData.get('status');

    const cookieStore = await cookies();
    const currentCompanyId = parseInt(cookieStore.get('company_id')?.value, 10);
    if (!currentCompanyId) return;

    try {
      await pool.query(
        'UPDATE invoices SET status = $1 WHERE id = $2 AND company_id = $3',
        [status, invoiceId, currentCompanyId]
      );
      revalidatePath('/invoices');
      revalidatePath('/dashboard');
    } catch (err) {
      console.error("Erreur mise à jour statut facture :", err.message);
    }
  }

  async function deleteInvoice(formData) {
    'use server';
    const invoiceId = formData.get('invoiceId');

    const cookieStore = await cookies();
    const currentCompanyId = parseInt(cookieStore.get('company_id')?.value, 10);
    if (!currentCompanyId) return;

    try {
      await pool.query(
        'DELETE FROM invoices WHERE id = $1 AND company_id = $2',
        [invoiceId, currentCompanyId]
      );
      revalidatePath('/invoices');
      revalidatePath('/dashboard');
    } catch (err) {
      console.error("Erreur suppression facture :", err.message);
    }
  }

  const hasActiveFilters = searchQuery || statusFilter !== 'ALL' || dateFilter !== 'ALL';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facturation &amp; Ventes</h1>
          <p className="text-gray-500 mt-1">Émettez vos factures et suivez les règlements en temps réel.</p>
        </div>

        <div className="mt-4 md:mt-0">
          <label htmlFor="invoice-modal-toggle" className="inline-block cursor-pointer">
            <span className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition whitespace-nowrap">
              <Plus className="w-5 h-5 flex-shrink-0" />
              <span>Nouvelle facture</span>
            </span>
          </label>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200">
          {errorMessage}
        </div>
      )}

      {/* BARRE DE RECHERCHE ET FILTRES */}
      <form method="GET" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            name="q"
            defaultValue={searchQuery}
            placeholder="Rechercher par N° de facture ou client..." 
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="relative w-full md:w-48">
          <Filter className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            name="status"
            defaultValue={statusFilter}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition appearance-none cursor-pointer"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="En attente">En attente</option>
            <option value="Payée">Payée</option>
            <option value="En retard">En retard</option>
            <option value="Annulée">Annulée</option>
          </select>
        </div>

        <div className="relative w-full md:w-48">
          <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            name="dateRange"
            defaultValue={dateFilter}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition appearance-none cursor-pointer"
          >
            <option value="ALL">Toutes les dates</option>
            <option value="TODAY">Aujourd'hui</option>
            <option value="THIS_MONTH">Ce mois-ci</option>
            <option value="THIS_YEAR">Cette année</option>
          </select>
        </div>

        <Button type="submit" variant="dark" className="w-full md:w-auto">
          Filtrer
        </Button>

        {hasActiveFilters && (
          <Button href="/invoices" variant="secondary" className="w-full md:w-auto">
            Réinitialiser
          </Button>
        )}
      </form>

      {/* MODALE DE CRÉATION DE FACTURE */}
      <input type="checkbox" id="invoice-modal-toggle" className="peer hidden" />
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 opacity-0 pointer-events-none peer-checked:opacity-100 peer-checked:pointer-events-auto transition duration-200">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Émettre une nouvelle facture</h2>
          
          <form action={createInvoice} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
              <select name="clientId" required className="w-full px-3 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500">
                <option value="">Sélectionner un client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Produit / Service *</label>
              <select name="productId" required className="w-full px-3 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500">
                <option value="">Sélectionner un produit</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({formatMoney(p.price, p.currency || 'Ar')})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantité *</label>
                <input type="number" name="quantity" defaultValue="1" min="1" required className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Devise *</label>
                <select name="currency" className="w-full px-3 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500">
                  <option value="Ar">Ar (Ariary)</option>
                  <option value="EUR">€ (Euro)</option>
                  <option value="USD">$ (Dollar)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <label htmlFor="invoice-modal-toggle" className="inline-block cursor-pointer">
                <span className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition whitespace-nowrap">
                  Annuler
                </span>
              </label>
              <Button type="submit" variant="primary">
                Générer la facture
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* TABLEAU DES FACTURES / ÉTAT VIDE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Liste des factures ({filteredInvoices.length})</h2>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-1">
              {hasActiveFilters ? "Aucune facture ne correspond à votre recherche" : "Aucune facture émise pour le moment"}
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mb-6">
              {hasActiveFilters 
                ? "Essayez de modifier vos filtres." 
                : "Commencez à émettre des factures pour suivre vos ventes."}
            </p>
            {hasActiveFilters ? (
              <Button href="/invoices" variant="secondary">
                Réinitialiser les filtres
              </Button>
            ) : (
              <label htmlFor="invoice-modal-toggle" className="inline-block cursor-pointer">
                <span className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition whitespace-nowrap">
                  <Plus className="w-4 h-4" />
                  <span>Créer une première facture</span>
                </span>
              </label>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4">N° Facture</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Montant Total</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-4 font-semibold text-gray-900">
                      {formatInvoiceNumber(inv.invoice_number, inv.id, inv.created_at)}
                    </td>
                    <td className="p-4 text-gray-700 font-medium">{inv.client_name || 'Client inconnu'}</td>
                    <td className="p-4 font-bold text-gray-900">
                      {formatMoney(inv.total_amount, inv.currency || 'Ar')}
                    </td>
                    <td className="p-4">
                      <InvoiceStatusSelect 
                        invoiceId={inv.id} 
                        initialStatus={inv.status} 
                        dueDate={inv.due_date}
                        updateStatusAction={updateInvoiceStatus} 
                      />
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end space-x-1">
                        <a 
                          href={`/invoices/${inv.id}/print`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          title="Imprimer / PDF"
                          className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition shadow-sm"
                        >
                          <Printer className="w-4 h-4" />
                        </a>

                        <DeleteActionButton 
                          itemId={inv.id} 
                          itemIdName="invoiceId" 
                          deleteAction={deleteInvoice} 
                          confirmMessage="Voulez-vous vraiment supprimer cette facture ?" 
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}