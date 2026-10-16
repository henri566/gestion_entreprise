import pool from '../lib/db';

export default async function TestDbPage() {
  let dbStatus = "Non connecté";
  let dbTime = null;

  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    dbTime = res.rows[0].now;
    dbStatus = "Connecté avec succès à PostgreSQL ! 🎉";
    client.release();
  } catch (err) {
    dbStatus = `Erreur de connexion : ${err.message}`;
  }

  return (
    <div className="p-8 max-w-xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-4">Test de connexion Base de Données</h1>
      <div className="p-4 rounded-lg bg-gray-100 border border-gray-300">
        <p className="text-lg font-medium">{dbStatus}</p>
        {dbTime && (
          <p className="mt-2 text-sm text-gray-600">
            Heure du serveur PostgreSQL : {dbTime.toString()}
          </p>
        )}
      </div>
    </div>
  );
}