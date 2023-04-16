import type { MrkdwnElement, PlainTextElement } from '@slack/types';
import type { DateInterval, Group } from '@aws-sdk/client-cost-explorer';

export interface CostGroup {
  key: string;
  value: number;
  text: string;
}

export function getTimePeriod(granularity: string): DateInterval {
  let start: Date;
  let end = new Date();

  switch (granularity) {
    case 'DAILY':
      start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
      break;

    case 'MONTHLY':
      end = new Date(end.getFullYear(), end.getMonth(), 1);
      start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
      break;

    default:
      throw new Error(`Unsupported granularity: ${granularity}`);
  }

  return {
    Start: start.toISOString().substr(0, 10),
    End: end.toISOString().substr(0, 10),
  };
}

export function transformGroup(group: Group): CostGroup {
  return {
    key: group.Keys?.[0] ?? '',
    value: parseFloat(group.Metrics?.AmortizedCost?.Amount ?? '0'),
    text: `${group.Metrics?.AmortizedCost.Amount} ${group.Metrics?.AmortizedCost.Unit}`,
  };
}

export function nonZeroGroupOnly(group: CostGroup): boolean {
  return 0 < group.value;
}

export function byAmountDescTaxLast(a: CostGroup, b: CostGroup): number {
  return a.key === 'Tax' ? 1
    : b.key === 'Tax' ? -1
      : b.value - a.value;
}

export type SectionElement = PlainTextElement | MrkdwnElement;

export function groupsToFields(fields: SectionElement[], group: CostGroup): SectionElement[] {
  fields.push({ type: 'mrkdwn', text: `*${group.key}*` });
  fields.push({ type: 'plain_text', text: group.text });
  return fields;
}

export function round(value: number, precision: number): number {
  function shift(value: number, precision: number, reverse: boolean) {
    if (reverse) precision = -precision;
    const numArray = value.toString().split('e');
    return +(numArray[0] + 'e' + (numArray[1] ? (+numArray[1] + precision) : precision));
  }

  return shift(Math.round(shift(value, precision, false)), precision, true);
}
