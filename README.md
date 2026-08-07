# 🚀 Infinity Impressões 3D

E-commerce moderno e completo para produtos de impressão 3D, desenvolvido com React, Vite, Supabase e integração de pagamento via Mercado Pago.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: [React 18](https://react.dev/), [Vite](https://vitejs.dev/)
- **Estilização**: CSS Vanilla / Módulos responsivos com Glassmorphism e Design System moderno
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Backend & Banco de Dados**: [Supabase](https://supabase.com/) (Autenticação, PostgreSQL e Storage)
- **Pagamentos**: Integração com Mercado Pago (PIX com QR Code dinâmico e Cartão de Crédito)
- **Deploy**: Otimizado para [Vercel](https://vercel.com/)

---

## 📂 Estrutura do Projeto

```text
├── public/                 # Imagens estáticas, banners e ativos do site
├── src/
│   ├── components/         # Componentes React da aplicação (Header, Cart, Checkout, Admin, etc.)
│   ├── data/               # Dados mockados e constantes de fallback
│   ├── lib/                # Clientes de API, utilitários, formatadores e cálculo de frete
│   ├── App.jsx             # Componente raiz da aplicação
│   ├── main.jsx            # Ponto de entrada React
│   └── index.css           # Estilos globais e tokens de design
├── .env.example            # Modelo de variáveis de ambiente
├── setup_novo_supabase.sql # Script SQL para criação de tabelas e políticas RLS no Supabase
├── vercel.json             # Configuração de rotas SPA para Vercel
├── package.json            # Dependências e scripts do projeto
└── README.md               # Documentação principal
```

---

## ⚙️ Como Executar o Projeto Localmente

### 1. Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) (versão 18 ou superior) instalado em sua máquina.

### 2. Instalação das Dependências
No terminal, na raiz do projeto, execute:
```bash
npm install
```

### 3. Configuração de Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:
```env
VITE_SUPABASE_URL=https://sua-url-do-supabase.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-do-supabase
```

### 4. Executar em Modo de Desenvolvimento
```bash
npm run dev
```
O projeto estará disponível em `http://localhost:5173`.

---

## 🏗️ Build e Produção

Para gerar os arquivos otimizados para produção:
```bash
npm run build
```

Para visualizar a versão de produção localmente:
```bash
npm run preview
```

---

## 📝 Documentação Adicional

- [Guia do Painel Administrativo](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/painel_admin_guia.md)
- [Mapeamento do Supabase](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/mapeamento_supabase.md)
- [Integração Mercado Pago](file:///c:/Users/Valter/Desktop/Infinity%20impressoes%203d/INTEGRACAO_MERCADOPAGO.md)
