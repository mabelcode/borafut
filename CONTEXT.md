# Borafut — Contexto Global do Projeto

> **Para o assistente de IA:** Este arquivo é a fonte de verdade da arquitetura e regras de negócio do Borafut. Leia-o no início de cada sessão antes de implementar qualquer funcionalidade.

---

## 1. Visão Geral do Produto

**Borafut** é um Web App Mobile-First para gestão de partidas amadoras de futebol society. Resolve três dores principais:
1. **Lista de presença** gerenciada via pagamento ("Pay-to-Play").
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

> **Nota sobre Pagamentos (MVP):** Confirmação **manual pelo Group Admin**, sem CNPJ. Admin cadastra chave Pix pessoal. App gera QR Code Pix (payload EMV/BR Code) com valor e nome do jogador. Admin confirma manualmente. Taxa de plataforma de **5%** informativa (sem split por ora). Confirmação automática via webhook (OpenPix/Woovi) fica para fase futura.

---

## 3. Hierarquia de Papéis

A hierarquia é **inclusiva**: cada nível herda as capacidades do nível anterior.

```
Super Admin  ⊃  Admin  ⊃  Player

Player      → joga, paga, se inscreve em partidas do seus grupos
Admin       → tudo do Player + cria partidas, confirma pagamentos, gera link de convite
              pode ser Admin em N grupos e Player em outros
Super Admin → tudo do Admin em TODOS os grupos sem exceção
```

### Implementação dos papéis

```
users.isSuperAdmin boolean DEFAULT false
  └── plataforma (definido MANUALMENTE no banco, nunca via app)
  └── bypassa toda RLS de grupo — vê e gerencia absolutamente tudo

group_members.role = 'ADMIN' | 'PLAYER'
  └── escopo do grupo — um usuário pode ser ADMIN em 10 grupos e PLAYER em outros 20
  └── ADMIN também definido MANUALMENTE no banco, nunca via app
  └── PLAYER é o padrão ao entrar por link de convite
```

> **Regra crítica:** Nenhum usuário pode se tornar Admin ou Super Admin pelo app. Toda elevação de privilégio é feita manualmente via SQL/Supabase Dashboard.

---

## 4. Conceito de Bolha (Grupo)

- Cada **bolha** é um grupo isolado com seus próprios membros e partidas.
- Usuários entram via **link de convite** gerado pelo Group Admin:
  - URL: `borafut.app/join/<inviteToken>` — token opaco de 32 chars hex
  - O link é **multi-uso** (várias pessoas podem usar o mesmo link simultaneamente)
  - Admin pode definir uma **duração** para o link (24h, 7 dias, 30 dias, sem expiração)
  - Admin pode **invalidar** regenerando o token
  - Na entrada: verifica `inviteExpiresAt IS NULL OR inviteExpiresAt > now()`
- Partidas pertencem a uma bolha (`matches.groupId`).
- Toda visibilidade é filtrada por bolha via RLS.
- Pós-onboarding sem grupo → tela "Aguardando convite".

---

## 5. Funcionalidades

### A. Autenticação e Perfil
- Login via **Google OAuth**.
- No primeiro acesso: onboarding para **Nome/Apelido**, **Posição** e **WhatsApp**.
- Pós-onboarding: se veio de `/join/<token>` → entra como PLAYER. Caso contrário → tela "Aguardando convite".

### B. Gestão de Partidas
- Group Admin cria partida no seu grupo: **Data/Hora**, **Limite de Vagas**, **Valor da Taxa**.

### C. Pay-to-Play — MVP Manual
- "Tô Dentro" → `RESERVED` + QR Code Pix do admin do grupo.
- Group Admin confirma → `CONFIRMED`.
- Acima do limite → `WAITLIST`.
- **Admin também é jogador** — se inscreve e paga normalmente.
- **Fase futura:** webhook automático com split de 5%.

### D. Algoritmo de Sorteio
- Apenas `CONFIRMED`. Snake draft por posição + score. Persiste `teamNumber`.

### E. Avaliação 360°
- Pós-partida. Nota 1–5. Atualiza `globalScore`.

---

## 6. Modelo de Dados

```sql
-- Usuários
users (
  id             uuid PRIMARY KEY,
  phoneNumber    text UNIQUE,
  displayName    text,
  mainPosition   text CHECK (IN 'GOALKEEPER','DEFENSE','ATTACK'),
  globalScore    numeric DEFAULT 3.0,
  isSuperAdmin   boolean DEFAULT false,   -- definido manualmente
  pixKey         text,                    -- chave Pix pessoal
  createdAt      timestamptz DEFAULT now()
)

-- Bolhas (grupos)
groups (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  inviteToken      text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  inviteExpiresAt  timestamptz,           -- NULL = sem expiração
  createdAt        timestamptz DEFAULT now()
)

-- Membros da bolha (many-to-many)
group_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  groupId   uuid REFERENCES groups(id) ON DELETE CASCADE,
  userId    uuid REFERENCES users(id) ON DELETE CASCADE,
  role      text CHECK (role IN ('ADMIN','PLAYER')) DEFAULT 'PLAYER',
  joinedAt  timestamptz DEFAULT now(),
  UNIQUE (groupId, userId)
)

-- Partidas (pertencem a uma bolha)
matches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  groupId      uuid REFERENCES groups(id),
  managerId    uuid REFERENCES users(id),
  title        text,
  scheduledAt  timestamptz,
  maxPlayers   int,
  price        numeric,
  status       text CHECK (IN 'OPEN','CLOSED','FINISHED') DEFAULT 'OPEN',
  createdAt    timestamptz DEFAULT now()
)

-- Inscrições
match_registrations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matchId           uuid REFERENCES matches(id) ON DELETE CASCADE,
  userId            uuid REFERENCES users(id),
  snapshotPosition  text,
  snapshotScore     numeric,
  status            text CHECK (IN 'RESERVED','CONFIRMED','WAITLIST') DEFAULT 'RESERVED',
  paymentId         text,
  teamNumber        int,
  reservedUntil     timestamptz,
  createdAt         timestamptz DEFAULT now(),
  UNIQUE (matchId, userId)
)

-- Avaliações
evaluations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matchId      uuid REFERENCES matches(id) ON DELETE CASCADE,
  evaluatorId  uuid REFERENCES users(id),
  evaluatedId  uuid REFERENCES users(id),
  scoreGiven   int CHECK (scoreGiven BETWEEN 1 AND 5),
  createdAt    timestamptz DEFAULT now(),
  UNIQUE (matchId, evaluatorId, evaluatedId)
)
```

---

## 7. RLS

| Tabela | Operação | Condição |
|---|---|---|
| `users` | SELECT | qualquer autenticado |
| `users` | UPDATE | próprio `id` |
| `groups` | SELECT | membro do grupo OR `isSuperAdmin` |
| `group_members` | SELECT | membro do grupo OR `isSuperAdmin` |
| `group_members` | INSERT | usuário insere a si mesmo (ao entrar via link) |
| `matches` | SELECT | membro do `groupId` OR `isSuperAdmin` |
| `matches` | INSERT | `group_members.role = 'ADMIN'` no `groupId` OR `isSuperAdmin` |
| `match_registrations` | SELECT | membro do grupo do match OR `isSuperAdmin` |
| `match_registrations` | INSERT | membro do grupo (qualquer role) |
| `match_registrations` | UPDATE | próprio `userId` OR admin do grupo OR `isSuperAdmin` |

---

## 8. Regras de Negócio Críticas

- **Sem reembolso:** Nunca implementar estorno no app.
- **Confirmação manual (MVP):** `CONFIRMED` atualizado pelo Group Admin via frontend.
- **Elevação de admin:** Apenas via SQL manual — nunca via interface do app.
- **Score inicial:** `globalScore = 3.0`.
- **Snake draft:** Distribuição alternada por posição + score.
- **Pix:** `pixKey` em `users`. QR Code via `qrcode-pix` + `react-qr-code`, 100% frontend.
- **Taxa de plataforma:** 5% (informativa no MVP). Split futuro via OpenPix/Woovi.
- **Bolha:** Toda visibilidade escopada ao `groupId`. Sem grupo → tela "Aguardando convite".
- **Link de convite:** multi-uso, com duração opcional (`inviteExpiresAt`).
