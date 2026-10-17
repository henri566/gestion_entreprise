import pool from '@/lib/db';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';

export default function LoginPage() {

  async function handleLogin(formData) {
    'use server';
    
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      // 1. Rechercher l'utilisateur par son email
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      
      if (result.rows.length === 0) {
        console.error("Utilisateur non trouvé pour l'email :", email);
        return; // Ici vous pouvez gérer l'affichage d'un message d'erreur
      }

      const user = result.rows[0];

      // 2. Vérifier le mot de passe
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        console.error("Mot de passe incorrect");
        return;
      }

      // 3. Stocker le company_id dans un cookie sécurisé
      const cookieStore = await cookies();
      cookieStore.set('company_id', user.company_id.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 semaine
        path: '/',
      });

    } catch (err) {
      console.error("Erreur critique lors de la connexion :", err.message);
      return;
    }

    // 4. Redirection vers les clients après succès
    redirect('/clients');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md border border-gray-200">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Connexion à votre espace
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Accédez à votre ERP / SaaS multi-tenant
          </p>
        </div>
        
        <form className="mt-8 space-y-4" action={handleLogin}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Adresse Email *</label>
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
              Se connecter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}