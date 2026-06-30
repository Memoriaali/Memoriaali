# Architecture Documentation

> **System design and architectural decisions for Memoriaali v2**

## 🎯 Architecture Overview

The Memoriaali v2 project is a scalable monorepo architecture. This section documents the architectural decisions and system design.

## 🏗️ High-Level System Architecture

### System Architecture

```mermaid
graph TB
    subgraph "Memoriaali V2"
        M1["Next.js Frontend<br/>React 19 + TypeScript"]
        M2["TypeScript Backend<br/>Four-layer architecture"]
        M3["Prisma + MySQL<br/>Modern schema"]
        M4["SIP Microservice<br/>Java Spring Boot"]
        M5["Shared Packages<br/>Type-safe libraries"]
        M6["Authentication<br/>JWT + RBAC"]
        M7["API Documentation<br/>OpenAPI + Swagger"]
    end
    M1 <--> M2
    M2 <--> M3
    M2 <--> M4
    M2 <--> M5
    M2 <--> M6
    M2 <--> M7
```

```mermaid
graph TB
    subgraph "🎨 Frontend Layer"
        F1["React Application<br/>apps/frontend/"]
        F2["API Client<br/>Generated from schemas"]
        F3["State Management<br/>Redux"]
    end

    subgraph "🚀 Application Layer"
        A1["TypeScript Backend<br/>apps/backend/"]
        A2["SIP Generation Service<br/>apps/sip-service/"]
    end

    subgraph "📦 Shared Layer"
        S1["Database Package<br/>packages/database/"]
        S2["API Types Package<br/>packages/api-types/"]
        S3["Shared Utilities<br/>packages/shared/"]
        S4["File Processing<br/>packages/file-processing/"]
    end

    subgraph "💾 Data Layer"
        D1["MySQL Database<br/>Prisma ORM"]
        D2["File Storage<br/>Organized structure"]
        D3["SIP Packages<br/>E-ARK compliant"]
    end

    F1 --> F2
    F2 --> A1
    F1 --> F3

    A1 --> S1
    A1 --> S2
    A1 --> S3
    A1 --> S4
    A2 --> S1
    A2 --> S4

    S1 --> D1
    S4 --> D2
    A2 --> D3

    style F1 fill:#f3e5f5, color: #000
    style A1 fill:#e1f5fe, color: #000
    style A2 fill:#e8f5e8, color: #000
    style S1 fill:#fff3e0, color: #000
    style S2 fill:#fce4ec, color: #000
```

## 🔧 Key Architectural Principles

### 1. Type Safety End-to-End

```mermaid
flowchart LR
    A["📊 Prisma Schema<br/>Single source of truth"] --> B["🔧 Zod Generation<br/>Runtime validation"]
    B --> C["📝 TypeScript Types<br/>Compile-time safety"]
    C --> D["🌐 Frontend Types<br/>UI type safety"]
    C --> E["🚀 Backend Types<br/>API type safety"]

    style A fill:#e8f5e8, color: #000
    style B fill:#e1f5fe, color: #000
    style C fill:#fff3e0, color: #000
    style D fill:#f3e5f5, color: #000
    style E fill:#fce4ec, color: #000
```

**Benefits**:

- Catch errors at compile time
- Automatic API documentation
- Refactoring safety
- Shared contracts between frontend and backend

### 2. Modular Package Architecture

```mermaid
graph TB
    subgraph "📦 Package Dependencies"
        P1["database"] --> P2["api-types"]
        P3["shared"] --> P4["apps/backend"]
        P2 --> P4
        P1 --> P4
        P5["file-processing"] --> P4

        P2 --> P6["apps/frontend"]
        P3 --> P6
    end

    subgraph "✅ Benefits"
        B1["Clear Dependencies"]
        B2["Reusable Components"]
        B3["Isolated Testing"]
        B4["Incremental Development"]
    end

    style P1 fill:#e8f5e8, color: #000
    style P2 fill:#e1f5fe, color: #000
    style P3 fill:#fff3e0, color: #000
    style P4 fill:#f3e5f5, color: #000
    style P5 fill:#fce4ec, color: #000
    style P6 fill:#f1f8e9, color: #000
```

### 3. Service Separation

```mermaid
graph LR
    subgraph "🎯 Service Responsibilities"
        S1["Backend Service<br/>• User management<br/>• API endpoints<br/>• Business logic<br/>• File uploads"]
        S2["SIP Service<br/>• Archive generation<br/>• E-ARK compliance<br/>• Java libraries<br/>• Batch processing"]
        S3["Frontend Service<br/>• User interface<br/>• State management<br/>• API consumption<br/>• Real-time updates"]
    end

    S1 <--> S3
    S1 <--> S2

    style S1 fill:#e1f5fe, color: #000
    style S2 fill:#e8f5e8, color: #000
    style S3 fill:#f3e5f5, color: #000
```

**Rationale**:

- **Backend**: Web application logic in TypeScript/Node.js
- **SIP Service**: Specialized archival processing in Java
- **Frontend**: User interface and experience optimization

## 🗄️ Data Architecture Overview

### Schema Approach

```typescript
// Example: Document model with flexible metadata
model Document {
  id                     String         @id @default(cuid())
  title                  String
  filename               String

  // Flexible JSON metadata with proper indexing
  metadata    Json?

  // Proper relationships
  uploadedBy             String
  user                   User           @relation(fields: [uploadedBy], references: [id])
  fileMetadata           FileMetadata?
  collections            CollectionDocument[]

  @@index([title])
  @@fulltext([title])
}
```

## 🔐 Security Architecture

### Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant D as Database
    participant S as SIP Service

    F->>B: Login request
    B->>D: Validate credentials
    D-->>B: User data + roles
    B-->>F: JWT tokens (access + refresh)

    F->>B: API request + JWT
    B->>B: Validate JWT + permissions
    B->>D: Authorized data access
    D-->>B: Requested data
    B-->>F: Response

    F->>B: SIP generation request
    B->>B: Validate permissions
    B->>S: Generate SIP (internal auth)
    S-->>B: SIP package details
    B-->>F: Generation status
```

**Security Features**:

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Request validation with Zod schemas
- Secure service-to-service communication
- Audit logging for sensitive operations

## 📚 Architecture Decision Records

### Key Decisions

1. **Monorepo with Turborepo**: Enables shared dependencies and atomic changes
2. **Prisma + Zod Pipeline**: Provides end-to-end type safety from database to frontend
3. **Service Separation**: Java SIP service handles specialized archival processing
4. **Docker Development**: Ensures consistent environments across team

### Future Enhancement Opportunities

- **Caching Strategy**: Redis integration for performance optimization
- **Queue System**: Background job processing for file operations
- **API Gateway**: Centralized routing and rate limiting
- **Monitoring**: Comprehensive observability and alerting
- **Microservices Evolution**: Current monorepo can be split into microservices as needed

---

**Last Updated**: June 2026
