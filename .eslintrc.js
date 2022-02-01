module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json'
  },
  extends: [
    require.resolve('@contentful/eslint-config-extension'),
    require.resolve('@contentful/eslint-config-extension/jest'),
    require.resolve('@contentful/eslint-config-extension/jsx-a11y'),
    require.resolve('@contentful/eslint-config-extension/react')
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    'react/prop-types': 0,
    '@typescript-eslint/no-unused-vars': 'error'
  }
};
