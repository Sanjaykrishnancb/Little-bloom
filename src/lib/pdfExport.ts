import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, differenceInMonths } from 'date-fns';
import type { 
  Baby, 
  DoctorVisit, 
  Medicine, 
  Vaccine, 
  Milestone, 
  GrowthRecord, 
  VisitQuestion, 
  TeethBrushingLog 
} from '../db';

export const exportBabyJournalToPDF = async (
  baby: Baby,
  records: {
    doctorVisits: DoctorVisit[];
    medicines: Medicine[];
    vaccines: Vaccine[];
    milestones: Milestone[];
    growthRecords: GrowthRecord[];
    visitQuestions: VisitQuestion[];
    teethBrushingLogs: TeethBrushingLog[];
  }
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Palette matched with src/index.css
  const primaryColor: [number, number, number] = [127, 181, 173]; // #7FB5AD - theme-teal
  const secondaryColor: [number, number, number] = [230, 126, 110]; // #E67E6E - theme-salmon
  const darkTextColor: [number, number, number] = [44, 49, 56]; // #2C3138 - theme-heading
  const mutedTextColor: [number, number, number] = [138, 145, 155]; // #8A919B - theme-muted
  const lightBgColor: [number, number, number] = [244, 247, 246]; // #F4F7F6 - theme-bg

  // Helper to draw a header on each page
  const drawPageHeadersAndFooters = (pdf: jsPDF) => {
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      // We don't draw standard header on cover page
      if (i > 1) {
        // Subtle top line
        pdf.setDrawColor(220, 227, 225);
        pdf.setLineWidth(0.3);
        pdf.line(15, 15, 195, 15);
        
        // Running Header Text
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
        pdf.text(`${baby.name}'s Health & Growth Report`, 15, 11);
        pdf.text(`Journal Report`, 195, 11, { align: 'right' });
      }

      // Footer - on all pages
      pdf.setDrawColor(220, 227, 225);
      pdf.setLineWidth(0.3);
      pdf.line(15, 282, 195, 282);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
      const exportTime = format(new Date(), 'PPpp');
      pdf.text(`Generated on ${exportTime}`, 15, 287);
      pdf.text(`Page ${i} of ${pageCount}`, 195, 287, { align: 'right' });
    }
  };

  // ----- PAGE 1: COVER PAGE -----
  let y = 40;

  // Title Banner Card
  doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
  doc.roundedRect(15, y, 180, 85, 4, 4, 'F');

  // Decorative Baby Emoji
  doc.setFontSize(48);
  doc.text('👶', 105, y + 25, { align: 'center' });

  // Main Report Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('BABY DEVELOPMENT JOURNAL', 105, y + 45, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('Comprehensive Health & Milestone Report', 105, y + 55, { align: 'center' });

  // Accent Line
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setLineWidth(1);
  doc.line(75, y + 65, 135, y + 65);

  // Baby Summary Stats Info Box
  y = y + 100;
  
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('Child Profile Summary', 15, y + 10);

  // Stats Table / Details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  
  const formattedDob = format(new Date(baby.dob), 'MMMM do, yyyy');
  const ageMonths = differenceInMonths(new Date(), new Date(baby.dob));
  const genderCapitalized = baby.gender.charAt(0).toUpperCase() + baby.gender.slice(1);

  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(`Full Name:`, 20, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.text(`${baby.name}`, 60, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.text(`Date of Birth:`, 20, y + 30);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formattedDob}`, 60, y + 30);

  doc.setFont('helvetica', 'normal');
  doc.text(`Current Age:`, 20, y + 38);
  doc.setFont('helvetica', 'bold');
  doc.text(`${ageMonths} ${ageMonths === 1 ? 'month' : 'months'} old`, 60, y + 38);

  doc.setFont('helvetica', 'normal');
  doc.text(`Gender:`, 20, y + 46);
  doc.setFont('helvetica', 'bold');
  doc.text(`${genderCapitalized}`, 60, y + 46);

  // Growth Summary
  const lastGrowth = records.growthRecords[records.growthRecords.length - 1];
  if (lastGrowth) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Last Logged Weight:`, 20, y + 54);
    doc.setFont('helvetica', 'bold');
    doc.text(`${lastGrowth.weight} kg`, 60, y + 54);

    doc.setFont('helvetica', 'normal');
    doc.text(`Last Logged Height:`, 20, y + 62);
    doc.setFont('helvetica', 'bold');
    doc.text(`${lastGrowth.height} cm`, 60, y + 62);
  }

  // Cover Page Footer Note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text('This document contains personal health profiles, logs, immunization milestones,\nand pediatric feedback logged in the Baby Journal application.', 105, y + 80, { align: 'center' });

  // Add a new page
  doc.addPage();
  
  // ----- PAGE 2: CLINICAL / PEDIATRIC & MEDICATION PROFILE -----
  y = 25;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Medications & Vaccines Status', 15, y);

  // Active Medications
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('Active & Scheduled Medicines', 15, y);

  const medRows = records.medicines.map((m) => [
    m.name,
    m.dosage,
    m.frequency,
    format(new Date(m.startDate), 'yyyy-MM-dd'),
    m.reminders && m.reminders.length > 0 ? m.reminders.join(', ') : 'As needed',
    m.isActive ? 'Active' : 'Inactive'
  ]);

  autoTable(doc, {
    startY: y + 3,
    head: [['Medicine Name', 'Dosage', 'Frequency', 'Start Date', 'Alarms', 'Status']],
    body: medRows.length > 0 ? medRows : [['No medicines scheduled', '', '', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 15, right: 15 }
  });

  // Vaccines Inventory Schedule
  y = (doc as any).lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('Immunizations Summary', 15, y);

  const vaxRows = records.vaccines.map(v => [
    v.name,
    format(new Date(v.dueDate), 'yyyy-MM-dd'),
    v.completedDate ? format(new Date(v.completedDate), 'yyyy-MM-dd') : '-',
    v.status.toUpperCase()
  ]);

  autoTable(doc, {
    startY: y + 3,
    head: [['Vaccine Name', 'Due Date', 'Administered Date', 'Status']],
    body: vaxRows.length > 0 ? vaxRows : [['No vaccination schedules logged', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: secondaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      3: { fontStyle: 'bold' }
    },
    margin: { left: 15, right: 15 }
  });

  // ----- PAGE 3: PEDIATRICIAN VISITS & VISIT PREP QUESTIONS -----
  doc.addPage();
  y = 25;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Pediatric Consultations & Prep Questions', 15, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('Doctor Visits & Consultations', 15, y);

  const visitRows = records.doctorVisits.map(v => [
    format(new Date(v.date), 'yyyy-MM-dd'),
    v.doctorName,
    v.symptoms || '-',
    v.advice || '-',
    v.followUpDate ? format(new Date(v.followUpDate), 'yyyy-MM-dd') : '-'
  ]);

  autoTable(doc, {
    startY: y + 3,
    head: [['Date', 'Pediatrician', 'Symptoms Discussed', 'Doctor Advice', 'Follow Up']],
    body: visitRows.length > 0 ? visitRows : [['No doctor visits logged', '', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 15, right: 15 }
  });

  // Visit Preparation Questions
  y = (doc as any).lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('Doctor Visit Preparation Questions', 15, y);

  const questionRows = records.visitQuestions.map(q => [
    q.question,
    q.category,
    q.isAnswered ? 'Answered' : 'Pending',
    q.notes || '-'
  ]);

  autoTable(doc, {
    startY: y + 3,
    head: [['Question', 'Category', 'Status', 'Doctor Answers / Notes']],
    body: questionRows.length > 0 ? questionRows : [['No preparation questions logged', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: secondaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 15, right: 15 }
  });

  // ----- PAGE 4: DEVELOPMENT, GROWTH & ROUTINE SUMMARY -----
  doc.addPage();
  y = 25;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Growth Records & Developmental Milestones', 15, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('Growth Tracking Log', 15, y);

  const growthRows = records.growthRecords.map(g => [
    format(new Date(g.date), 'yyyy-MM-dd'),
    `${g.weight} kg`,
    `${g.height} cm`
  ]);

  autoTable(doc, {
    startY: y + 3,
    head: [['Date', 'Weight (kg)', 'Height (cm)']],
    body: growthRows.length > 0 ? growthRows : [['No growth records logged', '', '']],
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 15, right: 15 }
  });

  // Milestone Achievements
  y = (doc as any).lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('Developmental Milestones Achieved', 15, y);

  const milestoneRows = records.milestones.map(m => [
    format(new Date(m.date), 'yyyy-MM-dd'),
    m.title,
    m.description || '-'
  ]);

  autoTable(doc, {
    startY: y + 3,
    head: [['Achievement Date', 'Milestone Standard', 'Description notes']],
    body: milestoneRows.length > 0 ? milestoneRows : [['No milestones completed yet', '', '']],
    theme: 'striped',
    headStyles: { fillColor: secondaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 15, right: 15 }
  });

  // Daily Routine Tracker Summary (Teeth Brushing Routine)
  y = (doc as any).lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('Teeth Brushing Routine Summary', 15, y);

  const morningLogCount = records.teethBrushingLogs.filter(l => l.timeOfDay === 'morning').length;
  const eveningLogCount = records.teethBrushingLogs.filter(l => l.timeOfDay === 'evening').length;
  const totalLogs = records.teethBrushingLogs.length;

  const routineRows = [
    ['Morning Brushing Sessions Logged', `${morningLogCount} sessions`],
    ['Evening Brushing Sessions Logged', `${eveningLogCount} sessions`],
    ['Total Brushing Completed Count', `${totalLogs} times`],
  ];

  autoTable(doc, {
    startY: y + 3,
    head: [['Routine Tracker Metric', 'Total Completion']],
    body: routineRows,
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 15, right: 15 }
  });

  // Dynamically add page headers, footers and page numbering to all pages
  drawPageHeadersAndFooters(doc);

  // Save the PDF
  const filename = `${baby.name.toLowerCase().replace(/\s+/g, '_')}_health_status_report.pdf`;
  doc.save(filename);
};
