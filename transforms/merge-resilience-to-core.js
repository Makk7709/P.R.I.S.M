/**
 * Codemod : redirige tous les imports de prismSelfHeal, prismFailsafe et prismEmergencyProtocol
 *            vers core/Resilience.js
 */
export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const modules = ['prismSelfHeal', 'prismFailsafe', 'prismEmergencyProtocol'];
  root.find(j.ImportDeclaration)
    .filter(path =>
      modules.some(m => path.node.source.value.includes(m))
    )
    .forEach(path => {
      path.node.source.value = 'core/Resilience.js';
    });

  root.find(j.CallExpression, { callee: { name: 'require' } })
    .filter(path =>
      modules.some(m => path.node.arguments[0].value.includes(m))
    )
    .forEach(path => {
      path.node.arguments[0].value = 'core/Resilience.js';
    });

  return root.toSource();
} 