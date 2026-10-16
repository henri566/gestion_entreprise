'use client';

import { useState, useTransition } from 'react';
import { Trash2, CheckCircle2 } from 'lucide-react';

export default function DeleteActionButton({ itemId, itemIdName = 'id', deleteAction, confirmMessage = 'Voulez-vous vraiment supprimer cet élément ?' }) {
  const [isPending, startTransition] = useTransition();
  const [showToast, setShowToast] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (window.confirm(confirmMessage)) {
      const formData = new FormData();
      formData.append(itemIdName, itemId);

      startTransition(async () => {
        await deleteAction(formData);
        
        // Afficher le toast de succès
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 3000);
      });
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="inline-block">
        <button
          type="submit"
          disabled={isPending}
          title="Supprimer"
          className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition shadow-sm disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </form>

      {/* TOAST DE CONFIRMATION / SUCCÈS */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-gray-800 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-sm font-medium">Élément supprimé avec succès ✓</span>
        </div>
      )}
    </>
  );
}