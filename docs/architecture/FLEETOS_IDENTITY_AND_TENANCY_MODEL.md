# FLEETOS — Identity & Tenancy Model

## Objetivo

Definir claramente:

* quem pertence ao Auth Core
* quem pertence à FleetOS
* como funciona multi-tenant
* como funcionam colaboradores
* como funcionam clientes
* como funcionam permissões
* como funcionam convites
* quais são as fronteiras entre identidade global e dados operacionais

Este documento é fundacional para:

* Auth
* RBAC
* Billing
* Support
* Customer Portal
* Bookings
* Dispatch
* Invoices
* Future mobile apps

---

# 1. Princípio Arquitetural

## Auth Core = identidade global

O CodeVertex Auth Core é a fonte de verdade para:

* login
* password
* email
* MFA / 2FA
* recovery
* sessões
* perfil global
* consentimentos
* memberships globais

Qualquer pessoa que faça login deve existir no Auth Core.

FleetOS nunca gere:

* passwords locais
* reset password local
* MFA local
* sessões locais
* identidade global

---

## FleetOS = relação operacional

FleetOS é responsável por:

* tenants/empresas
* permissões operacionais
* memberships locais
* frota
* bookings
* dispatch
* maintenance
* clientes
* operações

FleetOS não é sistema de identidade.

---

# 2. Tipos de Utilizador

## 2.1 Internal Users

Exemplos:

* owner
* admin
* manager
* dispatcher
* driver
* mechanic
* viewer

Todos os utilizadores internos:

* existem no Auth Core
* pertencem a um ou mais tenants
* possuem roles locais por tenant

Modelo:

```txt
Auth Core
└── user/profile

FleetOS
└── tenant_members
```

---

## 2.2 Customers

Clientes que:

* reservam viagens
* pagam serviços
* recebem invoices
* consultam histórico
* usam portal cliente

Também devem existir no Auth Core.

Motivos:

* pagamentos
* histórico
* suporte autenticado
* anti-fraude
* rebookings
* customer portal futuro
* identidade consistente

Modelo:

```txt
Auth Core
└── user/profile

FleetOS
└── tenant_customers
```

Clientes não são tenant_members operacionais.

---

## 2.3 Leads / Pre-bookings

Opcionalmente, FleetOS pode suportar:

* quotation requests
* contact requests
* pre-bookings

Sem conta obrigatória.

Modelo:

```txt
fleetos_leads
```

Mas no momento do pagamento/reserva oficial:

* login obrigatório
  ou
* criação de conta obrigatória

---

# 3. Multi-Tenant Model

## 3.1 Tenants

Cada empresa é um tenant independente.

Tabela principal:

```txt
tenants
```

Exemplos:

* Transportes XPTO
* Lisboa Executive Travel
* Aero Shuttle Algarve

---

## 3.2 Tenant Memberships

Tabela:

```txt
tenant_members
```

Exemplo:

```txt
tenant_id
codevertex_user_id
role
status
permissions
```

Possíveis roles:

* owner
* admin
* manager
* dispatcher
* driver
* mechanic
* viewer

---

## 3.3 Customer Relationships

Tabela:

```txt
tenant_customers
```

Exemplo:

```txt
tenant_id
codevertex_user_id
customer_status
preferences
billing_reference
```

Um cliente pode existir em múltiplos tenants.

---

# 4. Invitation Model

FleetOS deve suportar convites.

Tabela:

```txt
tenant_invites
```

Campos sugeridos:

```txt
tenant_id
email
intended_role
invite_token
status
expires_at
created_by
```

Fluxo:

1. owner/admin convida utilizador
2. email enviado
3. Auth Core login/register
4. SSO callback
5. FleetOS resolve invite pendente
6. tenant_membership criada

---

# 5. Profile Requirements

FleetOS usa:

```txt
profile_mode = business
requires_profile = true
membership_mode = approval_required
```

Objetivo:

garantir que empresas reais e utilizadores identificáveis entram no sistema.

---

# 6. FleetOS vs Auth Responsibilities

## Auth Core

Responsável por:

* authentication
* sessions
* MFA
* password reset
* global profile
* global security

---

## FleetOS

Responsável por:

* tenant RBAC
* bookings
* operations
* vehicles
* drivers
* dispatch
* customer relationships
* invoices
* permissions locais

---

# 7. Future-Proofing

Este modelo foi desenhado para suportar futuramente:

* customer portal
* mobile apps
* white-label fleets
* API access
* subscription billing
* audit logs
* support impersonation
* cross-app identity
* enterprise SSO

---

# 8. Non-Goals

FleetOS não deve:

* implementar auth local
* implementar passwords locais
* duplicar sessões
* duplicar MFA
* gerir identidade fora do Auth Core
* criar modelos híbridos inconsistentes

---

# 9. Golden Rule

```txt
Identity belongs to Auth Core.
Operational relationships belong to FleetOS.
```
