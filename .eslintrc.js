// Node/Babel ESM server. airbnb-base is the baseline; the overrides below are
// the rules that fight this codebase rather than catch bugs in it.
module.exports = {
  root: true,
  extends: ['airbnb-base', 'prettier'],
  plugins: ['import', 'prettier'],
  parser: '@babel/eslint-parser',
  parserOptions: { sourceType: 'module', ecmaVersion: 2022 },
  env: { node: true, es2022: true },
  rules: {
    'prettier/prettier': 'error',
    // Server-side logging goes through console in config/scripts.
    'no-console': 'off',
    // Imports use explicit .js extensions in places (Babel ESM); both forms work.
    'import/extensions': 'off',
    // for...of is fine on Node 20+; airbnb's ban is a browser-bundle concern.
    'no-restricted-syntax': 'off',
    // Express/Apollo callbacks have fixed arities ((err, req, res, next),
    // (parent, args, ctx)); unused trailing params are not defects.
    'no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true }],
    'consistent-return': 'off',
    // Sequelize hooks and axios interceptors mutate the object they are given.
    'no-param-reassign': ['error', { props: false }],
  },
  overrides: [
    {
      files: ['src/tests/**/*.js'],
      env: { mocha: true },
      // chai: expect(x).to.be.true
      rules: { 'no-unused-expressions': 'off' },
    },
  ],
};
