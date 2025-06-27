/**
 * @vitest-environment node
 */

// Grâce à `globals: true` dans la config, `describe`, `it`, et `expect`
// sont disponibles globalement, comme avec Jest.
describe('Validation de l\'environnement de test Vitest', () => {
  it('devrait exécuter un test simple avec succès', () => {
    expect(true).toBe(true);
  });
}); 