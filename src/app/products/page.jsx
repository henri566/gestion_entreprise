import pool from '../lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import DeleteActionButton from '../components/DeleteActionButton';
import Button from '../components/UI/Button';
import { Search, PackageOpen, Plus, Edit3 } from 'lucide-react';

export default async function ProductsPage({ searchParams }) {
  let products = [];
  let errorMessage = '';
  let editProduct = null;

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
      'SELECT * FROM products WHERE company_id = $1 ORDER BY id DESC',
      [company_id]
    );
    products = result.rows;

    if (editId) {
      const editRes = await pool.query(
        'SELECT * FROM products WHERE id = $1 AND company_id = $2',
        [editId, company_id]
      );
      if (editRes.rows.length > 0) {
        editProduct = editRes.rows[0];
      }
    }
  } catch (err) {
    errorMessage = `Erreur lors du chargement des produits : ${err.message}`;
  }

  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true;
    const nameMatch = product.name?.toLowerCase().includes(searchQuery);
    const descMatch = product.description?.toLowerCase().includes(searchQuery);
    return nameMatch || descMatch;
  });

  function formatPrice(amount, currency = 'Ar') {
    const num = parseFloat(amount) || 0;
    const formattedNumber = num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    if (currency === 'EUR') return `${formattedNumber} €`;
    if (currency === 'USD') return `$${formattedNumber}`;
    return `${formattedNumber} Ar`;
  }

  async function addProduct(formData) {
    'use server';
    const name = formData.get('name');
    const description = formData.get('description');
    const price = formData.get('price');
    const stock = parseInt(formData.get('stock'), 10);
    const currency = formData.get('currency') || 'Ar';
    
    const cookieStore = await cookies();
    const currentCompanyId = parseInt(cookieStore.get('company_id')?.value, 10);
    if (!currentCompanyId) return;

    try {
      await pool.query(
        'INSERT INTO products (company_id, name, description, price, stock, currency) VALUES ($1, $2, $3, $4, $5, $6)',
        [currentCompanyId, name, description, price, stock, currency]
      );
      revalidatePath('/products');
      revalidatePath('/dashboard');
    } catch (err) {
      console.error("Erreur ajout :", err.message);
    }
  }

  async function updateProduct(formData) {
    'use server';
    const id = formData.get('id');
    const name = formData.get('name');
    const description = formData.get('description');
    const price = formData.get('price');
    const stock = parseInt(formData.get('stock'), 10);
    const currency = formData.get('currency');

    const cookieStore = await cookies();
    const currentCompanyId = parseInt(cookieStore.get('company_id')?.value, 10);
    if (!currentCompanyId) return;

    try {
      await pool.query(
        'UPDATE products SET name = $1, description = $2, price = $3, stock = $4, currency = $5 WHERE id = $6 AND company_id = $7',
        [name, description, price, stock, currency, id, currentCompanyId]
      );
      revalidatePath('/products');
      revalidatePath('/dashboard');
    } catch (err) {
      console.error("Erreur modification :", err.message);
    }
  }

  async function deleteProduct(formData) {
    'use server';
    const productId = formData.get('productId');
    
    const cookieStore = await cookies();
    const currentCompanyId = parseInt(cookieStore.get('company_id')?.value, 10);
    if (!currentCompanyId) return;

    try {
      await pool.query(
        'DELETE FROM products WHERE id = $1 AND company_id = $2',
        [productId, currentCompanyId]
      );
      revalidatePath('/products');
      revalidatePath('/dashboard');
    } catch (err) {
      console.error("Erreur suppression :", err.message);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Stocks &amp; Produits</h1>
          <p className="text-gray-500 mt-1">Gérez votre catalogue d'articles et suivez les niveaux de stock en temps réel.</p>
        </div>

        <div className="mt-4 md:mt-0">
          <label htmlFor="product-modal-toggle" className="inline-block cursor-pointer">
            <span className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition whitespace-nowrap">
              <Plus className="w-5 h-5 flex-shrink-0" />
              <span>Nouveau produit</span>
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
            placeholder="Rechercher un produit par son nom ou sa description..." 
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </form>
        {searchQuery && (
          <Button href="/products" variant="secondary">
            Réinitialiser
          </Button>
        )}
      </div>

      {/* MODALE D'AJOUT DE PRODUIT */}
      <input type="checkbox" id="product-modal-toggle" className="peer hidden" />
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 opacity-0 pointer-events-none peer-checked:opacity-100 peer-checked:pointer-events-auto transition duration-200">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Ajouter un nouveau produit</h2>
          
          <form action={addProduct} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du produit / Service *</label>
              <input type="text" name="name" required className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Ex: Licence logiciel pro" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" rows="2" className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Détails du produit..."></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix Unitaire *</label>
                <input type="number" step="0.01" name="price" required className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantité en stock *</label>
              <input type="number" name="stock" required defaultValue="10" className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <label htmlFor="product-modal-toggle" className="inline-block cursor-pointer">
                <span className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition whitespace-nowrap">
                  Annuler
                </span>
              </label>
              <Button type="submit" variant="primary">
                Enregistrer le produit
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* MODALE DE MODIFICATION DE PRODUIT */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Modifier le produit : {editProduct.name}</h2>
            
            <form action={updateProduct} className="space-y-4">
              <input type="hidden" name="id" value={editProduct.id} />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du produit / Service *</label>
                <input type="text" name="name" defaultValue={editProduct.name} required className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" rows="2" defaultValue={editProduct.description || ''} className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix Unitaire *</label>
                  <input type="number" step="0.01" name="price" defaultValue={editProduct.price} required className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Devise *</label>
                  <select name="currency" defaultValue={editProduct.currency || 'Ar'} className="w-full px-3 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500">
                    <option value="Ar">Ar (Ariary)</option>
                    <option value="EUR">€ (Euro)</option>
                    <option value="USD">$ (Dollar)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantité en stock *</label>
                <input type="number" name="stock" defaultValue={editProduct.stock} required className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button href="/products" variant="secondary">
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

      {/* CATALOGUE DES PRODUITS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Catalogue des produits ({filteredProducts.length})</h2>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <PackageOpen className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-1">Aucun produit trouvé</h3>
            <p className="text-sm text-gray-500 max-w-sm mb-6">
              {searchQuery 
                ? `Aucun résultat ne correspond à "${searchQuery}".` 
                : "Votre catalogue est actuellement vide."}
            </p>
            {!searchQuery && (
              <label htmlFor="product-modal-toggle" className="inline-block cursor-pointer">
                <span className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition whitespace-nowrap">
                  <Plus className="w-4 h-4" />
                  <span>Ajouter un produit</span>
                </span>
              </label>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4">Nom du produit</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Prix Unitaire</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                {filteredProducts.map((product) => {
                  const stock = parseInt(product.stock, 10);
                  
                  let badgeStyle = "bg-green-100 text-green-800";
                  let badgeText = `${stock} en stock`;

                  if (stock === 0) {
                    badgeStyle = "bg-red-100 text-red-800 font-bold";
                    badgeText = "Rupture";
                  } else if (stock <= 5) {
                    badgeStyle = "bg-amber-100 text-amber-800 font-bold";
                    badgeText = `${stock} en stock (Bas)`;
                  }

                  return (
                    <tr key={product.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 font-semibold text-gray-900">{product.name}</td>
                      <td className="p-4 text-gray-500 truncate max-w-xs">{product.description || '-'}</td>
                      <td className="p-4 font-medium text-gray-900">
                        {formatPrice(product.price, product.currency || 'Ar')}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs ${badgeStyle}`}>
                          {badgeText}
                        </span>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end space-x-1">
                          <a 
                            href={`/products?edit=${product.id}`}
                            title="Modifier"
                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition shadow-sm"
                          >
                            <Edit3 className="w-4 h-4" />
                          </a>

                          <DeleteActionButton 
                            itemId={product.id} 
                            itemIdName="productId" 
                            deleteAction={deleteProduct} 
                            confirmMessage={`Voulez-vous vraiment supprimer le produit "${product.name}" ?`} 
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}