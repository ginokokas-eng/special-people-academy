import fs from 'node:fs';
import { expect, test as setup, type Page } from '@playwright/test';
import { authDir, learnerStatePath, requireEnv, staffStatePath } from './support/env';

/**
 * Setup project: signs in the two LONG-LIVED e2e accounts through the real Auth
 * page and saves one storageState per role. Accounts are never deleted.
 *
 * The staff account's role is granted ONCE by the operator with SQL — see
 * tests/e2e/README.md. This suite never grants roles.
 */

async function signIn(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto('/auth');
  await page.getByRole('tab', { name: 'Sign In' }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();

  // Either we leave /auth (success) or an error stays on the page.
  const left = await page
    .waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  return left;
}

async function signUp(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto('/auth');
  await page.getByRole('tab', { name: 'Sign Up' }).click();
  await page.getByLabel('Full Name').fill('E2E Test User');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create Account' }).click();

  return page
    .waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 25_000 })
    .then(() => true)
    .catch(() => false);
}

async function establishSession(page: Page, role: 'staff' | 'learner'): Promise<void> {
  const email = requireEnv(role === 'staff' ? 'E2E_STAFF_EMAIL' : 'E2E_LEARNER_EMAIL');
  const password = requireEnv(role === 'staff' ? 'E2E_STAFF_PASSWORD' : 'E2E_LEARNER_PASSWORD');

  if (await signIn(page, email, password)) return;

  // First ever run: create the account through the real sign-up form.
  if (await signUp(page, email, password)) return;

  throw new Error(
    [
      `Could not establish a session for the ${role} account (${email}).`,
      '',
      'Fix one of these:',
      '  1. Wrong password in .env.e2e — correct it, or reset the password for this account.',
      '  2. Sign-up returned no session because email confirmation is ON. Either confirm',
      `     ${email} once by hand, or turn off "Confirm email" while you create the two`,
      '     e2e accounts, then turn it back on. The suite will not email-confirm for you.',
      '  3. Sign-ups are disabled for this project — create the account manually.',
      '',
      'See tests/e2e/README.md > "Creating the two accounts".',
    ].join('\n'),
  );
}

setup('authenticate staff', async ({ page }) => {
  fs.mkdirSync(authDir, { recursive: true });
  await establishSession(page, 'staff');

  // The staff roles must already be granted by SQL; fail loudly and usefully.
  const roleHint = [
    `The staff account (${requireEnv('E2E_STAFF_EMAIL')}) cannot open the Course Builder.`,
    'Grant both roles once, as the operator:',
    "  insert into public.user_roles (user_id, role)",
    "  select id, r from auth.users,",
    "       unnest(array['ops_training_admin','trainer']::app_role[]) as r",
    "  where email = '<staff email>'",
    '  on conflict (user_id, role) do nothing;',
  ].join('\n');

  await page.goto('/admin-portal/courses');
  await expect(page.getByRole('heading', { name: 'Course Builder' }), roleHint).toBeVisible({
    timeout: 20_000,
  });

  await page.goto('/admin-portal/trainer');
  await expect(page, `${roleHint}\n(The Marking queue lives behind the trainer role.)`).not.toHaveURL(
    /access-denied/i,
  );


  await page.context().storageState({ path: staffStatePath });
});

setup('authenticate learner', async ({ page }) => {
  fs.mkdirSync(authDir, { recursive: true });
  await establishSession(page, 'learner');
  await page.context().storageState({ path: learnerStatePath });
});
