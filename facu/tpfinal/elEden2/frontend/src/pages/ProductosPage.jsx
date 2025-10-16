import React, { useState, useEffect } from 'react';
import { productosService, categoriasService, marcasService } from '../services';
import { handleApiError, success } from '../utils/notifications';
import { 
  Search, 
  Filter, 
  Package, 
  DollarSign, 
  Grid,
  List,
  Plus,
  X,
  Upload,
  Edit,
  Trash2
} from 'lucide-react';

const ProductosPage = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showModal, setShowModal] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: '',
    marca: '',
    imagen: null
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productosData, categoriasData, marcasData] = await Promise.all([
        productosService.getProductos(),
        categoriasService.getAll(),
        marcasService.getAll()
      ]);
      setProductos(productosData.results || []);
      setCategorias(Array.isArray(categoriasData) ? categoriasData : categoriasData.results || []);
      setMarcas(Array.isArray(marcasData) ? marcasData : marcasData.results || []);
    } catch (error) {
      handleApiError(error, 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (producto = null) => {
    if (producto) {
      console.log('Producto recibido:', producto);
      console.log('Categoria:', producto.categoria, 'Marca:', producto.marca, 'Imagen:', producto.imagen);
      
      setSelectedProducto(producto);
      setFormData({
        nombre: producto.nombre,
        descripcion: producto.descripcion || '',
        categoria: producto.categoria ? String(producto.categoria) : '',
        marca: producto.marca ? String(producto.marca) : '',
        imagen: null
      });
      // Si el producto tiene imagen, mostrarla como preview
      setImagePreview(producto.imagen || null);
      
      console.log('FormData después de setear:', {
        categoria: producto.categoria ? String(producto.categoria) : '',
        marca: producto.marca ? String(producto.marca) : '',
        imagen: producto.imagen
      });
    } else {
      setSelectedProducto(null);
      setFormData({
        nombre: '',
        descripcion: '',
        categoria: '',
        marca: '',
        imagen: null
      });
      setImagePreview(null);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProducto(null);
    setFormData({
      nombre: '',
      descripcion: '',
      categoria: '',
      marca: '',
      imagen: null
    });
    setImagePreview(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, imagen: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, imagen: null });
    setImagePreview(null);
    // Reset file input
    const fileInput = document.getElementById('imagen-input');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const submitData = new FormData();
      submitData.append('nombre', formData.nombre);
      submitData.append('descripcion', formData.descripcion);
      submitData.append('categoria', formData.categoria);
      submitData.append('marca', formData.marca);
      
      if (formData.imagen instanceof File) {
        submitData.append('imagen', formData.imagen);
      }

      if (selectedProducto) {
        await productosService.update(selectedProducto.id_producto, submitData);
        success('Producto actualizado exitosamente');
      } else {
        await productosService.create(submitData);
        success('Producto creado exitosamente');
      }

      handleCloseModal();
      fetchData();
    } catch (error) {
      handleApiError(error, 'Error al guardar el producto');
    }
  };

  const handleDelete = async (producto) => {
    if (window.confirm(`¿Está seguro que desea eliminar el producto "${producto.nombre}"?`)) {
      try {
        await productosService.delete(producto.id_producto);
        success('Producto eliminado exitosamente');
        fetchData();
      } catch (error) {
        handleApiError(error, 'Error al eliminar el producto');
      }
    }
  };

  const filteredProductos = productos.filter(producto => {
    const matchesSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         producto.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = !selectedCategoria || producto.categoria_nombre === selectedCategoria;
    const matchesPrice = (!priceRange.min || producto.precio >= priceRange.min) &&
                        (!priceRange.max || producto.precio <= priceRange.max);
    return matchesSearch && matchesCategoria && matchesPrice;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400"></div>
          <p className="text-gray-300 mt-4">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <Package className="w-8 h-8 mr-3 text-green-400" />
                Inventario de Productos
              </h1>
              <p className="text-gray-400">Gestión de productos para diseños de jardinería</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nuevo Producto
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Info Banner */}
          <div className="mt-4 bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
            <p className="text-blue-400 text-sm">
              <span className="font-semibold">ℹ️ Información:</span> Estos productos son utilizados exclusivamente en los diseños de jardinería. Los clientes no pueden comprarlos directamente, sino que forman parte de los presupuestos de diseño que deben aprobar.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-gray-800 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                className="w-full pl-10 pr-8 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Todas las categorías</option>
                {categorias.map(categoria => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Costo mín."
                value={priceRange.min}
                onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <input
                type="number"
                placeholder="Costo máx."
                value={priceRange.max}
                onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-end">
              <span className="text-sm text-gray-400">
                {filteredProductos.length} producto{filteredProductos.length !== 1 ? 's' : ''} encontrado{filteredProductos.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Products Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProductos.map(producto => (
              <div key={producto.id} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                {/* Product Image */}
                <div className="h-48 bg-gray-700 relative">
                  {producto.imagen ? (
                    <img
                      src={producto.imagen}
                      alt={producto.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-500" />
                    </div>
                  )}
                  {/* Badge de disponibilidad */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      producto.stock_actual > 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                      {producto.stock_actual > 0 ? 'Disponible' : 'Sin Stock'}
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                    {producto.nombre}
                  </h3>
                  
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                    {producto.descripcion || 'Sin descripción'}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between text-gray-300">
                      <span>Categoría:</span>
                      <span className="font-semibold text-white">{producto.categoria_nombre || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-300">
                      <span>Marca:</span>
                      <span className="font-semibold text-white">{producto.marca_nombre || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-300">
                      <span>Stock actual:</span>
                      <span className="font-semibold text-green-400">{producto.stock_actual || 0} unidades</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-300 border-t border-gray-700 pt-2">
                      <span>Costo unitario:</span>
                      <div className="flex items-center text-green-400 font-bold">
                        <DollarSign className="w-4 h-4" />
                        <span>{producto.precio?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleOpenModal(producto)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="text-sm">Editar</span>
                    </button>
                    <button
                      onClick={() => handleDelete(producto)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm">Eliminar</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3">Producto</th>
                  <th scope="col" className="px-6 py-3">Categoría</th>
                  <th scope="col" className="px-6 py-3">Marca</th>
                  <th scope="col" className="px-6 py-3">Costo</th>
                  <th scope="col" className="px-6 py-3">Stock</th>
                  <th scope="col" className="px-6 py-3 text-center">Estado</th>
                  <th scope="col" className="px-6 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProductos.map(producto => (
                  <tr key={producto.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-750">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center mr-3">
                          {producto.imagen ? (
                            <img src={producto.imagen} alt={producto.nombre} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Package className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">{producto.nombre}</p>
                          <p className="text-xs text-gray-400 line-clamp-1">{producto.descripcion || 'Sin descripción'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{producto.categoria_nombre || '-'}</td>
                    <td className="px-6 py-4 text-gray-300">{producto.marca_nombre || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-green-400">
                        <DollarSign className="w-4 h-4 mr-1" />
                        {producto.precio?.toFixed(2) || '0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-white">{producto.stock_actual || 0}</span>
                      <span className="text-gray-400 text-xs ml-1">unid.</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        producto.stock_actual > 0 ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                      }`}>
                        {producto.stock_actual > 0 ? 'Disponible' : 'Sin Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(producto)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          title="Editar producto"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(producto)}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {filteredProductos.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-500">
              Intenta ajustar los filtros de búsqueda
            </p>
          </div>
        )}

        {/* Modal Crear/Editar Producto */}
        {showModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleCloseModal}
          >
            <div 
              className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h3 className="text-xl font-bold text-white">
                  {selectedProducto ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nombre */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Ej: Tierra Abonada Premium"
                      required
                    />
                  </div>

                  {/* Categoría */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Categoría *
                    </label>
                    <select
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      <option value="">Seleccione categoría</option>
                      {categorias.map(cat => (
                        <option key={cat.id_categoria} value={String(cat.id_categoria)}>
                          {cat.nombre_categoria}
                        </option>
                      ))}
                    </select>
                    {categorias.length === 0 && (
                      <p className="text-xs text-yellow-400 mt-1">
                        ⚠️ Primero debes crear categorías
                      </p>
                    )}
                  </div>

                  {/* Marca */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Marca *
                    </label>
                    <select
                      value={formData.marca}
                      onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      <option value="">Seleccione marca</option>
                      {marcas.map(marca => (
                        <option key={marca.id_marca} value={String(marca.id_marca)}>
                          {marca.nombre_marca}
                        </option>
                      ))}
                    </select>
                    {marcas.length === 0 && (
                      <p className="text-xs text-yellow-400 mt-1">
                        ⚠️ Primero debes crear marcas
                      </p>
                    )}
                  </div>

                  {/* Descripción */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      rows="3"
                      placeholder="Descripción detallada del producto"
                    />
                  </div>

                  {/* Imagen */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Imagen del Producto
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          id="imagen-input"
                        />
                        <label
                          htmlFor="imagen-input"
                          className="flex items-center justify-center px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                        >
                          <Upload className="w-5 h-5 mr-2 text-gray-400" />
                          <span className="text-gray-300">Seleccionar imagen</span>
                        </label>
                      </div>
                      {imagePreview && (
                        <div className="relative">
                          <div className="w-24 h-24 bg-gray-700 rounded-lg overflow-hidden">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 transition-colors"
                            title="Eliminar imagen"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Formatos: JPG, PNG, GIF (máx. 5MB)
                    </p>
                  </div>
                </div>

                {/* Advertencias */}
                {(categorias.length === 0 || marcas.length === 0) && (
                  <div className="mt-4 bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4">
                    <p className="text-yellow-400 text-sm">
                      <span className="font-semibold">⚠️ Atención:</span> Para crear un producto necesitas tener al menos una categoría y una marca registradas.
                    </p>
                  </div>
                )}

                {/* Botones */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={categorias.length === 0 || marcas.length === 0}
                  >
                    {selectedProducto ? 'Actualizar' : 'Crear'} Producto
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductosPage;
