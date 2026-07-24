/**
 * Quick smoke test for the engine — analyzes the gitlens repo itself.
 * Run with: npx tsx scripts/test-engine.ts
 */

import { analyze } from '../packages/engine/src/index.js';
import { computeFileStats, groupByModule, topFiles } from '../packages/engine/src/diff-stats.js';

async function main() {
  const repoPath = process.argv[2] || process.cwd();

  console.log(`\n🔍 Analyzing: ${repoPath}\n`);

  const result = await analyze({
    repoPath,
    maxCommits: 500,
    onProgress: (event) => {
      const bar = '█'.repeat(Math.floor(event.progress * 20));
      const empty = '░'.repeat(20 - Math.floor(event.progress * 20));
      process.stdout.write(`\r  [${bar}${empty}] ${event.phase}: ${event.message}`);
      if (event.phase === 'done') console.log('\n');
    },
  });

  console.log('\n📊 Summary:');
  console.log(`  Repository: ${result.repoPath}`);
  console.log(`  HEAD: ${result.headHash.slice(0, 8)}`);
  console.log(`  Commits: ${result.totalCommits}`);
  console.log(`  Authors: ${result.authors.length}`);
  console.log(`  Date range: ${result.dateRange.start.toLocaleDateString()} → ${result.dateRange.end.toLocaleDateString()}`);
  console.log(`  Groups: ${result.groups.length}`);

  console.log('\n👤 Authors:');
  for (const author of result.authors.slice(0, 5)) {
    console.log(`  ${author.name} — ${author.commits} commits, +${author.additions}/-${author.deletions}`);
  }

  console.log('\n📦 Commit Groups:');
  for (const group of result.groups.slice(0, 5)) {
    console.log(`  [${group.commitHashes.length} commits] ${group.label}`);
    console.log(`    ${group.startDate.toLocaleDateString()} → ${group.endDate.toLocaleDateString()}`);
    console.log(`    keywords: ${group.keywords.join(', ')}`);
  }

  console.log('\n🔥 Top Files (by changes):');
  const fileStats = computeFileStats(result.commits);
  const top = topFiles(fileStats, 10);
  for (const f of top) {
    console.log(`  ${f.path} — ${f.changeCount} changes, +${f.totalAdditions}/-${f.totalDeletions}`);
  }

  console.log('\n📁 Modules:');
  const modules = groupByModule(fileStats);
  for (const m of modules) {
    console.log(`  ${m.module}/ — ${m.fileCount} files, ${m.totalChanges} changes`);
  }

  console.log('\n✅ Engine test complete!\n');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
