import { expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fixturesDir } from './env';

/**
 * Authoring helpers for the real lesson block editor.
 *
 * Every block form is mounted at once (BlockList passes `idPrefix = block-<index>`),
 * so all form testids are suffixed with that prefix. Blocks are appended in palette
 * order, which means the block added Nth carries `block-<N-1>`.
 */

export const ALL_BLOCK_TYPES = [
  'text',
  'callout',
  'card_deck',
  'flip_cards',
  'accordion',
  'image',
  'video',
  'carousel',
  'hot_graphic',
  'mcq',
  'drag_match',
  'checklist',
  'scenario',
  'reflection',
] as const;

export type BlockType = (typeof ALL_BLOCK_TYPES)[number];

/** Clicks a palette button and returns the idPrefix of the block it appended. */
export async function addBlock(page: Page, type: BlockType, index: number): Promise<string> {
  await page.getByTestId(`block-palette-${type}`).click();
  const prefix = `block-${index}`;
  // Every form renders a first field; wait for it rather than for an animation.
  await expect(page.locator(`[data-testid$="-${prefix}"], [data-testid*="-${prefix}-"]`).first()).toBeVisible();
  return prefix;
}

const IMAGE = path.join(fixturesDir, 'hotgraphic.png');
const CLIP = path.join(fixturesDir, 'clip.mp4');

/** Picks a Radix Select option by visible name (headless-safe: click, then role=option). */
export async function chooseOption(page: Page, triggerTestId: string, optionName: string | RegExp) {
  await page.getByTestId(triggerTestId).click();
  await page.getByRole('option', { name: optionName }).click();
  await expect(page.getByRole('option').first()).toBeHidden();
}

/**
 * Fills the minimal valid payload for a block type. Keep these payloads in step
 * with publishChecks.ts — anything weaker blocks the publish spec.
 */
export async function fillBlock(page: Page, type: BlockType, p: string, runId: string) {
  const t = (id: string) => page.getByTestId(id);

  switch (type) {
    case 'text':
      await t(`block-form-text-heading-${p}`).fill(`Text heading ${runId}`);
      await t(`block-form-text-text-${p}`).fill(
        'Care staff read this short paragraph before they start. It is deliberately plain.',
      );
      break;

    case 'callout':
      await t(`block-form-callout-title-${p}`).fill('Remember');
      await t(`block-form-callout-text-${p}`).fill('Always wash your hands before a feed.');
      break;

    case 'card_deck':
      await t(`block-form-card_deck-front-${p}-0`).fill('Card front');
      await t(`block-form-card_deck-back-${p}-0`).fill('Card back');
      break;

    case 'flip_cards':
      await t(`block-form-flip_cards-front-${p}-0`).fill('Flip front');
      await t(`block-form-flip_cards-back-${p}-0`).fill('Flip back');
      break;

    case 'accordion':
      await t(`block-form-accordion-title-${p}-0`).fill('What is a PEG tube?');
      await t(`block-form-accordion-body-${p}-0`).fill('A tube that delivers feed into the stomach.');
      break;

    case 'image':
      await t(`block-form-image-url-${p}`).fill('https://placehold.co/800x450.png');
      await t(`block-form-image-alt-${p}`).fill('A placeholder illustration');
      break;

    case 'video':
      // URL source keeps the suite off the upload path; checkpoints are covered
      // separately by 08-video-checkpoints with the uploaded fixture.
      await t(`block-form-video-title-${p}`).fill('Short clip');
      await chooseOption(page, `block-form-video-source-${p}`, /url|link|external/i).catch(() => {});
      await t(`block-form-video-url-${p}`).fill('https://www.youtube.com/watch?v=aqz-KE-bpKQ');
      break;

    case 'carousel':
      await t(`block-form-carousel-title-${p}-0`).fill('Step one');
      await t(`block-form-carousel-text-${p}-0`).fill('Check the feed label and the expiry date.');
      break;

    case 'hot_graphic':
      await t(`block-form-hot_graphic-alt-${p}`).fill('Diagram of a feeding set');
      await page.locator(`[data-testid="block-form-hot_graphic-file-${p}"], input[type="file"]`).last()
        .setInputFiles(IMAGE)
        .catch(() => {});
      await t(`block-form-hot_graphic-hotspot-add-${p}`).click();
      await t(`block-form-hot_graphic-hotspot-title-${p}-0`).fill('Giving set');
      await t(`block-form-hot_graphic-hotspot-text-${p}-0`).fill('Replace this every 24 hours.');
      break;

    case 'mcq':
      await t(`block-form-mcq-question-${p}`).fill('How often is a giving set replaced?');
      await t(`block-form-mcq-option-${p}-0`).fill('Every 24 hours');
      await t(`block-form-mcq-option-${p}-1`).fill('Once a week');
      await chooseOption(page, `block-form-mcq-correct-${p}`, /Every 24 hours|1|A/i);
      await t(`block-form-mcq-explanation-${p}`).fill('Daily replacement reduces infection risk.');
      break;

    case 'drag_match':
      await t(`block-form-drag_match-prompt-${p}`).fill('Match each item to when it is changed.');
      await t(`block-form-drag_match-target-${p}-0`).fill('Daily');
      await t(`block-form-drag_match-item-${p}-0`).fill('Giving set');
      await chooseOption(page, `block-form-drag_match-item-target-${p}-0`, /Daily/i);
      break;

    case 'checklist':
      await t(`block-form-checklist-step-${p}-0`).fill('Wash hands');
      await t(`block-form-checklist-step-add-${p}`).click();
      await t(`block-form-checklist-step-${p}-1`).fill('Check the feed label');
      break;

    case 'scenario':
      await t(`block-form-scenario-title-${p}`).fill('A blocked tube');
      break;

    case 'reflection':
      await t(`block-form-reflection-prompt-${p}`).fill(
        'Describe how you would escalate a blocked feeding tube on your next shift.',
      );
      await t(`block-form-reflection-min_words-${p}`).fill('10');
      await t(`block-form-reflection-criteria-${p}-0`).fill('Names who they would tell').catch(() => {});
      break;
  }
}

export const videoFixture = CLIP;
