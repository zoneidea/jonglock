import RNFS from 'react-native-fs';
let writes: Promise<unknown> = Promise.resolve();
/** Private app file: metadata only, never headers, tokens, session IDs, identity or card data. */
export function paymentActivity(event: string, endpoint: string, status?: number, durationMs?: number) {
  writes = writes.then(async () => {
    const directory = `${RNFS.DocumentDirectoryPath}/payment-logs`;
    const file = `${directory}/payments.log`;
    await RNFS.mkdir(directory);
    if (await RNFS.exists(file)) {
      const info = await RNFS.stat(file);
      if (Number(info.size) > 256 * 1024) {await RNFS.writeFile(file, '', 'utf8');}
    }
    await RNFS.appendFile(file, JSON.stringify({at: new Date().toISOString(), event, endpoint, status, durationMs}) + '\n', 'utf8');
  }).catch(() => undefined);
}
