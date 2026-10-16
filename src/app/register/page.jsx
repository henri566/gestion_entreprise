import pool from '../lib/db';
import { redirect } from 'next/navigation';
import bcrypt from 'bcrypt';

export default function RegisterPage() {
  
  // Action serveur pour traiter l'inscription
  async function handleRegister(formData) {
    'use server';
    
    const companyName = formData.get('companyName');
    const email = formData.get('email');
    const password = formData.get('password');
    const fullName = formData.get('fullName');

    try {
      // 1. Hasher le mot de passe pour la sécurité
      const hashedPassword = await bcrypt.hash(password, 10);

      // 2. Insérer l'entreprise dans la table `companies` et récupérer son ID généré
      const companyResult = await pool.query(
        'INSERT INTO companies (name, email) VALUES ($1, $2) RETURNING id',
        [companyName, email]
      );
      const companyId = companyResult.rows[0].id;

      // 3. Insérer l'utilisateur administrateur lié à cette entreprise dans `users`
      await pool.query(
        'INSERT INTO users (company_id, full_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
        [companyId, fullName, email, hashedPassword, 'admin']
      );

    } catch (err) {
      console.error("Erreur lors de l'inscription :", err.message);
      return;
    }

    // Rediriger vers la page de connexion après une inscription réussie (qu'on va créer juste après)
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md border border-gray-200">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Créer votre compte SaaS
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Configurez votre entreprise et votre accès administrateur
          </p>
        </div>
        
        <form className="mt-8 space-y-4" action={handleRegister}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nom de votre entreprise *</label>
            <input 
              type="text" 
              name="companyName" 
              required 
              className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Ma Société SARL"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Votre Nom complet *</label>
            <input 
              type="text" 
              name="fullName" 
              required 
              className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Jean Dupont"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Adresse Email professionnelle *</label>
            <input 
              type="email" 
              name="email" 
              required 
              className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="contact@masociete.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Mot de passe *</label>
            <input 
              type="password" 
              name="password" 
              required 
              className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium mt-4"
            >
              S'inscrire
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}