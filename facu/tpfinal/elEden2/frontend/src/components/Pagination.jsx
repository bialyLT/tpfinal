import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Componente de paginación reutilizable
 * 
 * @param {Object} props
 * @param {number} props.currentPage - Página actual (1-indexed)
 * @param {number} props.totalPages - Total de páginas
 * @param {number} props.totalItems - Total de items
 * @param {number} props.pageSize - Items por página
 * @param {Function} props.onPageChange - Callback cuando cambia la página
 * @param {Function} props.onPageSizeChange - Callback cuando cambia el tamaño de página
 * @param {boolean} props.loading - Estado de carga
 */
const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  loading = false
}) => {
  // Calcular rango de items mostrados
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generar array de números de página a mostrar
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      // Mostrar todas las páginas si son pocas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Mostrar páginas con elipsis
      if (currentPage <= 3) {
        // Cerca del inicio
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Cerca del final
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // En el medio
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1 && !onPageSizeChange) {
    return null; // No mostrar paginación si solo hay 1 página y no se puede cambiar el tamaño
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-4 py-3 bg-gray-800 border-t border-gray-700">
      {/* Información de items */}
      <div className="text-sm text-gray-300">
        Mostrando <span className="font-medium">{startItem}</span> a{' '}
        <span className="font-medium">{endItem}</span> de{' '}
        <span className="font-medium">{totalItems}</span> resultados
      </div>

      {/* Controles de paginación */}
      <div className="flex items-center gap-2">
        {/* Selector de tamaño de página */}
        {onPageSizeChange && (
          <div className="flex items-center gap-2 mr-4">
            <label htmlFor="pageSize" className="text-sm text-gray-300">
              Por página:
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={loading}
              className="block rounded-md bg-gray-700 border-gray-600 text-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:opacity-50"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}

        {/* Botón: Primera página */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1 || loading}
          className="p-2 rounded-md border border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Primera página"
        >
          <ChevronsLeft className="h-5 w-5" />
        </button>

        {/* Botón: Página anterior */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          className="p-2 rounded-md border border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Página anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Números de página */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((pageNum, index) => (
            pageNum === '...' ? (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-2 text-gray-400"
              >
                ...
              </span>
            ) : (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                disabled={loading}
                className={`px-3 py-2 rounded-md border transition-colors ${
                  currentPage === pageNum
                    ? 'bg-emerald-600 text-white border-emerald-700 font-medium shadow-sm hover:bg-emerald-700'
                    : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 hover:text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {pageNum}
              </button>
            )
          ))}
        </div>

        {/* Indicador móvil de página actual */}
        <div className="sm:hidden px-3 py-2 text-sm text-gray-300 font-medium">
          {currentPage} / {totalPages}
        </div>

        {/* Botón: Página siguiente */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
          className="p-2 rounded-md border border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Página siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Botón: Última página */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || loading}
          className="p-2 rounded-md border border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Última página"
        >
          <ChevronsRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
