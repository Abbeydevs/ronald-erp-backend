# Ronald Partners Consult ERP - Backend Core

An enterprise-grade, highly secure Management and Admissions ERP backend designed for **Ronald Partners Consult**. This system operates on a unified relational data model supporting two distinct business pipelines: a **B2C Student Recruitment Framework** and a **B2B Partner Relationship Management (PRM) Network**.

Built entirely using a modular, decoupled architecture following strict industry best practices.

---

## 🚀 Strategic Engineering Principles

To ensure zero technical debt, absolute maintainability, and enterprise reliability, this repository strictly adheres to the following development mandates:

1. **Absolute Type Safety:** `any` types are completely banned across the entire codebase. The TypeScript compiler runs in maximum strict mode (`strict: true`, `noImplicitAny: true`).
2. **Modular Domain Separation:** Every business feature must live inside its own isolated NestJS module domain. Cross-module communication is strictly limited to exported public services.
3. **CLI-Driven Operations:** All modules, services, controllers, and resources must be generated natively using the NestJS CLI to ensure consistent architecture and zero configuration layout drifting.
4. **Zero Structural Debt:** Features must be built sequentially to full completion (Database schema -> Service logic -> Controller API -> End-to-end UAT validation) before initiating the next phase.

---

## 🛠️ Technology Stack

- **Framework:** NestJS (Progressive Node.js framework)
- **Language:** TypeScript (Strictly typed)
- **ORM:** Prisma 6 (Type-safe database abstraction)
- **Database Engine:** PostgreSQL (Hosted via serverless NeonDB infrastructure)
- **Deployment/Hosting:** Render Container Clouds

---

## 📂 System Architecture Overview

The backend uses a modular decoupled domain architecture. The structural flow separates core concerns as follows:

```text
src/
├── app.module.ts            # Core application entry combining root configuration layers
├── main.ts                  # NestJS application bootstrap entry point
│
├── prisma/                  # Global Global Database Module
│   ├── prisma.module.ts     # Global export wrapper for PrismaClient instances
│   └── prisma.service.ts    # Connection lifecycle management (NeonDB pooling configuration)
│
├── auth/                    # Core Authentication Domain
│   ├── strategies/          # Secure Passport.js strategies
│   ├── guards/              # Custom RBAC & security enforcement interceptors
│   └── tables/              # Secure hardware device fingerprint tracking tables
│
├── hr/                      # Internal Staff Accountability Domain
│   ├── attendance/          # Geofenced coordinate matching engine
│   ├── logs/                # Session inactivity monitor hooks
│   └── reports/             # Shift-end mandatory documentation streams
│
├── leads/                   # B2C Intake & Routing Domain
│   ├── webhooks/            # Omnichannel third-party data ingesters
│   └── assignment/          # Deterministic regional/budget routing engines
│
├── communication/           # Live Communication Integration Matrix
│   ├── streams/             # WebRTC handshake gateways & auto-recording processors
│   └── timelines/           # Central chronological customer event aggregator logs
│
├── pipeline/                # Admissions Lifecycle Tracking Domain
│   ├── admission/           # Multi-state student lifecycle Kanban handlers
│   └── vault/               # Malware-screened file storage & compliance validation
│
├── prm/                     # B2B Partner Relationship Management Domain
│   ├── organizations/       # B2B school networks, agencies, and contact graphs
│   └── accounts/            # Isolated partner portals & automated referral pipelines
│
└── finance/                 # Enterprise Fiscal Control Domain
    └── ledgers/             # Multi-currency automated partner commission computation metrics
```
