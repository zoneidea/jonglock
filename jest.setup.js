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

jest.mock('@react-native-firebase/auth', () => {
  const auth = jest.fn(() => ({
    signOut: jest.fn(() => Promise.resolve()),
    currentUser: null,
  }));
  auth.PhoneAuthProvider = {
    credential: jest.fn(() => ({})),
  };
  return {
    __esModule: true,
    default: auth,
    FirebaseAuthTypes: {},
  };
});

jest.mock('@react-native-firebase/firestore', () => {
  const collection = {
    doc: jest.fn(() => ({
      delete: jest.fn(() => Promise.resolve()),
      set: jest.fn(() => Promise.resolve()),
    })),
    where: jest.fn(() => collection),
    onSnapshot: jest.fn((onNext) => {
      onNext({forEach: jest.fn()});
      return jest.fn();
    }),
  };
  const firestore = jest.fn(() => ({
    batch: jest.fn(() => ({
      delete: jest.fn(),
      commit: jest.fn(() => Promise.resolve()),
    })),
    collection: jest.fn(() => collection),
    runTransaction: jest.fn((handler) =>
      handler({
        get: jest.fn(() => Promise.resolve({exists: false, id: 'mock-lock', data: jest.fn()})),
        set: jest.fn(),
      }),
    ),
  }));
  return {
    __esModule: true,
    default: firestore,
  };
});

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

jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: {
    save: jest.fn(() => Promise.resolve('mock-photo-id')),
  },
}));

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/tmp',
  downloadFile: jest.fn(() => ({promise: Promise.resolve({statusCode: 200})})),
  unlink: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  const {View} = require('react-native');
  return {
    Camera: function MockCamera(props) {
      return React.createElement(View, props);
    },
    useCameraDevice: jest.fn(() => ({id: 'mock-camera'})),
    useCameraPermission: jest.fn(() => ({
      hasPermission: true,
      requestPermission: jest.fn(() => Promise.resolve(true)),
    })),
    useCodeScanner: jest.fn((scanner) => scanner),
  };
});

jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const {View} = require('react-native');
  return function LinearGradient(props) {
    return React.createElement(View, props, props.children);
  };
});
