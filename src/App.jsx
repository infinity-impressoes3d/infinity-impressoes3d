import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import { PRODUCTS, CATEGORIES } from './data/products';
import Header from './components/Header';
import HeroSlider from './components/HeroSlider';
import CategoryGrid from './components/CategoryGrid';
import ProductGrid from './components/ProductGrid';
import ProductPage from './components/ProductPage';
import CartDrawer from './components/CartDrawer';
import SearchModal from './components/SearchModal';
import Footer from './components/Footer';
import CollectionPage from './components/CollectionPage';
import CheckoutPage from './components/CheckoutPage';

export default function App() {
  const [productsList, setProductsList] = useState(PRODUCTS);
  const [collectionsList, setCollectionsList] = useState(CATEGORIES);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Navigation Routing: 'home' | 'catalog' | 'collection' | 'product' | 'checkout'
  const [currentView, setCurrentView] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Fetch Live Products & Collections from Supabase Database with Realtime
  useEffect(() => {
    async function fetchLiveCatalog() {
      try {
        const { data: dbProducts } = await supabase
          .from('products')
          .select('*')
          .or('active.eq.true,active.is.null')
          .order('created_at', { ascending: false });

        const { data: prodRels } = await supabase
          .from('product_collections')
          .select('product_id, collection_id');

        let formattedProducts = [];
        if (dbProducts && dbProducts.length > 0) {
          formattedProducts = dbProducts.map(p => {
            const relCols = prodRels ? prodRels.filter(r => r.product_id === p.id).map(r => r.collection_id) : [];
            const allColIds = Array.from(new Set([...relCols, ...(p.collection_id ? [p.collection_id] : [])]));

            return {
              id: p.id,
              name: p.name,
              title: p.name,
              description: p.description,
              price: Number(p.price || 0),
              oldPrice: p.old_price ? Number(p.old_price) : (p.oldPrice ? Number(p.oldPrice) : (Number(p.price || 0) > 0 ? Number(p.price) * 1.2 : null)),
              weightGrams: p.weight_grams,
              sizes: p.sizes && p.sizes.length > 0 ? p.sizes : [],
              image: p.images && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
              images: p.images && p.images.length > 0 ? p.images : ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'],
              collectionIds: allColIds,
              category: allColIds[0] || p.collection_id || null,
              rating: 5.0,
              reviewsCount: 12,
              isNew: true
            };
          });
          setProductsList(formattedProducts);
        }

        const { data: dbCols } = await supabase
          .from('collections')
          .select('*')
          .order('display_order', { ascending: true });

        if (dbCols && dbCols.length > 0) {

          const formattedCols = dbCols.map(c => {
            let finalImg = c.image;

            if (!finalImg && formattedProducts.length > 0) {
              const relatedProdIds = prodRels
                ? prodRels.filter(r => r.collection_id === c.id).map(r => r.product_id)
                : [];

              const prodsInCol = formattedProducts.filter(p =>
                relatedProdIds.includes(p.id) || (p.collectionIds && p.collectionIds.includes(c.id))
              );

              if (prodsInCol.length > 0) {
                const prodWithImg = prodsInCol.find(p => p.image || (p.images && p.images.length > 0));
                if (prodWithImg) {
                  finalImg = prodWithImg.image || prodWithImg.images[0];
                }
              }
            }

            if (!finalImg) {
              finalImg = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
            }

            return {
              id: c.id,
              name: c.name,
              image: finalImg,
              isFeaturedHome: c.is_featured_home !== false
            };
          });

          setCollectionsList(formattedCols);
        }
      } catch (e) {
        console.log('Erro ao carregar catálogo Supabase:', e);
      }
    }

    fetchLiveCatalog();

    // Inscreve no Supabase Realtime para escutar novas coleções e produtos criados
    let channel;
    try {
      channel = supabase
        .channel('storefront-catalog-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, () => fetchLiveCatalog())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchLiveCatalog())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'product_collections' }, () => fetchLiveCatalog())
        .subscribe();
    } catch (e) {
      console.log('Realtime canal off');
    }

    // Polling automático a cada 4 segundos e atualização instantânea ao voltar para a aba
    const pollInterval = setInterval(fetchLiveCatalog, 4000);
    const handleFocus = () => fetchLiveCatalog();
    window.addEventListener('focus', handleFocus);

    return () => {
      if (channel) supabase.removeChannel(channel);
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);


  // Handle URL Hash routing sem scroll automático indesejado
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/produto/')) {
        const prodId = hash.replace('#/produto/', '');
        const found = productsList.find((p) => p.id === prodId);
        if (found) {
          setSelectedProduct(found);
          setCurrentView('product');
          return;
        }
      }
      if (hash.startsWith('#/colecao/')) {
        const catId = hash.replace('#/colecao/', '');
        setSelectedCategory(catId);
        setCurrentView('collection');
        return;
      }
      if (hash === '#/checkout') {
        setCurrentView('checkout');
        return;
      }
      if (!hash || hash === '#' || hash === '#products') {
        setCurrentView('home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);



  // Cart Functions
  const handleAddToCart = (product, size = null, quantity = 1) => {
    if (!product) return;

    let targetSize = size;
    let targetQty = quantity;

    // Support single object parameter: onAddToCart({ ...product, selectedSize, quantity })
    if (typeof size !== 'string' && typeof size !== 'number' && product.selectedSize) {
      targetSize = product.selectedSize;
    }
    if (typeof size === 'number') {
      targetQty = size;
    } else if (product.quantity && (size === null || typeof size !== 'number')) {
      targetQty = product.quantity;
    }

    const finalSize = targetSize || (product.sizes && product.sizes[0]) || 'Único';
    const finalQty = Number(targetQty) || 1;

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item.id === product.id && item.selectedSize === finalSize
      );

      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex].quantity += finalQty;
        return updated;
      }

      return [
        ...prevItems,
        {
          ...product,
          selectedSize: finalSize,
          quantity: finalQty
        }
      ];
    });

    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (id, size, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(id, size);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id && item.selectedSize === size
          ? { ...item, quantity: newQty }
          : item
      )
    );
  };

  const handleRemoveItem = (id, size) => {
    setCartItems((prev) =>
      prev.filter((item) => !(item.id === id && item.selectedSize === size))
    );
  };

  // Quick View Handler
  const handleQuickView = (product) => {
    setSelectedProduct(product);
    setIsQuickViewOpen(true);
  };

  // Navigation Handlers
  const handleSelectCategory = (catId) => {
    setSelectedCategory(catId);
    setCurrentView('collection');
    window.location.hash = `#/colecao/${catId}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setCurrentView('product');
    window.location.hash = `#/produto/${product.id}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
    setCurrentView('home');
    setSelectedCategory(null);
    window.location.hash = '#';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCheckout = () => {
    setIsCartOpen(false);
    setCurrentView('checkout');
    window.location.hash = '#/checkout';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#000000', color: '#ffffff' }}>
      {/* Header Navigation */}
      <Header
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onGoHome={handleGoHome}
        onSelectCategory={handleSelectCategory}
        onSelectProduct={handleSelectProduct}
        products={productsList}
        categories={collectionsList}
      />

      {/* Main View Router */}
      <main style={{ flex: 1 }}>
        {currentView === 'home' && (
          <>
            <HeroSlider />
            <CategoryGrid
              categories={collectionsList}
              onSelectCategory={handleSelectCategory}
            />
            <ProductGrid
              products={productsList}
              onQuickView={handleQuickView}
              onAddToCart={handleAddToCart}
              onSelectProduct={handleSelectProduct}
            />
          </>
        )}

        {currentView === 'collection' && (
          <CollectionPage
            category={selectedCategory}
            categoryId={selectedCategory}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            onGoHome={handleGoHome}
            onSelectCategory={handleSelectCategory}
            products={productsList}
            allProducts={productsList}
            categories={collectionsList}
          />
        )}

        {currentView === 'product' && selectedProduct && (
          <ProductPage
            product={selectedProduct}
            onAddToCart={handleAddToCart}
            allProducts={productsList}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {currentView === 'checkout' && (
          <CheckoutPage
            cartItems={cartItems}
            onGoHome={handleGoHome}
            onClearCart={() => setCartItems([])}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
          />
        )}
      </main>

      {/* Footer */}
      <Footer onSelectCategory={handleSelectCategory} />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleOpenCheckout}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        products={productsList}
        onSelectProduct={(p) => {
          setIsSearchOpen(false);
          handleSelectProduct(p);
        }}
      />
    </div>
  );
}
