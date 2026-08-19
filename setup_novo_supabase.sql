-- ============================================================
-- 🚀 SCRIPT DE CONFIGURAÇÃO INICIAL DO NOVO SUPABASE
-- Execute este script no SQL Editor do seu novo Supabase (supabase.com)
-- ============================================================

-- 1. TABELA DE PRODUTOS
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  old_price NUMERIC(10, 2),
  weight_grams NUMERIC(10, 2) DEFAULT 300,
  height_cm NUMERIC(10, 2) DEFAULT 6,
  width_cm NUMERIC(10, 2) DEFAULT 11,
  length_cm NUMERIC(10, 2) DEFAULT 16,
  sizes JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  collection_id TEXT,
  active BOOLEAN DEFAULT TRUE,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_free_shipping BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS height_cm NUMERIC(10, 2) DEFAULT 6;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS width_cm NUMERIC(10, 2) DEFAULT 11;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS length_cm NUMERIC(10, 2) DEFAULT 16;


-- 2. TABELA DE COLEÇÕES / CATEGORIAS
CREATE TABLE IF NOT EXISTS public.collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image TEXT,
  display_order INT DEFAULT 0,
  is_featured_home BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE RELAÇÃO PRODUTO-COLEÇÃO (N:N)
CREATE TABLE IF NOT EXISTS public.product_collections (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
  collection_id TEXT REFERENCES public.collections(id) ON DELETE CASCADE,
  UNIQUE(product_id, collection_id)
);

