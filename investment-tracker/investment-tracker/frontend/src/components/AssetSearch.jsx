import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, TrendingUp, Bitcoin } from 'lucide-react';
import { assetsApi } from '../services/api';

function AssetSearch({ assetType, onSelect, placeholder }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounce search - 300ms
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await assetsApi.searchAssets(query, assetType);
        setSuggestions(response.data || []);
        setShowDropdown(true);
        setHighlightedIndex(-1);
      } catch (error) {
        console.error('Error searching assets:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, assetType]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (asset) => {
    setQuery(asset.symbol);
    setShowDropdown(false);
    setSuggestions([]);
    onSelect(asset);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
      default:
        break;
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    setQuery(value);
  };

  const getAssetIcon = (type) => {
    if (type === 'crypto') {
      return <Bitcoin className="w-4 h-4 text-orange-400" />;
    }
    return <TrendingUp className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          className="w-full bg-gray-700 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={placeholder || (assetType === 'stock' ? 'Buscar AAPL, MSFT...' : 'Buscar BTC, ETH...')}
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : (
            <Search className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Dropdown de sugerencias */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-xl max-h-64 overflow-y-auto"
        >
          {suggestions.map((asset, index) => (
            <button
              key={`${asset.symbol}-${index}`}
              type="button"
              onClick={() => handleSelect(asset)}
              className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                index === highlightedIndex
                  ? 'bg-gray-600'
                  : 'hover:bg-gray-600/50'
              }`}
            >
              <div className={`p-2 rounded-lg ${
                asset.type === 'crypto' ? 'bg-orange-500/20' : 'bg-blue-500/20'
              }`}>
                {getAssetIcon(asset.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{asset.symbol}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    asset.type === 'crypto'
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {asset.type === 'crypto' ? 'Crypto' : 'Stock'}
                  </span>
                </div>
                <p className="text-sm text-gray-400 truncate">{asset.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Mensaje cuando no hay resultados */}
      {showDropdown && query.length >= 1 && suggestions.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-xl p-4 text-center text-gray-400">
          No se encontraron activos para "{query}"
        </div>
      )}
    </div>
  );
}

export default AssetSearch;
