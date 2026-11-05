// A pending provider transaction is locked until the server settles it.
export function canModifyCartBooking(booking: {status: string}): boolean {
  return booking.status === 'pending_payment';
}
