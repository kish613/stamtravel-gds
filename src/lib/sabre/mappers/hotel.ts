import type { HotelResult } from '@/lib/types';
import type { HotelAvailResponse } from '../hotel/csl';

export const mapCslToHotels = (res: HotelAvailResponse): HotelResult[] => {
  const list = res.GetHotelAvailRS?.HotelAvailInfos?.HotelAvailInfo ?? [];
  return list.map((h, i) => {
    const info = h.HotelInfo;
    const rooms =
      h.HotelRateInfo?.Rooms?.Room?.map((r) => ({
        name: r.RoomDescription?.Name ?? '',
        capacity: Number(r.MaxOccupancy ?? '2') || 2,
        rate: Number(r.RoomRate?.AmountBeforeTax ?? '0') || 0,
        refundable: !r.RoomRate?.CancelPenalties?.NonRefundable
      })) ?? [];
    const first = rooms[0];
    return {
      id: info?.HotelCode ?? `${i}`,
      name: info?.HotelName ?? '',
      starRating: Number(info?.HotelRating ?? '3') || 3,
      distanceKm:
        info?.Distance?.Unit === 'MI'
          ? (info.Distance.Value ?? 0) * 1.60934
          : info?.Distance?.Value ?? 0,
      nightlyRate: first?.rate ?? 0,
      refundable: first?.refundable ?? false,
      currency: h.HotelRateInfo?.Rooms?.Room?.[0]?.RoomRate?.CurrencyCode ?? 'USD',
      address: info?.Address?.AddressLine1 ?? '',
      city: info?.Address?.CityName ?? '',
      description: '',
      rooms,
      policies: []
    };
  });
};
