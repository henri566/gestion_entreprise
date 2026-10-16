'use client';

import { Trash2 } from 'lucide-react';

export default function DeleteInvoiceButton({ invoiceId, deleteAction }) {
  return (
    <form 
      action={deleteAction} 
      className="inline-block"
      onSubmit={(e) => {
        if (!confirm("Voulez-vous vraiment supprimer cette facture ?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <button 
        type="submit" 
        title="Supprimer"
        className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition shadow-sm"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </form>
  );
}