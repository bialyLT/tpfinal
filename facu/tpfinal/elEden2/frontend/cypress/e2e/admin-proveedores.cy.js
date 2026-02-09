const getAdminCredentials = () => ({
  email: Cypress.env('E2E_ADMIN_EMAIL') || Cypress.env('E2E_EMAIL'),
  password: Cypress.env('E2E_ADMIN_PASSWORD') || Cypress.env('E2E_PASSWORD')
});

describe('Admin - Proveedores', () => {
  it('creates updates and deletes a proveedor', function () {
    const { email, password } = getAdminCredentials();
    if (!email || !password) {
      this.skip();
    }

    cy.viewport(1280, 720);
    cy.apiLogin(email, password);
    cy.visitWithAuth('/proveedores');

    const unique = Date.now();
    const name = `Proveedor E2E ${unique}`;
    const updated = `Proveedor E2E ${unique} Edit`;

    cy.contains('Nuevo Proveedor').click();
    cy.get('input[placeholder="Ej: Vivero San José S.A."]').type(name);
    cy.get('input[placeholder="XX-XXXXXXXX-X"]').type('20-12345678-9');
    cy.get('input[placeholder="Ej: Juan Pérez"]').type('Contacto E2E');
    cy.get('input[placeholder="Ej: +54 11 1234-5678"]').type('+54 11 5555-0000');
    cy.get('input[placeholder="Ej: contacto@proveedor.com"]').type(`proveedor${unique}@mail.com`);
    cy.get('textarea[placeholder="Dirección completa"]').type('Calle Falsa 123');
    cy.contains('button', 'Crear').click();

    cy.contains(name).should('be.visible');

    cy.contains('tr', name).within(() => {
      cy.get('button[title="Editar"]').click();
    });
    cy.get('input[placeholder="Ej: Vivero San José S.A."]').clear().type(updated);
    cy.contains('button', 'Actualizar').click();

    cy.contains(updated).should('be.visible');

    cy.on('window:confirm', () => true);
    cy.contains('tr', updated).within(() => {
      cy.get('button[title="Eliminar"]').click();
    });

    cy.contains(updated).should('not.exist');
  });
});
