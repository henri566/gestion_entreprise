'use client';

export default function DeleteButton({ productId, deleteAction }) {
  return (
    <form 
      action={deleteAction} 
      className="inline-block"
      onSubmit={(e) => {
        if (!confirm("Voulez-vous vraiment supprimer ce produit ?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <button 
        type="submit" 
        className="text-xs font-medium px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded transition"
      >
        Supprimer
      </button>
    </form>
  );
}