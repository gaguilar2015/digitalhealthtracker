import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export async function exportGanttAsPng(elementId: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Gantt element not found');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const link = document.createElement('a');
  link.download = `Gantt_${format(new Date(), 'yyyy-MM-dd')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function exportGanttAsPdf(elementId: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Gantt element not found');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Use landscape orientation, scale to fit page width
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [imgWidth / 2, imgHeight / 2],
  });

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth / 2, imgHeight / 2);
  pdf.save(`Gantt_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
