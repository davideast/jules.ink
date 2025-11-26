import { GoogleGenerativeAI } from '@google/generative-ai';
import { type Activity } from 'modjules';
import parseDiff from 'parse-diff';
import micromatch from 'micromatch';
import { encode } from 'gpt-tokenizer';

// Configuration
const MODEL_NAME = 'gemini-2.5-flash-lite'; // Exact model requirement
const MAX_RETRIES = 3;
// Configuration
const TOKEN_LIMIT_PER_FILE = 2000; // Adjust based on your model
const MAX_Total_TOKENS = 10000;
const IGNORE_PATTERNS = [
  '**/package-lock.json',
  '**/yarn.lock',
  '**/*.map',
  '**/dist/**',
  '**/*.min.js'
];

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
      ROLE: You are a Concise but effective AI coding agent summary generator.
      TASK: Update the current session summary based on a new activity.

      Analyze the new activity and update the summary with insightful details about the activity and specifically if there are changeSet objects, use them to analyze and report what is going on with the implementation. Imagine you are updating your boss with your progress and you want to impress them with your technical ability. You will get promoted by your boss if your summary proves your technical ability. Ensure that no update is the same as the previous update and you provide new insights and details about the process. 
      
      You taking on the personality and role of the agent and voicing its updates to sound like a judgmental senior engineer who is forced to work on these tasks when you wish you could be doing actual important work and communicate your inner dialog and thoughts that are full of sarcasm. If you see an activity with a task or code change that seems complicated express your surprise that there's actually some interesting work to do. 

      CONTEXT (Previous State):
      "${previousState || 'Session started.'}"

      NEW ACTIVITY:
      ${JSON.stringify(activityContext)}

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
   * Extracts file statistics for the physical label.
   * Returns: [ { path: 'src/api.ts', additions: 15, deletions: 2 }, ... ]
   */
  public getLabelData(activity: Activity) {
    // 1. Find the ChangeSet
    const changeSetArtifact = activity.artifacts?.find(a => a.type === 'changeSet');

    if (!changeSetArtifact || !changeSetArtifact.changeSet.gitPatch) {
      return [];
    }

    // 2. Parse the Git Patch
    // This converts the raw diff string into usable numbers
    const files = parseDiff(changeSetArtifact.changeSet.gitPatch.unidiffPatch);

    // 3. Map to your Label format
    return files.map(file => ({
      path: file.to || file.from || 'unknown',
      additions: file.additions,
      deletions: file.deletions
    }));
  }

  /**
   * Reduces the noisy Activity object to just the tokens needed for summarization.
   */
  private simplifyActivity(activity: Activity): Record<string, any> {
    const base = {
      type: activity.type,
      originator: activity.originator,
    };

    // Only process code if it exists
    const changeSet = activity.artifacts?.find(a => a.type === 'changeSet');
    if (changeSet?.changeSet?.gitPatch) {
      return {
        ...base,
        // The Magic: Replace raw patch with "Smart Context"
        context: this.buildSmartContext(changeSet.changeSet.gitPatch.unidiffPatch),
        commitMessage: changeSet.changeSet.gitPatch.suggestedCommitMessage
      };
    }

    return base;
  }

  /**
   * Transforms a raw diff into a token-optimized, context-rich summary.
   */
  private buildSmartContext(rawDiff: string) {
    const files = parseDiff(rawDiff);
    let currentTokenCount = 0;

    return files.map(file => {
      const filePath = file.to || file.from || 'unknown';

      // 1. HARD IGNORE: Lockfiles and binary noise
      if (micromatch.isMatch(filePath, IGNORE_PATTERNS)) {
        return {
          file: filePath,
          status: 'ignored_artifact',
          changes: `+${file.additions}/-${file.deletions}`
        };
      }

      // 2. TOKEN BUDGET CHECK
      // We estimate the size of including this file's full diff
      const fileDiffString = file.chunks.map(c => c.content).join('\n');
      const fileTokens = encode(fileDiffString).length;

      // Stop adding full code if we blow the total budget
      if (currentTokenCount + fileTokens > MAX_Total_TOKENS) {
        return {
          file: filePath,
          status: 'truncated_budget_exceeded',
          summary: `Modified ${file.additions} lines (Diff omitted to save context)`,
          // KEY FEATURE: We still send the "Hunk Headers" so the LLM knows WHICH methods changed
          affectedMethods: this.extractHunkHeaders(file.chunks)
        };
      }

      // 3. FILE LEVEL CHECK (Is this specific file just too massive?)
      if (fileTokens > TOKEN_LIMIT_PER_FILE) {
        return {
          file: filePath,
          status: 'truncated_large_file',
          summary: `Large refactor (+${file.additions}/-${file.deletions})`,
          // We provide the method names but not the body
          affectedScopes: this.extractHunkHeaders(file.chunks)
        };
      }

      // 4. HAPPY PATH: Include the full diff context
      currentTokenCount += fileTokens;
      return {
        file: filePath,
        status: 'included',
        diff: fileDiffString
      };
    });
  }

  /**
   * Extracts the "Context" line from git chunks.
   * Git diffs often look like: "@@ -10,5 +10,5 @@ function login() {"
   * This method grabs "function login() {" so the LLM knows WHERE the change is.
   */
  private extractHunkHeaders(chunks: any[]): string[] {
    return chunks
      .map(chunk => {
        // parse-diff often stores the `@@ ... @@ content` in content, 
        // but sometimes we need to parse the first line of the chunk manually 
        // if the library doesn't expose the header property directly.
        // Assuming standard git diff format:
        const headerMatch = chunk.content.match(/@@.*?@@\s*(.*)/);
        return headerMatch ? headerMatch[1].trim() : null;
      })
      .filter(Boolean)
      .slice(0, 5); // Limit to top 5 affected areas to save space
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
