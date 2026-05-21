import type { ExtensionMessage } from '@/src/messaging/messages';

export const AUTO_T_TRANSLATE_VISIBLE_COMMAND = 'auto-t-translate-visible';
export const AUTO_T_TRANSLATE_CONTEXT_COMMAND = 'auto-t-translate-context';

export type AutoTCommandId = typeof AUTO_T_TRANSLATE_VISIBLE_COMMAND | typeof AUTO_T_TRANSLATE_CONTEXT_COMMAND;

export function commandToContentMessage(command: string): ExtensionMessage | null {
  if (command === AUTO_T_TRANSLATE_VISIBLE_COMMAND) {
    return { type: 'COMMAND_TRANSLATE_VISIBLE' };
  }

  if (command === AUTO_T_TRANSLATE_CONTEXT_COMMAND) {
    return { type: 'COMMAND_TRANSLATE_CONTEXT' };
  }

  return null;
}
