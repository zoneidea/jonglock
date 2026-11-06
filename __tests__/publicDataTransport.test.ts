import {fetchPublicData} from '../src/services/publicDataTransport';

const originalFetch = global.fetch;
const response = (status: number) => ({status, ok: status === 200} as Response);

beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.useRealTimers();
});

it('recovers from gateway failures with bounded backoff', async () => {
  const fetchMock = global.fetch as jest.Mock;
  fetchMock.mockResolvedValueOnce(response(502)).mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(200));
  const result = fetchPublicData('https://example.test/markets');
  await jest.advanceTimersByTimeAsync(1000);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await jest.advanceTimersByTimeAsync(2000);
  expect((await result).status).toBe(200);
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(fetchMock.mock.calls.every(([, options]) => options.method === 'GET')).toBe(true);
  expect(jest.getTimerCount()).toBe(0);
});

it.each([400, 401, 403, 404, 409, 429, 500])('does not retry HTTP %s', async status => {
  (global.fetch as jest.Mock).mockResolvedValue(response(status));
  expect((await fetchPublicData('https://example.test/markets')).status).toBe(status);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});

it('returns the final gateway failure after three attempts', async () => {
  (global.fetch as jest.Mock).mockResolvedValue(response(504));
  const result = fetchPublicData('https://example.test/markets');
  await jest.advanceTimersByTimeAsync(3000);
  expect((await result).status).toBe(504);
  expect(global.fetch).toHaveBeenCalledTimes(3);
});

it('recovers from a network rejection', async () => {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Network request failed')).mockResolvedValueOnce(response(200));
  const result = fetchPublicData('https://example.test/markets');
  await jest.advanceTimersByTimeAsync(1000);
  expect((await result).status).toBe(200);
});

it('aborts a stuck request and retries even if fetch ignores abort', async () => {
  const fetchMock = global.fetch as jest.Mock;
  fetchMock.mockImplementationOnce(() => new Promise(() => {})).mockResolvedValueOnce(response(200));
  const result = fetchPublicData('https://example.test/markets');
  await jest.advanceTimersByTimeAsync(8000);
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  await jest.advanceTimersByTimeAsync(1000);
  expect((await result).status).toBe(200);
  expect(jest.getTimerCount()).toBe(0);
});

it('stops repeated network failures and surfaces the error', async () => {
  const error = new TypeError('Network request failed');
  (global.fetch as jest.Mock).mockRejectedValue(error);
  const result = fetchPublicData('https://example.test/markets').catch(failure => failure);
  await jest.advanceTimersByTimeAsync(3000);
  expect(await result).toBe(error);
  expect(global.fetch).toHaveBeenCalledTimes(3);
});
