module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    require.resolve('@contentful/eslint-config-extension'),
    require.resolve('@contentful/eslint-config-extension/jest'),
    require.resolve('@contentful/eslint-config-extension/jsx-a11y'),
    require.resolve('@contentful/eslint-config-extension/react')
  ],
  rules: {
    'react/prop-types': 0
  }
};
