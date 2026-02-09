const getAdminCredentials = () => ({
  email: Cypress.env('E2E_ADMIN_EMAIL') || Cypress.env('E2E_EMAIL'),
  password: Cypress.env('E2E_ADMIN_PASSWORD') || Cypress.env('E2E_PASSWORD')
});

const resolveApiBaseUrl = () => {
  return Cypress.env('API_BASE_URL') || 'http://localhost:8000/api/v1';
};

describe('Admin - Compras', () => {
  it('creates and deletes a compra', function () {
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
    const proveedorName = `Proveedor E2E ${unique}`;

    let categoriaId;
    let marcaId;
    let tareaId;
    let proveedorId;

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
        return cy.request({
          method: 'POST',
          url: `${apiBaseUrl}/users/proveedores/`,
          headers: authHeader,
          body: {
            razon_social: proveedorName,
            nombre_contacto: 'Contacto E2E',
            telefono: '+54 11 5555-0000',
            email: `proveedor${unique}@mail.com`,
            direccion: 'Calle Falsa 123',
            cuit: '20-12345678-9'
          }
        });
      }).then((proveedorRes) => {
        proveedorId = proveedorRes.body.id_proveedor;
      });
    });

    cy.visitWithAuth('/productos');
    cy.contains('Nuevo Producto').click();
    cy.get('input[placeholder="Ej: Tierra Abonada Premium"]').type(productoName);
    cy.contains('label', 'Categoría *').parent().find('select').select(categoriaName);
    cy.contains('label', 'Marca *').parent().find('select').select(marcaName);
    cy.contains('label', 'Tareas (opcionales)').parent().find('select').select([tareaName]);
    cy.get('textarea[placeholder="Descripción detallada del producto"]').type('Producto para compras');
    cy.contains('button', 'Crear Producto').click();
    cy.contains(productoName).should('be.visible');

    cy.visitWithAuth('/compras');
    cy.contains('Nueva Compra').click();

    cy.contains('label', 'Proveedor *').parent().find('select').select(proveedorName);
    cy.get('textarea[placeholder="Observaciones adicionales"]').type('Compra creada por Cypress');

    cy.contains('label', 'Producto').parent().find('select').select(productoName);
    cy.contains('label', 'Cantidad').parent().find('input[type="number"]').clear().type('2');
    cy.contains('label', 'Precio Unit.').parent().find('input[type="number"]').clear().type('1500');
    cy.contains('button', 'Agregar Producto').click();

    cy.contains('button', 'Crear Compra').click();

    cy.contains(proveedorName).should('be.visible');

    cy.on('window:confirm', () => true);
    cy.contains('tr', proveedorName).within(() => {
      cy.get('button[title="Eliminar"]').click();
    });

    cy.contains(proveedorName).should('not.exist');

    cy.then(() => {
      const tokens = Cypress.env('authTokens');
      if (!tokens?.access) return;
      const authHeader = { Authorization: `Bearer ${tokens.access}` };
      if (tareaId) cy.request({ method: 'DELETE', url: `${apiBaseUrl}/productos/tareas/${tareaId}/`, headers: authHeader, failOnStatusCode: false });
      if (marcaId) cy.request({ method: 'DELETE', url: `${apiBaseUrl}/productos/marcas/${marcaId}/`, headers: authHeader, failOnStatusCode: false });
      if (categoriaId) cy.request({ method: 'DELETE', url: `${apiBaseUrl}/productos/categorias/${categoriaId}/`, headers: authHeader, failOnStatusCode: false });
      if (proveedorId) cy.request({ method: 'DELETE', url: `${apiBaseUrl}/users/proveedores/${proveedorId}/`, headers: authHeader, failOnStatusCode: false });
    });
  });
});
