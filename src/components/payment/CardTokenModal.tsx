import {Text} from '../AppText';
import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Modal, Platform, Pressable, StyleSheet, View} from 'react-native';
import {WebView} from 'react-native-webview';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {API_BASE_URL} from '../../config/api';
import {paymentActivity} from '../../services/paymentActivity';
import {colors} from '../../theme/colors';

export default function CardTokenModal({visible, onToken, onCancel}: {visible: boolean; onToken: (token: string) => void; onCancel: () => void}) {
  const url = `${API_BASE_URL}/public/payments/reservepay/card-form?platform=${Platform.OS === 'ios' ? 'IOS' : 'ANDROID'}`;
  const webView = useRef<WebView<object>>(null);
  const recoveredBlank = useRef(false);
  const [presented, setPresented] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {if (failed && visible) {Alert.alert('ข้อมูลบัตร', 'โหลดฟอร์มบัตรไม่สำเร็จ กรุณาลองใหม่', [{text: 'ตกลง'}]);}}, [failed, visible]);
  useEffect(() => {if (!visible) {setPresented(false); setFailed(false); setLoading(true); recoveredBlank.current = false;}}, [visible]);
  useEffect(() => {
    if (!visible || !presented || !loading) {return;}
    const timeout = setTimeout(() => {setFailed(true); setLoading(false); paymentActivity('timeout', 'card-form');}, 20000);
    return () => clearTimeout(timeout);
  }, [visible, presented, loading]);
  return <Modal visible={visible} animationType="slide" onRequestClose={onCancel} onShow={() => setPresented(true)}>
    <View style={styles.frame}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.close}>
          <MaterialCommunityIcons name="chevron-left" size={23} color={colors.tealDark} />
          <Text style={styles.backText}>ช่องทางชำระเงิน</Text>
        </Pressable>
        <View style={styles.secure}><MaterialCommunityIcons name="lock-outline" size={14} color={colors.tealDark} /><Text style={styles.secureText}>ปลอดภัย</Text></View>
      </View>
      {loading && presented ? <ActivityIndicator accessibilityLabel="กำลังโหลดฟอร์มบัตร" /> : null}
      {failed ? <View style={styles.error}>
        <Pressable accessibilityRole="button" onPress={() => {setFailed(false); setLoading(true); webView.current?.reload();}}><Text>โหลดใหม่</Text></Pressable></View> : null}
      {visible && presented ? <WebView<object> ref={webView} style={styles.webView} source={{uri: url}} javaScriptEnabled mixedContentMode="never" originWhitelist={['https://*']}
        onLoadStart={() => {setLoading(true); paymentActivity('load-start', 'card-form');}}
        onLoadEnd={event => {
          const loadedUrl = event.nativeEvent.url;
          // Some iOS WebViews finish the initial empty document before applying source.
          // Navigate only from that empty document, once, to our fixed trusted form URL.
          if ((!loadedUrl || loadedUrl === 'about:blank') && !recoveredBlank.current) {
            recoveredBlank.current = true;
            paymentActivity('recover-empty-document', 'card-form');
            webView.current?.injectJavaScript(`window.location.replace(${JSON.stringify(url)});true;`);
            return;
          }
          setLoading(false); paymentActivity(loadedUrl === url ? 'load-end-trusted' : 'load-end-other', 'card-form');
        }}
        injectedJavaScript={'window.ReactNativeWebView.postMessage(JSON.stringify({type:\'reservepay.formStatus\',hasForm:!!document.getElementById(\'number\')}));true;'}
        onError={() => {setFailed(true); setLoading(false); paymentActivity('load-error', 'card-form');}}
        onHttpError={event => {setFailed(true); setLoading(false); paymentActivity('http-error', 'card-form', event.nativeEvent.statusCode);}}
        onContentProcessDidTerminate={() => {setFailed(true); setLoading(false); paymentActivity('process-terminated', 'card-form');}}
        onShouldStartLoadWithRequest={request => {
          const allowed = request.url === url || request.url === 'about:blank' || /^https:\/\/([a-z0-9-]+\.)*reservepay\.com\//i.test(request.url);
          if (!allowed) {paymentActivity('navigation-blocked', 'card-form');}
          return allowed;
        }}
        onMessage={event => {
          if (event.nativeEvent.data.includes('reservepay.formStatus')) {
            try {const status = JSON.parse(event.nativeEvent.data); if (status.type === 'reservepay.formStatus') {paymentActivity(status.hasForm ? 'form-present' : 'form-missing', 'card-form'); if (!status.hasForm && event.nativeEvent.url === url) {setFailed(true);} return;}} catch { /* Ignore malformed diagnostics. */ }
          }
          if (event.nativeEvent.url !== url) {return;}
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'reservepay.cardError') {Alert.alert('ข้อมูลบัตร', 'กรุณาตรวจสอบข้อมูลบัตรหรือโหลดฟอร์มใหม่', [{text: 'ตกลง'}]);}
            if (message.type === 'reservepay.cardToken' && typeof message.token === 'string' && /^[\x21-\x7e]{1,512}$/.test(message.token)) {onToken(message.token);}
          } catch { /* Ignore messages unrelated to tokenization. */ }
        }} /> : null}
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  frame: {flex: 1, paddingTop: Platform.OS === 'ios' ? 54 : 16, backgroundColor: colors.white},
  header: {minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border},
  close: {paddingVertical: 14, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 2},
  backText: {color: colors.tealDark, fontSize: 14, fontWeight: '700'},
  secure: {flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, backgroundColor: colors.soft, paddingVertical: 6, paddingHorizontal: 10},
  secureText: {color: colors.tealDark, fontSize: 11, fontWeight: '700'},
  webView: {flex: 1, backgroundColor: colors.background}, error: {padding: 20, gap: 12},
});
