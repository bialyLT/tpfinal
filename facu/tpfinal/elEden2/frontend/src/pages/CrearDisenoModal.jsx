import React, { useState, useEffect } from 'react';
import flatpickr from 'flatpickr';
// No localization imports for now
import { X, Upload, Plus, Trash2, Palette, DollarSign, Calendar, Image as ImageIcon, Package, Search } from 'lucide-react';
import { serviciosService, productosService } from '../services';
import { useAuth } from '../context/AuthContext';
import ProductSelector from '../components/ProductSelector';
import { success, error as showError } from '../utils/notifications';

const isSameDateTime = (a, b) => Boolean(a && b && a.getTime() === b.getTime());

const CrearDisenoModal = ({ servicio: reserva, diseno, isOpen, onClose, onDisenoCreado, mode = 'diseno', onCargarJardin }) => {
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  const [disenoCompleto, setDisenoCompleto] = useState(null);
  const [fechaPropuesta, setFechaPropuesta] = useState(null);
  const [fechaPropuestaDatePart, setFechaPropuestaDatePart] = useState(null); // selected date (day)
  const [fechaPropuestaTimePart, setFechaPropuestaTimePart] = useState(''); // 'HH:MM'
  const fpRef = React.useRef(null);
  const fpInstanceRef = React.useRef(null);
  const fpTimeRef = React.useRef(null);
  const fpTimeInstanceRef = React.useRef(null);
  const [originalFechaPropuesta, setOriginalFechaPropuesta] = useState(null);
  const [fechasBloqueadas, setFechasBloqueadas] = useState([]);
  const [minFechaLocal, setMinFechaLocal] = useState(null);
  const [fechaError, setFechaError] = useState('');
  
  // Determinar si estamos en modo edición
  const modoEdicion = !!diseno;
  
  // Helper para resolver id numérico de servicio de una reserva / objeto con posible nesting
  const resolveServiceId = (obj) => {
    if (!obj) return null;
    const svc = obj.servicio ?? obj.servicio_id ?? obj.id_servicio ?? obj.servicio_id;
    if (!svc) return null;
    // If svc is object, try nested ids
    if (typeof svc === 'object') {
      return svc.id_servicio || svc.id || svc.id_servicio || svc.id;
    }
    const numeric = Number(svc);
    if (!Number.isNaN(numeric)) return numeric;
    return null;
  };

  // Extraer el ID de servicio de la reserva o del diseño
  const servicioId = resolveServiceId(disenoCompleto) || resolveServiceId(diseno) || resolveServiceId(reserva);

  // Extraer el ID de la reserva
  const reservaId = disenoCompleto?.reserva_id || diseno?.reserva_id || reserva?.id_reserva;

  // Convertir datetime-local -> ISO (UTC) para enviar al backend
  const convertLocalToISO = (dateObj) => {
    if (!dateObj) return null;
    try {
      return dateObj.toISOString();
    } catch (err) {
      console.warn('No se pudo convertir la fecha local a ISO', err);
      return null;
    }
  };
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    descripcion_tecnica: '',
    presupuesto: '',
    presupuesto_final: ''
  });
  
  const [imagenesDiseno, setImagenesDiseno] = useState([]);
  const [imagenesExistentes, setImagenesExistentes] = useState([]); // Imágenes ya guardadas del diseño
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [productImagePreview, setProductImagePreview] = useState(null);
  const [reservasConJardin, setReservasConJardin] = useState([]);
  const [reservaSeleccionadaId, setReservaSeleccionadaId] = useState(null);
  const [searchReservaInput, setSearchReservaInput] = useState('');
  const [searchReservaLoading, setSearchReservaLoading] = useState(false);
  const [searchReservaError, setSearchReservaError] = useState('');
  const [reservaBuscada, setReservaBuscada] = useState(null);

  const getStockForProduct = (productId, inventario = null) => {
    if (!productId && productId !== 0) return 0;
    const id = parseInt(productId, 10);
    if (Number.isNaN(id)) return 0;
    const lista = inventario || productos;
    const prod = lista.find(p => p.id_producto === id || p.id === id);
    if (!prod) return 0;
    if (typeof prod.stock_actual !== 'undefined' && prod.stock_actual !== null) {
      return parseInt(prod.stock_actual, 10) || 0;
    }
    if (prod.stock && typeof prod.stock.cantidad !== 'undefined' && prod.stock.cantidad !== null) {
      return parseInt(prod.stock.cantidad, 10) || 0;
    }
    if (typeof prod.stock !== 'undefined') {
      return parseInt(prod.stock, 10) || 0;
    }
    return 0;
  };

  const cargarDisenoParaEditar = async (productosDisponibles = null) => {
    if (!diseno?.id_diseno) return;
    try {
      console.log('🔍 Intentando cargar diseño con ID:', diseno.id_diseno);
      console.log('🔍 Diseño completo recibido:', diseno);
      
      // Obtener detalles completos del diseño
      const disenoData = await serviciosService.getDiseno(diseno.id_diseno);
      
      console.log('✅ Diseño cargado del backend:', disenoData);
      
      // Guardar el diseño completo en el estado
      setDisenoCompleto(disenoData);

      // Inicializar reserva seleccionada para edicion
      const reservaIdFromDiseno = disenoData.reserva_id || disenoData.reserva?.id_reserva || disenoData.reserva?.id;
      if (reservaIdFromDiseno) setReservaSeleccionadaId(String(reservaIdFromDiseno));

      // Inicializar fecha propuesta (convertir ISO a Date object)
      if (disenoData.fecha_propuesta) {
        try {
          const d = new Date(disenoData.fecha_propuesta);
          if (!Number.isNaN(d.getTime())) setFechaPropuesta(d);
          if (!Number.isNaN(d.getTime())) setOriginalFechaPropuesta(d);
          if (!Number.isNaN(d.getTime())) {
            setFechaPropuestaDatePart(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
            setFechaPropuestaTimePart(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
          }
        } catch (err) {
          console.warn('Error parsing fecha_propuesta', err);
        }
      }
      
      // Formatear fecha si existe
      // fecha_propuesta is intentionally not moved to state anymore (we removed fecha_estimada_realizacion)
      
      // Cargar productos seleccionados y calcular costo de mano de obra
      let costoManoObraCalculado = parseFloat(disenoData.presupuesto) || 0;
      
      if (disenoData.productos && disenoData.productos.length > 0) {
        console.log('📦 Productos del backend:', disenoData.productos);
        const inventario = productosDisponibles || productos;
        const productosEditados = disenoData.productos.map(p => {
          console.log('📦 Producto individual:', p);
          const cantidadRaw = parseInt(p.cantidad, 10) || 0;
          const stockActual = getStockForProduct(p.producto, inventario);
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
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const initializeModal = async () => {
      const productosDisponibles = await fetchProductos();
      if (!isMounted) return;

      if (modoEdicion && diseno) {
        await cargarDisenoParaEditar(productosDisponibles);
      } else {
        resetForm();
      }

      if (!reserva && mode === 'diseno') {
        try {
          const data = await serviciosService.getReservas({ page: 1, page_size: 100 });
          if (!isMounted) return;
          const allReservas = data.results || data;
          const withJardin = allReservas.filter(r => !!r.jardin);
          setReservasConJardin(withJardin);
        } catch (err) {
          console.error('Error fetching reservas con jardín', err);
        }
      }

      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localNow = new Date(now.getTime() - tzOffset);
      setMinFechaLocal(localNow);

      try {
        const hoy = new Date().toISOString().split('T')[0];
        const fechaFinDate = new Date();
        fechaFinDate.setDate(fechaFinDate.getDate() + 60);
        const fechaFin = fechaFinDate.toISOString().split('T')[0];
        const response = await serviciosService.getFechasDisponibles(hoy, fechaFin);
        if (isMounted) {
          setFechasBloqueadas(response.fechas_bloqueadas || []);
        }
      } catch (err) {
        console.error('Error al cargar fechas bloqueadas:', err);
      }

      if (reserva && !modoEdicion) {
        setReservaSeleccionadaId(String(reserva.id_reserva || reserva.id));
        if (reserva.fecha_reserva) {
          const d = new Date(reserva.fecha_reserva);
          if (!Number.isNaN(d.getTime())) {
            setFechaPropuesta(d);
            setFechaPropuestaDatePart(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
            setFechaPropuestaTimePart(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
          } else {
            console.warn('La fecha de la reserva no es válida y no se aplicó preselección');
          }
        }
      }
    };

    initializeModal();

    return () => {
      isMounted = false;
    };
  }, [isOpen, modoEdicion, diseno?.id_diseno, mode, reserva?.id_reserva, reserva?.fecha_reserva]);

  // Initialize flatpickr on our input (DATE ONLY)
  useEffect(() => {
    if (!fpRef.current) return;
    if (fpInstanceRef.current) {
      fpInstanceRef.current.destroy();
      fpInstanceRef.current = null;
    }

    const originalDayStr = originalFechaPropuesta ? originalFechaPropuesta.toISOString().split('T')[0] : null;
    const disabledDatesArr = (fechasBloqueadas || []).filter(d => d !== originalDayStr);
    
    const options = {
      enableTime: false,
      dateFormat: 'Y-m-d',
      defaultDate: fechaPropuestaDatePart || null,
      minDate: minFechaLocal || 'today',
      disable: disabledDatesArr || [],
      onChange: (selectedDates) => {
        if (!selectedDates || selectedDates.length === 0) return;
        const d = selectedDates[0];
        setFechaPropuestaDatePart(d);
        
        // Update combined date if time is already selected
        if (fechaPropuestaTimePart) {
          const [hh, mm] = fechaPropuestaTimePart.split(':').map(Number);
          const newDate = new Date(d);
          newDate.setHours(hh, mm);
          setFechaPropuesta(newDate);
        } else {
          setFechaPropuesta(d);
        }
        setFechaError('');
      }
    };
    
    options.onDayCreate = (...args) => {
      const dayElem = args[3];
      const dayObj = dayElem?.dateObj;
      if (!dayObj) return;
      const dayISO = dayObj.toISOString().split('T')[0];
      if (disabledDatesArr?.includes(dayISO)) {
        dayElem.classList.add('blocked');
      }
    };

    fpInstanceRef.current = flatpickr(fpRef.current, options);
    return () => {
      if (fpInstanceRef.current) {
        fpInstanceRef.current.destroy();
        fpInstanceRef.current = null;
      }
    };
  }, [fpRef, minFechaLocal, fechasBloqueadas, fechaPropuestaDatePart, fechaPropuestaTimePart, originalFechaPropuesta]);

  // Initialize flatpickr for TIME ONLY
  useEffect(() => {
    if (!fpTimeRef.current) return;
    if (fpTimeInstanceRef.current) {
      fpTimeInstanceRef.current.destroy();
      fpTimeInstanceRef.current = null;
    }

    const options = {
      enableTime: true,
      noCalendar: true,
      dateFormat: "H:i",
      time_24hr: true,
      minuteIncrement: 15,
      defaultDate: fechaPropuestaTimePart || null,
      minTime: "08:00",
      maxTime: "20:00",
      onChange: (selectedDates, dateStr) => {
        setFechaPropuestaTimePart(dateStr);
        
        if (fechaPropuestaDatePart) {
          const [hh, mm] = dateStr.split(':').map(Number);
          const newDate = new Date(fechaPropuestaDatePart);
          newDate.setHours(hh, mm);
          setFechaPropuesta(newDate);
        }
        setFechaError('');
      }
    };

    fpTimeInstanceRef.current = flatpickr(fpTimeRef.current, options);
    return () => {
      if (fpTimeInstanceRef.current) {
        fpTimeInstanceRef.current.destroy();
        fpTimeInstanceRef.current = null;
      }
    };
  }, [fpTimeRef, fechaPropuestaTimePart, fechaPropuestaDatePart]);

  useEffect(() => {
    if (!isOpen) {
      setSearchReservaInput('');
      setSearchReservaError('');
      setSearchReservaLoading(false);
      setReservaBuscada(null);
    }
  }, [isOpen]);

  // Watch fechaPropuesta and fechasBloqueadas to show validation state if necessary
  useEffect(() => {
    if (!fechaPropuesta) {
      setFechaError('');
      return;
    }
    const selectedDate = new Date(fechaPropuesta);
    const now = new Date();
    if (selectedDate.getTime() < now.getTime()) {
      setFechaError('No se puede seleccionar una fecha pasada.');
      return;
    }
    const selDay = selectedDate.toISOString().split('T')[0];
    if (fechasBloqueadas.includes(selDay) && !isSameDateTime(selectedDate, originalFechaPropuesta)) {
      setFechaError('La fecha seleccionada no está disponible: todos los empleados están ocupados ese día.');
      return;
    }
    setFechaError('');
  }, [fechaPropuesta, fechasBloqueadas, originalFechaPropuesta]);

  

  const fetchProductos = async () => {
    try {
      const data = await productosService.getProductos();
      const list = data?.results || data || [];
      setProductos(list);
      return list;
    } catch (error) {
      showError('Error al cargar productos');
      console.error(error);
      return [];
    }
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
    setFechaPropuesta(null);
    setFechaPropuestaDatePart(null);
    setFechaPropuestaTimePart('');
    setOriginalFechaPropuesta(null);
    setFechaError('');
    setReservaSeleccionadaId(null);
    setSearchReservaInput('');
    setSearchReservaError('');
    setSearchReservaLoading(false);
    setReservaBuscada(null);
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

  const { user } = useAuth();
  const isEmpleadoOrAdmin = user && (user.is_staff || user.groups?.includes('Empleados') || user.groups?.includes('Administradores'));

  const handleSearchReserva = async () => {
    setSearchReservaError('');
    if (!searchReservaInput) {
      setSearchReservaError('Ingrese un ID de reserva');
      return;
    }
    const numeric = Number(searchReservaInput);
    if (Number.isNaN(numeric) || numeric <= 0) {
      setSearchReservaError('Ingrese un ID numérico válido');
      return;
    }
    setSearchReservaLoading(true);
    setReservaBuscada(null);
    try {
      const data = await serviciosService.getReservaById(numeric);
      setReservaBuscada(data);
      setReservaSeleccionadaId(data.id_reserva);
      // If the reservation contains jardin info, prefer that
    } catch (err) {
      console.error('Error buscando reserva:', err);
      setSearchReservaError('Reserva no encontrada');
    } finally {
      setSearchReservaLoading(false);
    }
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
      // Permitimos cualquier cantidad >= 0 (sin clamp por stock para poder estimar presupuesto)
      if (cantidad < 0) cantidad = 0;
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

      const validProducts = productosSeleccionados.filter(p => p.producto_id && Number(p.cantidad) >= 1);
      const hasImages = modoEdicion
        ? (imagenesDiseno.length > 0 || imagenesExistentes.length > 0)
        : imagenesDiseno.length > 0;

      if (!hasImages && validProducts.length === 0) {
        showError('Debes agregar al menos una imagen o al menos un producto (cantidad mínima 1) antes de guardar el diseño');
        return;
      }
      
      const formDataToSend = new FormData();

      // No permitir crear si se seleccionó un producto con stock 0 y cantidad >= 1
      const productoSinStock = productosSeleccionados.find(p => {
        const qty = Number(p.cantidad) || 0;
        const stock = p.producto_id ? getStockForProduct(p.producto_id) : null;
        return p.producto_id && qty >= 1 && (stock === 0 || stock === null || stock === undefined || stock < 1);
      });

      if (productoSinStock) {
        showError('Uno de los productos seleccionados no tiene stock disponible. Ajusta la cantidad a 0 o elimínalo.');
        return;
      }

      // No permitir crear si la cantidad excede el stock disponible
      const productoExcedeStock = productosSeleccionados.find(p => {
        const qty = Number(p.cantidad) || 0;
        const stock = p.producto_id ? getStockForProduct(p.producto_id) : null;
        return p.producto_id && stock !== null && stock !== undefined && stock >= 0 && qty > stock;
      });

      if (productoExcedeStock) {
        showError('La cantidad de un producto excede el stock disponible. Ajusta la cantidad o selecciona otro producto.');
        return;
      }
      
      // Agregar datos básicos
      // Determine servicio_id: use existing servicioId or derive from selected reserva
      let servicioParaEnviarId = servicioId;
      if (!servicioParaEnviarId) {
        const sel = reserva || reservaBuscada || reservasConJardin.find(r => `${r.id_reserva}` === `${reservaSeleccionadaId}`);
        servicioParaEnviarId = sel ? resolveServiceId(sel) : null;
      }
      if (!servicioParaEnviarId) {
        showError('El servicio asociado a la reserva no está disponible. Seleccione otra reserva.');
        return;
      }
      formDataToSend.append('servicio_id', Number(servicioParaEnviarId));
      // Agregar el ID de la reserva si existe
      const selRes = reserva || reservaBuscada || reservasConJardin.find(r => `${r.id_reserva}` === `${reservaSeleccionadaId}`);
      if (selRes && selRes.id_reserva) {
        formDataToSend.append('reserva_id', Number(selRes.id_reserva));
      }
      // Usar titulo calculado (computado) para consistencia
      formDataToSend.append('titulo', computedTitulo.substring(0,100));
      formDataToSend.append('descripcion', formData.descripcion_tecnica);
      formDataToSend.append('presupuesto', calcularPresupuestoFinal());
      
      // Validar fecha propuesta: no puede ser pasada ni estar en fechas bloqueadas
      if (fechaPropuesta) {
        const selectedDate = new Date(fechaPropuesta);
        const now = new Date();
        if (selectedDate.getTime() < now.getTime()) {
          showError('No se puede seleccionar una fecha pasada');
          return;
        }
        // Check blocked dates by day
        const selectedDay = selectedDate.toISOString().split('T')[0];
        if (fechasBloqueadas.includes(selectedDay) && !isSameDateTime(selectedDate, originalFechaPropuesta)) {
          showError('La fecha seleccionada no está disponible: todos los empleados están ocupados ese día.');
          return;
        }
      }

      // Agregar fecha propuesta si existe
      if (fechaPropuesta) {
        const isoFecha = convertLocalToISO(fechaPropuesta);
        if (isoFecha) formDataToSend.append('fecha_propuesta', isoFecha);
      }
      
      // Agregar imágenes
      imagenesDiseno.forEach((imagen) => {
        formDataToSend.append('imagenes_diseño', imagen);
      });
      
      // Agregar productos como JSON string
      if (validProducts.length > 0) {
        const productosValidados = validProducts.filter(p => 
          p.producto_id && Number(p.cantidad) >= 1 && p.precio_unitario
        );
        formDataToSend.append('productos', JSON.stringify(productosValidados));
      }

      let response;
      
      if (modoEdicion) {
        // Actualizar diseño existente
        // Si en edición se cambió la reserva seleccionada, enviar el nuevo reserva_id para que el backend actualice la asociacion
        const selForUpdate = reserva || reservaBuscada || reservasConJardin.find(r => `${r.id_reserva}` === `${reservaSeleccionadaId}`);
        if (selForUpdate?.id_reserva && (String(selForUpdate.id_reserva) !== String(disenoCompleto?.reserva_id || diseno?.reserva_id || ''))) {
          formDataToSend.append('reserva_id', Number(selForUpdate.id_reserva));
        }
        // If title should reflect the reservation number when description is empty, recompute
        let tituloEdicion = (formData.descripcion_tecnica || '').trim().substring(0,100);
        if (!tituloEdicion) {
          const possibleReservaId = selForUpdate?.id_reserva || reservaSeleccionadaId || disenoCompleto?.reserva_id || diseno?.reserva_id;
          tituloEdicion = possibleReservaId ? `Diseño - Reserva #${possibleReservaId}` : `Diseño - Servicio #${servicioId || 'N/A'}`;
          formDataToSend.set('titulo', tituloEdicion);
        }
        response = await serviciosService.updateDiseno(diseno.id_diseno, formDataToSend);
        success('Diseño actualizado exitosamente');
      } else {
        // Crear nuevo diseño
        const createReservaId = reservaId || reservaSeleccionadaId || (reservaBuscada && reservaBuscada.id_reserva);
        if (!createReservaId) {
          showError('Debe seleccionar una reserva antes de crear el diseño');
          return;
        }
        // If selected reservation doesn't have a garden, show error and optionally prompt to add jardn
        const selForCreate = reserva || reservaBuscada || reservasConJardin.find(r => `${r.id_reserva}` === `${createReservaId}`);
        if (!selForCreate?.jardin) {
          showError('La reserva seleccionada no tiene información del jardín. Cargue información del jardín antes de crear el diseño.');
          // Optionally open the garden modal automatically if handler exists
          if (onCargarJardin && typeof onCargarJardin === 'function') {
            onCargarJardin(selForCreate);
          }
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

  // Computed title preview based on description or selected reservation
  const selectedReservaForTitle = reserva || reservaBuscada || reservasConJardin.find(r => `${r.id_reserva}` === `${reservaSeleccionadaId}`);
  const computedReservaId = selectedReservaForTitle?.id_reserva || reservaSeleccionadaId || reservaId;
  const computedTitulo = (formData.descripcion_tecnica || '').trim().substring(0,100) || (computedReservaId ? `Diseño - Reserva #${computedReservaId}` : `Diseño - Servicio #${servicioId || 'N/A'}`);

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
              <>
                {isEmpleadoOrAdmin && (
                  <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 mb-3">
                    <h3 className="text-white font-semibold mb-2">Buscar Reserva por ID</h3>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min="1"
                        placeholder="Ingrese ID numérico de la reserva"
                        value={searchReservaInput}
                        onChange={(e) => setSearchReservaInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { handleSearchReserva(); } }}
                        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white w-full" />
                      <button
                        type="button"
                        onClick={handleSearchReserva}
                        disabled={searchReservaLoading}
                        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60"
                      >
                        {searchReservaLoading ? 'Buscando...' : 'Buscar'}
                      </button>
                    </div>
                    {searchReservaError && <p className="text-red-400 text-sm mt-2">{searchReservaError}</p>}
                    {reservaBuscada && (
                      <div className="mt-3 bg-gray-800 rounded p-3 border border-gray-700">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-white font-bold">Reserva #{reservaBuscada.id_reserva}</div>
                            <div className="text-gray-400 text-sm">Cliente: {reservaBuscada.cliente_nombre} {reservaBuscada.cliente_apellido}</div>
                            <div className="text-gray-400 text-sm">Servicio: {reservaBuscada.servicio_nombre}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-300">
                              {reservaBuscada.jardin ? <span className="text-green-400">Jardín cargado</span> : <span className="text-orange-400">Sin jardín</span>}
                            </div>
                            {!reservaBuscada.jardin && onCargarJardin && (
                              <button type="button" onClick={() => onCargarJardin(reservaBuscada)} className="px-2 py-1 bg-purple-600 rounded text-xs text-white hover:bg-purple-700">Cargar Información del Jardín</button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">Seleccionar Reserva (con jardín)</h3>
                <select value={reservaSeleccionadaId || ''} onChange={(e) => { setReservaSeleccionadaId(e.target.value); setReservaBuscada(null); setSearchReservaInput(''); setSearchReservaError(''); }} className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm">
                  <option value="">Seleccionar reserva...</option>
                  {reservasConJardin.map(r => (
                    <option key={r.id_reserva} value={r.id_reserva}>#{r.id_reserva} - {r.cliente_nombre} - {r.servicio_nombre}</option>
                  ))}
                </select>
              </div>
              </>
            )}
            
            
            {/* Preview del Título (según descripción o reserva) */}
            <div className="mb-2">
              <p className="text-xs text-gray-400">Título: <span className="text-white font-semibold">{computedTitulo}</span></p>
            </div>

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
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
                    <div className="flex items-center justify-center">
                      { (producto.imagen || getProductImage(producto.producto_id)) ? (
                        <button
                          type="button"
                          onClick={() => {
                            const url = producto.imagen || getProductImage(producto.producto_id);
                            if (url) setProductImagePreview({ url, nombre: 'Producto seleccionado' });
                          }}
                          className="relative group focus:outline-none"
                        >
                          <img src={producto.imagen || getProductImage(producto.producto_id)} alt="producto" className="w-14 h-14 object-cover rounded-md ring-1 ring-transparent group-hover:ring-green-500" />
                          <span className="absolute inset-0 bg-black/50 text-white text-[10px] opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-md transition-opacity">Ver</span>
                        </button>
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
                        allowSelectZeroStock={true}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Cantidad</label>
                      <input
                        type="number"
                        min={0}
                        value={producto.cantidad}
                        onChange={(e) => actualizarProducto(index, 'cantidad', e.target.value)}
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
                    
                    <div className="pt-5 flex items-start">
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
            <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fecha propuesta
                </label>
                <div className="bg-gray-800 p-2 rounded-md">
                  <div className="relative">
                    <input
                      ref={fpRef}
                      type="text"
                      readOnly
                      placeholder="Seleccionar fecha"
                      className={`w-full px-3 py-2 bg-gray-700 rounded-md text-white focus:outline-none focus:ring-2 ${fechaError ? 'focus:ring-red-500' : 'focus:ring-green-500'}`}
                    />
                  </div>
                </div>
                {fechaError && <p className="text-xs text-red-400 mt-1">{fechaError}</p>}
                {fechasBloqueadas && fechasBloqueadas.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">Fechas no disponibles: {fechasBloqueadas.slice(0,5).join(', ')}{fechasBloqueadas.length > 5 ? '...' : ''}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hora
                </label>
                <div className="bg-gray-800 p-2 rounded-md">
                  <div className="relative">
                    <input
                      ref={fpTimeRef}
                      type="text"
                      readOnly
                      placeholder="Seleccionar hora"
                      className={`w-full px-3 py-2 bg-gray-700 rounded-md text-white focus:outline-none focus:ring-2 ${fechaError ? 'focus:ring-red-500' : 'focus:ring-green-500'}`}
                    />
                  </div>
                </div>
              </div>
            </div>
            </>
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

      {/* Vista previa grande de imagen de producto */}
      {productImagePreview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
          <div className="relative bg-gray-900 rounded-lg shadow-2xl p-4 max-w-3xl w-full">
            <button
              type="button"
              onClick={() => setProductImagePreview(null)}
              className="absolute top-3 right-3 p-2 bg-gray-800 text-gray-200 rounded-full hover:bg-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-gray-200 text-sm mb-3 pr-10">{productImagePreview.nombre || 'Vista previa'}</div>
            <div className="bg-black rounded-lg overflow-hidden border border-gray-700">
              <img src={productImagePreview.url} alt="Vista previa producto" className="w-full max-h-[70vh] object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrearDisenoModal;