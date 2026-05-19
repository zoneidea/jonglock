import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors} from '../theme/colors';

function GoogleIcon() {
  return (
    <View style={styles.googleIcon}>
      <Text style={styles.googleIconText}>G</Text>
      <View style={[styles.googleDot, styles.googleDotRed]} />
      <View style={[styles.googleDot, styles.googleDotYellow]} />
      <View style={[styles.googleDot, styles.googleDotGreen]} />
    </View>
  );
}

const styles = StyleSheet.create({
  googleIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#e2e7ef',
  },
  googleIconText: {
    color: '#4285f4',
    fontSize: 19,
    fontWeight: '900',
  },
  googleDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  googleDotRed: {
    top: 6,
    right: 7,
    backgroundColor: '#ea4335',
  },
  googleDotYellow: {
    bottom: 6,
    right: 7,
    backgroundColor: '#fbbc05',
  },
  googleDotGreen: {
    bottom: 6,
    left: 7,
    backgroundColor: '#34a853',
  },
});

export default GoogleIcon;
