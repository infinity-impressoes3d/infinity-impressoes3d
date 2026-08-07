import React, { useRef, useEffect } from 'react';
import { CATEGORIES as FALLBACK_CATEGORIES } from '../data/products';

export default function CategoryGrid({ onSelectCategory, categories = [] }) {
  const scrollRef = useRef(null);

  // Filtra coleções marcadas como destaque na home se houver alguma, senão exibe todas as ativas
  let activeCategories = categories && categories.length > 0 
    ? categories.filter(c => c.isFeaturedHome)
    : [];

  if (activeCategories.length === 0 && categories && categories.length > 0) {
    activeCategories = categories;
  }

  if (activeCategories.length === 0) {
    activeCategories = FALLBACK_CATEGORIES;
  }

  // Quadrupled categories array for mobile infinite drag loop
  const infiniteCategories = [
    ...activeCategories,
    ...activeCategories,
    ...activeCategories,
    ...activeCategories
  ];

  // Set initial scroll position for mobile loop
  useEffect(() => {
    const el = scrollRef.current;
    if (el && activeCategories.length > 0) {
      const singleSetWidth = el.scrollWidth / 4;
      el.scrollLeft = singleSetWidth;
    }
  }, [categories, activeCategories.length]);

  // Seamless infinite drag loop for mobile touch swipe
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const singleSetWidth = el.scrollWidth / 4;
    if (el.scrollLeft >= singleSetWidth * 3 - 20) {
      el.scrollLeft -= singleSetWidth * 2;
    } else if (el.scrollLeft <= 20) {
      el.scrollLeft += singleSetWidth * 2;
    }
  };

  const handleCategoryClick = (catId, e) => {
    if (e) e.preventDefault();
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
  };

  return (
    <section style={{ padding: '20px 0 28px 0', backgroundColor: '#000000', overflow: 'hidden' }}>
      <div className="container" style={{ padding: '0 12px' }}>
        
        {/* MOBILE VIEW (screens < 768px): Horizontal Infinite Drag Loop (Quadrados 1:1) */}
        <div className="d-md-none" style={{ position: 'relative' }}>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{
              display: 'flex',
              gap: '14px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '10px',
              paddingTop: '4px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {infiniteCategories.map((cat, idx) => (
              <a
                key={`${cat.id}-${idx}`}
                href={`#/colecao/${cat.id}`}
                onClick={(e) => handleCategoryClick(cat.id, e)}
                style={{
                  flex: '0 0 145px',
                  width: '145px',
                  height: '145px',
                  aspectRatio: '1 / 1',
                  textDecoration: 'none',
                  position: 'relative',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  backgroundColor: '#161616',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.7)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 100%)',
                  pointerEvents: 'none'
                }} />
                <div style={{
                  position: 'relative',
                  zIndex: 2,
                  padding: '0 8px 12px 8px',
                  textAlign: 'center'
                }}>
                  <h3 style={{
                    fontSize: '12px',
                    fontWeight: '900',
                    color: '#ffffff',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    lineHeight: 1.2,
                    margin: 0,
                    textShadow: '0 2px 6px rgba(0,0,0,0.95)'
                  }}>
                    {cat.name}
                  </h3>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* DESKTOP / TABLET VIEW (screens >= 768px): Centered Collections Grid (Quadrados Perfeitos 1:1) */}
        <div className="d-none-mobile" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {activeCategories.map((cat) => (
            <a
              key={cat.id}
              href={`#/colecao/${cat.id}`}
              onClick={(e) => handleCategoryClick(cat.id, e)}
              style={{
                flex: '0 0 220px',
                width: '220px',
                height: '220px',
                aspectRatio: '1 / 1',
                textDecoration: 'none',
                position: 'relative',
                borderRadius: '22px',
                overflow: 'hidden',
                backgroundColor: '#161616',
                boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                e.currentTarget.style.borderColor = '#3498db';
                e.currentTarget.style.boxShadow = '0 14px 32px rgba(52, 152, 219, 0.35)';
                const img = e.currentTarget.querySelector('.cat-card-img-desk');
                if (img) img.style.transform = 'scale(1.08)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.8)';
                const img = e.currentTarget.querySelector('.cat-card-img-desk');
                if (img) img.style.transform = 'scale(1)';
              }}
            >
              <img
                className="cat-card-img-desk"
                src={cat.image}
                alt={cat.name}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'transform 0.4s ease'
                }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 45%, rgba(0,0,0,0) 100%)',
                pointerEvents: 'none'
              }} />
              <div style={{
                position: 'relative',
                zIndex: 2,
                padding: '0 12px 18px 12px',
                textAlign: 'center'
              }}>
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: '900',
                  color: '#ffffff',
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  lineHeight: 1.2,
                  margin: 0,
                  textShadow: '0 2px 8px rgba(0,0,0,0.95)'
                }}>
                  {cat.name}
                </h3>
              </div>
            </a>
          ))}
        </div>

      </div>

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
    </section>
  );
}
