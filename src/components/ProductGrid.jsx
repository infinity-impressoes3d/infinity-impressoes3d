import React from 'react';
import ProductCard from './ProductCard';

export default function ProductGrid({ products, onAddToCart, onSelectProduct }) {
  return (
    <section id="products" style={{ padding: '40px 0 60px 0', backgroundColor: '#000000' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '900',
            color: '#ffffff',
            letterSpacing: '1px'
          }}>
            PRODUTOS EM DESTAQUE
          </h2>
        </div>

        {/* 2-Column Mobile Product Grid */}
        <div className="product-grid-container">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
