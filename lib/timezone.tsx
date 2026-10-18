'use client';

import React, { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

export function serializeToUtc(dateInput?: Date | string | number): string {
  const date = !dateInput ? new Date() : typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  return date.toISOString();
}

export function formatToLocal(isoString: string, referenceDate?: Date): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const timeFormat = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  if (!referenceDate) {
    const dateFormat = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
    return `${dateFormat} • ${timeFormat}`;
  }

  const isToday =
    date.getDate() === referenceDate.getDate() &&
    date.getMonth() === referenceDate.getMonth() &&
    date.getFullYear() === referenceDate.getFullYear();

  const yesterday = new Date(referenceDate);
  yesterday.setDate(referenceDate.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    return `Today, ${timeFormat}`;
  }

  if (isYesterday) {
    return `Yesterday, ${timeFormat}`;
  }

  const dateFormat = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === referenceDate.getFullYear() ? undefined : 'numeric',
  }).format(date);

  return `${dateFormat} • ${timeFormat}`;
}

export function formatMonthYear(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatShortDate(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

interface LocalTimeProps {
  isoString: string;
  className?: string;
  format?: 'full' | 'short' | 'month';
}

export function LocalTime({ isoString, className, format = 'full' }: LocalTimeProps) {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);

  let formatted = '';
  if (format === 'month') {
    formatted = formatMonthYear(isoString);
  } else if (format === 'short') {
    formatted = formatShortDate(isoString);
  } else {
    formatted = formatToLocal(isoString, isClient ? new Date() : undefined);
  }

  return (
    <time dateTime={isoString} className={className}>
      {formatted || (isoString ? isoString.slice(0, 10) : '')}
    </time>
  );
}
