import { NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { cookies } from 'next/headers';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const companyIdCookie = cookieStore.get('company_id');
    const company_id = companyIdCookie ? parseInt(companyIdCookie.value, 10) : null;

    if (!company_id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const companyRes = await pool.query('SELECT * FROM companies WHERE id = $1', [company_id]);
    const company = companyRes.rows[0] || { name: 'Mon Entreprise' };

    const invoiceRes = await pool.query(`
      SELECT invoices.*, clients.name as client_name, clients.email as client_email, clients.address as client_address
      FROM invoices
      LEFT JOIN clients ON invoices.client_id = clients.id
      WHERE invoices.id = $1 AND invoices.company_id = $2
    `, [id, company_id]);

    if (invoiceRes.rows.length === 0) {
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }

    const invoice = invoiceRes.rows[0];
    const currency = invoice.currency || 'Ar';
    const paymentMethod = invoice.payment_method || 'Mvola';

    // Génération PDF
    const doc = new jsPDF();

    // En-tête
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text(company.name, 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Facture officielle - SaaS ERP", 14, 26);

    // Infos facture à droite
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`FACTURE : ${invoice.invoice_number}`, 196, 20, { align: 'right' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date : ${new Date(invoice.created_at).toLocaleDateString()}`, 196, 26, { align: 'right' });
    doc.text(`Échéance : ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}`, 196, 32, { align: 'right' });
    doc.text(`Statut : ${invoice.status.toUpperCase()}`, 196, 38, { align: 'right' });

    doc.setDrawColor(220, 220, 220);
    doc.line(14, 45, 196, 45);

    // Client
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text("FACTURÉ À :", 14, 55);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(invoice.client_name || 'Client divers', 14, 62);
    doc.text(invoice.client_email || '', 14, 68);
    doc.text(invoice.client_address || '', 14, 74);

    // Tableau
    doc.autoTable({
      startY: 85,
      head: [['Désignation', 'Statut', `Montant (${currency})`]],
      body: [
        [`Facture N° ${invoice.invoice_number}`, invoice.status, `${parseFloat(invoice.total_amount).toFixed(2)} ${currency}`]
      ],
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 10, cellPadding: 6 },
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`TOTAL À PAYER : ${parseFloat(invoice.total_amount).toFixed(2)} ${currency}`, 196, finalY, { align: 'right' });

    // Section Paiement Mobile / Instructions
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(`Instructions de Paiement (${paymentMethod}) :`, 14, finalY + 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    if (paymentMethod === 'Mvola') {
      doc.text("Veuillez effectuer le transfert Mvola au : +261 38 00 000 00", 14, finalY + 22);
    } else if (paymentMethod === 'Orange Money') {
      doc.text("Veuillez effectuer le transfert Orange Money au : +261 32 00 000 00", 14, finalY + 22);
    } else if (paymentMethod === 'Airtel Money') {
      doc.text("Veuillez effectuer le transfert Airtel Money au : +261 33 00 000 00", 14, finalY + 22);
    } else {
      doc.text("Veuillez effectuer le règlement par virement bancaire ou espèces.", 14, finalY + 22);
    }

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Merci pour votre confiance !", 105, 280, { align: 'center' });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="facture_${invoice.invoice_number}.pdf"`,
      },
    });

  } catch (err) {
    console.error("Erreur PDF:", err);
    return NextResponse.json({ error: "Erreur génération PDF" }, { status: 500 });
  }
}