import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionSummarizer } from '../src/summarizer.js';

// Mock the Google SDK
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel
  }))
}));

describe('SessionSummarizer (Unit)', () => {
  let summarizer: SessionSummarizer;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    summarizer = new SessionSummarizer();
    vi.clearAllMocks();
  });

  it('constructs the correct prompt structure', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Valid summary string.' }
    });

    const mockActivity: any = { type: 'planGenerated', planGenerated: { plan: { steps: [{ title: 'Fix API' }] } } };

    await summarizer.generateRollingSummary('Old State', mockActivity);

    // Verify the prompt sent to the model contains our constraints
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs).toContain('ROLE: You are a Thermal Printer Log Agent');
    expect(callArgs).toContain('Old State');
    expect(callArgs).toContain('Fix API');
  });

  it('retries on failure', async () => {
    // Fail twice, succeed third time
    mockGenerateContent
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Rate limit'))
      .mockResolvedValue({ response: { text: () => 'Recovered.' } });

    const result = await summarizer.generateRollingSummary('', {} as any);
    expect(result).toBe('Recovered.');
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  });
});
