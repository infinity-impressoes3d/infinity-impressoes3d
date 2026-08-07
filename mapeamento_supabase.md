# 📋 Mapeamento Completo de Integração Supabase — Infinity Impressões 3D

> **Nota:** Este documento serve como raio-X de tudo o que utiliza o Supabase no projeto atual. Ele servirá de guia completo para recriar as tabelas, variáveis, Edge Functions e subscrições Realtime no **novo projeto Supabase** quando for feita a migração.
> **Importante:** O código da aplicação atual **permanece intocado e 100% funcional com o Supabase atual** até que você solicite a troca para o novo Supabase.

---

## 1. 🔑 Credenciais e Variáveis de Ambiente

### Arquivo `.env`
Contém a URL base e a chave anônima (`anon key`) pública do projeto Supabase atual:

```env
VITE_SUPABASE_URL=https://zrpwxghfwtdanclfqhzt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpycHd4Z2hmd3RkYW5jbGZxaHp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4ODE1OTYsImV4cCI6MjEwMTQ1NzU5Nn0.R195k6Nzri2_qw7KhPBAh2swtltm-stzM2f1jYdcEuA
```

### Cliente Supabase ([src/lib/supabaseClient.js](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/src/lib/supabaseClient.js))
Inicializa o SDK do Supabase com fallback das chaves padrão:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zrpwxghfwtdanclfqhzt.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## 2. 📦 Dependência do Projeto

### `package.json`
- **Pacote:** `@supabase/supabase-js` (versão `^2.112.1`)

---

## 3. 🗄️ Esquema do Banco de Dados (Tabelas e Estrutura)

Abaixo estão todas as tabelas acessadas pelo código, com seus respectivos campos e usos:

### 3.1. Tabela `products` (Produtos)
Usada no catálogo da loja ([src/App.jsx](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/src/App.jsx)).
- **Campos utilizados:**
  - `id` (UUID / String / Int - Chave primária)
  - `name` (String - Nome do produto)
  - `description` (Text - Descrição detalhada)
  - `price` (Numeric - Preço atual)
  - `old_price` (Numeric, opcional - Preço antigo/riscado)
  - `weight_grams` (Numeric - Peso em gramas para cálculo de frete)
  - `sizes` (Array / JSON - Lista de tamanhos ex: `["P", "M", "G"]`)
  - `images` (Array / JSON - Lista de URLs de fotos)
  - `collection_id` (UUID / Foreign Key, opcional)
  - `active` (Boolean - Filtro `active = true`)
  - `created_at` (Timestamp - Ordenação `order('created_at', { ascending: false })`)

---

### 3.2. Tabela `collections` (Coleções / Categorias)
Usada no menu e filtros de categorias ([src/App.jsx](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/src/App.jsx)).
- **Campos utilizados:**
  - `id` (UUID / String / Int)
  - `name` (String - Nome da coleção ex: "Colecionáveis")
  - `image` (String, opcional - URL da imagem de capa)
  - `display_order` (Numeric - Ordenação `order('display_order', { ascending: true })`)
  - `is_featured_home` (Boolean - Se exibe na página inicial)

---

### 3.3. Tabela `product_collections` (Relação N:N Produtos e Coleções)
Usada para associar produtos a múltiplas coleções ([src/App.jsx](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/src/App.jsx)).
- **Campos utilizados:**
  - `product_id` (Foreign Key -> `products.id`)
  - `collection_id` (Foreign Key -> `collections.id`)

---

### 3.4. Tabela `hero_slides` (Banners Rotativos da Home)
Usada no carrossel superior da página inicial ([src/components/HeroSlider.jsx](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/src/components/HeroSlider.jsx)).
- **Campos utilizados:**
  - `id` (UUID / String / Int)
  - `image` (String - URL da imagem do banner)
  - `active` (Boolean - Filtro `active = true`)
  - `display_order` (Numeric - Ordenação `order('display_order', { ascending: true })`)

---

