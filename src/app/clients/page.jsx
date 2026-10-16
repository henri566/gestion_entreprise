import pool from '../lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import DeleteActionButton from '../components/DeleteActionButton';
import Button from '../components/UI/Button';
import { Search, Users, Plus, Edit3, Mail, Phone } from 'lucide-react';

export default async function ClientsPage({ searchParams }) {
  let clients = [];
  let errorMessage = '';
  let editClient = null;

  const cookieStore = await cookies();
  const companyIdCookie = cookieStore.get('company_id');
  const company_id = companyIdCookie ? parseInt(companyIdCookie.value, 10) : null;

  const params = await searchParams;
  const editId = params?.edit ? parseInt(params.edit, 10) : null;
  const searchQuery = params?.q ? params.q.toLowerCase().trim() : '';

  try {
    if (!company_id) {
      throw new Error("Aucune entreprise connectée. Veuillez vous reconnecter.");
    }

    const result = await pool.query(
      'SELECT * FROM clients WHERE company_id = $1 ORDER BY id DESC',
      [company_id]
    );
    clients = result.rows;

    if (editId) {
      const editRes = await pool.query(
        'SELECT * FROM clients WHERE id = $1 AND company_id = $2',
        [editId, company_id]
      );
      if (editRes.rows.length > 0) {
        editClient = editRes.rows[0];
      }
    }
  } catch (err) {
    errorMessage = `Erreur lors du chargement des clients : ${err.message}`;
  }

  const filteredClients = clients.filter(client => {
    if (!searchQuery) return true;
    const nameMatch = client.name?.toLowerCase().includes(searchQuery);
    const emailMatch = client.email?.toLowerCase().includes(searchQuery);
    const phoneMatch = client.phone?.toLowerCase().includes(searchQuery);
    return nameMatch || emailMatch || phoneMatch;
  });

  async function addClient(formData) {
    'use server';
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const address = formData.get('address');
    
    const cookieStore = await cookies();
    const currentCompanyId = parseInt(cookieStore.get('company_id')?.value, 10);
    if (!currentCompanyId) return;

    try {
      await pool.query(
        'INSERT INTO clients (company_id, name, email, phone, address) VALUES ($1, $2, $3, $4, $5)',
        [currentCompanyId, name, email, phone, address]
      );
      revalidatePath('/clients');
      revalidatePath('/dashboard');
    } catch (err) {
      console.error("Erreur ajout client :", err.message);
    }
  }

  async function updateClient(formData) {
    'use server';
    const id = formData.get('id');
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const address = formData.get('address');

    const cookieStore = await cookies();
    const currentCompanyId = parseInt(cookieStore.get('company_id')?.value, 10);
    if (!currentCompanyId) return;

    try {
      await pool.query(
        'UPDATE clients SET name = $1, email = $2, phone = $3, address = $4 WHERE id = $5 AND company_id = $6',
        [name, email, phone, address, id, currentCompanyId]
      );
      revalidatePath('/clients');
      revalidatePath('/dashboard');
    } catch (err) {
      console.error("Erreur modification client :", err.message);
    }
  }

  async function deleteClient(formData) {
    'use server';
    const clientId = formData.get('clientId');
    
    const cookieStore = await cookies();
    const currentCompanyId = parseInt(cookieStore.get('company_id')?.value, 10);
    if (!currentCompanyId) return;

    try {
      await pool.query(
        'DELETE FROM clients WHERE id = $1 AND company_id = $2',
        [clientId, currentCompanyId]
      );
      revalidatePath('/clients');
      revalidatePath('/dashboard');
    } catch (err) {
      console.error("Erreur suppression client :", err.message);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Clients</h1>
          <p className="text-gray-500 mt-1">Gérez votre portefeuille client et suivez vos contacts.</p>
        </div>

        <div className="mt-4 md:mt-0">
          <label htmlFor="client-modal-toggle" className="inline-block cursor-pointer">
            <span className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition whitespace-nowrap">
              <Plus className="w-5 h-5 flex-shrink-0" />
              <span>Nouveau client</span>
            </span>
          </label>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200">
          {errorMessage}
        </div>
      )}

      {/* BARRE DE RECHERCHE */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between gap-4">
        <form method="GET" className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            name="q"
            defaultValue={searchQuery}
            placeholder="Rechercher par nom, email ou téléphone..." 
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </form>
        {searchQuery && (
          <Button href="/clients" variant="secondary">
            Réinitialiser
          </Button>
        )}
      </div>

      {/* MODALE D'AJOUT DE CLIENT */}
      <input type="checkbox" id="client-modal-toggle" className="peer hidden" />
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 opacity-0 pointer-events-none peer-checked:opacity-100 peer-checked:pointer-events-auto transition duration-200">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Ajouter un nouveau client</h2>
          
          <form action={addClient} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du client ou entreprise *</label>
              <input type="text" name="name" required className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Ex: Société SARL" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" name="email" className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="contact@client.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input type="text" name="phone" className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="+261 34 00 000 00" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <textarea name="address" rows="2" className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Lot, Ville, Quartier..."></textarea>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <label htmlFor="client-modal-toggle" className="inline-block cursor-pointer">
                <span className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition whitespace-nowrap">
                  Annuler
                </span>
              </label>
              <Button type="submit" variant="primary">
                Enregistrer le client
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* MODALE DE MODIFICATION DE CLIENT */}
      {editClient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Modifier le client : {editClient.name}</h2>
            
            <form action={updateClient} className="space-y-4">
              <input type="hidden" name="id" value={editClient.id} />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du client ou entreprise *</label>
                <input type="text" name="name" defaultValue={editClient.name} required className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" name="email" defaultValue={editClient.email || ''} className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input type="text" name="phone" defaultValue={editClient.phone || ''} className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <textarea name="address" rows="2" defaultValue={editClient.address || ''} className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500"></textarea>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button href="/clients" variant="secondary">
                  Annuler
                </Button>
                <Button type="submit" variant="primary">
                  Mettre à jour
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TABLEAU DES CLIENTS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Liste des clients ({filteredClients.length})</h2>
        </div>

        {filteredClients.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-1">Aucun client trouvé</h3>
            <p className="text-sm text-gray-500 max-w-sm mb-6">
              {searchQuery 
                ? `Aucun résultat ne correspond à "${searchQuery}".` 
                : "Votre carnet de clients est vide. Commencez par en ajouter un."}
            </p>
            {!searchQuery && (
              <label htmlFor="client-modal-toggle" className="inline-block cursor-pointer">
                <span className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition whitespace-nowrap">
                  <Plus className="w-4 h-4" />
                  <span>Ajouter un client</span>
                </span>
              </label>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4">Nom / Entreprise</th>
                  <th className="p-4">Contact (Email / Tél)</th>
                  <th className="p-4">Adresse</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-4 font-semibold text-gray-900">{client.name}</td>
                    <td className="p-4 space-y-1">
                      {client.email && (
                        <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span>{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {!client.email && !client.phone && <span className="text-gray-400">-</span>}
                    </td>
                    <td className="p-4 text-gray-500 truncate max-w-xs">{client.address || '-'}</td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end space-x-1">
                        <a 
                          href={`/clients?edit=${client.id}`}
                          title="Modifier"
                          className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition shadow-sm"
                        >
                          <Edit3 className="w-4 h-4" />
                        </a>

                        <DeleteActionButton 
                          itemId={client.id} 
                          itemIdName="clientId" 
                          deleteAction={deleteClient} 
                          confirmMessage={`Voulez-vous vraiment supprimer le client "${client.name}" ?`} 
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