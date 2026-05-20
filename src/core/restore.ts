import { EXTENSION_SOURCE_HIDDEN_CLASS, EXTENSION_TRANSLATION_CLASS } from '@/src/constants';

export function restorePage() {
  document.querySelectorAll(`.${EXTENSION_TRANSLATION_CLASS}`).forEach((node) => node.remove());
  document.getElementById('auto-t-translation-layer')?.remove();
  document.querySelectorAll<HTMLElement>('[data-auto-t-original-margin-bottom]').forEach((node) => {
    const margin = node.getAttribute('data-auto-t-original-margin-bottom');
    node.style.marginBottom = margin ?? '';
    node.removeAttribute('data-auto-t-original-margin-bottom');
  });
  document.querySelectorAll(`.${EXTENSION_SOURCE_HIDDEN_CLASS}`).forEach((node) => {
    node.classList.remove(EXTENSION_SOURCE_HIDDEN_CLASS);
  });
}
