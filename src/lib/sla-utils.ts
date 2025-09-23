/**
 * Utility functions for SLA (Service Level Agreement) calculations
 */

/**
 * Calculate due date based on SLA configuration
 * @param slaDays - Number of days for SLA (if null/undefined, no automatic due date)
 * @param includeWeekends - Whether to include weekends in SLA calculation
 * @param startDate - Start date for calculation (defaults to current date)
 * @returns Due date or null if no SLA is configured
 */
export function calculateSLADueDate(
  slaDays: number | null | undefined,
  includeWeekends: boolean = false,
  startDate: Date = new Date()
): Date | null {
  // If no SLA days configured, return null
  if (!slaDays || slaDays <= 0) {
    return null;
  }

  const dueDate = new Date(startDate);
  let daysAdded = 0;

  // If including weekends, simply add the days
  if (includeWeekends) {
    dueDate.setDate(dueDate.getDate() + slaDays);
    return dueDate;
  }

  // If not including weekends, count only business days
  while (daysAdded < slaDays) {
    dueDate.setDate(dueDate.getDate() + 1);
    const dayOfWeek = dueDate.getDay();

    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return dueDate;
}

/**
 * Format SLA information for display
 * @param slaDays - Number of days for SLA
 * @param includeWeekends - Whether weekends are included
 * @returns Formatted SLA string
 */
export function formatSLAInfo(
  slaDays: number | null | undefined,
  includeWeekends: boolean = false
): string {
  if (!slaDays || slaDays <= 0) {
    return "No SLA configured";
  }

  const dayText = slaDays === 1 ? "day" : "days";
  const weekendText = includeWeekends ? " (including weekends)" : " (business days only)";

  return `${slaDays} ${dayText}${weekendText}`;
}

/**
 * Get the default due date suggestion based on service SLA
 * @param slaDays - Number of days for SLA
 * @param includeWeekends - Whether weekends are included
 * @returns Due date suggestion or null
 */
export function getSLADueDateSuggestion(
  slaDays: number | null | undefined,
  includeWeekends: boolean = false
): Date | null {
  return calculateSLADueDate(slaDays, includeWeekends);
}