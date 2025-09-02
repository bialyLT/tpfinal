import React, { useState, useEffect } from 'react';
import { productosService } from '../services';
import { toast } from 'react-hot-toast';
import Loading from '../components/Loading';

const ProductosPage = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productosData, categoriasData] = await Promise.all([
        productosService.getProductos(),
        productosService.getCategorias()
      ]);
      setProductos(productosData);
      setCategorias(categoriasData);
    } catch (error) {
      toast.error('Error al cargar los datos');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProductos = productos.filter(producto => {
    const matchesSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         producto.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = !selectedCategoria || producto.categoria === selectedCategoria;
    return matchesSearch && matchesCategoria;
  });

  if (loading) {
    return <Loading message="Cargando productos..." />;
  }

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Catálogo de Productos</h1>
          <p className="text-gray-600">Encuentra productos para el cuidado de tu jardín</p>
        </div>

        {/* Filters */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Buscar productos</span>
                </label>
                <input
                  type="text"
                  placeholder="Buscar por nombre o descripción..."
                  className="input input-bordered w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Filtrar por categoría</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={selectedCategoria}
                  onChange={(e) => setSelectedCategoria(e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map(categoria => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProductos.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <div className="text-6xl mb-4">🌱</div>
              <h3 className="text-xl font-bold text-gray-800">No hay productos disponibles</h3>
              <p className="text-gray-600">
                {searchTerm || selectedCategoria 
                  ? 'No se encontraron productos con los filtros aplicados.'
                  : 'Aún no hay productos registrados en el sistema.'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProductos.map(producto => (
              <div key={producto.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                <figure className="px-6 pt-6">
                  {producto.imagen ? (
                    <img 
                      src={producto.imagen} 
                      alt={producto.nombre}
                      className="rounded-xl h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="bg-base-200 rounded-xl h-48 w-full flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </figure>
                
                <div className="card-body">
                  <h3 className="card-title text-lg">{producto.nombre}</h3>
                  
                  {producto.descripcion && (
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {producto.descripcion}
                    </p>
                  )}

                  <div className="flex justify-between items-center mt-2">
                    <div className="badge badge-outline">
                      {categorias.find(c => c.id === producto.categoria)?.nombre || 'Sin categoría'}
                    </div>
                    
                    {producto.precio && (
                      <div className="text-lg font-bold text-primary">
                        ${producto.precio}
                      </div>
                    )}
                  </div>

                  {producto.stock !== null && (
                    <div className="mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Stock:</span>
                        <span className={`badge ${
                          producto.stock > 10 ? 'badge-success' : 
                          producto.stock > 0 ? 'badge-warning' : 'badge-error'
                        }`}>
                          {producto.stock > 0 ? `${producto.stock} disponibles` : 'Sin stock'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="card-actions justify-end mt-4">
                    <button className="btn btn-primary btn-sm">
                      Ver Detalles
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Floating Action Button para administradores */}
        {/* {user?.groups?.includes('Administradores') && (
          <div className="fixed bottom-6 right-6">
            <button className="btn btn-primary btn-circle btn-lg shadow-lg">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default ProductosPage;
