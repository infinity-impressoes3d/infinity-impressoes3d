import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import ProductCard from './ProductCard';

export default function SearchModal({ isOpen, onClose, products, onAddToCart, onSelectProduct }) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const results = searchTerm.trim() === ''
    ? []
    : products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      backgroundColor: 'rgba(0,0,0,0.95)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      padding: '40px 20px',
      overflowY: 'auto'
    }}>
      <div className="container" style={{ width: '100%', maxWidth: '800px', position: 'relative' }}>
        {/* Header Close */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button
            onClick={onClose}
            aria-label="Fechar busca"
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333333',
              color: '#ffffff',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#e74c3c';
              e.currentTarget.style.borderColor = '#e74c3c';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#1a1a1a';
              e.currentTarget.style.borderColor = '#333333';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Input Form */}
        <div style={{
          position: 'relative',
          marginBottom: '40px'
        }}>
          <input
            type="text"
            autoFocus
            placeholder="O que você está procurando? (ex: Chrome Hearts, Bugs Gangster, Porsche...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#121212',
              border: '2px solid #3498db',
              color: '#ffffff',
              padding: '18px 50px 18px 20px',
              borderRadius: '30px',
              fontSize: '16px',
              outline: 'none',
              boxShadow: '0 0 25px rgba(52, 152, 219, 0.3)'
            }}
          />
          <Search
            size={24}
            color="#3498db"
            style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)' }}
          />
        </div>

        {/* Search Results */}
        {searchTerm.trim() !== '' && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#aaaaaa', marginBottom: '20px' }}>
              Resultados para "<strong style={{ color: '#ffffff' }}>{searchTerm}</strong>" ({results.length}):
            </h3>

            {results.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '20px'
              }}>
                {results.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onAddToCart={(item) => {
                      if (onAddToCart) onAddToCart(item);
                      onClose();
                    }}
                    onSelectProduct={(item) => {
                      if (onSelectProduct) onSelectProduct(item);
                      onClose();
                    }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#666666' }}>
                <p>Nenhum produto encontrado para sua busca.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
