import React, { useState, useEffect, useCallback } from 'react';
import { X, Upload, Plus, Trash2, Palette, DollarSign, Calendar, Image as ImageIcon, Package, Search } from 'lucide-react';
import { serviciosService, productosService } from '../services';
import ProductSelector from '../components/ProductSelector';
import { success, error as showError } from '../utils/notifications';

const CrearDisenoModal = ({ servicio: reserva, diseno, isOpen, onClose, onDisenoCreado, mode = 'diseno' }) => {
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  const [disenoCompleto, setDisenoCompleto] = useState(null);
  
  // Determinar si estamos en modo edición
  const modoEdicion = !!diseno;
  
  // Extraer el ID de servicio de la reserva o del diseño
  const servicioId = disenoCompleto?.servicio || diseno?.servicio || reserva?.servicio || reserva?.id_servicio;
  // Extraer el ID de la reserva
  const reservaId = disenoCompleto?.reserva_id || diseno?.reserva_id || reserva?.id_reserva;
  
  // Debug: verificar que tenemos la reserva correctamente
  useEffect(() => {
    if (isOpen) {
      console.log('📋 Modo:', modoEdicion ? 'Edición' : 'Creación');
      console.log('📋 Diseño recibido:', diseno);
      console.log('📋 Reserva recibida:', reserva);
      console.log('📋 Diseño completo cargado:', disenoCompleto);
      console.log('🔑 Servicio ID:', servicioId);
      console.log('🔑 Reserva ID:', reservaId);
    }
  }, [isOpen, reserva, diseno, disenoCompleto, servicioId, reservaId, modoEdicion]);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    descripcion_tecnica: '',
    presupuesto: '',
    presupuesto_final: ''
  });
  // Formas Terreno may still be used in other contexts
  const [formasTerreno, setFormasTerreno] = useState([]);
  
  const [imagenesDiseno, setImagenesDiseno] = useState([]);
  const [imagenesExistentes, setImagenesExistentes] = useState([]); // Imágenes ya guardadas del diseño
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [reservasConJardin, setReservasConJardin] = useState([]);
  const [reservaSeleccionadaId, setReservaSeleccionadaId] = useState(null);

  const cargarDisenoParaEditar = useCallback(async () => {
    if (!diseno?.id_diseno) return;
    try {
      console.log('🔍 Intentando cargar diseño con ID:', diseno.id_diseno);
      console.log('🔍 Diseño completo recibido:', diseno);
      
      // Obtener detalles completos del diseño
      const disenoData = await serviciosService.getDiseno(diseno.id_diseno);
      
      console.log('✅ Diseño cargado del backend:', disenoData);
      
      // Guardar el diseño completo en el estado
      setDisenoCompleto(disenoData);
      
      // Formatear fecha si existe
      // fecha_propuesta is intentionally not moved to state anymore (we removed fecha_estimada_realizacion)
      
      // Cargar productos seleccionados y calcular costo de mano de obra
      let costoManoObraCalculado = parseFloat(disenoData.presupuesto) || 0;
      
      if (disenoData.productos && disenoData.productos.length > 0) {
        console.log('📦 Productos del backend:', disenoData.productos);
        const productosEditados = disenoData.productos.map(p => {
          console.log('📦 Producto individual:', p);
          const cantidadRaw = parseInt(p.cantidad, 10) || 0;
          const stockActual = getStockForProduct(p.producto);
          const cantidad = stockActual > 0 ? Math.min(Math.max(cantidadRaw || 1, 1), stockActual) : 0;
          return {
            producto_id: p.producto,  // ID del producto
            cantidad: cantidad,  // Ajustar a stock disponible
            precio_unitario: parseFloat(p.precio_unitario) || 0,  // Asegurar que sea un número
            notas: p.notas || ''
          };
        });
        console.log('📦 Productos mapeados para el estado:', productosEditados);
        setProductosSeleccionados(productosEditados);
        
        // Calcular el costo de mano de obra (Presupuesto Total - Subtotal de Productos)
        const subtotalProductos = productosEditados.reduce((total, prod) => {
          return total + (prod.cantidad * prod.precio_unitario);
        }, 0);
        costoManoObraCalculado = Math.max(0, (parseFloat(disenoData.presupuesto) || 0) - subtotalProductos);
        
        console.log('💰 Presupuesto total:', disenoData.presupuesto);
        console.log('📦 Subtotal productos:', subtotalProductos);
        console.log('👷 Costo mano de obra calculado:', costoManoObraCalculado);
      }
      
      // Cargar datos del formulario con el costo de mano de obra correcto
      setFormData({
        descripcion_tecnica: disenoData.descripcion || '',
        presupuesto: costoManoObraCalculado.toFixed(2),  // Usar el costo de mano de obra calculado
        presupuesto_final: disenoData.presupuesto || ''
      });
      
      // Cargar imágenes existentes del diseño
      if (disenoData.imagenes && disenoData.imagenes.length > 0) {
        console.log('🖼️ Imágenes del diseño:', disenoData.imagenes);
        setImagenesExistentes(disenoData.imagenes);
      }
      
    } catch (error) {
      showError('Error al cargar el diseño para editar');
      console.error('❌ Error completo:', error);
      console.error('❌ Response:', error.response);
    }
  }, [diseno]);

  useEffect(() => {
    if (isOpen) {
      fetchProductos();
      fetchFormasTerreno();
      if (modoEdicion && diseno) {
        cargarDisenoParaEditar();
      } else {
        resetForm();
      }
      
      // If no reservation (reserva prop) and we're in diseno mode, fetch reservas with garden
      if (!reserva && mode === 'diseno') {
        (async () => {
          try {
            const data = await serviciosService.getReservas({ page: 1, page_size: 100 });
            const allReservas = data.results || data;
            const withJardin = allReservas.filter(r => !!r.jardin);
            setReservasConJardin(withJardin);
          } catch (err) {
            console.error('Error fetching reservas with jardn', err);
          }
        })();
      }
    }
  }, [isOpen, modoEdicion, diseno, cargarDisenoParaEditar]);

  

  const fetchProductos = async () => {
    try {
      const data = await productosService.getProductos();
      setProductos(data.results || []);
    } catch (error) {
      showError('Error al cargar productos');
      console.error(error);
    }
  };

  const fetchFormasTerreno = async () => {
    try {
      const data = await serviciosService.getFormasTerreno();
      setFormasTerreno(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error al cargar formas de terreno', error);
    }
  };

  // Helper para obtener stock numérico de un producto (prefiere stock_actual). Devuelve 0 si no existe.
  const getStockForProduct = (productId) => {
    if (!productId && productId !== 0) return 0;
    const id = parseInt(productId, 10);
    if (Number.isNaN(id)) return 0;
    const prod = productos.find(p => p.id_producto === id);
    if (!prod) return 0;
    if (typeof prod.stock_actual !== 'undefined' && prod.stock_actual !== null) {
      return parseInt(prod.stock_actual, 10) || 0;
    }
    if (prod.stock && typeof prod.stock.cantidad !== 'undefined' && prod.stock.cantidad !== null) {
      return parseInt(prod.stock.cantidad, 10) || 0;
    }
    return 0;
  };

  const getProductImage = (productId) => {
    if (!productId && productId !== 0) return null;
    const id = parseInt(productId, 10);
    if (Number.isNaN(id)) return null;
    const prod = productos.find(p => p.id_producto === id || p.id === id);
    return prod?.imagen || null;
  };

  const resetForm = () => {
    setFormData({
      descripcion_tecnica: '',
      presupuesto: '',
      presupuesto_final: '',
    });
    setImagenesDiseno([]);
    setImagenesExistentes([]);
    setProductosSeleccionados([]);
    setPreviewImages([]);
    setDisenoCompleto(null);
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
    // Si no hay productos con stock > 0, no permitir agregar
    const anyStockAvailable = productos.some(p => getStockForProduct(p.id_producto) > 0);
    if (!anyStockAvailable) {
      showError('No hay productos con stock disponible');
      return;
    }
    setProductosSeleccionados([...productosSeleccionados, {
      producto_id: '',
      cantidad: 1,
      precio_unitario: '',
      notas: ''
    }]);
  };

  const actualizarProducto = (index, campo, valor) => {
    const nuevosProductos = [...productosSeleccionados];

    if (campo === 'producto_id') {
      nuevosProductos[index][campo] = valor;

      const productoSeleccionado = productos.find(p => p.id_producto === parseInt(valor, 10));
      if (productoSeleccionado) {
        nuevosProductos[index]['precio_unitario'] = productoSeleccionado.precio;
        const stock = getStockForProduct(productoSeleccionado.id_producto);
        const prevCantidad = parseInt(nuevosProductos[index].cantidad, 10) || 0;
        if (stock > 0) {
          nuevosProductos[index]['cantidad'] = Math.min(Math.max(prevCantidad || 1, 1), stock);
        } else {
          nuevosProductos[index]['cantidad'] = 0;
        }
      } else {
        nuevosProductos[index]['precio_unitario'] = '';
        nuevosProductos[index]['cantidad'] = 1;
      }
    } else if (campo === 'cantidad') {
      let cantidad = parseInt(valor, 10);
      if (Number.isNaN(cantidad)) cantidad = 0;

      const prodIdForIndex = parseInt(nuevosProductos[index].producto_id, 10);
      const stock = prodIdForIndex ? getStockForProduct(prodIdForIndex) : null;

      if (stock !== null && stock !== undefined) {
        const min = stock > 0 ? 1 : 0;
        const max = stock;
        if (cantidad < min) cantidad = min;
        if (cantidad > max) cantidad = max;
      } else {
        if (cantidad < 1) cantidad = 1;
      }
      nuevosProductos[index][campo] = cantidad;
    } else {
      nuevosProductos[index][campo] = valor;
    }

    setProductosSeleccionados(nuevosProductos);
  };

  const eliminarProducto = (index) => {
    const nuevosProductos = productosSeleccionados.filter((_, i) => i !== index);
    setProductosSeleccionados(nuevosProductos);
  };

  const calcularTotalProductos = () => {
    return productosSeleccionados.reduce((total, prod) => {
      const subtotal = (prod.cantidad || 0) * (parseFloat(prod.precio_unitario) || 0);
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
    
    // Descripción técnica no es obligatoria (opcional al final)

    try {
      setLoading(true);
      
      const formDataToSend = new FormData();
      
      // Agregar datos básicos
      // Determine servicio_id: use existing servicioId or derive from selected reserva
      let servicioParaEnviarId = servicioId;
      if (!servicioParaEnviarId) {
        const sel = reserva || reservasConJardin.find(r => `${r.id_reserva}` === `${reservaSeleccionadaId}`);
        servicioParaEnviarId = sel ? (sel.servicio || sel.servicio_id || sel.id_servicio) : null;
      }
      if (!servicioParaEnviarId) {
        showError('El servicio asociado a la reserva no está disponible. Seleccione otra reserva.');
        return;
      }
      formDataToSend.append('servicio_id', servicioParaEnviarId);
      // Agregar el ID de la reserva si existe
      if (reservaId) {
        formDataToSend.append('reserva_id', reservaId);
      }
      // Usar valor de descripcion como titulo si existe; si no, usar reserva como fallback
      let titulo = (formData.descripcion_tecnica || '').trim().substring(0, 100);
      // Determine createReservaId for fallbacks
      const createReservaId = reservaId || reservaSeleccionadaId;
      if (!titulo) {
        titulo = createReservaId ? `Diseño - Reserva #${createReservaId}` : `Diseño - Servicio #${servicioId || 'N/A'}`;
      }
      formDataToSend.append('titulo', titulo);
      formDataToSend.append('descripcion', formData.descripcion_tecnica);
      formDataToSend.append('presupuesto', calcularPresupuestoFinal());
      
      // Agregar fecha propuesta si existe
      // Fecha estimada de realización removed (no longer appended)
      
      // Agregar imágenes
      imagenesDiseno.forEach((imagen) => {
        formDataToSend.append('imagenes_diseño', imagen);
      });
      
      // Agregar productos como JSON string
      if (productosSeleccionados.length > 0) {
        const productosValidados = productosSeleccionados.filter(p => 
          p.producto_id && p.cantidad && p.precio_unitario
        );
        formDataToSend.append('productos', JSON.stringify(productosValidados));
      }

      let response;
      
      if (modoEdicion) {
        // Actualizar diseño existente
        response = await serviciosService.updateDiseno(diseno.id_diseno, formDataToSend);
        success('Diseño actualizado exitosamente');
      } else {
        // Crear nuevo diseño
        const createReservaId = reservaId || reservaSeleccionadaId;
        if (!createReservaId) {
          showError('Debe seleccionar una reserva que tenga información del jardín antes de crear el diseño');
          return;
        }
        formDataToSend.append('reserva_id', createReservaId);
        response = await serviciosService.crearDisenoCompleto(formDataToSend);
        success('Diseño creado exitosamente');
      }
      
      // Llamar al callback solo si está definido
      if (onDisenoCreado && typeof onDisenoCreado === 'function') {
        onDisenoCreado(response);
      }
      
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
  }, [previewImages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Palette className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-bold text-white">
              {modoEdicion ? 'Editar Diseño' : 'Crear Diseño'}
            </h2>
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
            {/* If it's diseno mode but no reserva passed, let user choose a reserva (only those with jardin) */}
            {mode === 'diseno' && !reserva && (
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">Seleccionar Reserva (con jardín)</h3>
                <select value={reservaSeleccionadaId || ''} onChange={(e) => setReservaSeleccionadaId(e.target.value)} className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm">
                  <option value="">Seleccionar reserva...</option>
                  {reservasConJardin.map(r => (
                    <option key={r.id_reserva} value={r.id_reserva}>#{r.id_reserva} - {r.cliente_nombre} - {r.servicio_nombre}</option>
                  ))}
                </select>
              </div>
            )}
            
            
            {/* Descripción Técnica (opcional, se puede agregar al final) */}

            {/* Fecha estimada removed by request */}

            {/* Imágenes del Diseño (solo en modo diseño) */}
            {mode !== 'jardin' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                <ImageIcon className="w-4 h-4 mr-2" />
                Imágenes del Diseño
              </label>
              
              {/* Imágenes Existentes (en modo edición) */}
              {modoEdicion && imagenesExistentes.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2">Imágenes actuales del diseño:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {imagenesExistentes.map((imagen, index) => (
                      <div key={`existente-${index}`} className="relative group">
                        <img
                          src={imagen.imagen}
                          alt={imagen.descripcion || `Imagen ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-blue-500"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-blue-600 bg-opacity-75 text-white text-xs p-1 text-center rounded-b-lg">
                          Existente
                        </div>
                        {imagen.descripcion && (
                          <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 rounded-t-lg">
                            {imagen.descripcion}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
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
                  <span className="text-gray-400">
                    {modoEdicion ? 'Agregar más imágenes' : 'Haz clic para subir imágenes'}
                  </span>
                </label>
                
                {/* Preview de nuevas imágenes */}
                {previewImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-400 mb-2">Nuevas imágenes a agregar:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {previewImages.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview.url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border-2 border-green-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-green-600 bg-opacity-75 text-white text-xs p-1 text-center rounded-b-lg">
                            Nueva
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Productos Necesarios (solo en modo diseño) */}
            {mode !== 'jardin' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-300 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  Productos Necesarios
                </label>
                <button
                  type="button"
                  onClick={agregarProducto}
                  disabled={!productos.some(p => getStockForProduct(p.id_producto) > 0)}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Producto</span>
                </button>
              </div>

              {productosSeleccionados.map((producto, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-4 mb-3">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    <div className="flex items-center justify-center">
                      { (producto.imagen || getProductImage(producto.producto_id)) ? (
                        <img src={producto.imagen || getProductImage(producto.producto_id)} alt="producto" className="w-14 h-14 object-cover rounded-md" />
                      ) : (
                        <div className="w-14 h-14 flex items-center justify-center rounded-md bg-gray-600 text-gray-400">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Producto</label>
                      <ProductSelector
                        productos={productos}
                        selectedProductId={producto.producto_id}
                        onSelect={(selectedProd) => {
                          if (!selectedProd) return;
                          // Propagar selección: id, precio e imagen
                          actualizarProducto(index, 'producto_id', String(selectedProd.id_producto ?? selectedProd.id));
                          actualizarProducto(index, 'precio_unitario', selectedProd.precio);
                          // Guardar imagen en el producto seleccionado para mostrar thumbnail
                          const nuevosProductos = [...productosSeleccionados];
                          nuevosProductos[index] = {
                            ...nuevosProductos[index],
                            imagen: selectedProd.imagen || null
                          };
                          setProductosSeleccionados(nuevosProductos);
                        }}
                        placeholder="Buscar producto..."
                        showStock={true}
                        allowSelectZeroStock={!!producto.producto_id}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Cantidad</label>
                      <input
                        type="number"
                        min={getStockForProduct(producto.producto_id) > 0 ? 1 : 0}
                        max={getStockForProduct(producto.producto_id)}
                        value={producto.cantidad}
                        onChange={(e) => actualizarProducto(index, 'cantidad', e.target.value)}
                        disabled={getStockForProduct(producto.producto_id) === 0}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <p className="text-xs text-gray-400 mt-1">Stock disponible: {getStockForProduct(producto.producto_id)}</p>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Precio Unitario</label>
                      <input
                        type="text"
                        value={producto.precio_unitario ? `$${parseFloat(producto.precio_unitario).toFixed(2)}` : '$0.00'}
                        readOnly
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-gray-300 text-sm cursor-not-allowed"
                        title="El precio se toma automáticamente del producto"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Subtotal</label>
                      <input
                        type="text"
                        value={`$${((producto.cantidad || 0) * (parseFloat(producto.precio_unitario) || 0)).toFixed(2)}`}
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
            )}
            
            {/* Presupuestos y Fecha (solo en modo diseño) */}
            {mode !== 'jardin' && (
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
            )}

            {/* Descripción Técnica (opcional) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Descripción Técnica (opcional)
              </label>
              <textarea
                name="descripcion_tecnica"
                value={formData.descripcion_tecnica}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Describe detalladamente el diseño propuesto..."
              />
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
                    <span>{modoEdicion ? 'Actualizando...' : 'Creando...'}</span>
                  </>
                ) : (
                  <>
                    <Palette className="w-4 h-4" />
                    <span>{modoEdicion ? 'Actualizar Diseño' : 'Crear Diseño'}</span>
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