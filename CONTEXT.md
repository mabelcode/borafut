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
| Autenticação | **Supabase Auth** — Magic Link entregue via **WhatsApp** (Meta Cloud API) |
| Pagamentos | **A definir** (geração de Pix dinâmico + Webhook) |
| Ícones | lucide-react |
| Fonte | Inter (Google Fonts) |

> **Nota sobre Auth:** Em vez de OTP por código, usamos **Magic Link** (Supabase Auth nativo) entregue como mensagem no WhatsApp via **Meta WhatsApp Cloud API**. O free tier da Meta cobre até **1.000 conversas/mês** — suficiente para o volume atual de ~60-70 usuários/mês. Setup único: aprovação de conta Meta Business (~1-2 dias). Sem custo recorrente dentro do limite.
>
> **Nota sobre Pagamentos:** O provedor de Pix dinâmico será definido no momento da implementação dessa funcionalidade.

---

## 3. Atores do Sistema

- **Gerente (Admin):** Cria a partida, define regras, aciona o sorteio dos times, marca a partida como concluída.
- **Jogador (User):** Recebe o link, paga para confirmar presença, visualiza seu time, avalia outros jogadores pós-jogo.

---

## 4. Funcionalidades do MVP

### A. Autenticação e Perfil
- Login **passwordless via Magic Link** enviado diretamente no **WhatsApp** do usuário (Meta Cloud API + Supabase Auth).
- Fluxo: usuário digita número de WhatsApp → recebe link no WhatsApp → clica → autenticado. Zero digitação de código.
- No primeiro acesso: cadastro de **Nome/Apelido** e **Posição Principal** (`GOALKEEPER` | `DEFENSE` | `ATTACK`).
- O **Score** (nível técnico) do jogador é a média de todas as avaliações recebidas de outros jogadores. É dinâmico e evolui com cada partida.

### B. Gestão de Partidas
- Gerente cria uma partida definindo: **Data/Hora**, **Limite de Vagas** e **Valor da Taxa**.

### C. Pay-to-Play (Core de Presença)
- Ao clicar em "Tô Dentro", o app gera um **código Pix dinâmico** via o provedor de pagamentos (a definir).
- A vaga fica com status **`RESERVED`** por um tempo limitado (ex: 10 min).
- A confirmação muda para **`CONFIRMED`** de forma **100% automática** via **Webhook** do provedor de pagamentos, sem interação manual.
- Jogadores além do limite de vagas entram em **`WAITLIST`**.
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
- **Confirmação automática:** O status `CONFIRMED` só pode ser escrito pelo backend (webhook), nunca pelo frontend diretamente.
- **Score inicial:** Novos jogadores começam com `globalScore = 3.0` (meio da escala 1–5).
- **Snake draft:** Dentro de cada grupo de posição, times recebem jogadores em ordem alternada (1, 2, 3 ... N, N, N-1 ... 1) para igualar o nível técnico.
- **Snapshot no sorteio:** O `snapshotScore` e `snapshotPosition` são gravados no momento do sorteio, preservando o histórico mesmo se o perfil do jogador mudar depois.
