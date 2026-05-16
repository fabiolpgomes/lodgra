export const Client = jest.fn(() => ({
  publishJSON: jest.fn().mockResolvedValue({ messageId: 'mock-id' }),
  publish: jest.fn().mockResolvedValue({ messageId: 'mock-id' }),
}))

const mockQstash = { Client }
export default mockQstash
