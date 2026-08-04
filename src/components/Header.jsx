import React, { useState } from 'react';
import { Search, ShoppingBag, Menu, X, ArrowRight, ChevronDown, ChevronRight, Package, Layers } from 'lucide-react';
import { PRODUCTS, CATEGORIES } from '../data/products';

export default function Header({
  cartCount,
  onOpenCart,
  onOpenSearch,
  onGoHome,
  onSelectProduct,
  onSelectCategory
}) {
  const [activeDropdown, setActiveDropdown] = useState(null); // 'products' | 'collections' | null
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mobileCollectionsOpen, setMobileCollectionsOpen] = useState(false);

  const handleHomeClick = (e) => {
    if (e) e.preventDefault();
    setMobileMenuOpen(false);
    if (onGoHome) onGoHome();
  };

  return (
    <header style={{
      backgroundColor: '#000000',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      
      {/* ------------------------------------------------------------- */}
      {/* DESKTOP HEADER (Screens >= 768px)                              */}
      {/* ------------------------------------------------------------- */}
      <div className="d-none-mobile container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '84px',
        padding: '0 16px'
      }}>
        
        {/* Left Side: Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <a href="#" onClick={handleHomeClick} style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src="/logo.png"
              alt="Infinity Impressões 3D"
              style={{ height: '54px', objectFit: 'contain' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <span style={{
              display: 'none',
              fontSize: '18px',
              fontWeight: '900',
              letterSpacing: '1px',
              color: '#ffffff'
            }}>INFINITY IMPRESSÕES 3D</span>
          </a>
        </div>

        {/* Center: Navigation Menu (INÍCIO, PRODUTOS ▾, COLEÇÕES ▾) */}
        <nav style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '28px'
        }}>
          {/* 1. INÍCIO Link */}
          <a
            href="#"
            onClick={handleHomeClick}
            style={{
              fontSize: '13px',
              fontWeight: '800',
              letterSpacing: '1.2px',
              color: '#ffffff',
              textDecoration: 'none',
              textTransform: 'uppercase',
              transition: 'color 0.2s ease',
              padding: '10px 4px'
            }}
            onMouseOver={(e) => e.target.style.color = '#3498db'}
            onMouseOut={(e) => e.target.style.color = '#ffffff'}
          >
            INÍCIO
          </a>

          {/* 2. PRODUTOS Dropdown */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setActiveDropdown('products')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <a
              href="#products"
              onClick={(e) => e.preventDefault()}
              style={{
                fontSize: '13px',
                fontWeight: '800',
                letterSpacing: '1.2px',
                color: activeDropdown === 'products' ? '#3498db' : '#ffffff',
                textDecoration: 'none',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 4px',
                transition: 'color 0.2s ease',
                cursor: 'pointer'
              }}
            >
              PRODUTOS
              <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: activeDropdown === 'products' ? 'rotate(180deg)' : 'rotate(0)' }} />
            </a>

            {/* Dropdown Menu for Products */}
            {activeDropdown === 'products' && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#0a0a0a',
                border: '1px solid rgba(52, 152, 219, 0.4)',
                borderRadius: '12px',
                padding: '12px 0',
                minWidth: '320px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.95)',
                zIndex: 200
              }}>
                <div style={{
                  padding: '6px 18px 10px 18px',
                  fontSize: '10px',
                  color: '#3498db',
                  fontWeight: '800',
                  letterSpacing: '1px',
                  borderBottom: '1px solid #1a1a1a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Package size={14} /> CATÁLOGO DE PRODUTOS 3D:
                </div>

                <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '6px 0' }}>
                  {PRODUCTS.map((prod) => (
                    <a
                      key={prod.id}
                      href={`#/produto/${prod.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        if (onSelectProduct) onSelectProduct(prod);
                        setActiveDropdown(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 18px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#dddddd',
                        textDecoration: 'none',
                        transition: 'background 0.2s, color 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(9, 4, 118, 0.6)';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#dddddd';
                      }}
                    >
                      <img
                        src={prod.image}
                        alt={prod.name}
                        style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', backgroundColor: '#111' }}
                      />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>
                          {prod.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#3498db', fontWeight: '800' }}>
                          R$ {prod.price.toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. COLEÇÕES Dropdown */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setActiveDropdown('collections')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <a
              href="#collections"
              onClick={(e) => e.preventDefault()}
              style={{
                fontSize: '13px',
                fontWeight: '800',
                letterSpacing: '1.2px',
                color: activeDropdown === 'collections' ? '#3498db' : '#ffffff',
                textDecoration: 'none',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 4px',
                transition: 'color 0.2s ease',
                cursor: 'pointer'
              }}
            >
              COLEÇÕES
              <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: activeDropdown === 'collections' ? 'rotate(180deg)' : 'rotate(0)' }} />
            </a>

            {/* Dropdown Menu for Collections */}
            {activeDropdown === 'collections' && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#0a0a0a',
                border: '1px solid rgba(52, 152, 219, 0.4)',
                borderRadius: '12px',
                padding: '12px 0',
                minWidth: '280px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.95)',
                zIndex: 200
              }}>
                <div style={{
                  padding: '6px 18px 10px 18px',
                  fontSize: '10px',
                  color: '#3498db',
                  fontWeight: '800',
                  letterSpacing: '1px',
                  borderBottom: '1px solid #1a1a1a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Layers size={14} /> COLEÇÕES DISPONÍVEIS:
                </div>

                <div style={{ padding: '6px 0' }}>
                  {CATEGORIES.map((cat) => (
                    <a
                      key={cat.id}
                      href={`#/colecao/${cat.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        if (onSelectCategory) onSelectCategory(cat.id);
                        setActiveDropdown(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 18px',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#ffffff',
                        textDecoration: 'none',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(9, 4, 118, 0.6)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <img
                        src={cat.image}
                        alt={cat.name}
                        style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '6px' }}
                      />
                      <div>
                        <div style={{ color: '#ffffff', textTransform: 'uppercase', fontSize: '12px', fontWeight: '900' }}>
                          {cat.name}
                        </div>
                        <div style={{ fontSize: '10px', color: '#aaaaaa', fontWeight: '500' }}>
                          {cat.count}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Right Side: Search Icon (Lupa) + Carrinho Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          
          {/* Lupa (Search Icon) */}
          <button
            onClick={onOpenSearch}
            aria-label="Buscar produtos"
            style={{
              color: '#ffffff',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#3498db'}
            onMouseOut={(e) => e.currentTarget.style.color = '#ffffff'}
          >
            <Search size={22} />
          </button>

          {/* Carrinho Button */}
          <button
            onClick={onOpenCart}
            aria-label="Ver Carrinho"
            style={{
              position: 'relative',
              backgroundColor: '#090476',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '800',
              fontSize: '12px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(9, 4, 118, 0.4)',
              transition: 'transform 0.2s, background 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#0f4592';
              e.currentTarget.style.transform = 'scale(1.04)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#090476';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <ShoppingBag size={18} />
            <span>CARRINHO</span>
            <span style={{
              backgroundColor: '#ffffff',
              color: '#090476',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '900'
            }}>
              {cartCount}
            </span>
          </button>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE HEADER (Screens < 768px - Matching Screenshot 1)        */}
      {/* ------------------------------------------------------------- */}
      <div className="d-md-none" style={{ padding: '12px 16px 16px 16px' }}>
        
        {/* Top Row: Hamburger Menu + Logo + Cart Icon */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          {/* Hamburger Menu 3-lines icon */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir Menu de Navegação"
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <Menu size={26} />
          </button>

          {/* Centered Brand Logo */}
          <a href="#" onClick={handleHomeClick} style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src="/logo.png"
              alt="Infinity Impressões 3D"
              style={{ height: '46px', objectFit: 'contain' }}
            />
          </a>

          {/* Cart Icon with badge */}
          <button
            onClick={onOpenCart}
            aria-label="Ver Carrinho"
            style={{
              position: 'relative',
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <ShoppingBag size={24} />
            <span style={{
              position: 'absolute',
              top: '-2px',
              right: '-4px',
              backgroundColor: '#090476',
              color: '#ffffff',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: '900',
              border: '2px solid #000000'
            }}>
              {cartCount}
            </span>
          </button>
        </div>

        {/* Full-width Search Input matching screenshot 1 */}
        <div
          onClick={onOpenSearch}
          style={{
            position: 'relative',
            width: '100%',
            backgroundColor: '#000000',
            border: '1px solid #333333',
            borderRadius: '4px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '13px', color: '#777777', fontWeight: '400' }}>
            Buscar
          </span>
          <Search size={18} color="#ffffff" />
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE NAVIGATION OVERLAY DRAWER (Matching Screenshot 2)      */}
      {/* ------------------------------------------------------------- */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#000000',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
          {/* Top Bar with Close Button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #1a1a1a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/logo.png" alt="Infinity 3D" style={{ height: '36px' }} />
              <span style={{ fontSize: '14px', fontWeight: '900', color: '#ffffff' }}>MENU INFINITY</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Fechar Menu"
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
            >
              <X size={26} />
            </button>
          </div>

          {/* Navigation Links List matching screenshot 2 style */}
          <div style={{ flex: 1, padding: '10px 0' }}>
            
            {/* 1. INÍCIO */}
            <div
              onClick={handleHomeClick}
              style={{
                padding: '18px 20px',
                borderBottom: '1px solid #141414',
                fontSize: '14px',
                fontWeight: '800',
                letterSpacing: '1px',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>INÍCIO</span>
            </div>

            {/* 2. PRODUTOS (with Expandable Arrow) */}
            <div>
              <div
                onClick={() => setMobileProductsOpen(!mobileProductsOpen)}
                style={{
                  padding: '18px 20px',
                  borderBottom: '1px solid #141414',
                  fontSize: '14px',
                  fontWeight: '800',
                  letterSpacing: '1px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>PRODUTOS</span>
                <ArrowRight size={18} color="#ffffff" style={{ transform: mobileProductsOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
              </div>

              {/* Sub-items for Products */}
              {mobileProductsOpen && (
                <div style={{ backgroundColor: '#080808', borderBottom: '1px solid #141414' }}>
                  {PRODUCTS.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => {
                        if (onSelectProduct) onSelectProduct(prod);
                        setMobileMenuOpen(false);
                      }}
                      style={{
                        padding: '14px 24px 14px 36px',
                        fontSize: '13px',
                        color: '#cccccc',
                        borderBottom: '1px solid #111111',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <span>{prod.name}</span>
                      <span style={{ fontSize: '11px', color: '#3498db', fontWeight: '800' }}>
                        R$ {prod.price.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. COLEÇÕES (with Expandable Arrow) */}
            <div>
              <div
                onClick={() => setMobileCollectionsOpen(!mobileCollectionsOpen)}
                style={{
                  padding: '18px 20px',
                  borderBottom: '1px solid #141414',
                  fontSize: '14px',
                  fontWeight: '800',
                  letterSpacing: '1px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>COLEÇÕES</span>
                <ArrowRight size={18} color="#ffffff" style={{ transform: mobileCollectionsOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
              </div>

              {/* Sub-items for Collections */}
              {mobileCollectionsOpen && (
                <div style={{ backgroundColor: '#080808', borderBottom: '1px solid #141414' }}>
                  {CATEGORIES.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => {
                        if (onSelectCategory) onSelectCategory(cat.id);
                        setMobileMenuOpen(false);
                      }}
                      style={{
                        padding: '14px 24px 14px 36px',
                        fontSize: '13px',
                        color: '#ffffff',
                        fontWeight: '700',
                        borderBottom: '1px solid #111111',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <span>{cat.name}</span>
                      <ChevronRight size={16} color="#3498db" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. ATENDIMENTO WHATSAPP */}
            <a
              href="https://api.whatsapp.com/send?phone=5534988388278"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: '18px 20px',
                borderBottom: '1px solid #141414',
                fontSize: '14px',
                fontWeight: '800',
                letterSpacing: '1px',
                color: '#25d366',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>ATENDIMENTO WHATSAPP</span>
              <ArrowRight size={18} color="#25d366" />
            </a>

          </div>

        </div>
      )}

      {/* Breakpoint standard CSS */}
      <style>{`
        @media (max-width: 767px) {
          .d-none-mobile { display: none !important; }
          .d-md-none { display: block !important; }
        }
        @media (min-width: 768px) {
          .d-none-mobile { display: flex !important; }
          .d-md-none { display: none !important; }
        }
      `}</style>
    </header>
  );
}
