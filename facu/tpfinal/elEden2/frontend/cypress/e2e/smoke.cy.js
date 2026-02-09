describe('Smoke', () => {
  it('loads the home page', () => {
    cy.visit('/');
    cy.contains('Transforma tu espacio');
  });

  it('redirects protected page to login', () => {
    cy.visit('/productos');
    cy.location('pathname').should('eq', '/login');
    cy.get('input#email').should('be.visible');
  });
});
