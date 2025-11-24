import { describe, it, expect } from 'vitest';
import { analyzeChangeSet, BLOCK_FULL, BLOCK_LIGHT } from '../../src/analyzer.js';

const MOCK_DIFF = `
diff --git a/src/api.ts b/src/api.ts
index 123..456 100644
--- a/src/api.ts
+++ b/src/api.ts
@@ -1,5 +1,7 @@
-const old = 1;
+const new = 2;
+const extra = 3;
+const another = 4;
`;

describe('ChangeSet Analyzer', () => {
  it('correctly calculates additions and deletions', () => {
    const result = analyzeChangeSet(MOCK_DIFF);

    expect(result.totalFiles).toBe(1);
    expect(result.totalInsertions).toBe(3); // 3 lines added
    expect(result.totalDeletions).toBe(1);  // 1 line removed
    expect(result.files[0].path).toBe('src/api.ts');
  });

  it('generates the correct summary string', () => {
    const result = analyzeChangeSet(MOCK_DIFF);
    expect(result.summaryString).toBe('1 files changed, 3 insertions(+), 1 deletions(-)');
  });

  it('generates a proportional visual graph', () => {
    // 3 adds, 1 del. Total 4.
    // Ratio: 75% add, 25% del.
    const result = analyzeChangeSet(MOCK_DIFF, { maxGraphWidth: 4 });

    // We expect 3 full blocks and 1 light block
    const expectedGraph = BLOCK_FULL.repeat(3) + BLOCK_LIGHT.repeat(1);
    expect(result.files[0].graph).toBe(expectedGraph);
  });

  it('handles empty diffs gracefully', () => {
    const result = analyzeChangeSet('');
    expect(result.totalFiles).toBe(0);
    expect(result.totalInsertions).toBe(0);
  });
});
