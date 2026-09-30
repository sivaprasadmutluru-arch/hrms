module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '^react-native-bootsplash$': '<rootDir>/__mocks__/bootsplashMock.js',
    '^@react-native-community/netinfo$': '<rootDir>/__mocks__/netInfoMock.js',
    '^react-native-geolocation-service$': '<rootDir>/__mocks__/geolocationMock.js',
    '^@react-native-documents/picker$': '<rootDir>/__mocks__/documentPickerMock.js',
    '^react-native-linear-gradient$': '<rootDir>/__mocks__/linearGradientMock.js',
    '^react-native-image-picker$': '<rootDir>/__mocks__/imagePickerMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|@react-native-async-storage|@react-native-documents|react-native|react-native-css-interop|react-native-vector-icons|nativewind)/)',
  ],
};
