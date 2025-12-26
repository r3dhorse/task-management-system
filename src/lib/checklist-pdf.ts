import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { TaskChecklistItem, TaskChecklistSection } from "@/features/checklists/types";

interface ChecklistPDFParams {
  taskNumber: string;
  taskName: string;
  sections: TaskChecklistSection[];
}

type StatusColorMap = {
  passed: [number, number, number];
  failed: [number, number, number];
  pending: [number, number, number];
};

const STATUS_COLORS: StatusColorMap = {
  passed: [34, 197, 94],   // green-500
  failed: [239, 68, 68],   // red-500
  pending: [156, 163, 175], // gray-400
};

const STATUS_BG_COLORS: StatusColorMap = {
  passed: [220, 252, 231], // green-100
  failed: [254, 226, 226], // red-100
  pending: [243, 244, 246], // gray-100
};

function getStatusLabel(status: string): string {
  switch (status) {
    case 'passed':
      return 'PASSED';
    case 'failed':
      return 'FAILED';
    default:
      return 'PENDING';
  }
}

// Helper type for row data
interface RowData {
  type: 'section' | 'item';
  sectionName?: string;
  sectionIndex?: number;
  item?: TaskChecklistItem;
  itemIndex?: number;
}

export async function generateChecklistPDF({
  taskNumber,
  taskName,
  sections,
}: ChecklistPDFParams): Promise<void> {
  try {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // ============================================================================
    // HEADER (Compact)
    // ============================================================================

    // Header background
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.rect(0, 0, pageWidth, 22, "F");

    // Title and task info on same line
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Checklist Report", margin, 10);

    // Task info
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const taskInfo = `${taskNumber} - ${taskName}`;
    doc.text(taskInfo, margin, 17);

    // Generated date on right
    const dateText = format(new Date(), "MMM dd, yyyy 'at' hh:mm a");
    doc.text(dateText, pageWidth - margin, 10, { align: "right" });

    yPos = 30;

    // ============================================================================
    // CHECKLIST ITEMS TABLE WITH SECTIONS, PHOTOS AND REMARKS
    // ============================================================================

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Checklist Items", margin, yPos);
    yPos += 8;

    // Sort sections by order
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);

    // Photo size: smaller to fit in cell properly
    const photoSize = 20;
    const photoCellWidth = 25;
    const photoRowHeight = photoSize + 8;
    const defaultRowHeight = 12;
    const sectionRowHeight = 10;

    // Build table data with section headers and items
    const tableBody: (string[])[] = [];
    const rowDataRef: RowData[] = [];

    sortedSections.forEach((section, sectionIndex) => {
      // Add section header row - section name will be drawn manually spanning all columns
      tableBody.push(["", "", "", "", ""]);
      rowDataRef.push({
        type: 'section',
        sectionName: section.name,
        sectionIndex,
      });

      // Sort items by order and add them
      const sortedItems = [...section.items].sort((a, b) => a.order - b.order);
      sortedItems.forEach((item, itemIndex) => {
        tableBody.push([
          `${itemIndex + 1}`,
          item.title,
          "", // Status - drawn with badge styling
          "", // Photo placeholder
          item.remarks || "-",
        ]);
        rowDataRef.push({
          type: 'item',
          item,
          itemIndex,
          sectionIndex,
        });
      });
    });

    autoTable(doc, {
      startY: yPos,
      head: [["No.", "Item", "Status", "Photo", "Remarks"]],
      body: tableBody,
      theme: "grid",
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
        valign: "middle",
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2,
        valign: "middle",
      },
      columnStyles: {
        0: { cellWidth: 12, halign: "center", valign: "middle" },
        1: { cellWidth: 70, valign: "middle" },
        2: { cellWidth: 20, halign: "center", valign: "middle" },
        3: { cellWidth: photoCellWidth, halign: "center", valign: "middle" },
        4: { cellWidth: "auto", fontSize: 8, valign: "middle" },
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      margin: { left: margin, right: margin, bottom: 20 },
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      pageBreak: 'auto',
      didParseCell: (data) => {
        if (data.section === "body") {
          const rowIndex = data.row.index;
          const rowData = rowDataRef[rowIndex];

          if (rowData?.type === 'section') {
            // Section header row styling
            data.cell.styles.minCellHeight = sectionRowHeight;
            data.cell.styles.fillColor = [229, 231, 235]; // gray-200
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 9;
            data.cell.styles.textColor = [55, 65, 81]; // gray-700

            // First column spans all for section header
            if (data.column.index === 0) {
              data.cell.styles.cellWidth = 'auto';
            }
          } else if (rowData?.type === 'item') {
            // Item row styling
            const item = rowData.item;
            if (item?.photoUrl) {
              data.cell.styles.minCellHeight = photoRowHeight;
            } else {
              data.cell.styles.minCellHeight = defaultRowHeight;
            }
          }
        }
      },
      didDrawCell: (data) => {
        const cell = data.cell;
        if (!cell ||
            typeof cell.x !== 'number' || isNaN(cell.x) ||
            typeof cell.y !== 'number' || isNaN(cell.y) ||
            typeof cell.width !== 'number' || isNaN(cell.width) ||
            typeof cell.height !== 'number' || isNaN(cell.height)) return;

        if (data.section !== "body") return;

        const rowIndex = data.row.index;
        if (rowIndex < 0 || rowIndex >= rowDataRef.length) return;

        const rowData = rowDataRef[rowIndex];
        if (!rowData) return;

        // Handle section header row - draw section name in Item column (wider)
        if (rowData.type === 'section') {
          // Only draw in the Item column (index 1)
          if (data.column.index === 1) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(55, 65, 81); // gray-700
            const sectionTextX = cell.x + 3;
            const sectionTextY = cell.y + cell.height / 2 + 1.5;
            if (!isNaN(sectionTextX) && !isNaN(sectionTextY) && rowData.sectionName) {
              doc.text(rowData.sectionName, sectionTextX, sectionTextY);
            }
          }
          return;
        }

        // Handle item rows
        if (rowData.type === 'item') {
          const item = rowData.item;
          if (!item) return;

          // Draw status badge in status column
          if (data.column.index === 2) {
            const statusLabel = getStatusLabel(item.status);
            let bgColor: [number, number, number];
            let textColor: [number, number, number];

            if (item.status === "passed") {
              bgColor = STATUS_BG_COLORS.passed;
              textColor = STATUS_COLORS.passed;
            } else if (item.status === "failed") {
              bgColor = STATUS_BG_COLORS.failed;
              textColor = STATUS_COLORS.failed;
            } else {
              bgColor = STATUS_BG_COLORS.pending;
              textColor = STATUS_COLORS.pending;
            }

            // Draw colored badge background
            const badgeWidth = 18;
            const badgeHeight = 7;
            const badgeX = cell.x + (cell.width - badgeWidth) / 2;
            const badgeY = cell.y + (cell.height - badgeHeight) / 2;

            doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
            doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, "F");

            // Draw status text
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            doc.setFontSize(6);
            doc.setFont("helvetica", "bold");
            const statusTextX = cell.x + cell.width / 2;
            const statusTextY = cell.y + cell.height / 2 + 1;
            if (!isNaN(statusTextX) && !isNaN(statusTextY)) {
              doc.text(statusLabel, statusTextX, statusTextY, { align: "center" });
            }
          }

          // Draw photo in photo column
          if (data.column.index === 3) {
            if (item?.photoUrl && typeof item.photoUrl === 'string' && item.photoUrl.startsWith("data:")) {
              try {
                const padding = 2;
                const availableWidth = cell.width - (padding * 2);
                const availableHeight = cell.height - (padding * 2);
                const fitSize = Math.min(availableWidth, availableHeight, photoSize);

                const photoX = cell.x + (cell.width - fitSize) / 2;
                const photoY = cell.y + (cell.height - fitSize) / 2;

                const imageFormat = item.photoUrl.includes("image/png") ? "PNG" : "JPEG";
                doc.addImage(item.photoUrl, imageFormat, photoX, photoY, fitSize, fitSize);
              } catch (err) {
                console.error("Failed to add image to PDF:", err);
                doc.setFontSize(6);
                doc.setTextColor(156, 163, 175);
                const errorTextX = cell.x + cell.width / 2;
                const errorTextY = cell.y + cell.height / 2;
                if (!isNaN(errorTextX) && !isNaN(errorTextY)) {
                  doc.text("Error", errorTextX, errorTextY, { align: "center" });
                }
              }
            } else {
              doc.setFontSize(8);
              doc.setTextColor(156, 163, 175);
              const noPhotoTextX = cell.x + cell.width / 2;
              const noPhotoTextY = cell.y + cell.height / 2;
              if (!isNaN(noPhotoTextX) && !isNaN(noPhotoTextY)) {
                doc.text("-", noPhotoTextX, noPhotoTextY, { align: "center" });
              }
            }
          }
        }
      },
    });

    // ============================================================================
    // FOOTER ON ALL PAGES
    // ============================================================================

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfDoc = doc as any;
    const totalPages = pdfDoc.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      pdfDoc.setPage(i);

      // Footer line
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      // Generated info
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(
        `Generated on ${format(new Date(), "MMM dd, yyyy 'at' hh:mm a")}`,
        margin,
        pageHeight - 6
      );

      // Page number
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth - margin,
        pageHeight - 6,
        { align: "right" }
      );
    }

    // ============================================================================
    // SAVE PDF
    // ============================================================================

    const fileName = `Checklist_${taskNumber}_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error("Failed to generate checklist PDF:", error);
    throw error;
  }
}