-- 4. TABELA DE BANNERS DA HOME (HERO SLIDES)
CREATE TABLE IF NOT EXISTS public.hero_slides (
  id TEXT PRIMARY KEY,
  image TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE PEDIDOS E CHECKOUTS ABANDONADOS
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_cpf TEXT,
  shipping_address JSONB,
  shipping_method TEXT,
  shipping_cost NUMERIC(10, 2) DEFAULT 0,
  items JSONB,
  total_amount NUMERIC(10, 2),
  payment_method TEXT,
  status TEXT DEFAULT 'abandoned',
  status_entrega TEXT DEFAULT 'imprimindo',
  status_atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  comments TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status_entrega TEXT DEFAULT 'imprimindo';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status_atualizado_em TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- 6. TABELA DE CONFIGURAÇÕES DA LOJA E GATEWAYS
CREATE TABLE IF NOT EXISTS public.store_settings (
  id INT PRIMARY KEY DEFAULT 1,
  stripe_publishable_key TEXT,
  stripe_secret_key TEXT,
  infinitepay_handle TEXT,
  infinitepay_api_token TEXT,
  infinitepay_status TEXT,
  mercadopago_public_key TEXT,
  mercadopago_access_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS infinitepay_handle TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS infinitepay_api_token TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS infinitepay_status TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS mercadopago_public_key TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS mercadopago_access_token TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 7. TABELA DE CREDENCIAIS DE PAGAMENTO
CREATE TABLE IF NOT EXISTS public.payment_credentials (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  public_key TEXT,
  access_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA DE FINANÇAS / CUSTOS, ENTRADAS E DESPESAS
CREATE TABLE IF NOT EXISTS public.finances (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'expense',
  amount NUMERIC(10, 2) DEFAULT 0,
  value NUMERIC(10, 2) DEFAULT 0,
  category TEXT,
  date TEXT DEFAULT CURRENT_DATE::text,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HABILITAR PUBLIC ACCESS (RLS LEITURA E ESCRITA PARA LOJA E ADMIN)
-- ============================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica de produtos" ON public.products;
DROP POLICY IF EXISTS "Permitir leitura publica de colecoes" ON public.collections;
DROP POLICY IF EXISTS "Permitir leitura publica de product_collections" ON public.product_collections;
DROP POLICY IF EXISTS "Permitir leitura publica de hero_slides" ON public.hero_slides;
DROP POLICY IF EXISTS "Permitir inserção e atualização publica de orders" ON public.orders;
DROP POLICY IF EXISTS "Permitir leitura publica de store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Permitir acesso total de produtos" ON public.products;
DROP POLICY IF EXISTS "Permitir acesso total de colecoes" ON public.collections;
DROP POLICY IF EXISTS "Permitir acesso total de product_collections" ON public.product_collections;
DROP POLICY IF EXISTS "Permitir acesso total de hero_slides" ON public.hero_slides;
DROP POLICY IF EXISTS "Permitir acesso total de orders" ON public.orders;
DROP POLICY IF EXISTS "Permitir acesso total de store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Permitir acesso total de payment_credentials" ON public.payment_credentials;
DROP POLICY IF EXISTS "Permitir acesso total de finances" ON public.finances;

CREATE POLICY "Permitir acesso total de produtos" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso total de colecoes" ON public.collections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso total de product_collections" ON public.product_collections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso total de hero_slides" ON public.hero_slides FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso total de orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso total de store_settings" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso total de payment_credentials" ON public.payment_credentials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso total de finances" ON public.finances FOR ALL USING (true) WITH CHECK (true);

-- HABILITAR REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.products, public.collections, public.product_collections, public.hero_slides, public.orders, public.finances;

-- ============================================================
-- STORAGE: BUCKET DE IMAGENS DE PRODUTOS E BANNERS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Permitir leitura publica em product-images" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload publico em product-images" ON storage.objects;
CREATE POLICY "Permitir leitura publica em product-images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Permitir upload publico em product-images" ON storage.objects FOR ALL USING (bucket_id = 'product-images') WITH CHECK (bucket_id = 'product-images');

-- ============================================================
-- DADOS INICIAIS (SEED)
-- ============================================================
INSERT INTO public.collections (id, name, image, display_order, is_featured_home) VALUES
  ('porta-monster', 'PORTA MONSTER', '/col_porta_monster.png', 1, TRUE),
  ('porta-chaveiro', 'PORTA CHAVEIRO', '/col_porta_chaveiro.png', 2, TRUE),
  ('miniaturas', 'MINIATURAS', '/col_miniaturas.png', 3, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.hero_slides (id, image, active, display_order) VALUES
  ('slide-1', '/banner1.png', TRUE, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, name, description, price, old_price, weight_grams, sizes, images, active) VALUES
  (
    'pernalonga-50cm',
    'ACTION FIGURE PERNALONGA 50CM 3D GANGSTER',
    'Estátua colecionável de alta presença com 50cm do Pernalonga modelo Gangster Peaky Blinders. Produzida em impressão 3D de altíssima resolução com detalhes minuciosos do terno, boina, arma e saco de dinheiro.',
    349.90,
    420.00,
    1200,
    '["50cm"]'::jsonb,
    '["/pernalonga_50cm.png"]'::jsonb,
    TRUE
  ),
  (
    'patolino-peaky-blinders',
    'MINIATURA PATOLINO GANGSTER PEAKY BLINDERS 3D',
    'Miniatura colecionável do Patolino Gangster Peaky Blinders com acabamento fino e pintura realista.',
    249.90,
    299.90,
    800,
    '["30cm"]'::jsonb,
    '["/col_miniaturas.png"]'::jsonb,
    TRUE
  ),
  (
    'porta-monster-moleton',
    'PORTA LATA MONSTER MOLETON 3D',
    'Porta lata com alça estilo moletom com capuz impresso em 3D de alta durabilidade. Encaixe perfeito para latas de 473ml com isolamento térmico.',
    119.90,
    149.90,
    350,
    '["Padrão 473ml"]'::jsonb,
    '["/porta_monster_moleton.png"]'::jsonb,
    TRUE
  ),
  (
    'porta-lata-monster-garra',
    'PORTA LATA MONSTER GARRA 3D NEON',
    'Copo porta lata formato Garra Monster Energy. Impresso em 3D com texturas esculpidas.',
    99.90,
    129.90,
    300,
    '["Padrão 473ml"]'::jsonb,
    '["/porta_lata_monster.png"]'::jsonb,
    TRUE
  ),
  (
    'porta-chave-porsche',
    'PORTA CHAVES PORSCHE GT3 RS 3D',
    'Porta chaves de parede formato traseira Porsche 911 GT3 RS com 5 ganchos reforçados.',
    199.90,
    249.90,
    450,
    '["Único"]'::jsonb,
    '["/porta_chave_porsche.png"]'::jsonb,
    TRUE
  ),
  (
    'porta-chave-golf-gti',
    'PORTA CHAVES GOLF GTI MK7 3D',
    'Porta chaves de parede modelo Golf GTI MK7 com textura em fibra de carbono.',
    149.90,
    189.90,
    400,
    '["Único"]'::jsonb,
    '["/porta_chave_golf.png"]'::jsonb,
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.product_collections (product_id, collection_id) VALUES
  ('pernalonga-50cm', 'miniaturas'),
  ('patolino-peaky-blinders', 'miniaturas'),
  ('porta-monster-moleton', 'porta-monster'),
  ('porta-lata-monster-garra', 'porta-monster'),
  ('porta-chave-porsche', 'porta-chaveiro'),
  ('porta-chave-golf-gti', 'porta-chaveiro')
ON CONFLICT DO NOTHING;
