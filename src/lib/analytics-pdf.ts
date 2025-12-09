import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { PopulatedTask } from "@/features/tasks/types";
import type { Member } from "@/features/members/types";
import { TaskStatus } from "@/features/tasks/types";
import { MemberRole } from "@/features/members/types";

// ============================================================================
// TYPES
// ============================================================================

interface ServiceType {
  id: string;
  name: string;
  workspaceId: string;
  isPublic: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface KPIWeights {
  kpiCompletionWeight: number;
  kpiProductivityWeight: number;
  kpiSlaWeight: number;
  kpiCollaborationWeight: number;
  kpiReviewWeight: number;
}

interface MemberAnalytics {
  id: string;
  name: string;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksOverdue: number;
  completionRate: number;
  slaCompliance: number;
  collaborationScore: number;
  reviewScore: number;
  normalizedProductivityScore: number;
  kpiScore: number;
}

interface ServiceAnalytics {
  id: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  backlogTasks: number;
  healthScore: number;
}

interface StatusDistribution {
  [key: string]: number;
}

interface ProductivityMetrics {
  tasksCreated: number;
  tasksCompleted: number;
  averageCompletionTime: number;
  completionRate: number;
  overdueRate: number;
}

export interface AnalyticsPDFParams {
  workspaceName: string;
  tasks: PopulatedTask[];
  members: Member[];
  services: ServiceType[];
  dateFrom?: Date;
  dateTo?: Date;
  withReviewStage: boolean;
  kpiWeights: KPIWeights;
  generatedBy: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
  return [239, 68, 68]; // red
}

function calculateProductivityMetrics(tasks: PopulatedTask[]): ProductivityMetrics {
  const completedTasks = tasks.filter(task => task.status === TaskStatus.DONE);
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === TaskStatus.DONE) return false;
    return new Date(task.dueDate) < new Date();
  });

  const avgCompletionTime = completedTasks.reduce((acc, task) => {
    const created = new Date(task.createdAt);
    const completed = new Date(task.updatedAt);
    const days = Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return acc + days;
  }, 0) / (completedTasks.length || 1);

  return {
    tasksCreated: tasks.length,
    tasksCompleted: completedTasks.length,
    averageCompletionTime: Math.round(avgCompletionTime),
    completionRate: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
    overdueRate: tasks.length > 0 ? (overdueTasks.length / tasks.length) * 100 : 0,
  };
}

function calculateStatusDistribution(tasks: PopulatedTask[]): StatusDistribution {
  return {
    [TaskStatus.BACKLOG]: tasks.filter(t => t.status === TaskStatus.BACKLOG).length,
    [TaskStatus.TODO]: tasks.filter(t => t.status === TaskStatus.TODO).length,
    [TaskStatus.IN_PROGRESS]: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    [TaskStatus.IN_REVIEW]: tasks.filter(t => t.status === TaskStatus.IN_REVIEW).length,
    [TaskStatus.DONE]: tasks.filter(t => t.status === TaskStatus.DONE).length,
  };
}

