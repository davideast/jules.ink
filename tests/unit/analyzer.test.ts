import { describe, it, expect } from 'vitest';
import { analyzeChangeSet, analyzeContextForPrompt, extractHunkHeaders } from '../../src/analyzer.js';

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
    expect(result.summaryString).toBe('1 files | +3 / -1');
  });

  it('includes totalChanges for each file', () => {
    const result = analyzeChangeSet(MOCK_DIFF);
    expect(result.files[0].totalChanges).toBe(4); // 3 adds + 1 del
  });

  it('handles empty diffs gracefully', () => {
    const result = analyzeChangeSet('');
    expect(result.totalFiles).toBe(0);
    expect(result.totalInsertions).toBe(0);
  });

  it('ignores lockfiles and noise', () => {
    const diff = `
diff --git a/package-lock.json b/package-lock.json
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,1 +1,1 @@
-old
+new
diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,1 +1,1 @@
-old
+new line
`;
    const result = analyzeChangeSet(diff);
    expect(result.totalFiles).toBe(1);
    expect(result.files[0].path).toBe('src/index.ts');
    expect(result.totalInsertions).toBe(1);
  });

  it('sorts files by total changes descending', () => {
    const diff = `
diff --git a/small.ts b/small.ts
--- a/small.ts
+++ b/small.ts
@@ -1,1 +1,1 @@
-old
+new
diff --git a/large.ts b/large.ts
--- a/large.ts
+++ b/large.ts
@@ -1,1 +1,5 @@
-old
+1
+2
+3
+4
+5
diff --git a/medium.ts b/medium.ts
--- a/medium.ts
+++ b/medium.ts
@@ -1,1 +1,3 @@
-old
+1
+2
+3
`;
    const result = analyzeChangeSet(diff);
    expect(result.totalFiles).toBe(3);
    expect(result.files[0].path).toBe('large.ts');
    expect(result.files[1].path).toBe('medium.ts');
    expect(result.files[2].path).toBe('small.ts');
  });

  it('handles renamed files correctly', () => {
    const diff = `
diff --git a/old-name.ts b/new-name.ts
similarity index 100%
rename from old-name.ts
rename to new-name.ts
`;
    const result = analyzeChangeSet(diff);
    expect(result.totalFiles).toBe(1);
    expect(result.files[0].path).toBe('new-name.ts');
    expect(result.files[0].totalChanges).toBe(0);
  });

  it('handles binary files gracefully', () => {
    const diff = `
diff --git a/image.png b/image.png
new file mode 100644
index 0000000..1234567
Binary files /dev/null and b/image.png differ
`;
    const result = analyzeChangeSet(diff);
    expect(result.totalFiles).toBe(1);
    expect(result.files[0].path).toBe('image.png');
    expect(result.totalInsertions).toBe(0);
  });

  it('handles malformed diff strings gracefully', () => {
    const result = analyzeChangeSet('this is not a diff');
    expect(result.totalFiles).toBe(0);
    expect(result.files.length).toBe(0);
  });
});

describe('Context Analyzer (for prompts)', () => {
  it('correctly analyzes a simple file change', () => {
    const result = analyzeContextForPrompt(MOCK_DIFF);
    expect(result.length).toBe(1);
    expect(result[0].file).toBe('src/api.ts');
    expect(result[0].status).toBe('included');
    expect(result[0].diff).toContain('const new = 2;');
  });

  it('ignores files in IGNORE_PATTERNS', () => {
    const diff = `
diff --git a/package-lock.json b/package-lock.json
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,1 +1,1 @@
-old
+new
`;
    const result = analyzeContextForPrompt(diff);
    expect(result.length).toBe(1);
    expect(result[0].file).toBe('package-lock.json');
    expect(result[0].status).toBe('ignored_artifact');
    expect(result[0].changes).toBe('+1/-1');
  });

  it('detects large files (truncated)', () => {
    // Generate a large diff
    const largeContent = Array(5000).fill('+line').join('\n');
    const diff = `
diff --git a/large-file.ts b/large-file.ts
index 123..456 100644
--- a/large-file.ts
+++ b/large-file.ts
@@ -1,1 +1,5000 @@
-old
${largeContent}
`;
    const result = analyzeContextForPrompt(diff);
    expect(result.length).toBe(1);
    // Depending on token count, it might be truncated_large_file or truncated_budget_exceeded
    // Given TOKEN_LIMIT_PER_FILE is 2000, 5000 lines should likely exceed it.
    expect(result[0].status).toMatch(/truncated_/);
    expect(result[0].file).toBe('large-file.ts');
  });

    it('extracts hunk headers correctly', () => {
    const diffChunks = [
        {
            content: '@@ -1,5 +1,7 @@ function test() {'
        },
        {
            content: '@@ -10,5 +10,7 @@ class MyClass {'
        }
    ];
    const headers = extractHunkHeaders(diffChunks);
    expect(headers).toEqual(['function test() {', 'class MyClass {']);
  });
});
