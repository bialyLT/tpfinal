import api from './api';

const ENCUESTAS_URL = '/encuestas';

export const encuestasService = {
  // Obtener la encuesta activa
  obtenerEncuestaActiva: async () => {
    try {
      const response = await api.get(`${ENCUESTAS_URL}/activa/`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener encuesta activa:', error);
      throw error;
    }
  },

  // Enviar respuestas de una encuesta
  responderEncuesta: async (reservaId, respuestas) => {
    try {
      const response = await api.post(`${ENCUESTAS_URL}/responder/`, {
        reserva_id: reservaId,
        respuestas: respuestas
      });
      return response.data;
    } catch (error) {
      console.error('Error al enviar respuestas de encuesta:', error);
      throw error;
    }
  },

  // Obtener respuestas de encuestas con filtros opcionales
  obtenerRespuestas: async (params = {}) => {
    try {
      const response = await api.get(`${ENCUESTAS_URL}/encuestas-respuestas/`, { params });
      return response.data;
    } catch (error) {
      console.error('Error al obtener respuestas de encuesta:', error);
      throw error;
    }
  },

  // Obtener estadísticas de una encuesta (solo admin)
  obtenerEstadisticas: async (encuestaId) => {
    try {
      const response = await api.get(`${ENCUESTAS_URL}/${encuestaId}/estadisticas/`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  }
};

export default encuestasService;
