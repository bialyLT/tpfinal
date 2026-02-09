const getAdminCredentials = () => ({
  email: Cypress.env('E2E_ADMIN_EMAIL') || Cypress.env('E2E_EMAIL'),
  password: Cypress.env('E2E_ADMIN_PASSWORD') || Cypress.env('E2E_PASSWORD')
});

describe('Admin - Configuracion', () => {
  it('updates config and manages objetivos catalog', function () {
    const { email, password } = getAdminCredentials();
    if (!email || !password) {
      this.skip();
    }

    cy.viewport(1280, 720);
    cy.intercept('GET', '**/servicios/configuracion-pagos/**').as('fetchConfig');
    cy.intercept('GET', '**/servicios/objetivos-diseno/**').as('fetchObjetivos');
    cy.intercept('GET', '**/servicios/niveles-intervencion/**').as('fetchNiveles');
    cy.intercept('GET', '**/servicios/presupuestos-aproximados/**').as('fetchPresupuestos');
    cy.intercept('GET', '**/servicios/formas-terreno/**').as('fetchFormas');

    cy.apiLogin(email, password);
    cy.visitWithAuth('/configuracion');

    cy.contains('h3', 'Objetivos de diseño').should('be.visible');

    cy.get('input[placeholder="Ej: 5000"]').clear().type('5500');
    cy.contains('button', 'Guardar cambios').click();
  });
});
