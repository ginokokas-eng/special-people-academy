import fs from 'node:fs';
import path from 'node:path';

/**
 * Tiny .env reader — the suite deliberately has no dotenv dependency.
 * Real process env always wins, then `.env.e2e` (accounts), then `.env`
 * (the Vite backend URL + publishable key, which are not secret).
 */
function parseEnvFile(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export const repoRoot = process.cwd();

const fileEnv = {
  ...parseEnvFile(path.join(repoRoot, '.env')),
  ...parseEnvFile(path.join(repoRoot, '.env.e2e')),
};

export function env(name: string): string | undefined {
  return process.env[name] ?? fileEnv[name];
}

export function requireEnv(name: string): string {
  const value = env(name);
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.e2e.example to .env.e2e and fill it in (see tests/e2e/README.md).`,
    );
  }
  return value;
}

export const supabaseUrl = () => requireEnv('VITE_SUPABASE_URL');
export const supabaseAnonKey = () => requireEnv('VITE_SUPABASE_PUBLISHABLE_KEY');

export const authDir = path.join(repoRoot, 'tests/e2e/.auth');
export const staffStatePath = path.join(authDir, 'staff.json');
export const learnerStatePath = path.join(authDir, 'learner.json');
export const runFilePath = path.join(authDir, 'run.json');
export const fixturesDir = path.join(repoRoot, 'tests/e2e/fixtures');

export interface RunRecord {
  runId: string;
  courseId: string;
  courseTitle: string;
  orgName: string;
  orgId?: string;
  lessonAId?: string;
  lessonBId?: string;
  mcqBlockId?: string;
  /** Draft copy made by 10-clone-course.spec.ts; teardown deletes it first. */
  cloneCourseId?: string;
}


export function saveRun(run: RunRecord): void {
  fs.mkdirSync(authDir, { recursive: true });
  fs.writeFileSync(runFilePath, JSON.stringify(run, null, 2));
}

export function loadRun(): RunRecord {
  if (!fs.existsSync(runFilePath)) {
    throw new Error(
      'tests/e2e/.auth/run.json is missing — run 01-author-all-blocks.spec.ts first (it records the course this spec needs).',
    );
  }
  return JSON.parse(fs.readFileSync(runFilePath, 'utf8')) as RunRecord;
}
