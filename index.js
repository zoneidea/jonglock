/**
 * @format
 */

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';
import {handleBackgroundPushMessage} from './src/services/notifications';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  await handleBackgroundPushMessage(remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
