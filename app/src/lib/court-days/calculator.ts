// South African Rules of Court Days Deadline Calculator
// Excludes Saturdays, Sundays, and South African Public Holidays per Court Rules

export function calculateCourtDeadline(
  triggerDate: Date,
  courtDaysCount: number,
  publicHolidays: string[]
): { calculatedDeadline: Date; daysSkipped: number } {
  let currentDate = new Date(triggerDate);
  let daysAdded = 0;
  let daysSkipped = 0;

  // Legal calculation rules: trigger date itself is excluded, counting starts on the next court day
  while (daysAdded < courtDaysCount) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay(); // 0 = Sun, 6 = Sat
    const dateStr = currentDate.toISOString().split('T')[0];

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPublicHoliday = publicHolidays.includes(dateStr);

    if (isWeekend || isPublicHoliday) {
      daysSkipped++;
    } else {
      daysAdded++;
    }
  }

  // Set default court filing cutoff close: 17:00 SAST per High Court directions
  currentDate.setHours(17, 0, 0, 0);
  return { calculatedDeadline: currentDate, daysSkipped };
}
