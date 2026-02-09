const getCredentials = () => {
  const email = Cypress.env('E2E_EMAIL');
  const password = Cypress.env('E2E_PASSWORD');
  return { email, password };
};

describe('Productos (roles protegidos)', () => {
  it('allows an employee/admin to access inventory', function () {
    const { email, password } = getCredentials();
    if (!email || !password) {
      this.skip();
    }

    cy.intercept('POST', '**/token/').as('login');
    cy.intercept('GET', '**/users/me/').as('currentUser');

    cy.visit('/login');
    cy.get('input#email').type(email);
    cy.get('input#password').type(password, { log: false });
    cy.get('button[type="submit"]').click();

    cy.wait('@login');
    cy.wait('@currentUser');

    cy.contains('Inventario').should('be.visible').click();
    cy.contains('Productos').should('be.visible').click();
    cy.contains('Inventario de Productos');
  });
});
