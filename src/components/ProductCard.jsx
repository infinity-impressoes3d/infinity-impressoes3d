import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { formatPrice, handleImageError, DEFAULT_FALLBACK_IMAGE } from '../lib/formatters';

export default function ProductCard({ product, onAddToCart, onSelectProduct }) {

  const handleCardClick = () => {
    if (onSelectProduct) {
      onSelectProduct(product);
    }
  };

  const handleButtonClick = (e) => {
    e.stopPropagation();
    if (onSelectProduct) {
      onSelectProduct(product);
    }
  };

  const priceNum = Number(product.price || 0);
  const oldPriceNum = product.oldPrice ? Number(product.oldPrice) : null;
  const hasDiscount = oldPriceNum && oldPriceNum > priceNum;
  const discountBadge = product.discount || (hasDiscount ? `${Math.round(((oldPriceNum - priceNum) / oldPriceNum) * 100)}% OFF` : null);

  return (
    <div
      onClick={handleCardClick}
      style={{
        backgroundColor: '#000000',
        borderRadius: '4px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        cursor: 'pointer'
      }}
    >
      {/* Image Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '125%', // 4:5 portrait aspect ratio
        backgroundColor: '#0d0d0d',
        overflow: 'hidden',
        borderRadius: '4px'
      }}>
        {product.badge && (
          <span style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            backgroundColor: '#090476',
            color: '#ffffff',
            fontSize: '9px',
            fontWeight: '800',
            padding: '3px 6px',
            borderRadius: '3px',
            zIndex: 2,
            letterSpacing: '0.5px'
          }}>
            {product.badge}
          </span>
        )}

        {discountBadge && (
          <span style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            backgroundColor: '#e74c3c',
            color: '#ffffff',
            fontSize: '9px',
            fontWeight: '900',
            padding: '3px 6px',
            borderRadius: '3px',
            zIndex: 2,
            letterSpacing: '0.5px'
          }}>
            -{discountBadge}
          </span>
        )}

        <img
          src={product.image || DEFAULT_FALLBACK_IMAGE}
          alt={product.name}
          onError={handleImageError}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.3s ease'
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        />
      </div>

      {/* Product Details Content */}
      <div style={{ padding: '10px 4px 6px 4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Title */}
        <h3 style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#ffffff',
          letterSpacing: '0.3px',
          lineHeight: '1.3',
          textTransform: 'uppercase',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: '32px'
        }}>
          {product.name}
        </h3>

        {/* Price & Discount Tag Row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
          <span style={{
            fontSize: '16px',
            fontWeight: '900',
            color: '#ffffff'
          }}>
            R$ {formatPrice(priceNum)}
          </span>
        </div>

        {/* Strikethrough Old Price */}
        {hasDiscount && (
          <div style={{
            fontSize: '11px',
            color: '#888888',
            textDecoration: 'line-through'
          }}>
            De: R$ {formatPrice(oldPriceNum)}
          </div>
        )}

        {/* Installment Info */}
        <div style={{
          fontSize: '10px',
          color: '#aaaaaa',
          lineHeight: '1.3'
        }}>
          Parcelamentos podem incluir acréscimos conforme o número de parcelas escolhido
        </div>

        {/* COMPRAR Button -> Opens Product Detail Page */}
        <button
          onClick={handleButtonClick}
          style={{
            marginTop: '8px',
            width: '100%',
            backgroundColor: '#090476',
            color: '#ffffff',
            fontWeight: '800',
            fontSize: '11px',
            letterSpacing: '0.5px',
            padding: '8px 0',
            borderRadius: '4px',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#0f4592';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#090476';
          }}
        >
          <ShoppingBag size={14} /> COMPRAR
        </button>
      </div>
    </div>
  );
}
