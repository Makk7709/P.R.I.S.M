/**
 * Codemod : redirige tous les imports de prismSentinel et prismStrategyExecutor
 *            vers core/Planner.js
 */
export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Modifier les import declarations
  root.find(j.ImportDeclaration)
    .filter(path =>
      /prismSentinel|prismStrategyExecutor/.test(path.node.source.value)
    )
    .forEach(path =>
      path.node.source.value = 'core/Planner.js'
    );

  // Modifier les require calls
  root.find(j.CallExpression, { callee: { name: 'require' } })
    .filter(path =>
      /prismSentinel|prismStrategyExecutor/.test(path.node.arguments[0].value)
    )
    .forEach(path =>
      path.node.arguments[0].value = 'core/Planner.js'
    );

  return root.toSource();
} 