function calculateMemberAnalytics(
  members: Member[],
  tasks: PopulatedTask[],
  weights: KPIWeights,
  withReviewStage: boolean
): MemberAnalytics[] {
  const memberStats = members
    .filter(member => member.role !== MemberRole.CUSTOMER)
    .map(member => {
      const memberTasks = tasks.filter(task =>
        task.assignees && task.assignees.some(a => a.id === member.id)
      );
      const completedTasks = memberTasks.filter(task => task.status === TaskStatus.DONE);
      const inProgressTasks = memberTasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
      const overdueTasks = memberTasks.filter(task => {
        if (!task.dueDate || task.status === TaskStatus.DONE) return false;
        return new Date(task.dueDate) < new Date();
      });

      const followingTasks = tasks.filter(task => {
        if (task.assignees && task.assignees.some(a => a.id === member.id)) return false;
        if (task.followers && Array.isArray(task.followers)) {
          return task.followers.some((follower: { id: string }) => follower.id === member.id);
        }
        return false;
      });
      const followingTasksCompleted = followingTasks.filter(task => task.status === TaskStatus.DONE);

      const reviewingTasks = tasks.filter(task => {
        return task.reviewerId === member.id && task.status === TaskStatus.IN_REVIEW;
      });
      const reviewingTasksCompleted = tasks.filter(task => {
        return task.reviewerId === member.id && task.status === TaskStatus.DONE;
      }).length;

      const completionRate = memberTasks.length > 0 ? completedTasks.length / memberTasks.length : 0;

      const assignedPoints = completedTasks.length * 1.0;
      const collaboratorPoints = followingTasksCompleted.length * 0.5;
      const reviewerPoints = reviewingTasksCompleted * 0.3;
      const contributionScore = assignedPoints + collaboratorPoints + reviewerPoints;

      const tasksWithDueDate = memberTasks.filter(task => task.dueDate);
      const tasksCompletedOnTime = completedTasks.filter(task => {
        if (!task.dueDate) return true;
        const dueDate = new Date(task.dueDate);
        const completedDate = new Date(task.updatedAt);
        return completedDate <= dueDate;
      });
      const slaCompliance = tasksWithDueDate.length > 0
        ? tasksCompletedOnTime.length / tasksWithDueDate.length
        : 1;

      const collaborationScore = followingTasks.length > 0
        ? followingTasksCompleted.length / followingTasks.length
        : 0;

      const totalReviewedTasks = reviewingTasksCompleted + reviewingTasks.length;
      const reviewScore = totalReviewedTasks > 0
        ? reviewingTasksCompleted / totalReviewedTasks
        : 0;

      return {
        id: member.id,
        name: member.name,
        tasksAssigned: memberTasks.length,
        tasksCompleted: completedTasks.length,
        tasksInProgress: inProgressTasks.length,
        tasksOverdue: overdueTasks.length,
        contributionScore,
        completionRate,
        slaCompliance,
        collaborationScore,
        reviewScore,
      };
    });

  const maxContributionScore = Math.max(...memberStats.map(m => m.contributionScore), 1);

  return memberStats.map(member => {
    const normalizedProductivityScore = member.contributionScore / maxContributionScore;

    const kpiScore = (
      member.completionRate * (weights.kpiCompletionWeight / 100) +
      normalizedProductivityScore * (weights.kpiProductivityWeight / 100) +
      member.slaCompliance * (weights.kpiSlaWeight / 100) +
      member.collaborationScore * (weights.kpiCollaborationWeight / 100) +
      (withReviewStage ? member.reviewScore * (weights.kpiReviewWeight / 100) : 0)
    );

    return {
      ...member,
      normalizedProductivityScore,
      kpiScore: Math.round(kpiScore * 100),
    };
  }).sort((a, b) => b.kpiScore - a.kpiScore);
}

function calculateServiceAnalytics(
  services: ServiceType[],
  tasks: PopulatedTask[]
): ServiceAnalytics[] {
  return services.map(service => {
    const serviceTasks = tasks.filter(task => task.serviceId === service.id);
    const completedTasks = serviceTasks.filter(task => task.status === TaskStatus.DONE);
    const inProgressTasks = serviceTasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
    const backlogTasks = serviceTasks.filter(task => task.status === TaskStatus.BACKLOG);

    const completionRate = serviceTasks.length > 0
      ? (completedTasks.length / serviceTasks.length) * 100
      : 0;
    const progressRate = serviceTasks.length > 0
      ? ((completedTasks.length + inProgressTasks.length) / serviceTasks.length) * 100
      : 0;

    const healthScore = Math.round((completionRate * 0.6) + (progressRate * 0.4));

    return {
      id: service.id,
      name: service.name,
      totalTasks: serviceTasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      backlogTasks: backlogTasks.length,
      healthScore
    };
  }).sort((a, b) => b.healthScore - a.healthScore);
}

// ============================================================================
// CHART DRAWING FUNCTIONS
// ============================================================================

