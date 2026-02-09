const getAdminCredentials = () => ({
  email: Cypress.env('E2E_ADMIN_EMAIL') || Cypress.env('E2E_EMAIL'),
  password: Cypress.env('E2E_ADMIN_PASSWORD') || Cypress.env('E2E_PASSWORD')
});

describe('Admin - Especies', () => {
  it('creates updates and deletes an especie', function () {
    const { email, password } = getAdminCredentials();
    if (!email || !password) {
      this.skip();
    }

    cy.viewport(1280, 720);
    cy.apiLogin(email, password);
    cy.visitWithAuth('/especies');

    const unique = Date.now();
    const name = `Especie E2E ${unique}`;
    const updated = `Especie E2E ${unique} Edit`;

    cy.contains('Nueva Especie').click();
    cy.get('input[placeholder="Ej: Lavanda"]').type(name);
    cy.get('textarea[placeholder="Descripción de la especie"]').type('Especie creada por Cypress');
    cy.contains('button', 'Crear').click();

    cy.contains(name).should('be.visible');

    cy.contains('tr', name).within(() => {
      cy.get('button[title="Editar"]').click();
    });
    cy.get('input[placeholder="Ej: Lavanda"]').clear().type(updated);
    cy.contains('button', 'Actualizar').click();

    cy.contains(updated).should('be.visible');

    cy.on('window:confirm', () => true);
    cy.contains('tr', updated).within(() => {
      cy.get('button[title="Eliminar"]').click();
    });

    cy.contains(updated).should('not.exist');
  });
});
