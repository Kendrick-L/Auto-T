import {
  AUTO_T_TRANSLATE_CONTEXT_COMMAND,
  AUTO_T_TRANSLATE_VISIBLE_COMMAND,
  type AutoTCommandId,
} from '@/src/commands/command-router';

export type ShortcutStatus = {
  id: AutoTCommandId;
  label: string;
  description: string;
  shortcut: string;
  status: 'bound' | 'unbound-or-conflict' | 'unknown';
};

export const AUTO_T_COMMAND_LABELS: Record<
  AutoTCommandId,
  {
    label: string;
    description: string;
  }
> = {
  [AUTO_T_TRANSLATE_VISIBLE_COMMAND]: {
    label: 'Translate visible text',
    description: 'Default Option+V on macOS. Translates the current viewport.',
  },
  [AUTO_T_TRANSLATE_CONTEXT_COMMAND]: {
    label: 'Translate selection or hovered text',
    description: 'Default Option+T on macOS. Selection takes priority over the hovered sentence or paragraph.',
  },
};

export function buildShortcutStatuses(commands: chrome.commands.Command[]): ShortcutStatus[] {
  return (Object.keys(AUTO_T_COMMAND_LABELS) as AutoTCommandId[]).map((id) => {
    const command = commands.find((candidate) => candidate.name === id);
    const shortcut = command?.shortcut?.trim() ?? '';
    const metadata = AUTO_T_COMMAND_LABELS[id];

    if (!command) {
      return {
        id,
        label: metadata.label,
        description: metadata.description,
        shortcut: '',
        status: 'unknown',
      };
    }

    return {
      id,
      label: metadata.label,
      description: metadata.description,
      shortcut,
      status: shortcut ? 'bound' : 'unbound-or-conflict',
    };
  });
}
