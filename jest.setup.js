/* global jest */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() =>
      Promise.resolve({
        data: {
          user: {
            name: 'Jonglock Merchant',
            email: 'merchant@gmail.com',
            photo: null,
          },
        },
      }),
    ),
    signOut: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: {
    app: jest.fn(() => ({name: '[DEFAULT]'})),
  },
}));

jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const {View} = require('react-native');
  return function LinearGradient(props) {
    return React.createElement(View, props, props.children);
  };
});
