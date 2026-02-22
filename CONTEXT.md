# Borafut — Contexto Global do Projeto

> **Para o assistente de IA:** Este arquivo é a fonte de verdade da arquitetura e regras de negócio do Borafut. Leia-o no início de cada sessão antes de implementar qualquer funcionalidade.

---

## 1. Visão Geral do Produto

**Borafut** é um Web App Mobile-First para gestão de partidas amadoras de futebol society. Resolve três dores principais:
1. **Lista de presença** gerenciada via pagamento automático ("Pay-to-Play").
2. **Balanceamento técnico** dos times via avaliação peer-to-peer (360°).
3. **Interface com zero fricção** — fluxo rápido, mobile-first.

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | Vite + React + TypeScript (strict) |
| Estilização | Tailwind CSS (v4, CSS-first via `@theme`) |
| Estado / Cache | TanStack React Query |
| Banco de Dados | **Supabase** (PostgreSQL + Auth + Realtime + Edge Functions) |
| Autenticação | **Supabase Auth** — Google OAuth (Social Login) |
| Pagamentos | **Pix Manual** — QR Code gerado no frontend via `qrcode-pix` + `react-qr-code` |
| Ícones | lucide-react |
| Fonte | Inter (Google Fonts) |

> **Nota sobre Auth:** Usamos **Google OAuth via Supabase Auth**. Setup rápido (~30 min): criação de credenciais no Google Cloud Console + configuração no painel do Supabase. O e-mail retornado pelo Google é a identidade principal do usuário. O número de telefone (para Pix e notificações) é coletado na tela de onboarding do primeiro acesso.
>
> **Nota sobre Pagamentos (MVP):** Confirmação **manual pelo admin**, sem CNPJ. O admin cadastra sua chave Pix pessoal no perfil. Ao reservar, o app gera um QR Code Pix estático (payload EMV/BR Code) com o valor exato da partida e o nome do jogador como descrição. O admin vê os RESERVED na tela de detalhe da partida e confirma manualmente. A taxa da plataforma é de **5%** sobre o valor da partida (informativa por ora — sem split implementado). Confirmação automática via webhook (OpenPix/Woovi) fica para fase futura quando houver CNPJ/MEI.

---

## 3. Atores do Sistema

- **Gerente (Admin):** Cria a partida, define regras, aciona o sorteio dos times, marca a partida como concluída.
- **Jogador (User):** Recebe o link, paga para confirmar presença, visualiza seu time, avalia outros jogadores pós-jogo.

---

## 4. Funcionalidades do MVP

### A. Autenticação e Perfil
- Login via **Google OAuth** (Supabase Auth Social Login).
- Fluxo: usuário clica em "Entrar com Google" → popup/redirect Google → autenticado. Zero formulário.
- No primeiro acesso (quando `displayName` está vazio): tela de onboarding para cadastro de **Nome/Apelido**, **Posição Principal** (`GOALKEEPER` | `DEFENSE` | `ATTACK`) e **Número de WhatsApp** (necessário para notificações e Pix).
- O **Score** (nível técnico) do jogador é a média de todas as avaliações recebidas de outros jogadores. É dinâmico e evolui com cada partida.

### B. Gestão de Partidas
- Gerente cria uma partida definindo: **Data/Hora**, **Limite de Vagas** e **Valor da Taxa**.

### C. Pay-to-Play (Core de Presença) — MVP Manual
- Ao clicar em "Tô Dentro", a vaga fica com status **`RESERVED`**.
- O app gera um **QR Code Pix estático** no frontend a partir da chave Pix pessoal do admin (campo `pixKey` no perfil), com o valor da partida e o nome do jogador como descrição (para facilitar a identificação pelo admin).
- A confirmação é **manual pelo Gerente**: ele verifica o extrato bancário e clica em "Confirmar" para cada jogador na tela de detalhes da partida.
- O status muda para **`CONFIRMED`** via update direto do frontend (feito pelo admin) — MVP trade-off consciente.
- Jogadores além do limite de vagas entram em **`WAITLIST`**.
- **Fase futura:** confirmação automática via webhook (OpenPix/Woovi, requer MEI/CNPJ). Taxa de plataforma de **5%** com split de pagamento.
- **Notificação ao admin via WhatsApp:** quando um jogador reserva, o sistema poderá notificar o admin via WhatsApp (deferred — fase futura).
- **Política rígida: não há reembolso ou devolução pelo app.** Pagou, confirmou.

