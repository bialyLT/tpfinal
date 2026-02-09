const getAdminCredentials = () => ({
  email: Cypress.env('E2E_ADMIN_EMAIL') || Cypress.env('E2E_EMAIL'),
  password: Cypress.env('E2E_ADMIN_PASSWORD') || Cypress.env('E2E_PASSWORD')
});

describe('Admin - Gestion Encuestas', () => {
  it('creates and deletes a encuesta', function () {
    const { email, password } = getAdminCredentials();
    if (!email || !password) {
      this.skip();
    }

    cy.viewport(1280, 720);
    cy.apiLogin(email, password);
    cy.visitWithAuth('/dashboard');
    cy.contains('Encuestas').should('be.visible').click();

    const unique = Date.now();
    const titulo = `Encuesta E2E ${unique}`;

    cy.contains('Nueva Encuesta').click();
    cy.get('input[placeholder="Ej: Encuesta de Satisfacción Post-Servicio"]').type(titulo);
    cy.get('textarea[placeholder="Descripción opcional de la encuesta..."]').type('Encuesta creada por Cypress');
    cy.get('input#activa').uncheck({ force: true });

    cy.contains('Agregar Pregunta').click();
    cy.get('input[placeholder="Escriba la pregunta..."]').type('Como evaluas el servicio?');

    cy.contains('button', 'Crear').click();

    cy.contains(titulo).should('be.visible');

    cy.on('window:confirm', () => true);
    cy.contains('h3', titulo).parents('div').first().within(() => {
      cy.get('button[title="Eliminar"]').click();
    });

    cy.contains(titulo).should('not.exist');
  });
});
