import React, { useState, useEffect } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Truck,
  ShieldCheck,
  CreditCard,
  ShoppingBag,
  Check,
  ArrowLeft,
  ChevronRight,
  Share2,
  Heart
} from 'lucide-react';
import ProductCard from './ProductCard';
import ShippingCalculator from './ShippingCalculator';
import { formatPrice, handleImageError, renderFormattedDescription, DEFAULT_FALLBACK_IMAGE } from '../lib/formatters';

export default function ProductPage({ product, allProducts, onAddToCart, onSelectProduct, onGoHome }) {
  const [selectedImage, setSelectedImage] = useState(product?.image || product?.gallery?.[0]);
  const [selectedSize, setSelectedSize] = useState(product?.sizes?.[0] || 'P');
  const [selectedColor, setSelectedColor] = useState(product?.colors?.[0] || { name: 'Padrão' });
  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Shipping Calculator state
  const [cepInput, setCepInput] = useState('');
  const [shippingCalculated, setShippingCalculated] = useState(false);
  const [isShippingOpen, setIsShippingOpen] = useState(true);

  // Scroll to top when product changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (product) {
      setSelectedImage(product.image || product.gallery?.[0]);
      setSelectedSize(product.sizes?.[0] || 'P');
      setSelectedColor(product.colors?.[0] || { name: 'Padrão' });
      setQuantity(1);
      setShippingCalculated(false);
    }
  }, [product]);

  if (!product) return null;

  const galleryImages = product.gallery && product.gallery.length > 0
    ? product.gallery
    : [product.image];
  const handleAddToCartClick = () => {
    onAddToCart({
      ...product,
      selectedSize,
      selectedColor: selectedColor.name,
      quantity
    });
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2000);
  };

  const handleCalculateShipping = (e) => {
    e.preventDefault();
    if (cepInput.trim().length >= 8) {
      setShippingCalculated(true);
    }
  };

  // Related products excluding current
  const relatedProducts = allProducts.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <div style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', paddingBottom: '60px' }}>
      
      {/* Breadcrumbs Navigation Bar */}
      <div style={{
        backgroundColor: '#0a0a0a',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '12px 0',
        fontSize: '11px',
        fontWeight: '600',
        letterSpacing: '0.5px'
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', color: '#888888' }}>
          <button
            onClick={onGoHome}
            style={{ color: '#888888', display: 'flex', alignItems: 'center', gap: '4px', background: 'none' }}
            onMouseOver={(e) => e.currentTarget.style.color = '#3498db'}
            onMouseOut={(e) => e.currentTarget.style.color = '#888888'}
          >
            Início
          </button>
          <span>.</span>
          <span style={{ color: '#aaaaaa', textTransform: 'uppercase' }}>
            {product.categoryLabel || 'ROUPAS & IMPRESSÕES 3D'}
          </span>
          <span>.</span>
          <span style={{ color: '#ffffff', fontWeight: '700', textTransform: 'uppercase' }}>
            {product.name}
          </span>
        </div>
      </div>

      {/* Main PDP Section */}
      <div className="container" style={{ marginTop: '24px' }}>
        
        {/* Back Button for mobile */}
        <button
          onClick={onGoHome}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#3498db',
            fontWeight: '700',
            marginBottom: '16px'
          }}
        >
          <ArrowLeft size={16} /> Voltar aos produtos
        </button>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '24px',
          alignItems: 'start'
        }}>
          
          {/* LEFT SIDE: Vertical Thumbnail Strip + Large Featured Image (7 cols on desktop) */}
          <div style={{
            gridColumn: 'span 12',
            display: 'flex',
            gap: '16px'
          }} className="pdp-gallery-col">

            {/* Vertical Thumbnail Strip */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              width: '80px',
              flexShrink: 0
            }} className="thumbnail-strip">
              
              <button style={{ color: '#555555', cursor: 'default' }}>
                <ChevronUp size={20} />
              </button>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxHeight: '480px',
                overflowY: 'auto',
                paddingRight: '2px'
              }}>
                {galleryImages.map((imgUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(imgUrl)}
                    style={{
                      width: '74px',
                      height: '92px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      border: selectedImage === imgUrl ? '2px solid #3498db' : '1px solid #222222',
                      backgroundColor: '#0a0a0a',
                      padding: 0,
                      transition: 'border-color 0.2s',
                      opacity: selectedImage === imgUrl ? 1 : 0.65
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt={`${product.name} thumb ${index + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </button>
                ))}
              </div>

              <button style={{ color: '#555555', cursor: 'default' }}>
                <ChevronDown size={20} />
              </button>
            </div>

            {/* Large Featured Image Viewer */}
            <div style={{
              flex: 1,
              backgroundColor: '#080808',
              borderRadius: '6px',
              border: '1px solid #1a1a1a',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '420px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {product.badge && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  backgroundColor: '#090476',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '4px 10px',
                  borderRadius: '3px',
                  letterSpacing: '1px',
                  zIndex: 2,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}>
                  {product.badge}
                </div>
              )}

              <img
                src={selectedImage}
                alt={product.name}
                style={{
                  width: '100%',
                  maxHeight: '620px',
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'transform 0.3s ease'
                }}
              />
            </div>
          </div>

          {/* RIGHT SIDE: Product Information & Purchase Controls (5 cols on desktop) */}
          <div style={{
            gridColumn: 'span 12',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }} className="pdp-details-col">

            {/* Product Title */}
            <div>
              <h1 style={{
                fontSize: '24px',
                fontWeight: '900',
                letterSpacing: '0.5px',
                lineHeight: '1.2',
                color: '#ffffff',
                textTransform: 'uppercase'
              }}>
                {product.name}
              </h1>
              {product.sku && (
                <span style={{ fontSize: '11px', color: '#666666', marginTop: '4px', display: 'block' }}>
                  SKU: {product.sku}
                </span>
              )}
            </div>

            {/* Price Block */}
            <div style={{
              backgroundColor: '#0a0a0a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              {/* Main Price & Discount badge */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff' }}>
                  R$ {formatPrice(product.price)}
                </span>
                {(product.discount || (product.oldPrice && Number(product.oldPrice) > Number(product.price))) && (
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '800',
                    color: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.15)',
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}>
                    -{product.discount || `${Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100)}% OFF`}
                  </span>
                )}
              </div>

              {/* Original Crossed Price */}
              {product.oldPrice && Number(product.oldPrice) > Number(product.price) && (
                <div style={{ fontSize: '13px', color: '#888888', textDecoration: 'line-through', marginTop: '2px' }}>
                  De: R$ {formatPrice(product.oldPrice)}
                </div>
              )}

              {/* Installment Notice */}
              <div style={{ fontSize: '11px', color: '#aaaaaa', marginTop: '6px', lineHeight: '1.4' }}>
                Parcelamentos podem incluir acréscimos conforme o número de parcelas escolhido
              </div>
            </div>

            {/* Color Swatches (if available) */}
            {product.colors && product.colors.length > 0 && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#cccccc', display: 'block', marginBottom: '8px' }}>
                  Cor: <span style={{ color: '#ffffff' }}>{selectedColor.name}</span>
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {product.colors.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedColor(c)}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '6px',
                        border: selectedColor.name === c.name ? '2px solid #3498db' : '1px solid #333333',
                        overflow: 'hidden',
                        padding: 0,
                        backgroundColor: '#111',
                        transition: 'transform 0.2s'
                      }}
                      title={c.name}
                    >
                      {c.image ? (
                        <img src={c.image} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', backgroundColor: c.hex || '#000' }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selector (Only displayed if product has size variants) */}
            {Boolean(product.has_variants || (product.sizes && product.sizes.length > 0 && product.sizes[0] !== 'Único')) && (
              <div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#cccccc' }}>
                    Tamanho: <span style={{ color: '#ffffff', fontWeight: '800' }}>{selectedSize}</span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(product.sizes || []).map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      style={{
                        minWidth: '46px',
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: '800',
                        border: selectedSize === size ? '2px solid #3498db' : '1px solid #222222',
                        backgroundColor: selectedSize === size ? '#090476' : '#0a0a0a',
                        color: '#ffffff',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector & Main Purchase CTA */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              
              {/* Quantity Counter */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#0a0a0a',
                border: '1px solid #222222',
                borderRadius: '4px',
                height: '52px'
              }}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{
                    padding: '0 16px',
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: '700',
                    height: '100%'
                  }}
                >
                  -
                </button>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '800',
                  color: '#ffffff',
                  minWidth: '28px',
                  textAlign: 'center'
                }}>
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  style={{
                    padding: '0 16px',
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: '700',
                    height: '100%'
                  }}
                >
                  +
                </button>
              </div>

              {/* Main COMPRAR Button */}
              <button
                onClick={handleAddToCartClick}
                style={{
                  flex: 1,
                  backgroundColor: addedSuccess ? '#27ae60' : '#090476',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: '900',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  borderRadius: '4px',
                  height: '52px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 6px 20px rgba(9, 4, 118, 0.4)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (!addedSuccess) e.currentTarget.style.backgroundColor = '#0f4592';
                }}
                onMouseOut={(e) => {
                  if (!addedSuccess) e.currentTarget.style.backgroundColor = '#090476';
                }}
              >
                {addedSuccess ? (
                  <>
                    <Check size={20} /> ADICIONADO AO CARRINHO
                  </>
                ) : (
                  <>
                    <ShoppingBag size={20} /> COMPRAR AGORA
                  </>
                )}
              </button>
            </div>

            {/* Shipping Calculator Correios Component */}
            <ShippingCalculator subtotal={product.price * quantity} />

            {/* Product Specifications & Description */}
            <div style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              backgroundColor: '#0a0a0a',
              padding: '20px',
              marginTop: '12px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Descrição do Produto
              </h3>
              
              <div style={{ marginBottom: '16px' }}>
                {renderFormattedDescription(product.description)}
              </div>

              {/* Technical Specifications list */}
              {product.specs && (
                <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '14px', marginTop: '14px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff', marginBottom: '10px', textTransform: 'uppercase' }}>
                    Especificações Técnicas
                  </h4>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    {product.specs.map((spec, idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #141414', paddingBottom: '6px' }}>
                        <span style={{ color: '#888888' }}>{spec.label}:</span>
                        <strong style={{ color: '#ffffff' }}>{spec.value}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Styled Promotional Banner block inside description (matching image) */}
              <div style={{
                marginTop: '24px',
                background: 'linear-gradient(135deg, #090476 0%, #000000 100%)',
                border: '1px solid #3498db',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <h4 style={{ fontSize: '16px', fontWeight: '900', color: '#ffffff', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  ⚡ QUALIDADE GUARANTIDA INFINITY 3D
                </h4>
                <p style={{ fontSize: '12px', color: '#aaaaaa', marginTop: '6px' }}>
                  Produtos selecionados e impressos com precisão máxima. Entrega garantida e suporte 24h.
                </p>
              </div>

            </div>

          </div>

        </div>

        {/* RELATED PRODUCTS SECTION */}
        <div style={{ marginTop: '60px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '1px', textAlign: 'center', marginBottom: '28px' }}>
            QUEM VIU ESTE PRODUTO, VIU TAMBÉM
          </h2>

          <div className="product-grid-container">
            {relatedProducts.map((relProduct) => (
              <div key={relProduct.id} onClick={() => onSelectProduct(relProduct)} style={{ cursor: 'pointer' }}>
                <ProductCard
                  product={relProduct}
                  onAddToCart={onAddToCart}
                />
              </div>
            ))}
          </div>
        </div>

      </div>



      {/* CSS adjustments for desktop responsive layout */}
      <style>{`
        @media (min-width: 992px) {
          .pdp-gallery-col {
            grid-column: span 7 !important;
            position: sticky !important;
            top: 100px !important;
          }
          .pdp-details-col {
            grid-column: span 5 !important;
          }
        }
        @media (max-width: 991px) {
          .pdp-gallery-col {
            position: relative !important;
            top: auto !important;
          }
        }
        @media (max-width: 767px) {
          .thumbnail-strip {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
