import { DuffelOffer } from '@/types/duffel';
import { SERVICE_FEE_USD } from '@/types/booking';

export interface CostBreakdown {
  baseFare:     number;
  serviceFee:   number;
  baggageFee:   number;
  total:        number;
  bagsIncluded: number; // count of free checked bags per passenger
}

export function getIncludedCheckedBags(offer: DuffelOffer): number {
  if (!offer.slices.length || !offer.slices[0].segments.length) return 0;
  const seg = offer.slices[0].segments[0];
  if (!seg.passengers.length) return 0;
  const pax = seg.passengers[0];
  const checked = pax.baggages.filter(b => b.type === 'checked');
  return checked.reduce((sum, b) => sum + b.quantity, 0);
}

export function calculateCost(offer: DuffelOffer, bagCount: number = 2): CostBreakdown {
  const baseFare     = parseFloat(offer.total_amount);
  const serviceFee   = SERVICE_FEE_USD;
  const bagsIncluded = getIncludedCheckedBags(offer);

  // If fewer bags included than needed, estimate $65/bag for the gap
  const bagsNeeded   = Math.max(0, bagCount - bagsIncluded);
  const baggageFee   = bagsNeeded * 65;

  return {
    baseFare,
    serviceFee,
    baggageFee,
    total: baseFare + serviceFee + baggageFee,
    bagsIncluded,
  };
}

export function shouldFlipSort(
  cheaper: DuffelOffer,
  expensive: DuffelOffer,
  bagCount: number = 2,
): boolean {
  const cheaperCost   = calculateCost(cheaper, bagCount);
  const expensiveCost = calculateCost(expensive, bagCount);

  const priceDiff = expensiveCost.baseFare - cheaperCost.baseFare;
  if (priceDiff < 0 || priceDiff > 80) return false;

  // Flip if expensive has more free bags than cheaper
  return expensiveCost.bagsIncluded > cheaperCost.bagsIncluded;
}

export function sortByTotalCost(offers: DuffelOffer[], bagCount: number = 2): DuffelOffer[] {
  const sorted = [...offers].sort(
    (a, b) => calculateCost(a, bagCount).total - calculateCost(b, bagCount).total,
  );

  // Apply baggage flip for adjacent pairs
  for (let i = 0; i < sorted.length - 1; i++) {
    if (shouldFlipSort(sorted[i], sorted[i + 1], bagCount)) {
      [sorted[i], sorted[i + 1]] = [sorted[i + 1], sorted[i]];
    }
  }

  return sorted;
}

export function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return isoDuration;
  const hours   = parseInt(match[1] ?? '0');
  const minutes = parseInt(match[2] ?? '0');
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export interface FareType {
  label:    string;  // e.g. "Non-refundable", "Flexible"
  short:    string;  // e.g. "NON-REF", "FLEX"
  color:    string;
  bg:       string;
  refundable:  boolean;
  changeable:  boolean;
  refundFee:   string | null;
  changeFee:   string | null;
}

export function getFareType(offer: DuffelOffer): FareType {
  const refund   = offer.conditions?.refund_before_departure;
  const change   = offer.conditions?.change_before_departure;
  const canRef   = refund?.allowed ?? false;
  const canChg   = change?.allowed ?? false;

  let label: string;
  let short: string;
  let color: string;
  let bg:    string;

  if (canRef && canChg) {
    label = 'Fully flexible';  short = 'FLEX';     color = '#16A34A'; bg = '#F0FDF4';
  } else if (!canRef && canChg) {
    label = 'Changeable';      short = 'CHG';      color = '#2563EB'; bg = '#EFF6FF';
  } else if (canRef && !canChg) {
    label = 'Refundable';      short = 'REF';      color = '#7C3AED'; bg = '#F5F3FF';
  } else {
    label = 'Non-refundable';  short = 'NON-REF';  color = '#DC2626'; bg = '#FEF2F2';
  }

  return {
    label, short, color, bg,
    refundable: canRef,
    changeable: canChg,
    refundFee:  refund?.penalty_amount ?? null,
    changeFee:  change?.penalty_amount ?? null,
  };
}

export function getTotalDuration(offer: DuffelOffer): string {
  const totalMinutes = offer.slices.reduce((sum, slice) => {
    const match = slice.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return sum;
    return sum + parseInt(match[1] ?? '0') * 60 + parseInt(match[2] ?? '0');
  }, 0);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
