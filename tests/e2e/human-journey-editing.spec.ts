import { expect, test, type Page } from '@playwright/test';
import { waitForApp } from './helpers';

const JOURNEY_ID = 'journey-human-editing';
const PEOPLE = [{
  id: 'person-jordan',
  name: 'Jordan',
  relationship: 'Partner',
  createdAt: '2026-01-01T00:00:00.000Z',
}];

function journeyWith(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    profile: { id: JOURNEY_ID, phase: 'preparing', updatedAt: '2026-01-01T00:00:00.000Z' },
    responsibilities: [],
    questions: [],
    entries: [],
    ...overrides,
  };
}

async function seed(page: Page, journey: unknown) {
  await page.addInitScript(({ value, people }) => {
    localStorage.setItem('contraction-tracker:onboarding-seen', '1');
    localStorage.setItem('contraction-tracker:backup-dismissed', String(Date.now()));
    localStorage.setItem('contraction-tracker:people', JSON.stringify(people));
    localStorage.setItem('olive:journey:v1', JSON.stringify(value));
  }, { value: journey, people: PEOPLE });
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: /open birth journey/i }).click();
}

test('provider questions support edit, cancel, and undoable deletion', async ({ page }) => {
  await seed(page, journeyWith({
    questions: [{
      id: 'question-one',
      journeyId: JOURNEY_ID,
      text: 'When should I call?',
      category: 'birth',
      private: true,
      pinned: false,
      notesAreProviderInstructions: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
  }));

  const dialog = page.getByRole('dialog', { name: 'Birth journey' });
  await dialog.getByRole('button', { name: 'Provider questions' }).click();
  const article = page.getByRole('article', { name: 'When should I call?' });

  await article.getByRole('button', { name: 'Edit question: When should I call?' }).click();
  await article.getByLabel('Question for your provider').fill('What should I bring?');
  await article.getByLabel('Question category').selectOption('recovery');
  await article.getByRole('button', { name: 'Save question' }).click();
  const edited = page.getByRole('article', { name: 'What should I bring?' });
  await expect(edited).toContainText('What should I bring?');
  await expect(edited).toContainText('Recovery');

  await edited.getByRole('button', { name: 'Edit question: What should I bring?' }).click();
  await edited.getByLabel('Question for your provider').fill('Discard this draft');
  await edited.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('What should I bring?')).toBeVisible();
  await expect(page.getByText('Discard this draft')).toBeHidden();

  await page.getByRole('button', { name: 'Delete question: What should I bring?' }).click();
  await expect(page.getByRole('status')).toContainText('Question deleted');
  await page.getByRole('button', { name: 'Undo question deletion' }).click();
  await expect(page.getByText('What should I bring?')).toBeVisible();
});

test('journey write failure keeps an edited question draft and stored data', async ({ page }) => {
  await seed(page, journeyWith({
    questions: [{
      id: 'question-one',
      journeyId: JOURNEY_ID,
      text: 'When should I call?',
      category: 'birth',
      private: true,
      pinned: false,
      notesAreProviderInstructions: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
  }));

  const dialog = page.getByRole('dialog', { name: 'Birth journey' });
  await dialog.getByRole('button', { name: 'Provider questions' }).click();
  const article = page.getByRole('article', { name: 'When should I call?' });
  const storedBefore = await page.evaluate(() => localStorage.getItem('olive:journey:v1'));

  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === 'olive:journey:v1') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return originalSetItem.call(this, key, value);
    };
  });

  await article.getByRole('button', { name: 'Edit question: When should I call?' }).click();
  await article.getByLabel('Question for your provider').fill('Unsaved replacement');
  await article.getByRole('button', { name: 'Save question' }).click();

  await expect(article.getByRole('button', { name: 'Save question' })).toBeVisible();
  await expect(article.getByLabel('Question for your provider')).toHaveValue('Unsaved replacement');
  await expect(page.getByRole('article', { name: 'When should I call?' })).toBeVisible();
  await expect(page.evaluate(() => localStorage.getItem('olive:journey:v1'))).resolves.toBe(storedBefore);
});

