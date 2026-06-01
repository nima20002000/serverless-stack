import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-onboarding',
  ],
  framework: '@storybook/nextjs-vite',
  staticDirs: ['../public'],
  async viteFinal(config) {
    config.plugins = config.plugins?.filter((plugin) => {
      if (!plugin || Array.isArray(plugin)) return true;
      return plugin.name !== 'vite:storybook-inject-mocker-runtime';
    });

    return config;
  },
};
export default config;