### D. Algoritmo de Sorteio (Core Engine)
Acionado pelo Gerente; roda no **frontend** e persiste o resultado:
1. Considera apenas jogadores `CONFIRMED`.
2. O Gerente define dinamicamente o **número de times**.
3. Agrupa jogadores por posição (garantindo, ex: 1 goleiro por time).
4. Dentro de cada grupo de posição, ordena por `globalScore` e aplica **snake draft** para distribuição equilibrada.
5. Salva o `teamNumber` na `match_registration` de cada jogador.

### E. Avaliação 360° (Pós-Jogo)
- Após a partida ser marcada como **concluída**, cada jogador avalia os outros (nota de 1 a 5).
- A média das notas recebidas atualiza o `globalScore` do perfil avaliado.
- Este score retroalimenta os sorteios futuros.

---

## 5. Modelo de Dados (PostgreSQL — Neon)

```sql
-- Usuários
users (
  id            uuid PRIMARY KEY,
  phoneNumber   text UNIQUE NOT NULL,
  displayName   text,
  mainPosition  text CHECK (mainPosition IN ('GOALKEEPER','DEFENSE','ATTACK')),
  globalScore   numeric DEFAULT 3.0,  -- Média das avaliações recebidas
  isAdmin       boolean DEFAULT false,
  pixKey        text,                 -- Chave Pix pessoal do admin (CPF, telefone, email ou chave aleatória)
  createdAt     timestamptz DEFAULT now()
)

-- Partidas
matches (
  id           uuid PRIMARY KEY,
  managerId    uuid REFERENCES users(id),
  title        text,
  scheduledAt  timestamptz,
  maxPlayers   int,
  price        numeric,  -- Valor da taxa em BRL
  status       text CHECK (status IN ('OPEN','CLOSED','FINISHED')),
  createdAt    timestamptz DEFAULT now()
)

-- Inscrições
match_registrations (
  id               uuid PRIMARY KEY,
  matchId          uuid REFERENCES matches(id),
  userId           uuid REFERENCES users(id),
  snapshotPosition text,     -- Posição no momento da inscrição
  snapshotScore    numeric,  -- Score no momento do sorteio
  status           text CHECK (status IN ('RESERVED','CONFIRMED','WAITLIST')),
  paymentId        text,     -- ID da transação no provedor de pagamentos
  teamNumber       int,      -- Preenchido após o sorteio
  reservedUntil    timestamptz,  -- Expiração da reserva (pay-to-play)
  createdAt        timestamptz DEFAULT now(),
  UNIQUE (matchId, userId)
)

-- Avaliações
evaluations (
  id          uuid PRIMARY KEY,
  matchId     uuid REFERENCES matches(id),
  evaluatorId uuid REFERENCES users(id),
  evaluatedId uuid REFERENCES users(id),
  scoreGiven  int CHECK (scoreGiven BETWEEN 1 AND 5),
  createdAt   timestamptz DEFAULT now(),
  UNIQUE (matchId, evaluatorId, evaluatedId)  -- Um voto por par por partida
)
```

---

## 6. Regras de Negócio Críticas

- **Sem reembolso:** Nunca implementar funcionalidade de estorno no app.
- **Confirmação manual (MVP):** O status `CONFIRMED` é atualizado pelo admin via frontend. Regra a ser revertida quando a confirmação automática via webhook for implementada.
- **Score inicial:** Novos jogadores começam com `globalScore = 3.0` (meio da escala 1–5).
- **Snake draft:** Dentro de cada grupo de posição, times recebem jogadores em ordem alternada (1, 2, 3 ... N, N, N-1 ... 1) para igualar o nível técnico.
- **Snapshot no sorteio:** O `snapshotScore` e `snapshotPosition` são gravados no momento do sorteio, preservando o histórico mesmo se o perfil do jogador mudar depois.
- **Chave Pix do admin:** O campo `pixKey` na tabela `users` armazena a chave Pix pessoal do admin. O QR Code é gerado no frontend usando `qrcode-pix` (payload EMV) + `react-qr-code` (render SVG). Nenhum provedor externo ou CNPJ necessário.
- **Taxa de plataforma:** 5% do valor da partida. Informativa no MVP. Split (repasse) a implementar via OpenPix/Woovi quando houver MEI/CNPJ.
