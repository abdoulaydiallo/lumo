import React from "react";

type DurationUnit = 'year' | 'month' | 'day' | 'hour' | 'minute';
type DurationPrecision = 'high' | 'medium' | 'low';
type DurationFormat = 'short' | 'long' | 'auto';

interface DurationParts {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
}

interface DurationProps {
  value: number; // in minutes
  className?: string;
  precision?: DurationPrecision;
  format?: DurationFormat;
  showZero?: boolean;
}

const TIME_CONSTANTS = {
  minutesPerHour: 60,
  hoursPerDay: 24,
  daysPerMonth: 30, // Approximation
  daysPerYear: 365, // Approximation
  minutesPerDay: 60 * 24,
  minutesPerMonth: 60 * 24 * 30,
  minutesPerYear: 60 * 24 * 365,
};

export const Duration: React.FC<DurationProps> = ({
  value,
  className = '',
  precision = 'medium',
  format = 'auto',
  showZero = false,
}) => {
  if (isNaN(value)) {
    return <span className={className}>N/A</span>;
  }

  if (!showZero && value === 0) {
    return <span className={className}>-</span>;
  }

  const duration = calculateDurationParts(value);
  const formatted = formatDuration(duration, format, precision);

  return <span className={className}>{formatted}</span>;
};

function calculateDurationParts(totalMinutes: number): DurationParts {
  let remaining = totalMinutes;

  const years = Math.floor(remaining / TIME_CONSTANTS.minutesPerYear);
  remaining -= years * TIME_CONSTANTS.minutesPerYear;

  const months = Math.floor(remaining / TIME_CONSTANTS.minutesPerMonth);
  remaining -= months * TIME_CONSTANTS.minutesPerMonth;

  const days = Math.floor(remaining / TIME_CONSTANTS.minutesPerDay);
  remaining -= days * TIME_CONSTANTS.minutesPerDay;

  const hours = Math.floor(remaining / TIME_CONSTANTS.minutesPerHour);
  remaining -= hours * TIME_CONSTANTS.minutesPerHour;

  const minutes = Math.round(remaining);

  return { years, months, days, hours, minutes };
}

function formatDuration(
  duration: DurationParts,
  format: DurationFormat,
  precision: DurationPrecision
): string {
  const { years, months, days, hours, minutes } = duration;
  const parts: { value: number; unit: DurationUnit }[] = [];

  // Determine which parts to show based on precision
  if (precision !== 'low' && years > 0) {
    parts.push({ value: years, unit: 'year' });
  }
  if (precision !== 'low' && months > 0) {
    parts.push({ value: months, unit: 'month' });
  }
  if (days > 0 || (precision === 'high' && (years > 0 || months > 0))) {
    parts.push({ value: days, unit: 'day' });
  }
  if (hours > 0 || precision === 'high') {
    parts.push({ value: hours, unit: 'hour' });
  }
  if (minutes > 0 || precision === 'high') {
    parts.push({ value: minutes, unit: 'minute' });
  }

  // Handle auto-formatting
  if (format === 'auto') {
    if (parts.length > 2) {
      // For long durations, show only the two most significant units
      return formatDurationParts(parts.slice(0, 2), 'short');
    }
    return formatDurationParts(parts, 'short');
  }

  return formatDurationParts(parts, format);
}

function formatDurationParts(
  parts: { value: number; unit: DurationUnit }[],
  format: 'short' | 'long'
): string {
  return parts
    .map(({ value, unit }) => {
      if (format === 'short') {
        const unitSymbols: Record<DurationUnit, string> = {
          year: 'a',
          month: 'm',
          day: 'j',
          hour: 'h',
          minute: 'min',
        };
        return `${value}${unitSymbols[unit]}`;
      } else {
        const unitNames: Record<DurationUnit, string> = {
          year: `an${value > 1 ? 's' : ''}`,
          month: `mois`,
          day: `jour${value > 1 ? 's' : ''}`,
          hour: `heure${value > 1 ? 's' : ''}`,
          minute: `minute${value !== 1 ? 's' : ''}`,
        };
        return `${value} ${unitNames[unit]}`;
      }
    })
    .join(' ');
}