test('responsibilities support editing the title and assignee with undoable deletion', async ({ page }) => {
  await seed(page, journeyWith({
    responsibilities: [{
      id: 'task-one',
      journeyId: JOURNEY_ID,
      title: 'Pack the bag',
      assigneePersonId: 'person-jordan',
      phase: 'preparing',
      private: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }],
  }));

  const dialog = page.getByRole('dialog', { name: 'Birth journey' });
  await dialog.getByRole('button', { name: 'Responsibilities' }).click();
  const article = page.getByRole('article', { name: 'Pack the bag' });

  await article.getByRole('button', { name: 'Edit responsibility: Pack the bag' }).click();
  await article.getByLabel('Responsibility').fill('Bring the hospital bag');
  await article.getByLabel('Assign to').selectOption('');
  await article.getByRole('button', { name: 'Save responsibility' }).click();
  const edited = page.getByRole('article', { name: 'Bring the hospital bag' });
  await expect(edited).toContainText('Bring the hospital bag');
  await expect(edited).toContainText('Unassigned');

  await edited.getByRole('button', { name: 'Edit responsibility: Bring the hospital bag' }).click();
  await edited.getByLabel('Responsibility').fill('Discard this draft');
  await edited.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Bring the hospital bag')).toBeVisible();
  await expect(page.getByText('Discard this draft')).toBeHidden();

  await page.getByRole('button', { name: 'Delete responsibility: Bring the hospital bag' }).click();
  await expect(page.getByRole('status')).toContainText('Responsibility deleted');
  await page.getByRole('button', { name: 'Undo responsibility deletion' }).click();
  await expect(page.getByText('Bring the hospital bag')).toBeVisible();
});

test('timeline editing keeps upcoming planning first and supports undoable deletion', async ({ page }) => {
  await seed(page, journeyWith({
    profile: { id: JOURNEY_ID, phase: 'postpartum', updatedAt: '2026-01-01T00:00:00.000Z' },
    entries: [
      {
        id: 'entry-past',
        journeyId: JOURNEY_ID,
        kind: 'recovery-note',
        title: 'Earlier note',
        occursAt: '2025-12-01T10:00',
        private: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'entry-upcoming',
        journeyId: JOURNEY_ID,
        kind: 'appointment',
        title: 'Upcoming visit',
        occursAt: '2099-06-01T10:00',
        private: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  }));

  const dialog = page.getByRole('dialog', { name: 'Birth journey' });
  await dialog.getByRole('button', { name: 'First 12 weeks' }).click();
  const articles = page.getByRole('article');
  await expect(articles.nth(0)).toHaveAccessibleName('Upcoming visit');
  await expect(articles.nth(1)).toHaveAccessibleName('Earlier note');

  const article = page.getByRole('article', { name: 'Upcoming visit' });
  await article.getByRole('button', { name: 'Edit timeline entry: Upcoming visit' }).click();
  await article.getByLabel('Timeline entry').fill('Updated follow-up');
  await article.getByLabel('Entry type').selectOption('recovery-note');
  await article.getByLabel('Date and time').fill('2099-06-02T11:30');
  await article.getByRole('button', { name: 'Save timeline entry' }).click();
  const edited = page.getByRole('article', { name: 'Updated follow-up' });
  await expect(edited).toContainText('Updated follow-up');
  await expect(edited).toContainText('Recovery note');

  await edited.getByRole('button', { name: 'Edit timeline entry: Updated follow-up' }).click();
  await edited.getByLabel('Timeline entry').fill('Discard this draft');
  await edited.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Updated follow-up')).toBeVisible();
  await expect(page.getByText('Discard this draft')).toBeHidden();

  await page.getByRole('button', { name: 'Delete timeline entry: Updated follow-up' }).click();
  await expect(page.getByRole('status')).toContainText('Timeline entry deleted');
  await page.getByRole('button', { name: 'Undo timeline entry deletion' }).click();
  await expect(page.getByText('Updated follow-up')).toBeVisible();
});
