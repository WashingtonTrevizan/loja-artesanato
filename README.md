# 🧵 Loja de Artesanato em Costura — Fase 0 (Fundação)

Loja virtual onde a artesã cadastra produtos sozinha pelo celular, com vitrine pública e carrinho.
**Fase 0 do PRD:** catálogo + vitrine + carrinho (fechamento via WhatsApp). Pagamento (Mercado Pago) e frete (Melhor Envio) entram na Fase 1.

## O que já funciona

- **Vitrine pública** mobile-first: categorias, busca, página do produto com fotos
- **Produtos** pronta-entrega (com estoque) ou sob encomenda (com prazo de produção)
- **Variações** de 1 nível (tamanho OU estampa), cada uma com estoque próprio
- **Carrinho** persistido no navegador, fechamento via WhatsApp (já dá pra vender!)
- **Painel da artesã**: login, lista de produtos, cadastro guiado com fotos pelo celular, peso/medidas pré-preenchidos por categoria, esconder/mostrar produto, confirmação dupla antes de apagar

## Passo a passo para colocar no ar (~30 min)

### 1. Configurar o Supabase (banco de dados + fotos + login)

1. Acesse [supabase.com](https://supabase.com) e crie um projeto (plano gratuito).
2. No menu lateral, abra **SQL Editor** → **New query**.
3. Copie TODO o conteúdo do arquivo `supabase/schema.sql` deste projeto, cole e clique **Run**. Isso cria as tabelas, as regras de segurança e o espaço para as fotos.
4. Crie o login da artesã: menu **Authentication** → **Users** → **Add user** → **Create new user**. Use o e-mail dela e uma senha fácil de lembrar. Marque **Auto Confirm User**.

### 2. Configurar o projeto

1. Copie `.env.local.example` para `.env.local`.
2. No Supabase, vá em **Project Settings → API** e copie:
   - `Project URL` → cole em `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → cole em `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Preencha `NEXT_PUBLIC_WHATSAPP_ARTESA` (só números, com 55 + DDD) e `NEXT_PUBLIC_NOME_LOJA`.

### 3. Rodar no seu computador

```bash
npm install
npm run dev
```

- Loja: http://localhost:3000
- Painel da artesã: http://localhost:3000/admin

### 4. Publicar na internet (Vercel)

1. Suba o projeto para o GitHub (repositório privado serve).
2. Em [vercel.com](https://vercel.com), **Add New → Project**, importe o repositório.
3. Em **Environment Variables**, adicione as MESMAS 4 variáveis do seu `.env.local`.
4. Deploy. Pronto — a loja está no ar no domínio gratuito da Vercel.
5. (Depois) Compre o domínio `.com.br` no [registro.br](https://registro.br) (~R$40/ano) e aponte na Vercel em **Settings → Domains**.

## Estrutura do projeto

```
supabase/schema.sql        ← banco de dados (rodar no Supabase)
src/app/page.tsx           ← vitrine (home, busca, categorias)
src/app/produto/[id]/      ← página do produto
src/app/carrinho/          ← carrinho + fechamento via WhatsApp
src/app/admin/             ← painel da artesã (protegido por login)
src/components/admin/      ← formulário guiado de produto
src/lib/cart.tsx           ← carrinho (localStorage)
src/middleware.ts          ← proteção das rotas /admin
```

## Critério de aceite da Fase 0 (do PRD)

> A artesã cadastra um produto com variação, do celular, sem ajuda, em < 5 min.

**Teste de usabilidade real com a artesã é critério de aceite.** Sente do lado dela, peça para cadastrar uma necessaire de verdade e só observe (não ajude!). Anote onde ela trava — isso vira o backlog de melhorias.

## Próximos passos (Fase 1 — MVP vendável)

1. Tabela de pedidos (`orders` + `order_items`) com reserva de estoque e expiração de 30 min
2. Checkout com endereço + cotação de frete via API do Melhor Envio
3. Mercado Pago Checkout Pro (redirect) + webhook idempotente de confirmação
4. Status do pedido no painel (Pago → Em produção → Postado → Entregue)
5. Notificações: WhatsApp para a artesã, e-mail para a compradora
