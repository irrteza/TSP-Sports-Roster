import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const buildDir = mkdtempSync(join(tmpdir(), 'roster-scraper-tests-'));
try {
  const compile = spawnSync(process.execPath, [
    'node_modules/typescript/bin/tsc', '-p', 'api/tsconfig.json',
    '--noEmit', 'false', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--outDir', buildDir,
  ], { stdio: 'inherit' });
  if (compile.status !== 0) process.exitCode = compile.status || 1;
  else {
    writeFileSync(join(buildDir, 'package.json'), '{"type":"module"}');
    const tests = spawnSync(process.execPath, ['--test', 'tests/scrape-metrics.test.mjs'], {
      stdio: 'inherit', env: { ...process.env, SCRAPER_TEST_BUILD_DIR: buildDir },
    });
    process.exitCode = tests.status ?? 1;
  }
} finally {
  rmSync(buildDir, { recursive: true, force: true });
}
