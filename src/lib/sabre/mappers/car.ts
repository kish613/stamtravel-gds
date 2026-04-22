import type { CarResult } from '@/lib/types';
import type { VehAvailResponse } from '../car/veh';

const categoryFromSize = (size?: string): CarResult['category'] => {
  if (!size) return 'intermediate';
  const s = size.toLowerCase();
  if (s.includes('econ')) return 'economy';
  if (s.includes('compact')) return 'compact';
  return 'intermediate';
};

export const mapVehAvailToCars = (res: VehAvailResponse): CarResult[] => {
  const list = res.GetVehAvailRS?.VehAvailInfos?.VehAvailInfo ?? [];
  return list.map((v, i) => {
    const charge = v.VehAvailCore?.TotalCharge;
    return {
      id: v.VehAvailCore?.Vehicle?.Code ?? `${i}`,
      vendor: v.Vendor?.CompanyShortName ?? v.Vendor?.Code ?? '',
      model: v.VehAvailCore?.Vehicle?.VehMakeModel?.Name ?? '',
      acriss: v.VehAvailCore?.Vehicle?.Code ?? '',
      category: categoryFromSize(v.VehAvailCore?.Vehicle?.VehClass?.Size),
      pickupLocation: '',
      dailyRate: Number(charge?.RateTotalAmount ?? charge?.EstimatedTotalAmount ?? '0') || 0,
      inclusions: [],
      currency: charge?.CurrencyCode ?? 'USD'
    };
  });
};
