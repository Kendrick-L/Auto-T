import { EXTENSION_TRANSLATION_CLASS } from '@/src/constants';

export function restorePage() {
  document.querySelectorAll(`.${EXTENSION_TRANSLATION_CLASS}`).forEach((node) => node.remove());
}
