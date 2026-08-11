import React, { useState, useMemo } from 'react';
import { ChevronDown, ArrowLeft, RotateCcw, Bell } from 'lucide-react';
import ProductCard from './ProductCard';
import { CATEGORIES } from '../data/products';

export default function CollectionPage({
  categoryId,
  category,
  allProducts,
  products,
  categories,
  onSelectProduct,
  onAddToCart,
  onGoHome,
  onSelectCategory
}) {
  const activeCatId = categoryId || category || 'todos';
  const activeProducts = allProducts || products || [];
  const activeCategoriesList = (categories && categories.length > 0) ? categories : CATEGORIES;

  // Active Category details
  const foundCat = activeCategoriesList.find(c => String(c.id) === String(activeCatId));
  const categoryInfo = foundCat || {
    id: activeCatId,
    name: activeCatId === 'todos' ? 'TODAS AS COLEÇÕES' : (activeCatId ? activeCatId.toUpperCase() : 'COLEÇÃO EXCLUSIVA'),
    tag: 'EXPLORE NOSSOS PRODUTOS'
  };

  // Filter & Sorting States
  const [sortBy, setSortBy] = useState('relevancia'); // 'relevancia' | 'menor-preco' | 'maior-preco' | 'nome'
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [appliedPriceRange, setAppliedPriceRange] = useState({ min: null, max: null });

  // Base products filtered by category
  const baseCategoryProducts = useMemo(() => {
    if (!activeCatId || activeCatId === 'todos') return activeProducts;
    return activeProducts.filter(p => 
      String(p.category) === String(activeCatId) || 
      (Array.isArray(p.collectionIds) && p.collectionIds.includes(activeCatId)) ||
      String(p.collection_id) === String(activeCatId)
    );
  }, [activeCatId, activeProducts]);

  // Handle Price Filter Submit
  const handleApplyPrice = (e) => {
    e.preventDefault();
    setAppliedPriceRange({
      min: priceFrom !== '' ? parseFloat(priceFrom) : null,
      max: priceTo !== '' ? parseFloat(priceTo) : null
    });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSortBy('relevancia');
    setPriceFrom('');
    setPriceTo('');
    setAppliedPriceRange({ min: null, max: null });
  };

  // Filter & Sort Products
  const filteredProducts = useMemo(() => {
    let list = baseCategoryProducts.filter(product => {
      // Filter by price range
      if (appliedPriceRange.min !== null && product.price < appliedPriceRange.min) {
        return false;
      }
      if (appliedPriceRange.max !== null && product.price > appliedPriceRange.max) {
        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'relevancia') {
        return (Boolean(b.isPinned) ? 1 : 0) - (Boolean(a.isPinned) ? 1 : 0);
      }
      if (sortBy === 'menor-preco') return a.price - b.price;
      if (sortBy === 'maior-preco') return b.price - a.price;
      if (sortBy === 'nome') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [baseCategoryProducts, appliedPriceRange, sortBy]);

  return (
    <div style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', paddingBottom: '60px' }}>
      
      {/* Breadcrumb Navigation Bar */}
      <div style={{
        backgroundColor: '#050505',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '12px 0',
        fontSize: '11px',
        fontWeight: '600',
        letterSpacing: '0.5px'
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', color: '#888888' }}>
          <button
            onClick={onGoHome}
            style={{ color: '#888888', display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseOver={(e) => e.currentTarget.style.color = '#3498db'}
            onMouseOut={(e) => e.currentTarget.style.color = '#888888'}
          >
            Início
          </button>
          <span>.</span>
          <span style={{ color: '#888888', textTransform: 'uppercase' }}>COLEÇÕES</span>
          <span>.</span>
          <span style={{ color: '#ffffff', fontWeight: '700', textTransform: 'uppercase' }}>
            {categoryInfo.name}
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="container" style={{ marginTop: '24px' }}>
        
        {/* Header Title Section */}
        <div style={{ marginBottom: '28px' }}>
          <button
            onClick={onGoHome}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#3498db',
              fontWeight: '700',
              marginBottom: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} /> Voltar ao início
          </button>
          
          <h1 style={{
            fontSize: '32px',
            fontWeight: '900',
            letterSpacing: '0.5px',
            textTransform: 'none',
            color: '#ffffff',
            marginBottom: '6px'
          }}>
            Resultados da pesquisa
          </h1>
          <p style={{ fontSize: '13px', color: '#888888', margin: 0 }}>
            Exibindo resultados para <strong style={{ color: '#ffffff' }}>"{categoryInfo.name}"</strong>
          </p>
        </div>

        {/* Quick Category Tabs Bar */}
        <div style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '14px',
          marginBottom: '28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {activeCategoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory && onSelectCategory(cat.id)}
              style={{
                padding: '8px 18px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                backgroundColor: String(activeCatId) === String(cat.id) ? '#090476' : '#111111',
                color: '#ffffff',
                border: String(activeCatId) === String(cat.id) ? '1px solid #3498db' : '1px solid #222222',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 2-COLUMN MAIN LAYOUT: Left Filter Sidebar + Right 4-Column Product Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '32px',
          alignItems: 'start'
        }}>

          {/* LEFT SIDEBAR: FILTERS */}
          <div style={{
            gridColumn: 'span 12',
            backgroundColor: '#000000'
          }} className="collection-sidebar">
            
            {/* 1. Ordenar por Dropdown */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', display: 'block', marginBottom: '12px' }}>
                Ordenar por
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    border: '1px solid #333333',
                    borderRadius: '4px',
                    padding: '12px 14px',
                    fontSize: '13px',
                    fontWeight: '500',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="relevancia">Relevância</option>
                  <option value="menor-preco">Menor Preço</option>
                  <option value="maior-preco">Maior Preço</option>
                  <option value="nome">Nome (A-Z)</option>
                </select>
                <ChevronDown size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#ffffff' }} />
              </div>
            </div>

            {/* 2. Preço Section (Price range De / Até + Aplicar) */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                  Preço
                </h3>
                {(appliedPriceRange.min !== null || appliedPriceRange.max !== null) && (
                  <button
                    onClick={handleResetFilters}
                    style={{ fontSize: '11px', color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <RotateCcw size={12} /> Limpar
                  </button>
                )}
              </div>

              <form onSubmit={handleApplyPrice}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#aaaaaa', display: 'block', marginBottom: '6px' }}>
                      De
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="69.9"
                      value={priceFrom}
                      onChange={(e) => setPriceFrom(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #333333',
                        color: '#ffffff',
                        padding: '10px 12px',
                        fontSize: '13px',
                        outline: 'none',
                        borderRadius: '3px'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#aaaaaa', display: 'block', marginBottom: '6px' }}>
                      Até
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="149.9"
                      value={priceTo}
                      onChange={(e) => setPriceTo(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #333333',
                        color: '#ffffff',
                        padding: '10px 12px',
                        fontSize: '13px',
                        outline: 'none',
                        borderRadius: '3px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: '#aaaaaa',
                      color: '#000000',
                      fontWeight: '800',
                      fontSize: '13px',
                      padding: '8px 22px',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#aaaaaa'}
                  >
                    Aplicar
                  </button>
                </div>
              </form>
            </div>

          </div>

          {/* RIGHT SIDE: EXACTLY 4 PRODUCTS PER ROW PRODUCT GRID */}
          <div style={{ gridColumn: 'span 12' }} className="collection-grid-col">
            
            {filteredProducts.length > 0 ? (
              <div className="four-col-product-grid">
                {filteredProducts.map((prod) => (
                  <div key={prod.id} style={{ position: 'relative' }}>
                    {/* Out of Stock overlay / badge if product is out of stock */}
                    {prod.isOutofStock && (
                      <span style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '3px 8px',
                        borderRadius: '2px',
                        zIndex: 10,
                        textTransform: 'uppercase'
                      }}>
                        Esgotado
                      </span>
                    )}

                    <ProductCard
                      product={prod}
                      onAddToCart={onAddToCart}
                      onSelectProduct={onSelectProduct}
                    />

                    {/* Avise-me quando chegar floating pill button on out-of-stock item */}
                    {prod.isOutofStock && (
                      <button
                        onClick={() => alert(`Você será notificado quando ${prod.name} voltar ao estoque!`)}
                        style={{
                          position: 'absolute',
                          bottom: '12px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: '#1b2297',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '20px',
                          padding: '8px 14px',
                          fontSize: '11px',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                          zIndex: 12,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Bell size={14} /> Avise-me quando chegar!
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: '#0a0a0a',
                borderRadius: '8px',
                border: '1px solid #222222'
              }}>
                <p style={{ fontSize: '15px', color: '#aaaaaa', marginBottom: '16px' }}>
                  Nenhum produto encontrado com os filtros selecionados.
                </p>
                <button
                  onClick={handleResetFilters}
                  style={{
                    backgroundColor: '#090476',
                    color: '#ffffff',
                    padding: '10px 22px',
                    borderRadius: '4px',
                    fontWeight: '800',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    border: 'none'
                  }}
                >
                  Resetar Todos os Filtros
                </button>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Responsive Grid Layout Rules: Exactly 4 Columns on Desktop as requested */}
      <style>{`
        @media (min-width: 992px) {
          .collection-sidebar {
            grid-column: span 3 !important;
          }
          .collection-grid-col {
            grid-column: span 9 !important;
          }
          .four-col-product-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 20px !important;
          }
        }
        @media (max-width: 991px) and (min-width: 640px) {
          .four-col-product-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 16px !important;
          }
        }
        @media (max-width: 639px) {
          .four-col-product-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