function drawHorizontalBarChart(
  doc: jsPDF,
  data: { label: string; value: number; color: [number, number, number] }[],
  x: number,
  y: number,
  width: number,
  height: number,
  title: string
): void {
  const barHeight = Math.min(15, (height - 30) / data.length);
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barAreaWidth = width - 80;

  // Title
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  doc.text(title, x, y);

  let currentY = y + 10;

  data.forEach((item) => {
    // Label
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    const labelText = item.label.length > 12 ? item.label.substring(0, 12) + "..." : item.label;
    doc.text(labelText, x, currentY + barHeight / 2 + 2);

    // Bar background
    doc.setFillColor(229, 231, 235);
    doc.roundedRect(x + 50, currentY, barAreaWidth, barHeight - 2, 2, 2, "F");

    // Bar fill
    const barWidth = (item.value / maxValue) * barAreaWidth;
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.roundedRect(x + 50, currentY, barWidth, barHeight - 2, 2, 2, "F");

    // Value
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(31, 41, 55);
    doc.text(`${item.value}`, x + 52 + barAreaWidth, currentY + barHeight / 2 + 2);

    currentY += barHeight + 3;
  });
}

function drawPieChart(
  doc: jsPDF,
  data: { label: string; value: number; color: [number, number, number] }[],
  centerX: number,
  centerY: number,
  radius: number,
  title: string
): void {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    doc.setFontSize(10);
    doc.setTextColor(156, 163, 175);
    doc.text("No data", centerX - 15, centerY);
    return;
  }

  // Title
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  doc.text(title, centerX - radius, centerY - radius - 10);

  let startAngle = -Math.PI / 2;

  data.forEach((item) => {
    if (item.value === 0) return;

    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    // Draw pie slice using small line segments
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);

    const points: [number, number][] = [[centerX, centerY]];
    const segments = Math.max(10, Math.ceil(sliceAngle * 20));

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (sliceAngle * i) / segments;
      points.push([
        centerX + radius * Math.cos(angle),
        centerY + radius * Math.sin(angle),
      ]);
    }

    // Draw filled polygon
    if (points.length > 2) {
      // Use lines to approximate the arc
      doc.setDrawColor(item.color[0], item.color[1], item.color[2]);
      doc.setLineWidth(0.5);

      for (let i = 1; i < points.length; i++) {
        const [x1, y1] = points[i - 1];
        const [x2, y2] = points[i];
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.triangle(centerX, centerY, x1, y1, x2, y2, "F");
      }
    }

    startAngle = endAngle;
  });

  // Legend
  let legendY = centerY + radius + 10;
  const legendX = centerX - radius;
  doc.setFontSize(7);

  data.forEach((item) => {
    if (item.value === 0) return;
    const percentage = ((item.value / total) * 100).toFixed(1);

    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.rect(legendX, legendY - 3, 6, 6, "F");

    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    const legendText = `${item.label}: ${item.value} (${percentage}%)`;
    doc.text(legendText, legendX + 9, legendY + 2);

    legendY += 10;
  });
}

function drawDonutChart(
  doc: jsPDF,
  data: { label: string; value: number; color: [number, number, number] }[],
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  title: string
): void {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    doc.setFontSize(10);
    doc.setTextColor(156, 163, 175);
    doc.text("No data", centerX - 15, centerY);
    return;
  }

  // Title
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  doc.text(title, centerX - outerRadius, centerY - outerRadius - 10);

  let startAngle = -Math.PI / 2;

  // Draw each segment using filled arcs (smoother rendering)
  data.forEach((item) => {
    if (item.value === 0) return;

    const sliceAngle = (item.value / total) * 2 * Math.PI;
    // Use more segments for smoother curves, minimum 50 for small slices
    const segments = Math.max(50, Math.ceil(sliceAngle * 50));

    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    // Remove stroke to eliminate visible lines
    doc.setDrawColor(item.color[0], item.color[1], item.color[2]);
    doc.setLineWidth(0);

    for (let i = 0; i < segments; i++) {
      const angle1 = startAngle + (sliceAngle * i) / segments;
      const angle2 = startAngle + (sliceAngle * (i + 1)) / segments;

      const x1 = centerX + outerRadius * Math.cos(angle1);
      const y1 = centerY + outerRadius * Math.sin(angle1);
      const x2 = centerX + outerRadius * Math.cos(angle2);
      const y2 = centerY + outerRadius * Math.sin(angle2);
      const x3 = centerX + innerRadius * Math.cos(angle2);
      const y3 = centerY + innerRadius * Math.sin(angle2);
      const x4 = centerX + innerRadius * Math.cos(angle1);
      const y4 = centerY + innerRadius * Math.sin(angle1);

      // Draw quadrilateral using filled triangles
      doc.triangle(x1, y1, x2, y2, x3, y3, "F");
      doc.triangle(x1, y1, x3, y3, x4, y4, "F");
    }

    startAngle += sliceAngle;
  });

  // Center circle (white) - covers any artifacts
  doc.setFillColor(255, 255, 255);
  doc.circle(centerX, centerY, innerRadius, "F");

  // Center text
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  doc.text(total.toString(), centerX, centerY + 2, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text("Total", centerX, centerY + 8, { align: "center" });

  // Legend - positioned to the RIGHT of the donut chart
  const legendX = centerX + outerRadius + 10;
  let legendY = centerY - outerRadius + 5;
  doc.setFontSize(8);

  data.forEach((item) => {
    if (item.value === 0) return;
    const percentage = ((item.value / total) * 100).toFixed(1);

    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.rect(legendX, legendY - 3, 6, 6, "F");

    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    const legendText = `${item.label}: ${item.value} (${percentage}%)`;
    doc.text(legendText, legendX + 9, legendY + 2);

    legendY += 12;
  });
}

