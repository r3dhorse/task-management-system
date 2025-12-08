import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { TeamMemberKPI, TeamStats, AdminWorkspace } from "@/features/workspaces/api/use-get-team-overall-kpi";

interface TeamKPIPDFParams {
  members: TeamMemberKPI[];
  teamStats: TeamStats;
  adminWorkspaces: AdminWorkspace[];
  startDate: Date | null;
  endDate: Date | null;
  selectedWorkspaceName?: string;
  generatedBy: string;
}

function getKPIRating(kpiScore: number): string {
  if (kpiScore >= 80) return "Excellent";
  if (kpiScore >= 60) return "Good";
  if (kpiScore >= 40) return "Average";
  return "Needs Improvement";
}

function getKPIColor(kpiScore: number): [number, number, number] {
  if (kpiScore >= 80) return [34, 197, 94]; // green
  if (kpiScore >= 60) return [59, 130, 246]; // blue
  if (kpiScore >= 40) return [245, 158, 11]; // amber
  return [156, 163, 175]; // gray
}

export function generateTeamKPIPDF({
  members,
  teamStats,
  adminWorkspaces,
  startDate,
  endDate,
  selectedWorkspaceName,
  generatedBy,
}: TeamKPIPDFParams): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [79, 70, 229]; // indigo-600
  const secondaryColor: [number, number, number] = [107, 114, 128]; // gray-500
  const lightGray: [number, number, number] = [243, 244, 246]; // gray-100

  // ===== HEADER =====
  // Purple gradient header background
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 45, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Team Overall KPI Report", margin, 22);

  // Subtitle with date range
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  let subtitle = "Performance Report";
  if (startDate && endDate) {
    subtitle = `${format(startDate, "MMM dd, yyyy")} - ${format(endDate, "MMM dd, yyyy")}`;
  } else if (startDate) {
    subtitle = `From ${format(startDate, "MMM dd, yyyy")}`;
  } else if (endDate) {
    subtitle = `Until ${format(endDate, "MMM dd, yyyy")}`;
  } else {
    subtitle = "All Time";
  }
  doc.text(subtitle, margin, 32);

  // Workspace filter info
  if (selectedWorkspaceName) {
    doc.setFontSize(10);
    doc.text(`Workspace: ${selectedWorkspaceName}`, margin, 40);
  }

  yPos = 55;

  // ===== TEAM STATS CARDS =====
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Team Summary", margin, yPos);
  yPos += 8;

  const cardWidth = (pageWidth - margin * 2 - 12) / 5;
  const cardHeight = 30;

  const statsCards = [
    { label: "Team Members", value: teamStats.totalMembers.toString(), color: [99, 102, 241] }, // indigo
    { label: "Average KPI", value: `${teamStats.averageKPI}%`, color: [168, 85, 247] }, // purple
    { label: "High Performers", value: teamStats.highPerformers.toString(), color: [34, 197, 94] }, // green
    { label: "Tasks Completed", value: teamStats.totalCompleted.toString(), color: [59, 130, 246] }, // blue
    { label: "Total Tasks", value: teamStats.totalTasks.toString(), color: [245, 158, 11] }, // amber
  ];

  statsCards.forEach((card, index) => {
    const xPos = margin + index * (cardWidth + 3);

    // Card background
    doc.setFillColor(card.color[0], card.color[1], card.color[2]);
    doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 3, 3, "F");

    // Value
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(card.value, xPos + cardWidth / 2, yPos + 13, { align: "center" });

    // Label
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(card.label, xPos + cardWidth / 2, yPos + 22, { align: "center" });
  });

  yPos += cardHeight + 15;

  // ===== TEAM PERFORMANCE TABLE =====
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Team Performance Rankings", margin, yPos);
  yPos += 5;

  // Table data
  const tableData = members.map((member, index) => [
    (index + 1).toString(),
    member.userName,
    member.workspaceCount.toString(),
    `${member.totalCompletedAcrossWorkspaces}/${member.totalTasksAcrossWorkspaces}`,
    `${member.overallKPI}%`,
    getKPIRating(member.overallKPI),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Rank", "Member Name", "Workspaces", "Tasks", "KPI Score", "Rating"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      1: { cellWidth: 50, halign: "left" },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 30, halign: "center" },
      4: { cellWidth: 25, halign: "center" },
      5: { cellWidth: 35, halign: "center" },
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    margin: { left: margin, right: margin },
    didDrawCell: (data) => {
      // Color the KPI score cell based on value
      if (data.column.index === 4 && data.section === "body") {
        const kpiValue = parseInt(data.cell.text[0]);
        if (!isNaN(kpiValue)) {
          const color = getKPIColor(kpiValue);
          doc.setTextColor(color[0], color[1], color[2]);
        }
      }
      // Color the rating cell
      if (data.column.index === 5 && data.section === "body") {
        const rating = data.cell.text[0];
        if (rating === "Excellent") {
          doc.setTextColor(34, 197, 94);
        } else if (rating === "Good") {
          doc.setTextColor(59, 130, 246);
        } else if (rating === "Average") {
          doc.setTextColor(245, 158, 11);
        } else {
          doc.setTextColor(156, 163, 175);
        }
      }
    },
  });

  // ===== DOCUMENT FOOTER =====
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDoc = doc as any;
  const totalPages = pdfDoc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdfDoc.setPage(i);

    // Footer line
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    // Generated info
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...secondaryColor);
    doc.text(
      `Generated by ${generatedBy} on ${format(new Date(), "MMM dd, yyyy 'at' hh:mm a")}`,
      margin,
      pageHeight - 8
    );

    // Page number
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: "right" }
    );
  }

  // ===== DOWNLOAD =====
  const fileName = `Team_KPI_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}
