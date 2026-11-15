export const ORDER_STATUS_VARIANT: Record<
  string,
  'default' | 'success' | 'warning' | 'destructive' | 'secondary'
> = {
  PENDING_PAYMENT: 'warning',
  PAYMENT_QUEUED: 'warning',
  PAID: 'success',
  CONFIRMED: 'success',
  PAYMENT_FAILED: 'destructive',
  EXPIRED: 'secondary',
  CANCELLED: 'secondary',
}

export const EVENT_STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'secondary'> =
  {
    ON_SALE: 'success',
    SCHEDULED: 'secondary',
    SOLD_OUT: 'warning',
    ENDED: 'secondary',
    DRAFT: 'secondary',
  }
