import React from 'react';

type RangeLabel = 'low' | 'normal' | 'high' | 'unknown' | null;

interface Props {
  label: RangeLabel;
}

const config: Record<
  NonNullable<RangeLabel>,
  { className: string; icon: string; text: string; ariaLabel: string }
> = {
  low: {
    className: 'range-low',
    icon: '↓',
    text: 'Low',
    ariaLabel: 'Below reference range',
  },
  normal: {
    className: 'range-normal',
    icon: '✓',
    text: 'Normal',
    ariaLabel: 'Within reference range',
  },
  high: {
    className: 'range-high',
    icon: '↑',
    text: 'High',
    ariaLabel: 'Above reference range',
  },
  unknown: {
    className: 'range-unknown',
    icon: '?',
    text: 'No range',
    ariaLabel: 'Reference range not provided',
  },
};

export function RangeLabel({ label }: Props) {
  const key = label ?? 'unknown';
  const cfg = config[key];

  return (
    <span className={cfg.className} aria-label={cfg.ariaLabel} role="status">
      <span aria-hidden="true">{cfg.icon}</span>
      {cfg.text}
    </span>
  );
}
