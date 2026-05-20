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
        type: 'success',
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
  isCancelledResponse: jest.fn((response) => response.type === 'cancelled'),
  isErrorWithCode: jest.fn((error) => Boolean(error && error.code)),
  isSuccessResponse: jest.fn((response) => response.type === 'success'),
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
  },
}));

jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: {
    app: jest.fn(() => ({name: '[DEFAULT]'})),
  },
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const {Text} = require('react-native');
  return function MaterialCommunityIcons(props) {
    return React.createElement(Text, props, props.name);
  };
});

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(() => Promise.resolve({didCancel: true})),
}));

jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const {View} = require('react-native');
  return function LinearGradient(props) {
    return React.createElement(View, props, props.children);
  };
});
