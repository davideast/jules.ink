import { GoogleGenerativeAI } from '@google/generative-ai';
import { type Activity } from 'modjules';

// Configuration
const MODEL_NAME = 'gemini-2.5-flash-lite'; // Exact model requirement
const MAX_RETRIES = 3;

interface SummarizerConfig {
  apiKey?: string;
}

export class SessionSummarizer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(config: SummarizerConfig = {}) {
    const key = config.apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('Missing GEMINI_API_KEY environment variable');
    }
    this.genAI = new GoogleGenerativeAI(key);
    this.model = this.genAI.getGenerativeModel({ model: MODEL_NAME });
  }

  /**
   * Generates a recursive "Rolling Summary" based on the previous state
   * and the new activity.
   */
  async generateRollingSummary(
    previousState: string,
    currentActivity: Activity
  ): Promise<string> {
    const activityContext = this.simplifyActivity(currentActivity);

    // The Prompt Engineering: Strict Output Constraints
    const prompt = `
      ROLE: You are a Thermal Printer Log Agent.
      TASK: Update the current session summary based on a new activity.

      CONTEXT (Previous State):
      "${previousState || 'Session started.'}"

      NEW ACTIVITY:
      ${JSON.stringify(activityContext)}

      INSTRUCTIONS:
      1. Synthesize the Previous State with the New Activity.
      2. The output MUST be a single sentence.
      3. The output MUST be between 60 and 90 characters long.
      4. Focus on the "Net Result" (what was achieved), not just the action.
      5. Do not use Markdown, bolding, or special characters.

      OUTPUT:
    `;

    return this.executeWithRetry(prompt);
  }

  /**
   * Reduces the noisy Activity object to just the tokens needed for summarization.
   */
  private simplifyActivity(activity: Activity): Record<string, any> {
    const base: Record<string, any> = {
      type: activity.type,
      originator: activity.originator,
    };

    if (activity.planGenerated?.plan?.steps) {
      return { ...base, planTitle: activity.planGenerated.plan.steps[0]?.title || 'New Plan' };
    }

    if (activity.progressUpdated) {
      return { ...base, update: activity.progressUpdated.title };
    }

    if (activity.artifacts) {
      // Find a changeSet if it exists
      const changeSet = activity.artifacts.find(a => a.type === 'changeSet');
      if (changeSet) {
        // We don't send the whole diff, just the file names or the commit message idea
        // Parsing the raw diff here to just get the 'intent' saves tokens.
        return { ...base, hasCodeChanges: true };
      }
    }

    return base;
  }

  private async executeWithRetry(prompt: string, attempt = 1): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();

      // Basic cleanup for the printer
      text = text.replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ');

      return text;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        // Linear backoff
        await new Promise(r => setTimeout(r, 500 * attempt));
        return this.executeWithRetry(prompt, attempt + 1);
      }
      throw error;
    }
  }
}
