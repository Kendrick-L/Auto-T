import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Auto-T',
    description: 'AI bilingual webpage translation powered by DeepSeek.',
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