function drawKPIGaugeChart(
  doc: jsPDF,
  value: number,
  x: number,
  y: number,
  radius: number,
  label: string
): void {
  // Background arc - line width proportional to radius
  const lineWidth = Math.max(4, radius * 0.4);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(lineWidth);

  const startAngle = Math.PI * 0.75;
  const endAngle = Math.PI * 2.25;
  const segments = 30;

  for (let i = 0; i < segments; i++) {
    const a1 = startAngle + ((endAngle - startAngle) * i) / segments;
    const a2 = startAngle + ((endAngle - startAngle) * (i + 1)) / segments;
    const x1 = x + radius * Math.cos(a1);
    const y1 = y + radius * Math.sin(a1);
    const x2 = x + radius * Math.cos(a2);
    const y2 = y + radius * Math.sin(a2);
    doc.line(x1, y1, x2, y2);
  }

  // Value arc
  const color = getKPIColor(value);
  doc.setDrawColor(color[0], color[1], color[2]);
  const valueAngle = startAngle + ((endAngle - startAngle) * Math.min(value, 100)) / 100;

  const valueSegments = Math.ceil((value / 100) * segments);
  for (let i = 0; i < valueSegments; i++) {
    const a1 = startAngle + ((valueAngle - startAngle) * i) / valueSegments;
    const a2 = startAngle + ((valueAngle - startAngle) * (i + 1)) / valueSegments;
    const x1 = x + radius * Math.cos(a1);
    const y1 = y + radius * Math.sin(a1);
    const x2 = x + radius * Math.cos(a2);
    const y2 = y + radius * Math.sin(a2);
    doc.line(x1, y1, x2, y2);
  }

  // Value text
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(`${value}%`, x, y + 5, { align: "center" });

  // Label
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(label, x, y + radius + 8, { align: "center" });
}

// ============================================================================
// MAIN PDF GENERATION FUNCTION
// ============================================================================

