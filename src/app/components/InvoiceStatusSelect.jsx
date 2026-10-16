'use client';

import { useState, useTransition } from 'react';

export default function InvoiceStatusSelect({ invoiceId, initialStatus, dueDate, updateStatusAction }) {
  // Calcul automatique du retard si la facture n'est pas payée et que la date d'échéance est dépassée
  const isOverdue = initialStatus !== 'Payée' && dueDate && new Date(dueDate) < new Date();
  const effectiveStatus = isOverdue ? 'En retard' : initialStatus;

  const [status, setStatus] = useState(effectiveStatus);
  const [isPending, startTransition] = useTransition();
  const [showNotification, setShowNotification] = useState(false);

  const handleChange = (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('invoiceId', invoiceId);
      formData.append('status', newStatus);

      await updateStatusAction(formData);
      
      setShowNotification(true);
      setTimeout(() => {
        setShowNotification(false);
      }, 2000);
    });
  };

  // Styles dynamiques des badges de statut
  let badgeStyle = "bg-amber-100 text-amber-800 border-amber-200"; // En attente
  if (status === 'Payée') badgeStyle = "bg-green-100 text-green-800 border-green-200";
  if (status === 'En retard') badgeStyle = "bg-red-100 text-red-800 border-red-200 font-bold animate-pulse";
  if (status === 'Annulée') badgeStyle = "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <div className="relative inline-flex items-center gap-2">
      <select
        value={status}
        onChange={handleChange}
        disabled={isPending}
        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer ${badgeStyle}`}
      >
        <option value="En attente">En attente</option>
        <option value="Payée">Payée</option>
        <option value="En retard">En retard</option>
        <option value="Annulée">Annulée</option>
      </select>

      {showNotification && (
        <span className="absolute -right-32 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md shadow-md animate-fade-in whitespace-nowrap">
          Statut mis à jour ✓
        </span>
      )}
    </div>
  );
}