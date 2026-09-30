module.exports = {
  getCurrentPosition: jest.fn(),
  requestAuthorization: jest.fn(() => Promise.resolve('granted')),
};
