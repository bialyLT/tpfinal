import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { productosService } from '../services';

// Server-side searchable product selector with images, pagination and keyboard navigation

const ProductSelector = ({ productos = [], selectedProductId, onSelect, placeholder = 'Buscar producto...', showStock = true, allowSelectZeroStock = false, serverSide = true, pageSize = 25 }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState(productos);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const containerRef = useRef(null);
  const queryRef = useRef('');

  useEffect(() => {
    setFiltered(productos);
  }, [productos]);

  useEffect(() => {
    // If serverSide is enabled, we don't do local filtering; instead fetch from server
    if (serverSide) return;
    if (!query) {
      setFiltered(productos);
      return;
    }
    const q = query.toLowerCase();
    setFiltered(productos.filter(p => (p.nombre || '').toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q)));
  }, [query, productos, serverSide]);

  // Server-side fetch with debounce
  useEffect(() => {
    if (!serverSide || !open) return;
    const ctrl = { cancelled: false };
    let debounce = null;
    const fetchPage = async (pg, append = false) => {
      try {
        if (pg === 1 && !append) setLoading(true);
        const result = await productosService.getProductos({ search: query || undefined, page: pg, page_size: pageSize });
        if (ctrl.cancelled) return;
        const items = result.results || result;
        setFiltered(prev => (append ? [...prev, ...items] : items));
        setHasMore(result.next || (items.length === pageSize));
      } catch (err) {
        console.error('Error loading products', err);
      } finally {
        if (!ctrl.cancelled) setLoading(false);
      }
    };
    const doFetch = () => {
      setPage(1);
      fetchPage(1, false);
    };
    // When query changes, debounce
    debounce = setTimeout(() => {
      queryRef.current = query;
      doFetch();
    }, 300);
    return () => { ctrl.cancelled = true; clearTimeout(debounce); };
  }, [query, serverSide, open, pageSize]);

  useEffect(() => {
    if (!open) setFocusedIndex(-1);
  }, [open]);

  useEffect(() => {
    if (focusedIndex >= (filtered || []).length) {
      setFocusedIndex((filtered || []).length - 1);
    }
  }, [filtered, focusedIndex]);

  // When selectedProductId exists but is not in filtered results, fetch it and prepend
  useEffect(() => {
    if (!serverSide || !selectedProductId) return;
    const prodFound = (filtered || []).find(p => String(getProductId(p)) === String(selectedProductId));
    if (prodFound) return;
    let cancelled = false;
    const fetchSelected = async () => {
      try {
        const p = await productosService.getById(selectedProductId);
        if (cancelled) return;
        setFiltered(prev => [p, ...(prev || [])]);
      } catch (err) {
        console.error('Error fetching selected product', err);
      }
    };
    fetchSelected();
    return () => { cancelled = true; };
  }, [selectedProductId, serverSide, filtered]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getProductId = (p) => p.id_producto ?? p.id ?? p.id_producto;

  const handleSelect = (prod) => {
    setQuery(prod.nombre);
    setOpen(false);
    if (onSelect) onSelect(prod);
  };

  const loadMore = async () => {
    const next = page + 1;
    setPage(next);
    try {
      setLoading(true);
      const result = await productosService.getProductos({ search: query || undefined, page: next, page_size: pageSize });
      const items = result.results || result;
      setFiltered(prev => [...prev, ...items]);
      setHasMore(result.next || items.length === pageSize);
    } catch (err) {
      console.error('Error loading more products', err);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => Math.min((filtered || []).length - 1, (prev + 1) || 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => Math.max(0, (prev - 1) || 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && filtered[focusedIndex]) {
        handleSelect(filtered[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const selectedProduct = productos.find(p => String(getProductId(p)) === String(selectedProductId));

  useEffect(() => {
    if (!selectedProductId) {
      setQuery('');
      return;
    }
    if (selectedProduct) setQuery(selectedProduct.nombre || '');
  }, [selectedProductId, selectedProduct]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={query || (selectedProduct ? selectedProduct.nombre : '')}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setFocusedIndex(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-4 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-64 overflow-auto">
          {loading ? (
            <div className="p-2 text-gray-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-2 text-gray-400">No se encontraron productos</div>
          ) : (
            filtered.map((prod) => {
              const prodId = getProductId(prod);
              const stock = prod.stock_actual || (prod.stock ? prod.stock.cantidad : 0) || 0;
              const disabled = stock === 0 && !allowSelectZeroStock;
              const idx = (filtered || []).findIndex(p => getProductId(p) === prodId);
              const isFocused = focusedIndex === idx;
              return (
                <div
                  key={prodId}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-700 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isFocused ? 'bg-gray-700 outline outline-1 outline-green-500' : ''}`}
                  onClick={() => !disabled && handleSelect(prod)}
                  onMouseEnter={() => { setHoveredProduct(prod); }}
                  onMouseLeave={() => { setHoveredProduct(null); }}
                  role="button"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {prod.imagen ? (
                      <img src={prod.imagen} alt={prod.nombre || 'producto'} className="w-10 h-10 object-cover rounded-md" />
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center rounded-md bg-gray-700 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 00-2 2v9.5A1.5 1.5 0 003.5 16h13A1.5 1.5 0 0018 14.5V5a2 2 0 00-2-2H4z" /><path d="M7 7a1 1 0 110-2 1 1 0 010 2zM4 13l2.5-3 3 4 3.5-5L16 13H4z"/></svg>
                      </div>
                    )}
                    <div>
                    <div className="text-sm font-medium text-white truncate">{prod.nombre}</div>
                    <div className="text-xs text-gray-400 truncate">{prod.descripcion || ''}</div>
                    </div>
                  </div>
                  <div className="ml-3 text-right flex items-center gap-3">
                    <div className="text-sm text-green-400 font-semibold">${parseFloat(prod.precio || 0).toFixed(2)}</div>
                    {showStock && (
                      <div className={`text-xs font-semibold ${stock > 0 ? 'text-green-400' : 'text-red-400'}`}>{stock}u</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {/* Preview panel on the right if hovered product */}
          {hoveredProduct && (
            <div className="absolute right-0 top-0 w-36 p-2 hidden md:block">
              {hoveredProduct.imagen ? (
                <img src={hoveredProduct.imagen} alt={hoveredProduct.nombre || ''} className="w-full h-24 object-cover rounded-md" />
              ) : (
                <div className="w-full h-24 flex items-center justify-center rounded-md bg-gray-700 text-gray-400">
                  No imagen
                </div>
              )}
            </div>
          )}
          {hasMore && !loading && (
            <div className="p-2 border-t border-gray-700 flex items-center justify-center">
              <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm" onClick={loadMore}>Cargar más</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSelector;
