const listeners = new Set<() => void>();
export function notifyPaymentUpdate() {listeners.forEach(listener => listener());}
export function subscribeToPaymentUpdates(listener: () => void) {
  listeners.add(listener);
  return () => {listeners.delete(listener);};
}
