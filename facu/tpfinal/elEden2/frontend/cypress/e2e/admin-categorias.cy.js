const getAdminCredentials = () => ({
  email: Cypress.env('E2E_ADMIN_EMAIL') || Cypress.env('E2E_EMAIL'),
  password: Cypress.env('E2E_ADMIN_PASSWORD') || Cypress.env('E2E_PASSWORD')
});

describe('Admin - Categorias', () => {
  it('creates updates and deletes a categoria', function () {
    const { email, password } = getAdminCredentials();
    if (!email || !password) {
      this.skip();
    }

    cy.viewport(1280, 720);
    cy.apiLogin(email, password);
    cy.visitWithAuth('/categorias');

    const unique = Date.now();
    const name = `Categoria E2E ${unique}`;
    const updated = `Categoria E2E ${unique} Edit`;

    cy.contains('Nueva Categoría').click();
    cy.get('input[placeholder="Ej: Herramientas de Jardín"]').type(name);
    cy.get('textarea[placeholder="Descripción de la categoría"]').type('Categoria creada por Cypress');
    cy.contains('button', 'Crear').click();

    cy.contains(name).should('be.visible');

    cy.contains('tr', name).within(() => {
      cy.get('button[title="Editar"]').click();
    });
    cy.get('input[placeholder="Ej: Herramientas de Jardín"]').clear().type(updated);
    cy.contains('button', 'Actualizar').click();

    cy.contains(updated).should('be.visible');

    cy.on('window:confirm', () => true);
    cy.contains('tr', updated).within(() => {
      cy.get('button[title="Eliminar"]').click();
    });

    cy.contains(updated).should('not.exist');
  });
});
