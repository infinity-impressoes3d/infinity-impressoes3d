import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HeroSlider from './components/HeroSlider';
import CategoryGrid from './components/CategoryGrid';
import ProductGrid from './components/ProductGrid';
import ProductPage from './components/ProductPage';
import CollectionPage from './components/CollectionPage';
import CheckoutPage from './components/CheckoutPage';
import TrustBadges from './components/TrustBadges';
import CartDrawer from './components/CartDrawer';
import SearchModal from './components/SearchModal';
import Footer from './components/Footer';
import { PRODUCTS } from './data/products';

export default function App() {
  const [cartItems, setCartItems] = useState([
    {
      ...PRODUCTS[0],
      selectedSize: 'P',
      quantity: 1
    }
  ]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Routing state for Product Detail Page, Collection Page, and Checkout Page
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'product' | 'collection' | 'checkout'
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [selectedCategory, setSelectedCategory] = useState('todos');

  // Handle URL Hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/produto/')) {
        const prodId = hash.replace('#/produto/', '');
        const found = PRODUCTS.find((p) => p.id === prodId);
        if (found) {
          setSelectedProduct(found);
          setCurrentView('product');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
      if (hash.startsWith('#/colecao/')) {
        const catId = hash.replace('#/colecao/', '');
        setSelectedCategory(catId);
        setCurrentView('collection');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (hash === '#/checkout') {
        setCurrentView('checkout');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!hash || hash === '#' || hash === '#products') {
        setCurrentView('home');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setCurrentView('product');
    window.location.hash = `#/produto/${product.id}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (catId = 'todos') => {
    setSelectedCategory(catId);
    setCurrentView('collection');
    window.location.hash = `#/colecao/${catId}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCheckout = () => {
    setCurrentView('checkout');
    setIsCartOpen(false);
    window.location.hash = '#/checkout';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
    setCurrentView('home');
    window.location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add to cart logic
  const handleAddToCart = (productWithDetails) => {
    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item.id === productWithDetails.id && item.selectedSize === productWithDetails.selectedSize
      );

      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex].quantity += (productWithDetails.quantity || 1);
        return updated;
      } else {
        return [...prevItems, { ...productWithDetails, quantity: productWithDetails.quantity || 1 }];
      }
    });

    setIsCartOpen(true);
  };

  // Update item quantity in cart
  const handleUpdateQuantity = (id, size, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(id, size);
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id && item.selectedSize === size
          ? { ...item, quantity: newQty }
          : item
      )
    );
  };

  // Remove item from cart
  const handleRemoveItem = (id, size) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => !(item.id === id && item.selectedSize === size))
    );
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);

  // If in Checkout view, render full checkout page layout
  if (currentView === 'checkout') {
    return (
      <CheckoutPage
        cartItems={cartItems}
        onGoHome={handleGoHome}
        onClearCart={handleClearCart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
      />
    );
  }

  return (
    <div style={{ backgroundColor: '#000000', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Navigation Menu */}
      <Header
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onGoHome={handleGoHome}
        onSelectProduct={handleSelectProduct}
        onSelectCategory={handleSelectCategory}
      />

      {/* Main View Switching: Home Page vs Product Detail Page vs Dedicated Collection Page */}
      {currentView === 'product' ? (
        <ProductPage
          product={selectedProduct}
          allProducts={PRODUCTS}
          onAddToCart={handleAddToCart}
          onSelectProduct={handleSelectProduct}
          onGoHome={handleGoHome}
        />
      ) : currentView === 'collection' ? (
        <CollectionPage
          categoryId={selectedCategory}
          allProducts={PRODUCTS}
          onSelectProduct={handleSelectProduct}
          onAddToCart={handleAddToCart}
          onGoHome={handleGoHome}
          onSelectCategory={handleSelectCategory}
        />
      ) : (
        <main>
          {/* Hero Slide Banner */}
          <HeroSlider />

          {/* Category Grid */}
          <CategoryGrid
            onSelectCategory={handleSelectCategory}
          />

          {/* Product Catalog Grid */}
          <ProductGrid
            products={PRODUCTS}
            onAddToCart={handleAddToCart}
            onSelectProduct={handleSelectProduct}
          />
        </main>
      )}

      {/* Trust Badges */}
      <TrustBadges />

      {/* Footer */}
      <Footer />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleOpenCheckout}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        products={PRODUCTS}
        onAddToCart={handleAddToCart}
        onSelectProduct={handleSelectProduct}
      />
    </div>
  );
}
