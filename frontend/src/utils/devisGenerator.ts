import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { numberToFrenchWords } from './numberToFrenchWords';

export interface DevisData {
  patientFullName: string;
  medecinTraitant: string;
  pathologie: string;
  numeroDevis: string;
  seances: {
    numero: number;
    dateHeureStr: string;
  }[];
  prixUnitaire: number;
}

export function generateDevisPDF(data: DevisData) {
  if (!data.seances || data.seances.length === 0) {
    throw new Error("Impossible de générer un devis sans aucune séance. Veuillez ajouter des séances.");
  }
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Polices
  doc.setFont('helvetica');

  // 1. Titre Principal (Bleu et centré)
  doc.setFontSize(14);
  doc.setTextColor(30, 100, 180); // Bleu style "Word"
  doc.setFont('helvetica', 'bold');
  doc.text('CENTRE SAOUFI DE REEDUCATION FONCTIONNELLE', pageWidth / 2, 25, { align: 'center' });

  // 2. Coordonnées à gauche
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0); // Noir
  doc.setFont('helvetica', 'normal');
  
  const startX = 20;
  let currentY = 45;

  doc.text('Kinésithérapeute : MABROUK Manal', startX, currentY);
  currentY += 8;
  doc.text('05 AV Elarrar QU Nahda Safi, 46300', startX, currentY);
  currentY += 8;
  
  // Mail en bleu souligné (simulé)
  doc.text('Mail : ', startX, currentY);
  doc.setTextColor(30, 100, 180);
  doc.text('Centre.saoufi@gmail.com', startX + 10, currentY);
  doc.setTextColor(0, 0, 0);
  currentY += 8;

  doc.text('N°tel : 0700752545', startX, currentY);
  currentY += 15;

  // 3. Numéro de devis (Centré)
  doc.setFont('helvetica', 'bold');
  doc.text(`Devis N° ${data.numeroDevis}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  // 4. Informations du patient
  doc.setFont('helvetica', 'normal');
  doc.text(`Patient(e) : ${data.patientFullName.toUpperCase()}`, startX, currentY);
  currentY += 8;
  doc.text(`Médecin traitant : ${data.medecinTraitant}`, startX, currentY);
  currentY += 8;
  doc.text(`Pathologie : ${data.pathologie}`, startX, currentY);
  currentY += 8;

  const totalSeances = data.seances.length;
  // Date de début basée sur la première séance saisie
  let dateDebut = '';
  if (totalSeances > 0 && data.seances[0].dateHeureStr) {
    // on extrait juste la partie avant un éventuel espace (l'heure)
    dateDebut = data.seances[0].dateHeureStr.split(' ')[0];
  }

  doc.text(`Nombre de séances : ${totalSeances} séances du ${dateDebut}`, startX, currentY);
  currentY += 10;

  // 5. Tableau des séances
  const tableBody = data.seances.map((seance) => {
    const numStr = seance.numero === 1 ? '1 ère' : `${seance.numero} ème`;
    const dateStr = seance.dateHeureStr || 'À définir';
    const prixStr = data.prixUnitaire.toFixed(2).replace('.', ',');
    return [numStr, dateStr, prixStr];
  });

  const totalTTC = totalSeances * data.prixUnitaire;
  const totalStr = totalTTC.toFixed(2).replace('.', ',');

  // Ajout de la ligne totale à la fin
  tableBody.push(['', 'Total TTC', totalStr]);

  autoTable(doc, {
    startY: currentY,
    head: [['Nombre de séances', 'Date / Heure', 'Prix TTC']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      fontStyle: 'bold'
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 60 },
      2: { cellWidth: 40 }
    },
    margin: { left: startX },
    didParseCell: function (data) {
      // Mettre en gras la ligne de Total
      if (data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // @ts-ignore - Le type finalY existe sur autoTable
  currentY = doc.lastAutoTable.finalY + 10;

  // 6. Phrase finale
  doc.setFont('helvetica', 'normal');
  const phrase = 'Ce devis est arrêté à la somme de :';
  const sommeLettres = `${numberToFrenchWords(totalTTC)} dirhams TTC.`;
  
  doc.text(phrase, pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;
  doc.text(sommeLettres, pageWidth / 2, currentY, { align: 'center' });

  // 7. Footer (très bas)
  doc.setFontSize(8);
  const footerY = 280;
  doc.text('N° 05 AV Elaarar QU Nahda Safi (en face pharmacie safia)', startX, footerY);
  doc.text('Tel : 0700752545 - N° patente : 50901899 - IF : 52576609 - ICE : 003119087000051', startX, footerY + 5);

  // 8. Ouverture du PDF
  // 8. Ouverture du PDF
  
  const blobUrl = doc.output('bloburl');
  window.open(blobUrl, '_blank');
}
