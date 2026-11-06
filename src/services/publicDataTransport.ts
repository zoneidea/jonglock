const ATTEMPT_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

// Only for public, read-only data. Never use for booking/payment mutations.
export async function fetchPublicData(url: string): Promise<Response> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('การเชื่อมต่อหมดเวลา กรุณาลองใหม่'));
          controller.abort();
        }, ATTEMPT_TIMEOUT_MS);
      });
      const response = await Promise.race([
        fetch(url, {method: 'GET', signal: controller.signal}),
        timeout,
      ]);
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS - 1) {
        return response;
      }
    } catch (error) {
      if (attempt === MAX_ATTEMPTS - 1) {
        throw error;
      }
    } finally {
      clearTimeout(timer);
    }
    await new Promise<void>(resolve => setTimeout(resolve, (attempt + 1) * 1000));
  }
  throw new Error('ยังไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่');
}
