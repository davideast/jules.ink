import { loadSkillRules } from './src/skill-loader';
import fs from 'fs/promises';
import path from 'path';

async function setup() {
  const dir = path.join(process.cwd(), '.agents', 'skills', 'test', 'rules');
  await fs.mkdir(dir, { recursive: true });
  for (let i = 0; i < 1000; i++) {
    await fs.writeFile(path.join(dir, `rule_${i}.md`), `---
title: Rule ${i}
impact: HIGH
tags: tag1, tag2
---
## Title
This is the first sentence for rule ${i}.
`);
  }
}

async function run() {
  const start = performance.now();
  await loadSkillRules('test', { maxRules: 1000 });
  const end = performance.now();
  console.log(`Time taken: ${end - start} ms`);
}

async function main() {
  await setup();
  // Warmup
  await run();
  // Test
  let total = 0;
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    await loadSkillRules('test', { maxRules: 1000 });
    const end = performance.now();
    total += (end - start);
  }
  console.log(`Average time taken: ${total / 5} ms`);
}

main().catch(console.error);
