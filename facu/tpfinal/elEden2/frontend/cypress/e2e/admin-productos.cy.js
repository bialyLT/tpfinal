const getAdminCredentials = () => ({
  email: Cypress.env('E2E_ADMIN_EMAIL') || Cypress.env('E2E_EMAIL'),
  password: Cypress.env('E2E_ADMIN_PASSWORD') || Cypress.env('E2E_PASSWORD')
});

const resolveApiBaseUrl = () => {
  return Cypress.env('API_BASE_URL') || 'http://localhost:8000/api/v1';
};

describe('Admin - Productos', () => {
  it('creates updates and deletes a producto', function () {
    const { email, password } = getAdminCredentials();
    if (!email || !password) {
      this.skip();
    }

    cy.viewport(1280, 720);

    const apiBaseUrl = resolveApiBaseUrl();
    const unique = Date.now();
    const categoriaName = `Categoria E2E ${unique}`;
    const marcaName = `Marca E2E ${unique}`;
    const tareaName = `Tarea E2E ${unique}`;
    const productoName = `Producto E2E ${unique}`;
    const productoUpdated = `Producto E2E ${unique} Edit`;

    let categoriaId;
    let marcaId;
    let tareaId;

    cy.apiLogin(email, password).then((tokens) => {
      const authHeader = { Authorization: `Bearer ${tokens.access}` };

      return cy.request({
        method: 'POST',
        url: `${apiBaseUrl}/productos/categorias/`,
        headers: authHeader,
        body: { nombre_categoria: categoriaName, descripcion: 'Categoria para E2E' }
      }).then((categoriaRes) => {
        categoriaId = categoriaRes.body.id_categoria;
        return cy.request({
          method: 'POST',
          url: `${apiBaseUrl}/productos/marcas/`,
          headers: authHeader,
          body: { nombre_marca: marcaName, descripcion: 'Marca para E2E' }
        });
      }).then((marcaRes) => {
        marcaId = marcaRes.body.id_marca;
        return cy.request({
          method: 'POST',
          url: `${apiBaseUrl}/productos/tareas/`,
          headers: authHeader,
          body: { nombre: tareaName, duracion_base: 30, cantidad_personal_minimo: 1 }
        });
      }).then((tareaRes) => {
        tareaId = tareaRes.body.id_tarea;
      });
    });

    cy.visitWithAuth('/productos');

    cy.contains('Nuevo Producto').click();
    cy.get('input[placeholder="Ej: Tierra Abonada Premium"]').type(productoName);

    cy.contains('label', 'Categoría *').parent().find('select').select(categoriaName);
    cy.contains('label', 'Marca *').parent().find('select').select(marcaName);
    cy.contains('label', 'Tareas (opcionales)').parent().find('select').select([tareaName]);

    cy.get('textarea[placeholder="Descripción detallada del producto"]').type('Producto creado por Cypress');
    cy.contains('button', 'Crear Producto').click();

    cy.contains(productoName).should('be.visible');

    cy.contains('h3', productoName).parents().first().within(() => {
      cy.contains('button', 'Editar').click();
    });
    cy.get('input[placeholder="Ej: Tierra Abonada Premium"]').clear().type(productoUpdated);
    cy.contains('button', 'Actualizar').click();

    cy.contains(productoUpdated).should('be.visible');

    cy.on('window:confirm', () => true);
    cy.contains('h3', productoUpdated).parents().first().within(() => {
      cy.contains('button', 'Eliminar').click();
    });

    cy.contains(productoUpdated).should('not.exist');

    cy.then(() => {
      const tokens = Cypress.env('authTokens');
      if (!tokens?.access) return;
      const authHeader = { Authorization: `Bearer ${tokens.access}` };
      if (tareaId) cy.request({ method: 'DELETE', url: `${apiBaseUrl}/productos/tareas/${tareaId}/`, headers: authHeader, failOnStatusCode: false });
      if (marcaId) cy.request({ method: 'DELETE', url: `${apiBaseUrl}/productos/marcas/${marcaId}/`, headers: authHeader, failOnStatusCode: false });
      if (categoriaId) cy.request({ method: 'DELETE', url: `${apiBaseUrl}/productos/categorias/${categoriaId}/`, headers: authHeader, failOnStatusCode: false });
    });
  });
});
