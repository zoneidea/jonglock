import React from 'react';
import {Modal, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import {WebView} from 'react-native-webview';
import {API_BASE_URL} from '../../config/api';

export default function CardTokenModal({visible, onToken, onCancel}: {visible: boolean; onToken: (token: string) => void; onCancel: () => void}) {
  const url = `${API_BASE_URL}/public/payments/reservepay/card-form?platform=${Platform.OS === 'ios' ? 'IOS' : 'ANDROID'}`;
  return <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
    <View style={styles.frame}>
      <Pressable accessibilityRole="button" onPress={onCancel} style={styles.close}><Text>กลับไปเลือกช่องทาง</Text></Pressable>
      {visible ? <WebView source={{uri: url}} javaScriptEnabled mixedContentMode="never" originWhitelist={['https://*']}
        onShouldStartLoadWithRequest={request => request.url === url || request.url === 'about:blank' || /^https:\/\/([a-z0-9-]+\.)*reservepay\.com\//i.test(request.url)}
        onMessage={event => {
          if (event.nativeEvent.url !== url) {return;}
          try {const message = JSON.parse(event.nativeEvent.data); if (message.type === 'reservepay.cardToken' && typeof message.token === 'string' && /^[\x21-\x7e]{1,512}$/.test(message.token)) {onToken(message.token);}} catch { /* Ignore messages unrelated to tokenization. */ }
        }} /> : null}
    </View>
  </Modal>;
}
const styles = StyleSheet.create({frame: {flex: 1, paddingTop: Platform.OS === 'ios' ? 54 : 16, paddingBottom: 20, backgroundColor: 'white'}, close: {padding: 18, alignItems: 'flex-end'}});
