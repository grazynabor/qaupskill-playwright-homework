import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

const playwrightFiles = [
  'tests/**/*.ts',
  'pages/**/*.ts',
  'fixtures/**/*.ts',
  'playwright.config.ts',
];

export default [
  {
    ignores: [
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'playwright/.auth/**',
    ],
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: playwrightFiles,
  })),
  {
    ...playwright.configs['flat/recommended'],
    files: playwrightFiles,
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Deterministic conditionals are intentional for cleanup and static table-driven scenarios, not runtime UI-state branching.
      'playwright/no-conditional-expect': 'off',
      'playwright/no-conditional-in-test': 'off',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/prefer-hooks-on-top': 'off',
      'playwright/prefer-web-first-assertions': 'error',
    },
  },
];
