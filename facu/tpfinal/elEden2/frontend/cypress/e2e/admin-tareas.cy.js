const getAdminCredentials = () => ({
  email: Cypress.env('E2E_ADMIN_EMAIL') || Cypress.env('E2E_EMAIL'),
  password: Cypress.env('E2E_ADMIN_PASSWORD') || Cypress.env('E2E_PASSWORD')
});

describe('Admin - Tareas', () => {
  it('creates updates and deletes a tarea', function () {
    const { email, password } = getAdminCredentials();
    if (!email || !password) {
      this.skip();
    }

    cy.viewport(1280, 720);
    cy.apiLogin(email, password);
    cy.visitWithAuth('/tareas');

    const unique = Date.now();
    const name = `Tarea E2E ${unique}`;
    const updated = `Tarea E2E ${unique} Edit`;

    cy.contains('Nueva Tarea').click();
    cy.get('input[placeholder="Ej: Poda"]').type(name);
    cy.get('input[type="number"]').eq(0).clear().type('30');
    cy.get('input[type="number"]').eq(1).clear().type('2');
    cy.contains('button', 'Crear').click();

    cy.contains(name).should('be.visible');

    cy.contains('tr', name).within(() => {
      cy.get('button[title="Editar"]').click();
    });
    cy.get('input[placeholder="Ej: Poda"]').clear().type(updated);
    cy.contains('button', 'Actualizar').click();

    cy.contains(updated).should('be.visible');

    cy.on('window:confirm', () => true);
    cy.contains('tr', updated).within(() => {
      cy.get('button[title="Eliminar"]').click();
    });

    cy.contains(updated).should('not.exist');
  });
});
