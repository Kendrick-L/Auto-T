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
    host_permissions: ['https://api.deepseek.com/*'],
    action: {
      default_title: 'Auto-T',
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
  },
});