export function generateAnalyticsPDF({
  workspaceName,
  tasks,
  members,
  services,
  dateFrom,
  dateTo,
  withReviewStage,
  kpiWeights,
  generatedBy,
}: AnalyticsPDFParams): void {
  // Create landscape PDF
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let yPos = margin;

  // Calculate analytics data
  const productivityMetrics = calculateProductivityMetrics(tasks);
  const statusDistribution = calculateStatusDistribution(tasks);
  const memberAnalytics = calculateMemberAnalytics(members, tasks, kpiWeights, withReviewStage);
  const serviceAnalytics = calculateServiceAnalytics(services, tasks);

  // Colors
  const primaryColor: [number, number, number] = [79, 70, 229]; // indigo-600
  const secondaryColor: [number, number, number] = [107, 114, 128]; // gray-500

  // ===== PAGE 1: HEADER & OVERVIEW =====

  // Header background
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 35, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Workspace Analytics Report", margin, 18);

  // Subtitle with date range
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  let subtitle = workspaceName;
  if (dateFrom && dateTo) {
    subtitle += ` | ${format(dateFrom, "MMM dd, yyyy")} - ${format(dateTo, "MMM dd, yyyy")}`;
  }
  doc.text(subtitle, margin, 28);

  yPos = 45;

  // ===== KEY METRICS CARDS =====
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Key Performance Indicators", margin, yPos);
  yPos += 8;

  const cardWidth = (pageWidth - margin * 2 - 15) / 4;
  const cardHeight = 28;

  const metricsCards = [
    { label: "Completion Rate", value: `${Math.round(productivityMetrics.completionRate)}%`, color: [59, 130, 246] as [number, number, number], subtext: "Overall" },
    { label: "Avg Completion", value: `${productivityMetrics.averageCompletionTime} days`, color: [34, 197, 94] as [number, number, number], subtext: "Per Task" },
    { label: "Active Members", value: `${memberAnalytics.filter(m => m.tasksAssigned > 0).length}`, color: [168, 85, 247] as [number, number, number], subtext: `of ${members.length} total` },
    { label: "Overdue Rate", value: `${productivityMetrics.overdueRate.toFixed(1)}%`, color: [245, 158, 11] as [number, number, number], subtext: "Tasks Overdue" },
  ];

  metricsCards.forEach((card, index) => {
    const xPos = margin + index * (cardWidth + 5);

    // Card background
    doc.setFillColor(card.color[0], card.color[1], card.color[2]);
    doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 3, 3, "F");

    // Value
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(card.value, xPos + cardWidth / 2, yPos + 12, { align: "center" });

    // Label
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(card.label, xPos + cardWidth / 2, yPos + 20, { align: "center" });

    // Subtext
    doc.setFontSize(7);
    doc.text(card.subtext, xPos + cardWidth / 2, yPos + 25, { align: "center" });
  });

  yPos += cardHeight + 15;

  // ===== CHARTS SECTION =====
  const chartSectionWidth = (pageWidth - margin * 2 - 10) / 2;

  // Task Status Distribution (Donut Chart)
  const statusData = [
    { label: "Backlog", value: statusDistribution[TaskStatus.BACKLOG], color: [156, 163, 175] as [number, number, number] },
    { label: "To Do", value: statusDistribution[TaskStatus.TODO], color: [59, 130, 246] as [number, number, number] },
    { label: "In Progress", value: statusDistribution[TaskStatus.IN_PROGRESS], color: [245, 158, 11] as [number, number, number] },
    { label: "In Review", value: statusDistribution[TaskStatus.IN_REVIEW], color: [168, 85, 247] as [number, number, number] },
    { label: "Done", value: statusDistribution[TaskStatus.DONE], color: [34, 197, 94] as [number, number, number] },
  ];

  drawDonutChart(
    doc,
    statusData,
    margin + 45,
    yPos + 50,
    35,
    18,
    "Task Status Distribution"
  );

  // Member Performance Gauge Charts (moved from page 2)
  const avgKPI = memberAnalytics.length > 0
    ? Math.round(memberAnalytics.reduce((sum, m) => sum + m.kpiScore, 0) / memberAnalytics.length)
    : 0;
  const avgCompletion = memberAnalytics.length > 0
    ? Math.round(memberAnalytics.reduce((sum, m) => sum + m.completionRate, 0) / memberAnalytics.length * 100)
    : 0;
  const avgSLA = memberAnalytics.length > 0
    ? Math.round(memberAnalytics.reduce((sum, m) => sum + m.slaCompliance, 0) / memberAnalytics.length * 100)
    : 0;
  const avgCollaboration = memberAnalytics.length > 0
    ? Math.round(memberAnalytics.reduce((sum, m) => sum + m.collaborationScore, 0) / memberAnalytics.length * 100)
    : 0;

  // Member Performance Analytics Section Title
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  doc.text("Member Performance Analytics", margin + chartSectionWidth + 10, yPos);

  // KPI Gauge Charts - positioned on the right side
  const numGauges = withReviewStage ? 5 : 4;
  const gaugeRadiusPage1 = 12; // Reduced radius to prevent overlap
  const gaugeStartX = margin + chartSectionWidth + 15;
  const gaugeAreaWidth = chartSectionWidth - 10;
  const gaugeSpacingPage1 = gaugeAreaWidth / numGauges;
  const gaugeY = yPos + 40;

  drawKPIGaugeChart(doc, avgKPI, gaugeStartX + gaugeSpacingPage1 * 0.5, gaugeY, gaugeRadiusPage1, "Avg KPI Score");
  drawKPIGaugeChart(doc, avgCompletion, gaugeStartX + gaugeSpacingPage1 * 1.5, gaugeY, gaugeRadiusPage1, "Avg Completion");
  drawKPIGaugeChart(doc, avgSLA, gaugeStartX + gaugeSpacingPage1 * 2.5, gaugeY, gaugeRadiusPage1, "Avg SLA");
  drawKPIGaugeChart(doc, avgCollaboration, gaugeStartX + gaugeSpacingPage1 * 3.5, gaugeY, gaugeRadiusPage1, "Collaboration");

  if (withReviewStage) {
    const avgReview = memberAnalytics.length > 0
      ? Math.round(memberAnalytics.reduce((sum, m) => sum + m.reviewScore, 0) / memberAnalytics.length * 100)
      : 0;
    drawKPIGaugeChart(doc, avgReview, gaugeStartX + gaugeSpacingPage1 * 4.5, gaugeY, gaugeRadiusPage1, "Review Score");
  }

  // ===== PAGE 2: MEMBER PERFORMANCE =====
  doc.addPage();
  yPos = margin;

  // Page 2 Header
  doc.setFillColor(168, 85, 247);
  doc.rect(0, 0, pageWidth, 25, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Member Performance Analytics", margin, 16);

  yPos = 35;

  // Member Performance Table (Gauge charts moved to page 1)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Team Performance Rankings", margin, yPos);
  yPos += 5;

  const tableHeaders = withReviewStage
    ? ["Rank", "Member", "KPI", "CR", "PS", "SLA", "CS", "RS", "Tasks", "Rating"]
    : ["Rank", "Member", "KPI", "CR", "PS", "SLA", "CS", "Tasks", "Rating"];

  const tableData = memberAnalytics.map((member, index) => {
    const baseData = [
      (index + 1).toString(),
      member.name.length > 20 ? member.name.substring(0, 20) + "..." : member.name,
      `${member.kpiScore}%`,
      `${(member.completionRate * 100).toFixed(0)}%`,
      `${(member.normalizedProductivityScore * 100).toFixed(0)}%`,
      `${(member.slaCompliance * 100).toFixed(0)}%`,
      `${(member.collaborationScore * 100).toFixed(0)}%`,
    ];

    if (withReviewStage) {
      baseData.push(`${(member.reviewScore * 100).toFixed(0)}%`);
    }

    baseData.push(`${member.tasksCompleted}/${member.tasksAssigned}`);
    baseData.push(getKPIRating(member.kpiScore));

    return baseData;
  });

  autoTable(doc, {
    startY: yPos,
    head: [tableHeaders],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      halign: "center",
    },
    columnStyles: withReviewStage ? {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 45, halign: "left" },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 18, halign: "center" },
      5: { cellWidth: 18, halign: "center" },
      6: { cellWidth: 18, halign: "center" },
      7: { cellWidth: 18, halign: "center" },
      8: { cellWidth: 25, halign: "center" },
      9: { cellWidth: 35, halign: "center" },
    } : {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 50, halign: "left" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 20, halign: "center" },
      5: { cellWidth: 20, halign: "center" },
      6: { cellWidth: 20, halign: "center" },
      7: { cellWidth: 28, halign: "center" },
      8: { cellWidth: 38, halign: "center" },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    margin: { left: margin, right: margin },
    didDrawCell: (data) => {
      // Color the KPI score cell
      if (data.column.index === 2 && data.section === "body") {
        const kpiValue = parseInt(data.cell.text[0]);
        if (!isNaN(kpiValue)) {
          const color = getKPIColor(kpiValue);
          doc.setTextColor(color[0], color[1], color[2]);
        }
      }
      // Color the rating cell
      const ratingColIndex = withReviewStage ? 9 : 8;
      if (data.column.index === ratingColIndex && data.section === "body") {
        const rating = data.cell.text[0];
        if (rating === "Excellent") {
          doc.setTextColor(34, 197, 94);
        } else if (rating === "Good") {
          doc.setTextColor(59, 130, 246);
        } else if (rating === "Average") {
          doc.setTextColor(245, 158, 11);
        } else {
          doc.setTextColor(239, 68, 68);
        }
      }
    },
  });

  // ===== PAGE 3: SERVICE ANALYTICS =====
  doc.addPage();
  yPos = margin;

  // Page 3 Header
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, pageWidth, 25, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Service Analytics & Summary", margin, 16);

  yPos = 35;

  // Service Metrics Table
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Service Performance Metrics", margin, yPos);
  yPos += 5;

  const serviceTableData = serviceAnalytics.map(service => [
    service.name,
    service.totalTasks.toString(),
    service.completedTasks.toString(),
    service.inProgressTasks.toString(),
    service.backlogTasks.toString(),
    service.totalTasks > 0 ? `${Math.round((service.completedTasks / service.totalTasks) * 100)}%` : "0%",
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Service", "Total", "Completed", "In Progress", "Backlog", "Completion"]],
    body: serviceTableData,
    theme: "grid",
    headStyles: {
      fillColor: [34, 197, 94],
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
      0: { cellWidth: 70, halign: "left" },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 35, halign: "center" },
      3: { cellWidth: 35, halign: "center" },
      4: { cellWidth: 30, halign: "center" },
      5: { cellWidth: 35, halign: "center" },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    margin: { left: margin, right: margin },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterServiceTable = (doc as any).lastAutoTable?.finalY || yPos + 60;
  yPos = afterServiceTable + 15;

  // Workspace Summary Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  doc.text("Workspace Summary", margin, yPos);
  yPos += 10;

  const summaryCardWidth = (pageWidth - margin * 2 - 5) / 2;
  const summaryCardHeight = 35;

  // Overall Productivity Card
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, yPos, summaryCardWidth, summaryCardHeight, 4, 4, "F");
  doc.setFillColor(99, 102, 241);
  doc.roundedRect(margin, yPos, 4, summaryCardHeight, 2, 2, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text("Overall Productivity", margin + 10, yPos + 10);

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(99, 102, 241);
  doc.text(`${Math.round(productivityMetrics.completionRate)}%`, margin + 10, yPos + 25);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(`${productivityMetrics.tasksCompleted} of ${productivityMetrics.tasksCreated} tasks completed`, margin + 10, yPos + 32);

  // Team Efficiency Card
  const card2X = margin + summaryCardWidth + 5;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(card2X, yPos, summaryCardWidth, summaryCardHeight, 4, 4, "F");
  doc.setFillColor(168, 85, 247);
  doc.roundedRect(card2X, yPos, 4, summaryCardHeight, 2, 2, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text("Team Efficiency", card2X + 10, yPos + 10);

  const highPerformers = memberAnalytics.filter(m => m.kpiScore >= 60).length;
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(168, 85, 247);
  doc.text(highPerformers.toString(), card2X + 10, yPos + 25);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text("high-performing members", card2X + 10, yPos + 32);

  // ===== KPI WEIGHTS LEGEND =====
  yPos += summaryCardHeight + 15;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  doc.text("KPI Weight Configuration", margin, yPos);
  yPos += 8;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);

  const weightText = [
    `CR (Completion Rate): ${kpiWeights.kpiCompletionWeight.toFixed(1)}%`,
    `PS (Productivity Score): ${kpiWeights.kpiProductivityWeight.toFixed(1)}%`,
    `SLA (SLA Compliance): ${kpiWeights.kpiSlaWeight.toFixed(1)}%`,
    `CS (Collaboration Score): ${kpiWeights.kpiCollaborationWeight.toFixed(1)}%`,
  ];

  if (withReviewStage) {
    weightText.push(`RS (Review Score): ${kpiWeights.kpiReviewWeight.toFixed(1)}%`);
  }

  doc.text(weightText.join("  |  "), margin, yPos);

  // ===== FOOTER ON ALL PAGES =====
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
    doc.setTextColor(...secondaryColor);
    doc.text(
      `Generated by ${generatedBy} on ${format(new Date(), "MMM dd, yyyy 'at' hh:mm a")}`,
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

  // ===== SAVE PDF =====
  const dateStr = dateFrom && dateTo
    ? `${format(dateFrom, "yyyyMMdd")}-${format(dateTo, "yyyyMMdd")}`
    : format(new Date(), "yyyyMMdd");
  const fileName = `${workspaceName.replace(/[^a-zA-Z0-9]/g, "_")}_Analytics_${dateStr}.pdf`;
  doc.save(fileName);
}
