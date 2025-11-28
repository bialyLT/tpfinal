import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

const ProductSelector = ({ productos = [], selectedProductId, onSelect, placeholder = 'Buscar producto...', showStock = true, allowSelectZeroStock = false }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState(productos);
  const containerRef = useRef(null);

  useEffect(() => {
    setFiltered(productos);
  }, [productos]);

  useEffect(() => {
    if (!query) {
      setFiltered(productos);
      return;
    }
    const q = query.toLowerCase();
    setFiltered(productos.filter(p => (p.nombre || '').toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q)));
  }, [query, productos]);

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
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-10 pr-4 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-64 overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-2 text-gray-400">No se encontraron productos</div>
          ) : (
            filtered.map((prod) => {
              const prodId = getProductId(prod);
              const stock = prod.stock_actual || (prod.stock ? prod.stock.cantidad : 0) || 0;
              const disabled = stock === 0 && !allowSelectZeroStock;
              return (
                <div
                  key={prodId}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-700 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !disabled && handleSelect(prod)}
                  role="button"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white truncate">{prod.nombre}</div>
                    <div className="text-xs text-gray-400 truncate">{prod.descripcion || ''}</div>
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
        </div>
      )}
    </div>
  );
};

export default ProductSelector;
