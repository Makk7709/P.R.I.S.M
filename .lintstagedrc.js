export default {
  '*.{js,ts,mjs}': [
    'eslint --fix',
    'prettier --write',
  ],
  '*.{json,md}': [
    'prettier --write',
  ],
};
