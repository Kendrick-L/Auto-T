import { EXTENSION_SOURCE_HIDDEN_CLASS, EXTENSION_TRANSLATION_CLASS } from '@/src/constants';

export function restorePage() {
  document.querySelectorAll(`.${EXTENSION_TRANSLATION_CLASS}`).forEach((node) => node.remove());
  document.querySelectorAll(`.${EXTENSION_SOURCE_HIDDEN_CLASS}`).forEach((node) => {
    node.classList.remove(EXTENSION_SOURCE_HIDDEN_CLASS);
  });
}
