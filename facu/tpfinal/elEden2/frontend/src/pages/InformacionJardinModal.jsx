import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { serviciosService } from '../services';
import { success, error as showError } from '../utils/notifications';

const InformacionJardinModal = ({ reserva, isOpen, onClose, onJardinSaved }) => {
  const [zonas, setZonas] = useState([]);
  const [formas, setFormas] = useState([]);
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Load formas and garden
    (async () => {
      try {
        const f = await serviciosService.getFormasTerreno();
        setFormas(Array.isArray(f) ? f : f.results || []);
      } catch (e) {
        console.error('Error loading formas', e);
      }
    })();
    // Load existing jardin
    if (reserva && reserva.id_reserva) {
      serviciosService.getJardinByReserva(reserva.id_reserva).then((data) => {
        if (data && data.id_jardin) {
          setZonas(data.zonas || [{ nombre: '', ancho: '', largo: '', forma: '' }]);
          setDescripcion(data.descripcion || '');
        } else {
          setZonas([{ nombre: '', ancho: '', largo: '', forma: '' }]);
          setDescripcion('');
        }
      }).catch(err => {
        // If none, default to a single zone
        setZonas([{ nombre: '', ancho: '', largo: '', forma: '' }]);
        setDescripcion('');
      });
    } else {
      setZonas([{ nombre: '', ancho: '', largo: '', forma: '' }]);
      setDescripcion('');
    }
  }, [isOpen, reserva]);

  if (!isOpen) return null;

  const handleAdd = () => setZonas(prev => [...prev, { nombre: '', ancho: '', largo: '', forma: '' }]);
  const handleRemove = (i) => setZonas(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!reserva || !reserva.id_reserva) {
      showError('Reserva no encontrada');
      return;
    }
    // Validate
    if (!zonas || zonas.length === 0) {
      showError('El jardín debe contener al menos una zona');
      return;
    }
    for (let i = 0; i < zonas.length; i++) {
      const z = zonas[i];
      if (!z.ancho || !z.largo) {
        showError(`La zona ${z.nombre || i + 1} debe tener ancho y largo`);
        return;
      }
    }
    const payload = {
      descripcion: descripcion || '',
      zonas: zonas
    };

    setLoading(true);
    try {
      const res = await serviciosService.upsertJardin(reserva.id_reserva, payload);
      success('Jardín guardado correctamente');
      if (onJardinSaved) onJardinSaved(res);
      onClose();
    } catch (e) {
      console.error(e);
      showError('Error al guardar el jardín');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-white">Cargar información del jardín</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold">Zonas del Jardín</h3>
              <button type="button" onClick={handleAdd} className="px-3 py-1 bg-green-600 rounded">Agregar Zona</button>
            </div>
            <div className="mt-2">
              {zonas.map((zona, zi) => (
                <div key={zi} className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-2 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Nombre <span className="text-xs text-gray-500">(opcional)</span></label>
                    <input placeholder="Nombre de la zona (opcional)" type="text" value={zona.nombre} onChange={(e) => setZonas(prev => { const next = [...prev]; next[zi].nombre = e.target.value; return next; })} className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Ancho (m)</label>
                    <input type="number" value={zona.ancho} onChange={(e) => setZonas(prev => { const next = [...prev]; next[zi].ancho = e.target.value; return next; })} className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Largo (m)</label>
                    <input type="number" value={zona.largo} onChange={(e) => setZonas(prev => { const next = [...prev]; next[zi].largo = e.target.value; return next; })} className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Forma</label>
                    <select value={zona.forma || ''} onChange={(e) => setZonas(prev => { const next = [...prev]; next[zi].forma = e.target.value; return next; })} className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm">
                      <option value="">Seleccionar...</option>
                      {formas.map(f => <option key={f.id_forma} value={f.id_forma}>{f.nombre}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 md:col-span-1">
                    <button type="button" onClick={() => handleRemove(zi)} className="px-3 py-1 bg-red-600 rounded">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Descripción del Jardín (opcional)</label>
            <textarea rows={4} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" placeholder="Describe detalladamente el jardín..." />
          </div>
          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700 mt-4">
            <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Cancelar</button>
            <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">{loading ? 'Guardando...' : 'Guardar Jardín'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InformacionJardinModal;
