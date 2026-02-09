import { useEffect, useState } from 'react';
import { Settings, Save, Plus, Trash2 } from 'lucide-react';
import {
  configuracionService,
  objetivosDisenoService,
  nivelesIntervencionService,
  presupuestosAproximadosService,
  formasTerrenoService,
} from '../services';
import { success, handleApiError } from '../utils/notifications';

const ConfiguracionesPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    monto_sena: '',
  });
  const [objetivos, setObjetivos] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [formasTerreno, setFormasTerreno] = useState([]);
  const [nuevoObjetivo, setNuevoObjetivo] = useState({ codigo: '', nombre: '', activo: true });
  const [nuevoNivel, setNuevoNivel] = useState({ codigo: '', nombre: '', valor: 'true', activo: true });
  const [nuevoPresupuesto, setNuevoPresupuesto] = useState({ codigo: '', nombre: '', activo: true });
  const [nuevaFormaTerreno, setNuevaFormaTerreno] = useState({ nombre: '' });

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const data = await configuracionService.getConfig();
      setFormData({
        monto_sena: data?.monto_sena ?? '',
      });
    } catch (error) {
      handleApiError(error, 'Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogos = async () => {
    try {
      const [objetivosData, nivelesData, presupuestosData, formasTerrenoData] = await Promise.all([
        objetivosDisenoService.getAll(),
        nivelesIntervencionService.getAll(),
        presupuestosAproximadosService.getAll(),
        formasTerrenoService.getAll(),
      ]);

      setObjetivos(Array.isArray(objetivosData) ? objetivosData : objetivosData.results || []);
      setNiveles(Array.isArray(nivelesData) ? nivelesData : nivelesData.results || []);
      setPresupuestos(Array.isArray(presupuestosData) ? presupuestosData : presupuestosData.results || []);
      setFormasTerreno(Array.isArray(formasTerrenoData) ? formasTerrenoData : formasTerrenoData.results || []);
    } catch (error) {
      handleApiError(error, 'Error al cargar los catálogos');
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchCatalogos();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (formData.monto_sena === '' || Number(formData.monto_sena) < 0) {
      handleApiError({ message: 'El monto de seña debe ser mayor o igual a 0' }, 'Datos inválidos');
      return;
    }

    try {
      setSaving(true);
      await configuracionService.updateConfig({
        monto_sena: formData.monto_sena,
      });
      success('Configuración guardada');
      await fetchConfig();
    } catch (error) {
      handleApiError(error, 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleObjetivoChange = (id, field, value) => {
    setObjetivos((prev) =>
      prev.map((item) =>
        item.id_objetivo_diseno === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleNivelChange = (id, field, value) => {
    setNiveles((prev) =>
      prev.map((item) =>
        item.id_opcion_nivel === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handlePresupuestoChange = (id, field, value) => {
    setPresupuestos((prev) =>
      prev.map((item) =>
        item.id_opcion_presupuesto === id ? { ...item, [field]: value } : item
      )
    );
  };

  const guardarObjetivo = async (item) => {
    try {
      await objetivosDisenoService.update(item.id_objetivo_diseno, {
        codigo: item.codigo,
        nombre: item.nombre,
        activo: item.activo,
      });
      success('Objetivo actualizado');
      fetchCatalogos();
    } catch (error) {
      handleApiError(error, 'Error al guardar el objetivo');
    }
  };

  const guardarNivel = async (item) => {
    try {
      await nivelesIntervencionService.update(item.id_opcion_nivel, {
        codigo: item.codigo,
        nombre: item.nombre,
        valor: item.valor,
        activo: item.activo,
        orden: item.orden,
      });
      success('Nivel actualizado');
      fetchCatalogos();
    } catch (error) {
      handleApiError(error, 'Error al guardar el nivel');
    }
  };

  const guardarPresupuesto = async (item) => {
    try {
      await presupuestosAproximadosService.update(item.id_opcion_presupuesto, {
        codigo: item.codigo,
        nombre: item.nombre,
        activo: item.activo,
        orden: item.orden,
      });
      success('Presupuesto actualizado');
      fetchCatalogos();
    } catch (error) {
      handleApiError(error, 'Error al guardar el presupuesto');
    }
  };

  const crearObjetivo = async () => {
    if (!nuevoObjetivo.codigo || !nuevoObjetivo.nombre) {
      handleApiError({ message: 'Completá código y nombre' }, 'Datos incompletos');
      return;
    }
    try {
      await objetivosDisenoService.create(nuevoObjetivo);
      setNuevoObjetivo({ codigo: '', nombre: '', activo: true });
      success('Objetivo creado');
      fetchCatalogos();
    } catch (error) {
      handleApiError(error, 'Error al crear el objetivo');
    }
  };

  const crearNivel = async () => {
    if (!nuevoNivel.codigo || !nuevoNivel.nombre) {
      handleApiError({ message: 'Completá código y nombre' }, 'Datos incompletos');
      return;
    }
    try {
      await nivelesIntervencionService.create({
        ...nuevoNivel,
        valor: nuevoNivel.valor === 'true',
      });
      setNuevoNivel({ codigo: '', nombre: '', valor: 'true', activo: true });
      success('Nivel creado');
      fetchCatalogos();
    } catch (error) {
      handleApiError(error, 'Error al crear el nivel');
    }
  };

  const crearPresupuesto = async () => {
    if (!nuevoPresupuesto.codigo || !nuevoPresupuesto.nombre) {
      handleApiError({ message: 'Completá código y nombre' }, 'Datos incompletos');
      return;
    }
    try {
      await presupuestosAproximadosService.create(nuevoPresupuesto);
      setNuevoPresupuesto({ codigo: '', nombre: '', activo: true });
      success('Presupuesto creado');
      fetchCatalogos();
    } catch (error) {
      handleApiError(error, 'Error al crear el presupuesto');
    }
  };

  const eliminarObjetivo = async (id) => {
    if (!window.confirm('¿Eliminar este objetivo?')) return;
    try {
      await objetivosDisenoService.delete(id);
      success('Objetivo eliminado');
      fetchCatalogos();
    } catch (error) {
      handleApiError(error, 'Error al eliminar el objetivo');
    }
  };

  const eliminarNivel = async (id) => {
    if (!window.confirm('¿Eliminar este nivel?')) return;
    try {
      await nivelesIntervencionService.delete(id);
      success('Nivel eliminado');
      fetchCatalogos();
    } catch (error) {
      handleApiError(error, 'Error al eliminar el nivel');
    }
  };

  const eliminarPresupuesto = async (id) => {
    if (!window.confirm('¿Eliminar este presupuesto?')) return;
    try {
      await presupuestosAproximadosService.delete(id);
      success('Presupuesto eliminado');
      fetchCatalogos();
    } catch (error) {
      handleApiError(error, 'Error al eliminar el presupuesto');
    }
  };

  const handleFormaTerrenoChange = (id, value) => {
    setFormasTerreno((prev) =>
      prev.map((item) => (item.id_forma === id ? { ...item, nombre: value } : item))
    );
  };

  const guardarFormaTerreno = async (item) => {
    try {
      await formasTerrenoService.update(item.id_forma, { nombre: item.nombre });
      success('Forma de terreno actualizada');
      fetchCatalogos();
    } catch (error) {
      handleApiError(error, 'Error al guardar la forma de terreno');
    }
  };

  const crearFormaTerreno = async () => {
    if (!nuevaFormaTerreno.nombre) {
      handleApiError({ message: 'Completá el nombre' }, 'Datos incompletos');
      return;
    }
    try {
      await formasTerrenoService.create(nuevaFormaTerreno);
      setNuevaFormaTerreno({ nombre: '' });
      success('Forma de terreno creada');
      fetchCatalogos();
    } catch (error) {
      handleApiError(error, 'Error al crear la forma de terreno');
    }
  };

  const eliminarFormaTerreno = async (id) => {
    if (!window.confirm('¿Eliminar esta forma de terreno?')) return;
    try {
      await formasTerrenoService.delete(id);
      success('Forma de terreno eliminada');
      fetchCatalogos();
    } catch (error) {
      handleApiError(error, 'Error al eliminar la forma de terreno');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400"></div>
          <p className="text-gray-300 mt-4">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <Settings className="w-8 h-8 mr-3 text-green-400" />
            Configuración del Sistema
          </h1>
          <p className="text-gray-400">Ajustes disponibles solo para administradores</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Monto de seña (ARS)</label>
              <input
                type="number"
                name="monto_sena"
                min="0"
                step="0.01"
                value={formData.monto_sena}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Ej: 5000"
                required
              />
              <p className="text-xs text-gray-400 mt-2">Monto fijo que se cobra como seña en Mercado Pago.</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>

        <div className="mt-10 space-y-10">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-white">Catálogos de diseño</h2>
            <p className="text-sm text-gray-400 mb-6">Configura objetivos, niveles de intervención y presupuestos.</p>

            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Objetivos de diseño</h3>
            <div className="space-y-4">
              {objetivos.map((item) => (
                <div key={item.id_objetivo_diseno} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                  <input
                    type="text"
                    value={item.codigo}
                    onChange={(e) => handleObjetivoChange(item.id_objetivo_diseno, 'codigo', e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="codigo"
                  />
                  <input
                    type="text"
                    value={item.nombre}
                    onChange={(e) => handleObjetivoChange(item.id_objetivo_diseno, 'nombre', e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white md:col-span-2"
                    placeholder="nombre"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={Boolean(item.activo)}
                      onChange={(e) => handleObjetivoChange(item.id_objetivo_diseno, 'activo', e.target.checked)}
                    />
                    Activo
                  </label>
                  <button
                    type="button"
                    onClick={() => guardarObjetivo(item)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarObjetivo(item.id_objetivo_diseno)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
              <input
                type="text"
                value={nuevoObjetivo.codigo}
                onChange={(e) => setNuevoObjetivo((prev) => ({ ...prev, codigo: e.target.value }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="codigo"
              />
              <input
                type="text"
                value={nuevoObjetivo.nombre}
                onChange={(e) => setNuevoObjetivo((prev) => ({ ...prev, nombre: e.target.value }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white md:col-span-2"
                placeholder="nombre"
              />
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={nuevoObjetivo.activo}
                  onChange={(e) => setNuevoObjetivo((prev) => ({ ...prev, activo: e.target.checked }))}
                />
                Activo
              </label>
              <button
                type="button"
                onClick={crearObjetivo}
                className="flex items-center justify-center px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </button>
            </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Nivel de intervención</h3>
            <div className="space-y-4">
              {niveles.map((item) => (
                <div key={item.id_opcion_nivel} className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center">
                  <input
                    type="text"
                    value={item.codigo}
                    onChange={(e) => handleNivelChange(item.id_opcion_nivel, 'codigo', e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                  <input
                    type="text"
                    value={item.nombre}
                    onChange={(e) => handleNivelChange(item.id_opcion_nivel, 'nombre', e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white md:col-span-2"
                  />
                  <select
                    value={String(item.valor)}
                    onChange={(e) => handleNivelChange(item.id_opcion_nivel, 'valor', e.target.value === 'true')}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="true">Desde cero</option>
                    <option value="false">Remodelación</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={Boolean(item.activo)}
                      onChange={(e) => handleNivelChange(item.id_opcion_nivel, 'activo', e.target.checked)}
                    />
                    Activo
                  </label>
                  <button
                    type="button"
                    onClick={() => guardarNivel(item)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarNivel(item.id_opcion_nivel)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-7 gap-3 items-center">
              <input
                type="text"
                value={nuevoNivel.codigo}
                onChange={(e) => setNuevoNivel((prev) => ({ ...prev, codigo: e.target.value }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="codigo"
              />
              <input
                type="text"
                value={nuevoNivel.nombre}
                onChange={(e) => setNuevoNivel((prev) => ({ ...prev, nombre: e.target.value }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white md:col-span-2"
                placeholder="nombre"
              />
              <select
                value={nuevoNivel.valor}
                onChange={(e) => setNuevoNivel((prev) => ({ ...prev, valor: e.target.value }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="true">Desde cero</option>
                <option value="false">Remodelación</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={nuevoNivel.activo}
                  onChange={(e) => setNuevoNivel((prev) => ({ ...prev, activo: e.target.checked }))}
                />
                Activo
              </label>
              <button
                type="button"
                onClick={crearNivel}
                className="flex items-center justify-center px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </button>
            </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Presupuesto aproximado</h3>
            <div className="space-y-4">
              {presupuestos.map((item) => (
                <div key={item.id_opcion_presupuesto} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
                  <input
                    type="text"
                    value={item.codigo}
                    onChange={(e) => handlePresupuestoChange(item.id_opcion_presupuesto, 'codigo', e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                  <input
                    type="text"
                    value={item.nombre}
                    onChange={(e) => handlePresupuestoChange(item.id_opcion_presupuesto, 'nombre', e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white md:col-span-2"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={Boolean(item.activo)}
                      onChange={(e) => handlePresupuestoChange(item.id_opcion_presupuesto, 'activo', e.target.checked)}
                    />
                    Activo
                  </label>
                  <button
                    type="button"
                    onClick={() => guardarPresupuesto(item)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarPresupuesto(item.id_opcion_presupuesto)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
              <input
                type="text"
                value={nuevoPresupuesto.codigo}
                onChange={(e) => setNuevoPresupuesto((prev) => ({ ...prev, codigo: e.target.value }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="codigo"
              />
              <input
                type="text"
                value={nuevoPresupuesto.nombre}
                onChange={(e) => setNuevoPresupuesto((prev) => ({ ...prev, nombre: e.target.value }))}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white md:col-span-2"
                placeholder="nombre"
              />
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={nuevoPresupuesto.activo}
                  onChange={(e) => setNuevoPresupuesto((prev) => ({ ...prev, activo: e.target.checked }))}
                />
                Activo
              </label>
              <button
                type="button"
                onClick={crearPresupuesto}
                className="flex items-center justify-center px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </button>
            </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-white">Formas de terreno</h2>
            <p className="text-sm text-gray-400 mb-6">Opciones para la forma de las zonas del jardín.</p>

            <div className="space-y-4">
              {formasTerreno.map((item) => (
                <div key={item.id_forma} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                  <input
                    type="text"
                    value={item.nombre}
                    onChange={(e) => handleFormaTerrenoChange(item.id_forma, e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white md:col-span-2"
                    placeholder="nombre"
                  />
                  <button
                    type="button"
                    onClick={() => guardarFormaTerreno(item)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarFormaTerreno(item.id_forma)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
              <input
                type="text"
                value={nuevaFormaTerreno.nombre}
                onChange={(e) => setNuevaFormaTerreno({ nombre: e.target.value })}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white md:col-span-2"
                placeholder="nombre"
              />
              <button
                type="button"
                onClick={crearFormaTerreno}
                className="flex items-center justify-center px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionesPage;
