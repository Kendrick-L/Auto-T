import { describe, expect, it } from 'vitest';
import { commandToContentMessage } from '@/src/commands/command-router';

describe('commandToContentMessage', () => {
  it('routes visible translation command to content script message', () => {
    expect(commandToContentMessage('auto-t-translate-visible')).toEqual({
      type: 'COMMAND_TRANSLATE_VISIBLE',
    });
  });

  it('routes context translation command to content script message', () => {
    expect(commandToContentMessage('auto-t-translate-context')).toEqual({
      type: 'COMMAND_TRANSLATE_CONTEXT',
    });
  });

  it('ignores unknown commands', () => {
    expect(commandToContentMessage('unknown-command')).toBeNull();
  });
});