### 3.5. Tabela `orders` (Pedidos & Checkouts Abandonados)
Usada para registrar e atualizar pedidos no checkout ([src/components/CheckoutPage.jsx](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/src/components/CheckoutPage.jsx)).
- **Operação:** `upsert` com `onConflict: 'id'`
- **Campos utilizados:**
  - `id` (String / UUID - Identificador único do pedido/checkout)
  - `customer_name` (String - Nome completo do comprador)
  - `customer_email` (String - E-mail)
  - `customer_phone` (String - Telefone/WhatsApp)
  - `customer_cpf` (String - CPF)
  - `shipping_address` (JSONB - `{ cep, street, number, complement, neighborhood, city, state }`)
  - `shipping_method` (String - ex: "Correios SEDEX" ou "PAC")
  - `shipping_cost` (Numeric - Valor do frete)
  - `items` (JSONB - Array de itens: `[{ name, price, quantity, size, image }]`)
  - `total_amount` (Numeric - Valor total do pedido)
  - `payment_method` (String - ex: "pix", "credit_card", "mercadopago")
  - `status` (String - `'paid'` quando concluído, `'abandoned'` durante o preenchimento)
  - `comments` (Text - Observações do pedido)
  - `created_at` (Timestamp ISO)
  - `updated_at` (Timestamp ISO)

---

### 3.6. Tabela `store_settings` (Configurações da Loja)
Usada para obter configurações como a chave pública do Stripe ([src/components/CheckoutPage.jsx](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/src/components/CheckoutPage.jsx)).
- **Campos utilizados:**
  - `stripe_publishable_key` (Text - Chave pública do Stripe)

---

## 4. ⚡ Edge Functions (Endpoints Serverless)

### `create-mercadopago-preference`
- **Chamada:** `POST ${VITE_SUPABASE_URL}/functions/v1/create-mercadopago-preference`
- **Local:** [src/components/CheckoutPage.jsx](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/src/components/CheckoutPage.jsx#L609-L625)
- **Função:** Gera a preferência de pagamento no Mercado Pago no backend serverless do Supabase e retorna a URL de checkout (`initPoint`).
- **Payload enviado:**
  ```json
  {
    "items": [{ "name": "...", "price": 100, "quantity": 1, "size": "..." }],
    "payer": { "name": "...", "email": "...", "phone": "...", "cpf": "..." },
    "successUrl": "https://.../#/sucesso",
    "cancelUrl": "https://.../#/checkout"
  }
  ```

---

## 5. 📡 Subscrições Supabase Realtime (Atualização em Tempo Real)

O projeto usa o recurso Realtime do Supabase para atualizar a interface instantaneamente sem precisar dar F5 quando dados mudam no banco:

1. **Catálogo de Produtos e Coleções** ([src/App.jsx](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/src/App.jsx#L110-L117)):
   - Canal: `storefront-catalog-realtime`
   - Escuta alterações (`postgres_changes`) nas tabelas `collections`, `products` e `product_collections`.
2. **Banners da Home** ([src/components/HeroSlider.jsx](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/src/components/HeroSlider.jsx#L12-L15)):
   - Canal: `storefront-hero-slides`
   - Escuta alterações (`postgres_changes`) na tabela `hero_slides`.

---

## 6. 📄 Detalhamento dos Arquivos que Consomem o Supabase

| Arquivo | Função / Uso |
|---|---|
| [src/lib/supabaseClient.js](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/src/lib/supabaseClient.js) | Configura e exporta a instância global do cliente Supabase. |
| [src/App.jsx](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/src/App.jsx) | Busca produtos, coleções e relacionamentos de produtos-coleções; gerencia subscrição Realtime do catálogo. |
| [src/components/HeroSlider.jsx](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/src/components/HeroSlider.jsx) | Busca slides ativos da home e gerencia subscrição Realtime dos banners. |
| [src/components/CheckoutPage.jsx](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/src/components/CheckoutPage.jsx) | Carrega chave do Stripe (`store_settings`), salva/atualiza pedidos (`orders`), chama Edge Function do Mercado Pago (`create-mercadopago-preference`). |
| [.env](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/.env) | Guarda a URL e Anon Key do Supabase atual. |
| [painel_admin_guia.md](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/painel_admin_guia.md) | Documentação e guia de integração do painel admin com Supabase. |

---

## 🚀 Checklist para quando formos conectar o Novo Supabase

Quando você trouxer as credenciais do novo Supabase:

- [ ] **1.** Atualizar as variáveis no arquivo `.env` com a nova `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- [ ] **2.** Executar as queries de criação de tabelas (`products`, `collections`, `product_collections`, `hero_slides`, `orders`, `store_settings`) no novo SQL Editor.
- [ ] **3.** Habilitar a publicação Realtime para as tabelas no novo dashboard.
- [ ] **4.** Fazer deploy ou recriar a Edge Function `create-mercadopago-preference` no novo projeto.
- [ ] **5.** Inserir registros de teste nas tabelas do novo Supabase.
