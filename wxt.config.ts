import { defineConfig } from 'wxt';
import packageJson from './package.json';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    envPrefix: ['VITE_', 'WXT_', 'DEEPSEEK_'],
  }),
  manifest: {
    name: 'Auto-T',
    description: 'AI bilingual webpage translation powered by DeepSeek.',
    version: packageJson.version,
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['https://api.deepseek.com/*', 'http://127.0.0.1:38475/*', 'http://localhost:38475/*'],
    icons: {
      16: 'icons/auto-t-enabled-16.png',
      32: 'icons/auto-t-enabled-32.png',
      48: 'icons/auto-t-enabled-48.png',
      128: 'icons/auto-t-enabled-128.png',
    },
    action: {
      default_title: 'Auto-T',
      default_icon: {
        16: 'icons/auto-t-enabled-16.png',
        32: 'icons/auto-t-enabled-32.png',
        48: 'icons/auto-t-enabled-48.png',
        128: 'icons/auto-t-enabled-128.png',
      },
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
    commands: {
      'auto-t-translate-visible': {
        suggested_key: {
          default: 'Alt+V',
          mac: 'Alt+V',
        },
        description: 'Auto-T: translate visible text',
      },
      'auto-t-translate-context': {
        suggested_key: {
          default: 'Alt+T',
          mac: 'Alt+T',
        },
        description: 'Auto-T: translate selected text or hovered paragraph',
      },
    },
  },
});
