const axios = require('axios');

const mockPost = jest.fn();
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: mockPost,
  })),
}));

const llmService = require('../src/services/llm.service');

describe('LLM Service Integration', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should format request payload and call /context', async () => {
    const mockResponse = {
      data: {
        status: 'FOLLOW_UP',
        question: 'How long have you had this fever?',
        missing_fields: ['duration'],
      },
    };
    mockPost.mockResolvedValue(mockResponse);

    const result = await llmService.postContext({
      conversationId: 'test-conv-123',
      message: 'I have a fever',
      browserLocation: {
        city: 'Mumbai',
        latitude: 19.076,
        longitude: 72.8777,
      },
    });

    expect(result.status).toBe('FOLLOW_UP');
    expect(result.question).toBe('How long have you had this fever?');
    expect(mockPost).toHaveBeenCalledWith('/context', {
      conversation_id: 'test-conv-123',
      message: 'I have a fever',
      browser_location: {
        city: 'Mumbai',
        latitude: 19.076,
        longitude: 72.8777,
        formattedAddress: null,
      },
    });
  });
});
