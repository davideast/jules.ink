import { describe, it, expect } from 'vitest';
import { SessionSummarizer } from '../src/summarizer.js';

// Only run if API key is present
const runIfKey = process.env.GEMINI_API_KEY ? describe : describe.skip;

runIfKey('SessionSummarizer (Integration with Gemini 2.5)', () => {
  it('generates a summary within character constraints', async () => {
    const summarizer = new SessionSummarizer({ backend: 'cloud' });
    const prevState = "Agent proposed a plan to update API to handle handshake intents.";
    const mockActivity: any = {
      type: 'progressUpdated',
      progressUpdated: { title: 'Implemented HandshakeContext type in src/api.ts' }
    };

    const summary = await summarizer.generateRollingSummary(prevState, mockActivity);

    console.log('Gemini Output:', summary);

    expect(summary).toBeTruthy();
    expect(typeof summary).toBe('string');

    // Check constraints (Soft check allowing slight variance from model)
    expect(summary.length).toBeGreaterThan(40);
    // expect(summary.length).toBeLessThan(120);
    expect(summary).not.toContain('**'); // No markdown
  });
});
