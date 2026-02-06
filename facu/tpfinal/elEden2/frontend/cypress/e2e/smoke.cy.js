describe('Smoke', () => {
  it('loads the home page', () => {
    cy.visit('/');
    cy.contains('Inventario de Productos');
  });
});
