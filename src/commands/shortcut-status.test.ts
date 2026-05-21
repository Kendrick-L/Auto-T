import { describe, expect, it } from 'vitest';
import { buildShortcutStatuses } from '@/src/commands/shortcut-status';

describe('buildShortcutStatuses', () => {
  it('marks commands with shortcuts as bound', () => {
    const statuses = buildShortcutStatuses([
      { name: 'auto-t-translate-visible', shortcut: 'Alt+V' },
      { name: 'auto-t-translate-context', shortcut: 'Alt+T' },
    ]);

    expect(statuses).toMatchObject([
      { id: 'auto-t-translate-visible', shortcut: 'Alt+V', status: 'bound' },
      { id: 'auto-t-translate-context', shortcut: 'Alt+T', status: 'bound' },
    ]);
  });

  it('marks empty shortcuts as unbound or possibly conflicted', () => {
    const statuses = buildShortcutStatuses([
      { name: 'auto-t-translate-visible', shortcut: '' },
      { name: 'auto-t-translate-context', shortcut: 'Alt+T' },
    ]);

    expect(statuses[0]).toMatchObject({
      id: 'auto-t-translate-visible',
      shortcut: '',
      status: 'unbound-or-conflict',
    });
  });

  it('marks missing command metadata as unknown', () => {
    const statuses = buildShortcutStatuses([{ name: 'auto-t-translate-visible', shortcut: 'Alt+V' }]);

    expect(statuses[1]).toMatchObject({
      id: 'auto-t-translate-context',
      shortcut: '',
      status: 'unknown',
    });
  });
});
