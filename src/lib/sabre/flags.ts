const truthy = (v: string | undefined): boolean => v === 'true' || v === '1';

export const flags = {
  air: truthy(process.env.NEXT_PUBLIC_USE_SABRE_AIR),
  hotel: truthy(process.env.NEXT_PUBLIC_USE_SABRE_HOTEL),
  car: truthy(process.env.NEXT_PUBLIC_USE_SABRE_CAR),
  pnr: truthy(process.env.NEXT_PUBLIC_USE_SABRE_PNR),
  queues: truthy(process.env.NEXT_PUBLIC_USE_SABRE_QUEUES),
  bookAtpco: truthy(process.env.NEXT_PUBLIC_USE_SABRE_BOOK_ATPCO),
  bookNdc: truthy(process.env.NEXT_PUBLIC_USE_SABRE_BOOK_NDC),
  ticket: truthy(process.env.NEXT_PUBLIC_USE_SABRE_TICKET),
  terminal: truthy(process.env.NEXT_PUBLIC_USE_SABRE_TERMINAL)
} as const;

export type SabreFlag = keyof typeof flags;
