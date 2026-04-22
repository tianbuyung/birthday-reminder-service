import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';

/**
 * Computes the next occurrence of the user's birthday at 09:00 in their
 * local timezone.
 *
 * - If the 9 AM window has already passed today, returns 9 AM on next year's birthday.
 * - Feb 29 birthdays fire on Feb 28 in non-leap years and Feb 29 in leap years.
 *   Luxon overflows Feb 29 → Mar 1 in non-leap years via JS Date arithmetic, so we
 *   resolve the day explicitly before constructing the candidate.
 * - DST is handled transparently by Luxon — 9 AM is always local wall-clock time.
 * - `now` is truncated to the second to eliminate sub-millisecond boundary jitter.
 */
export const computeNextBirthday9AM = (
  birthday: Date,
  timezone: string,
): Date => {
  const now = DateTime.now().setZone(timezone).startOf('second');

  if (!now.isValid) {
    throw new BadRequestException('Invalid timezone');
  }
  const bday = DateTime.fromJSDate(birthday, { zone: 'utc' }).setZone(timezone);

  const isLeapDay = bday.month === 2 && bday.day === 29;

  const buildCandidate = (year: number): DateTime<true> => {
    const { month, day } = isLeapDay
      ? resolveLeapDay(year)
      : { month: bday.month, day: bday.day };
    return DateTime.fromObject(
      { year, month, day, hour: 9, minute: 0, second: 0, millisecond: 0 },
      { zone: timezone },
    ) as DateTime<true>;
  };

  let candidate = buildCandidate(now.year);

  if (candidate <= now) {
    candidate = buildCandidate(now.year + 1);
  }

  return candidate.toJSDate();
};

const resolveLeapDay = (year: number): { month: number; day: number } => {
  const isLeapYear = DateTime.fromObject({
    year,
    month: 1,
    day: 1,
  }).isInLeapYear;
  return { month: 2, day: isLeapYear ? 29 : 28 };
};
