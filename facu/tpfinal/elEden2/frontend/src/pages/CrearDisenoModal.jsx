import React, { useState, useEffect } from 'react';
import { X, Upload, Plus, Trash2, Palette, DollarSign, Calendar, Image as ImageIcon, Package } from 'lucide-react';
import { serviciosService, productosService } from '../services';
import { success, error as showError } from '../utils/notifications';

const CrearDisenoModal = ({ servicioId, isOpen, onClose, onDisenoCreated }) => {
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    descripcion_tecnica: '',
    presupuesto: '',
    presupuesto_final: '',
    fecha_estimada_realizacion: ''
  });
  
  const [imagenesDiseno, setImagenesDiseno] = useState([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchProductos();
      resetForm();
    }
  }, [isOpen]);

  const fetchProductos = async () => {
    try {
      const data = await productosService.getProductos();
      setProductos(data.results || []);
    } catch (error) {
      showError('Error al cargar productos');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      descripcion_tecnica: '',
      presupuesto: '',
      presupuesto_final: '',
      fecha_estimada_realizacion: ''
    });
    setImagenesDiseno([]);
    setProductosSeleccionados([]);
    setPreviewImages([]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImagenesDiseno(files);
    
    // Create preview URLs
    const previews = files.map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));
    setPreviewImages(previews);
  };

  const removeImage = (index) => {
    const newImages = imagenesDiseno.filter((_, i) => i !== index);
    const newPreviews = previewImages.filter((_, i) => i !== index);
    
    // Revoke URL of removed image to free memory
    if (previewImages[index]) {
      URL.revokeObjectURL(previewImages[index].url);
    }
    
    setImagenesDiseno(newImages);
    setPreviewImages(newPreviews);
  };

  const agregarProducto = () => {
    setProductosSeleccionados([...productosSeleccionados, {
      producto_id: '',
      cantidad: 1,
      costo_unitario: '',
      notas: ''
    }]);
  };

  const actualizarProducto = (index, campo, valor) => {
    const nuevosProductos = [...productosSeleccionados];
    nuevosProductos[index][campo] = valor;
    setProductosSeleccionados(nuevosProductos);
  };

  const eliminarProducto = (index) => {
    const nuevosProductos = productosSeleccionados.filter((_, i) => i !== index);
    setProductosSeleccionados(nuevosProductos);
  };

  const calcularTotalProductos = () => {
    return productosSeleccionados.reduce((total, prod) => {
      const subtotal = (prod.cantidad || 0) * (parseFloat(prod.costo_unitario) || 0);
      return total + subtotal;
    }, 0);
  };

  const calcularPresupuestoFinal = () => {
    const costoProductos = calcularTotalProductos();
    const costoManoObra = parseFloat(formData.presupuesto) || 0;
    return costoProductos + costoManoObra;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.descripcion_tecnica.trim()) {
      showError('La descripción técnica es obligatoria');
      return;
    }

    try {
      setLoading(true);
      
      const formDataToSend = new FormData();
      
      // Agregar datos básicos
      formDataToSend.append('servicio', servicioId);
      formDataToSend.append('descripcion_tecnica', formData.descripcion_tecnica);
      formDataToSend.append('presupuesto', formData.presupuesto || '0');
      formDataToSend.append('presupuesto_final', calcularPresupuestoFinal());
      
      if (formData.fecha_estimada_realizacion) {
        formDataToSend.append('fecha_estimada_realizacion', formData.fecha_estimada_realizacion);
      }
      
      // Agregar imágenes
      imagenesDiseno.forEach((imagen) => {
        formDataToSend.append('imagenes_diseño', imagen);
      });
      
      // Agregar productos como JSON string
      if (productosSeleccionados.length > 0) {
        const productosValidados = productosSeleccionados.filter(p => 
          p.producto_id && p.cantidad && p.costo_unitario
        );
        formDataToSend.append('productos', JSON.stringify(productosValidados));
      }

      const response = await serviciosService.crearDisenoCompleto(servicioId, formDataToSend);
      
      success('Diseño creado exitosamente');
      onDisenoCreated(response);
      onClose();
      
    } catch (error) {
      console.error('Error al crear diseño:', error);
      showError('Error al crear el diseño');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup URLs when component unmounts
  useEffect(() => {
    return () => {
      previewImages.forEach(preview => {
        URL.revokeObjectURL(preview.url);
      });
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Palette className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-bold text-white">Crear Diseño</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="p-6 space-y-6">
            
            {/* Descripción Técnica */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Descripción Técnica *
              </label>
              <textarea
                name="descripcion_tecnica"
                value={formData.descripcion_tecnica}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Describe detalladamente el diseño propuesto..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fecha Estimada de Realización
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="datetime-local"
                  name="fecha_estimada_realizacion"
                  value={formData.fecha_estimada_realizacion}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Imágenes del Diseño */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                <ImageIcon className="w-4 h-4 mr-2" />
                Imágenes del Diseño
              </label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="imagenes-diseno"
                />
                <label
                  htmlFor="imagenes-diseno"
                  className="cursor-pointer flex flex-col items-center justify-center py-4"
                >
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-gray-400">Haz clic para subir imágenes</span>
                </label>
                
                {/* Preview de imágenes */}
                {previewImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {previewImages.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview.url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Productos Necesarios */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-300 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  Productos Necesarios
                </label>
                <button
                  type="button"
                  onClick={agregarProducto}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Producto</span>
                </button>
              </div>

              {productosSeleccionados.map((producto, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-4 mb-3">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Producto</label>
                      <select
                        value={producto.producto_id}
                        onChange={(e) => actualizarProducto(index, 'producto_id', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Seleccionar...</option>
                        {productos.map((prod) => (
                          <option key={prod.id} value={prod.id}>
                            {prod.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        value={producto.cantidad}
                        onChange={(e) => actualizarProducto(index, 'cantidad', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Costo Unitario</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={producto.costo_unitario}
                        onChange={(e) => actualizarProducto(index, 'costo_unitario', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Subtotal</label>
                      <input
                        type="text"
                        value={((producto.cantidad || 0) * (parseFloat(producto.costo_unitario) || 0)).toFixed(2)}
                        readOnly
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-gray-300 text-sm cursor-not-allowed"
                      />
                    </div>
                    
                    <div>
                      <button
                        type="button"
                        onClick={() => eliminarProducto(index)}
                        className="w-full p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-xs text-gray-400 mb-1">Notas</label>
                    <input
                      type="text"
                      value={producto.notas}
                      onChange={(e) => actualizarProducto(index, 'notas', e.target.value)}
                      placeholder="Notas sobre el uso de este producto..."
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              ))}
            
            </div>
            
            {/* Presupuestos y Fecha */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Costo Mano de Obra
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    name="presupuesto"
                    value={formData.presupuesto}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Costo Productos
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={calcularTotalProductos().toFixed(2)}
                    readOnly
                    className="w-full pl-10 pr-3 py-2 bg-gray-600 border border-gray-600 rounded-md text-gray-300 cursor-not-allowed"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total Final
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-400" />
                  <input
                    type="text"
                    value={calcularPresupuestoFinal().toFixed(2)}
                    readOnly
                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-green-600 rounded-md text-green-400 font-bold cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creando...</span>
                  </>
                ) : (
                  <>
                    <Palette className="w-4 h-4" />
                    <span>Crear Diseño</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearDisenoModal;