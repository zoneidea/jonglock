import qrcode from 'qrcode-generator';
import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';

/** Renders a QR payload with plain Views (no native QR/SVG dependency). Dark runs per row are merged. */
function PaymentQrCode({value, size = 220}: {value: string; size?: number}) {
  const rows = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    const result: Array<Array<{start: number; length: number}>> = [];
    for (let row = 0; row < count; row += 1) {
      const runs: Array<{start: number; length: number}> = [];
      let column = 0;
      while (column < count) {
        if (qr.isDark(row, column)) {
          const start = column;
          while (column < count && qr.isDark(row, column)) {column += 1;}
          runs.push({start, length: column - start});
        } else {
          column += 1;
        }
      }
      result.push(runs);
    }
    return {count, rows: result};
  }, [value]);

  const quietZone = 4;
  const cell = size / (rows.count + quietZone * 2);

  return (
    <View style={[styles.surface, {width: size, height: size, padding: cell * quietZone}]} accessibilityLabel="QR Code สำหรับชำระเงิน">
      {rows.rows.map((runs, rowIndex) => (
        <View key={rowIndex} style={{height: cell}}>
          {runs.map((run) => (
            <View
              key={run.start}
              style={[styles.dark, {left: run.start * cell, width: run.length * cell + 0.5, height: cell + 0.5}]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: '#ffffff',
  },
  dark: {
    position: 'absolute',
    top: 0,
    backgroundColor: '#000000',
  },
});

export default React.memo(PaymentQrCode);
