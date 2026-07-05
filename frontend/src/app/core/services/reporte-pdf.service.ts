import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class ReportePdfService {

  constructor() { }

  /**
   * Genera y descarga el reporte en PDF del consumo calórico de un paciente.
   */
  exportarReportePaciente(
    pacienteNombre: string,
    planMeta: number,
    tipo: string,
    datos: {
      caloriasTotales: number;
      caloriasMetaPeriodo: number;
      porcentajePeriodo: number;
      alimentos: { fecha: string; fechaFormateada?: string; tipo: string; nombre: string; hora?: string; calorias: number; }[];
    }
  ): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const primaryColor: [number, number, number] = [25, 135, 84];
    const darkColor: [number, number, number]    = [33, 37, 41];
    const greyColor: [number, number, number]    = [100, 100, 100];

    // ── Barra superior verde ──────────────────────────────────
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 12, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('NutriScan', 15, 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Sistema de Nutrición Inteligente', 44, 8);

    // ── Título ────────────────────────────────────────────────
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('REPORTE DE CONSUMO CALÓRICO', 15, 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...greyColor);
    const periodoLabel = tipo === 'dia' ? 'Día Específico' : tipo === 'semana' ? 'Semanal (últimos 7 días)' : 'Mensual';
    doc.text(`Periodo: ${periodoLabel}  •  Generado: ${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}`, 15, 30);

    // ── Línea divisora ────────────────────────────────────────
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(15, 34, 195, 34);

    // ── Info del paciente ─────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text('Información del Paciente', 15, 42);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...darkColor);
    doc.text('Paciente:', 15, 48);
    doc.setFont('helvetica', 'bold');
    doc.text(pacienteNombre, 38, 48);
    doc.setFont('helvetica', 'normal');
    doc.text(`Meta Calórica Diaria: ${planMeta} kcal`, 15, 54);

    // ── Caja de resumen ────────────────────────────────────────
    doc.setFillColor(240, 248, 244);
    doc.setDrawColor(180, 220, 200);
    doc.setLineWidth(0.5);
    doc.rect(115, 38, 80, 24, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.text('RESUMEN DEL PERIODO', 120, 44);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...darkColor);

    doc.text('Total consumido:', 120, 50);
    doc.setFont('helvetica', 'bold');
    doc.text(`${datos.caloriasTotales} kcal`, 160, 50);

    doc.setFont('helvetica', 'normal');
    doc.text('Meta del periodo:', 120, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(`${datos.caloriasMetaPeriodo} kcal`, 160, 55);

    doc.setFont('helvetica', 'normal');
    doc.text('Progreso:', 120, 60);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`${datos.porcentajePeriodo}% de la meta`, 140, 60);

    // ── Título tabla ──────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text('Desglose de Alimentos Consumidos', 15, 73);

    // ── Tabla con autoTable (función directa) ─────────────────
    const tableBody = datos.alimentos.length > 0
      ? datos.alimentos.map(item => [
          item.fechaFormateada || item.fecha,
          item.tipo,
          item.nombre,
          item.hora || '--:--',
          `${item.calorias} kcal`
        ])
      : [['—', '—', 'Sin registros en este periodo', '—', '0 kcal']];

    autoTable(doc, {
      startY: 77,
      head: [['Fecha', 'Tipo de Comida', 'Alimento', 'Hora', 'Calorías']],
      body: tableBody,
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'left'
      },
      bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
      alternateRowStyles: { fillColor: [248, 252, 249] },
      columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 15, right: 15 },
      theme: 'striped'
    });

    // ── Pie de página ─────────────────────────────────────────
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text('Reporte generado por NutriScan • Lleva un estilo de vida saludable.', 15, 285);
      doc.text(`Página ${i} de ${totalPages}`, 183, 285);
    }

    doc.save(`NutriScan_Reporte_${tipo}_${pacienteNombre.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  /**
   * Genera y descarga el reporte general de usuarios para el Administrador.
   */
  exportarReporteGeneralAdmin(usuarios: any[]): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const accentColor: [number, number, number] = [25, 135, 84];
    const darkColor: [number, number, number]   = [33, 37, 41];

    // ── Barra superior verde ──────────────────────────────────
    doc.setFillColor(...accentColor);
    doc.rect(0, 0, 297, 10, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('NutriScan', 15, 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Panel de Administración', 44, 7);

    // ── Título ────────────────────────────────────────────────
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('REPORTE GENERAL DE USUARIOS', 15, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Total de registros: ${usuarios.length}  •  Fecha: ${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      15, 28
    );

    // ── Línea divisora ────────────────────────────────────────
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 32, 282, 32);

    // ── Estadísticas rápidas ──────────────────────────────────
    const pacientes      = usuarios.filter(u => u.rol === 'Paciente').length;
    const nutricionistas = usuarios.filter(u => u.rol === 'Nutricionista').length;
    const admins         = usuarios.filter(u => u.rol === 'Administrador').length;
    const activos        = usuarios.filter(u => u.estado === 'Activo').length;
    const inactivos      = usuarios.length - activos;

    const stats = [
      { label: 'TOTAL',           value: usuarios.length, color: darkColor },
      { label: 'PACIENTES',       value: pacientes,       color: [13, 110, 253] as [number,number,number] },
      { label: 'NUTRICIONISTAS',  value: nutricionistas,  color: accentColor },
      { label: 'ADMINISTRADORES', value: admins,          color: [220, 53, 69] as [number,number,number] },
      { label: 'ACTIVOS',         value: activos,         color: accentColor },
      { label: 'INACTIVOS',       value: inactivos,       color: [108, 117, 125] as [number,number,number] },
    ];

    stats.forEach((stat, i) => {
      const x = 15 + i * 45;
      doc.setFillColor(248, 248, 248);
      doc.rect(x, 36, 42, 14, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...stat.color);
      doc.text(String(stat.value), x + 4, 46);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(130, 130, 130);
      doc.text(stat.label, x + 4, 48);
    });

    // ── Título tabla ──────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...accentColor);
    doc.text('Listado Completo de Usuarios', 15, 60);

    // ── Tabla con autoTable (función directa) ─────────────────
    const tableBody = usuarios.map(u => [
      u.id,
      u.nombre,
      u.email,
      u.identificacion || 'N/A',
      u.genero || 'N/A',
      u.rol,
      u.estado
    ]);

    autoTable(doc, {
      startY: 64,
      head: [['ID', 'Nombre Completo', 'Correo Electrónico', 'Identificación', 'Género', 'Rol', 'Estado']],
      body: tableBody,
      headStyles: {
        fillColor: darkColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'left'
      },
      bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        5: { fontStyle: 'bold' }
      },
      margin: { left: 15, right: 15 },
      theme: 'striped'
    });

    // ── Pie de página ─────────────────────────────────────────
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text('Confidencial — Exclusivo para uso administrativo de NutriScan.', 15, 198);
      doc.text(`Página ${i} de ${totalPages}`, 265, 198);
    }

    doc.save(`NutriScan_Reporte_General_${new Date().toISOString().slice(0, 10)}.pdf`);
  }
}
