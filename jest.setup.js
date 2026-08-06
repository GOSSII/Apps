/* AsyncStorage is a native module; tests get the library's official in-memory
   mock so the store can be exercised off-device. */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
