export const Client = jest.fn(() => ({
  publishJSON: jest.fn().mockResolvedValue({ messageId: 'mock-id' }),
  publish: jest.fn().mockResolvedValue({ messageId: 'mock-id' }),
}))

export default { Client }
