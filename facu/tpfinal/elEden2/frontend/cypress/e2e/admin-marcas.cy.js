const getAdminCredentials = () => ({
  email: Cypress.env('E2E_ADMIN_EMAIL') || Cypress.env('E2E_EMAIL'),
  password: Cypress.env('E2E_ADMIN_PASSWORD') || Cypress.env('E2E_PASSWORD')
});

describe('Admin - Marcas', () => {
  it('creates updates and deletes a marca', function () {
    const { email, password } = getAdminCredentials();
    if (!email || !password) {
      this.skip();
    }

    cy.viewport(1280, 720);
    cy.apiLogin(email, password);
    cy.visitWithAuth('/marcas');

    const unique = Date.now();
    const name = `Marca E2E ${unique}`;
    const updated = `Marca E2E ${unique} Edit`;

    cy.contains('Nueva Marca').click();
    cy.get('input[placeholder="Ej: Stihl"]').type(name);
    cy.get('textarea[placeholder="Descripción de la marca"]').type('Marca creada por Cypress');
    cy.contains('button', 'Crear').click();

    cy.contains(name).should('be.visible');

    cy.contains('tr', name).within(() => {
      cy.get('button[title="Editar"]').click();
    });
    cy.get('input[placeholder="Ej: Stihl"]').clear().type(updated);
    cy.contains('button', 'Actualizar').click();

    cy.contains(updated).should('be.visible');

    cy.on('window:confirm', () => true);
    cy.contains('tr', updated).within(() => {
      cy.get('button[title="Eliminar"]').click();
    });

    cy.contains(updated).should('not.exist');
  });
});
