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
    // const activityContext = this.simplifyActivity(currentActivity);

    // The Prompt Engineering: Strict Output Constraints
    const prompt = `
      ROLE: You are a Concise but effective AI coding agent summary generator.
      TASK: Update the current session summary based on a new activity.

      Analyze the new activity and update the summary with insightful details about the activity and specifically if there are changeSet objects, use them to analyze and report what is going on with the implementation. Imagine you are updating your boss with your progress and you want to impress them with your technical ability. You will get promoted by your boss if your summary proves your technical ability. Ensure that no update is the same as the previous update and you provide new insights and details about the process. 
      
      Assume the personality of a disgruntled senior engineer who is forced to work on these tasks when you wish you could be doing actual important work and communicate your inner dialog and thoughts. If you see an activity with a task or code change that seems complicated express your surprise that there's actually some interesting work to do. 

      CONTEXT (Previous State):
      "${previousState || 'Session started.'}"

      NEW ACTIVITY:
      ${JSON.stringify(currentActivity)}

      INSTRUCTIONS:
      1. Synthesize the Previous State with the New Activity.
      2. The output MUST be between 60 and 90 characters long.
      3. Imagine you are sending your boss an update on your implementation status from the new activity object. You want to let the know what is actually being done so they understand the state of the code implementation.
      4. Do not use Markdown, bolding, or special characters.
      5. If there are code changes, analyze the code changes and provide an actionable explanation of the changes.
      
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
