'use client';

export default function DeleteProductButton({ productId, deleteAction }) {
  return (
    <form action={deleteAction} className="inline-block">
      <input type="hidden" name="productId" value={productId} />
      <button 
        type="submit" 
        onClick={(e) => {
          if (!confirm("Voulez-vous vraiment supprimer ce produit ?")) {
            e.preventDefault();
          }
        }}
        className="text-xs font-medium px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded transition"
      >
        Supprimer
      </button>
    </form>
  );
}