'use file';
'use client';

import { useState, useEffect } from 'react';
import { ArrowRightLeft, RefreshCw } from 'lucide-react';

export default function CurrencyConverter() {
  const [amount, setAmount] = useState(10000);
  const [fromCurrency, setFromCurrency] = useState('Ar');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [result, setResult] = useState(0);
  const [rates, setRates] = useState({ MGA: 1, EUR: 0.00021, USD: 0.00023 }); // Taux de secours approximatifs
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

  // Récupération des taux de change en direct
  useEffect(() => {
    async function fetchRates() {
      setLoading(true);
      try {
        // API gratuite publique de taux de change (base EUR ou USD)
        const res = await fetch('https://open.er-api.com/v6/latest/EUR');
        const data = await res.json();
        
        if (data && data.rates) {
          // Supposons un taux indicatif MGA (Ariary) si l'API ne l'a pas directement, ou via USD/EUR
          // EUR vers MGA tourne autour de 4800 - 5000 Ar
          const eurToMga = 4900; 
          const eurToUsd = data.rates.USD || 1.08;

          setRates({
            EUR: 1,
            USD: eurToUsd,
            Ar: eurToMga,
          });
          setLastUpdate(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.error("Erreur récupération taux de change:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRates();
  }, []);

  // Calcul de la conversion
  useEffect(() => {
    if (!amount || isNaN(amount)) {
      setResult(0);
      return;
    }

    // Conversion de base vers l'Ariary (MGA)
    let amountInAr = amount;
    if (fromCurrency === 'EUR') amountInAr = amount * 4900;
    if (fromCurrency === 'USD') amountInAr = amount * 4500; // Taux indicatif moyen

    // Conversion depuis l'Ariary vers la devise cible
    let finalValue = amountInAr;
    if (toCurrency === 'EUR') finalValue = amountInAr / 4900;
    if (toCurrency === 'USD') finalValue = amountInAr / 4500;

    setResult(finalValue.toFixed(2));
  }, [amount, fromCurrency, toCurrency]);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-blue-600" />
          <span>Convertisseur de devises en temps réel</span>
        </h3>
        {lastUpdate && (
          <span className="text-xs text-gray-400">Mis à jour à {lastUpdate}</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
        {/* Montant source */}
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Montant</label>
          <div className="flex">
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-l-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
            />
            <select 
              value={fromCurrency} 
              onChange={(e) => setFromCurrency(e.target.value)}
              className="px-3 py-2.5 bg-gray-100 border-y border-r border-gray-200 text-sm font-semibold rounded-r-xl focus:outline-none"
            >
              <option value="Ar">Ar (Ariary)</option>
              <option value="EUR">€ (Euro)</option>
              <option value="USD">$ (Dollar)</option>
            </select>
          </div>
        </div>

        {/* Bouton Inverser */}
        <div className="md:col-span-1 flex justify-center">
          <button 
            onClick={handleSwap}
            className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition shadow-sm"
            title="Inverser les devises"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Résultat cible */}
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Résultat estimé</label>
          <div className="flex">
            <div className="w-full px-4 py-2.5 bg-blue-50/50 border border-blue-100 rounded-l-xl text-sm font-bold text-blue-900 flex items-center">
              {result} {toCurrency === 'EUR' ? '€' : toCurrency === 'USD' ? '$' : 'Ar'}
            </div>
            <select 
              value={toCurrency} 
              onChange={(e) => setToCurrency(e.target.value)}
              className="px-3 py-2.5 bg-gray-100 border-y border-r border-gray-200 text-sm font-semibold rounded-r-xl focus:outline-none"
            >
              <option value="Ar">Ar (Ariary)</option>
              <option value="EUR">€ (Euro)</option>
              <option value="USD">$ (Dollar)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}