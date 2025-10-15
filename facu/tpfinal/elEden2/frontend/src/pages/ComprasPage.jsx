import React, { useState, useEffect } from 'react';
import { success, handleApiError } from '../utils/notifications';
import { 
  Plus, Edit, Trash2, Search, ShoppingCart, X, Calendar, 
  FileText, Package, DollarSign, Minus 
} from 'lucide-react';
import { 
  comprasService, 
  proveedoresService,
  productosService 
} from '../services';

const ComprasPage = () => {
  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetallesModal, setShowDetallesModal] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para el formulario de compra
  const [formData, setFormData] = useState({
    proveedor: '',
    fecha: new Date().toISOString().split('T')[0],
    observaciones: ''
  });
  
  // Estados para detalles de compra (inline)
  const [detalles, setDetalles] = useState([]);
  const [nuevoDetalle, setNuevoDetalle] = useState({
    producto: '',
    cantidad: 1,
    precio_unitario: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [comprasData, proveedoresData, productosData] = await Promise.all([
        comprasService.getAll(),
        proveedoresService.getAll(),
        productosService.getAll()
      ]);
      
      setCompras(Array.isArray(comprasData) ? comprasData : comprasData.results || []);
      setProveedores(Array.isArray(proveedoresData) ? proveedoresData : proveedoresData.results || []);
      setProductos(Array.isArray(productosData) ? productosData : productosData.results || []);
    } catch (error) {
      handleApiError(error, 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (compra = null) => {
    if (compra) {
      setSelectedCompra(compra);
      setFormData({
        proveedor: compra.proveedor,
        fecha: compra.fecha?.split('T')[0] || new Date().toISOString().split('T')[0],
        observaciones: compra.observaciones || ''
      });
      setDetalles(compra.detalles || []);
    } else {
      setSelectedCompra(null);
      setFormData({
        proveedor: '',
        fecha: new Date().toISOString().split('T')[0],
        observaciones: ''
      });
      setDetalles([]);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCompra(null);
    setFormData({
      proveedor: '',
      fecha: new Date().toISOString().split('T')[0],
      observaciones: ''
    });
    setDetalles([]);
    setNuevoDetalle({
      producto: '',
      cantidad: 1,
      precio_unitario: 0
    });
  };

  const handleAgregarDetalle = () => {
    if (!nuevoDetalle.producto || nuevoDetalle.cantidad <= 0 || nuevoDetalle.precio_unitario <= 0) {
      handleApiError({ message: 'Complete todos los campos del detalle' }, 'Datos incompletos');
      return;
    }

    const producto = productos.find(p => p.id_producto === parseInt(nuevoDetalle.producto));
    const subtotal = nuevoDetalle.cantidad * nuevoDetalle.precio_unitario;

    setDetalles([...detalles, {
      producto: nuevoDetalle.producto,
      producto_nombre: producto?.nombre || '',
      cantidad: nuevoDetalle.cantidad,
      precio_unitario: nuevoDetalle.precio_unitario,
      subtotal: subtotal
    }]);

    setNuevoDetalle({
      producto: '',
      cantidad: 1,
      precio_unitario: 0
    });
  };

  const handleEliminarDetalle = (index) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (detalles.length === 0) {
      handleApiError({ message: 'Debe agregar al menos un producto' }, 'Datos incompletos');
      return;
    }

    try {
      const compraData = {
        ...formData,
        detalles: detalles.map(d => ({
          producto: d.producto,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario
        }))
      };

      if (selectedCompra) {
        await comprasService.update(selectedCompra.id_compra, compraData);
        success('Compra actualizada exitosamente');
      } else {
        await comprasService.create(compraData);
        success('Compra creada exitosamente');
      }

      handleCloseModal();
      fetchData();
    } catch (error) {
      handleApiError(error, 'Error al guardar la compra');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta compra?')) {
      return;
    }

    try {
      await comprasService.delete(id);
      success('Compra eliminada exitosamente');
      fetchData();
    } catch (error) {
      handleApiError(error, 'Error al eliminar la compra');
    }
  };

  const handleVerDetalles = (compra) => {
    setSelectedCompra(compra);
    setShowDetallesModal(true);
  };

  const filteredCompras = compras.filter(compra =>
    compra.proveedor_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    compra.fecha?.includes(searchTerm) ||
    compra.observaciones?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calcularTotal = () => {
    return detalles.reduce((sum, detalle) => sum + (detalle.cantidad * detalle.precio_unitario), 0);
  };

  if (loading && compras.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400"></div>
          <p className="text-gray-300 mt-4">Cargando compras...</p>
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
                <ShoppingCart className="w-8 h-8 mr-3 text-green-400" />
                Gestión de Compras
              </h1>
              <p className="text-gray-400">Administra las compras a proveedores</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nueva Compra
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 bg-gray-800 p-4 rounded-lg">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar compras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Proveedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Observaciones</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredCompras.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      {searchTerm ? 'No se encontraron compras' : 'No hay compras registradas'}
                    </td>
                  </tr>
                ) : (
                  filteredCompras.map((compra) => (
                    <tr key={compra.id_compra} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-400">#{compra.id_compra}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-300">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(compra.fecha).toLocaleDateString('es-AR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-white">{compra.proveedor_nombre || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm font-semibold text-green-400">
                          <DollarSign className="w-4 h-4 mr-1" />
                          ${compra.total ? Number(compra.total).toFixed(2) : '0.00'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-300">{compra.observaciones || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleVerDetalles(compra)}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            title="Ver Detalles"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenModal(compra)}
                            className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(compra.id_compra)}
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-sm text-gray-400 text-center">
          {filteredCompras.length} compra{filteredCompras.length !== 1 ? 's' : ''} encontrada{filteredCompras.length !== 1 ? 's' : ''}
        </div>

        {/* Modal Crear/Editar Compra */}
        {showModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleCloseModal}
          >
            <div 
              className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h3 className="text-xl font-bold text-white">
                  {selectedCompra ? 'Editar Compra' : 'Nueva Compra'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6">
                {/* Datos de la Compra */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Proveedor *
                    </label>
                    <select
                      value={formData.proveedor}
                      onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      <option value="">Seleccione proveedor</option>
                      {proveedores.map(prov => (
                        <option key={prov.id_proveedor} value={prov.id_proveedor}>
                          {prov.razon_social}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Fecha *
                    </label>
                    <input
                      type="date"
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Total
                    </label>
                    <div className="flex items-center px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-green-400 font-bold">
                      <DollarSign className="w-5 h-5 mr-1" />
                      {calcularTotal().toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows="2"
                    placeholder="Observaciones adicionales"
                  />
                </div>

                {/* Detalles de Compra */}
                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Package className="w-5 h-5 mr-2 text-green-400" />
                    Productos
                  </h4>

                  {/* Tabla de Detalles */}
                  {detalles.length > 0 && (
                    <div className="mb-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-700">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-300">Producto</th>
                            <th className="px-3 py-2 text-center text-gray-300">Cantidad</th>
                            <th className="px-3 py-2 text-right text-gray-300">Precio Unit.</th>
                            <th className="px-3 py-2 text-right text-gray-300">Subtotal</th>
                            <th className="px-3 py-2 text-center text-gray-300">-</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {detalles.map((detalle, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2 text-white">{detalle.producto_nombre}</td>
                              <td className="px-3 py-2 text-center text-gray-300">{detalle.cantidad}</td>
                              <td className="px-3 py-2 text-right text-gray-300">${detalle.precio_unitario.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right font-semibold text-green-400">${(detalle.cantidad * detalle.precio_unitario).toFixed(2)}</td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleEliminarDetalle(index)}
                                  className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Agregar Nuevo Detalle */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Producto
                      </label>
                      <select
                        value={nuevoDetalle.producto}
                        onChange={(e) => setNuevoDetalle({ ...nuevoDetalle, producto: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">Seleccione producto</option>
                        {productos.map(prod => (
                          <option key={prod.id_producto} value={prod.id_producto}>
                            {prod.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={nuevoDetalle.cantidad}
                        onChange={(e) => setNuevoDetalle({ ...nuevoDetalle, cantidad: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Precio Unit.
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={nuevoDetalle.precio_unitario}
                        onChange={(e) => setNuevoDetalle({ ...nuevoDetalle, precio_unitario: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAgregarDetalle}
                    className="mt-3 flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar Producto
                  </button>
                </div>

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
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    disabled={detalles.length === 0}
                  >
                    {selectedCompra ? 'Actualizar' : 'Crear'} Compra
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Ver Detalles */}
        {showDetallesModal && selectedCompra && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetallesModal(false)}
          >
            <div 
              className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h3 className="text-xl font-bold text-white">
                  Detalles de Compra #{selectedCompra.id_compra}
                </h3>
                <button
                  onClick={() => setShowDetallesModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <span className="text-gray-400">Proveedor:</span>
                    <p className="text-white font-semibold">{selectedCompra.proveedor_nombre}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Fecha:</span>
                    <p className="text-white font-semibold">{new Date(selectedCompra.fecha).toLocaleDateString('es-AR')}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400">Observaciones:</span>
                    <p className="text-white">{selectedCompra.observaciones || 'Sin observaciones'}</p>
                  </div>
                </div>

                {selectedCompra.detalles && selectedCompra.detalles.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-300">Producto</th>
                          <th className="px-4 py-2 text-center text-gray-300">Cantidad</th>
                          <th className="px-4 py-2 text-right text-gray-300">Precio Unit.</th>
                          <th className="px-4 py-2 text-right text-gray-300">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {selectedCompra.detalles.map((detalle, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-white">{detalle.producto_nombre || `Producto ${detalle.producto}`}</td>
                            <td className="px-4 py-2 text-center text-gray-300">{detalle.cantidad}</td>
                            <td className="px-4 py-2 text-right text-gray-300">${detalle.precio_unitario?.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-semibold text-green-400">
                              ${(detalle.cantidad * detalle.precio_unitario).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-700">
                        <tr>
                          <td colSpan="3" className="px-4 py-2 text-right font-bold text-white">TOTAL:</td>
                          <td className="px-4 py-2 text-right font-bold text-green-400 text-lg">
                            ${selectedCompra.total ? Number(selectedCompra.total).toFixed(2) : '0.00'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-gray-400 py-4">No hay detalles disponibles</p>
                )}

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowDetallesModal(false)}
                    className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComprasPage;
