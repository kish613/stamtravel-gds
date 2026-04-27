// Placeholder for Sabre-backed disruption notifications.
//
// Upstream mapping (live integration to be wired through src/lib/sabre/*):
//   - Sabre Travel Notification API   — itinerary-level events (schedule change, cancel, divert)
//   - Schedule Change Notification    — schedule updates against booked PNRs
//   - NotifyFlightStatusLLSRQ         — operational flight status (delayed / canceled)
//   - QueueAccessLLSRQ                — queue placements that carry rebooking actions
//
// The query hook in src/lib/query.ts targets /api/mock/notifications today; flip via flags.

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'sabre notifications not implemented' },
    { status: 501 }
  );
}
