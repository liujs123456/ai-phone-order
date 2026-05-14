# AI Phone Order System

Mobile-first web app where customers chat with an AI assistant to place a takeout
order. The AI calls a `search_menu` tool against a live PostgreSQL menu so it
never hallucinates dishes or prices.

```
frontend (React + Vite)  ──▶  backend (Spring Boot)  ──▶  Anthropic Messages API
                                       │
                                       └─▶  PostgreSQL (Supabase) / H2 (local)
```

## Local development

### 1. Backend

```bash
cd backend
export ANTHROPIC_API_KEY=sk-ant-…        # optional; demo runs without it
./mvnw spring-boot:run
```

- App boots on `http://localhost:8080` using the `dev` profile.
- `dev` uses an in-memory H2 in Postgres-compatibility mode, seeded from `data.sql`.
- H2 console available at `/h2-console` (JDBC URL `jdbc:h2:mem:orderdb`).

If you prefer a real local Postgres, override the datasource in `application-dev.yml`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Vite proxies `/api/*` to the Spring backend on port 8080.

## API surface

| Method | Path             | Purpose                                                  |
|-------:|------------------|----------------------------------------------------------|
| GET    | `/api/menu`      | List menu items. Supports `?q=` and `?category=`.        |
| POST   | `/api/chat`      | `{ messages: [{role, content}] }` → AI reply + items.    |
| POST   | `/api/orders`    | Place an order.                                          |

## AI tool calling

`AiChatService` registers one tool with the Anthropic API:

```json
{
  "name": "search_menu",
  "input_schema": { "type": "object", "properties": { "query": { "type": "string" } }, "required": ["query"] }
}
```

When the model emits a `tool_use` block, the backend runs `MenuService.search()`
against the live database, feeds the JSON results back as a `tool_result`, and
loops until the model produces a final reply. Without `ANTHROPIC_API_KEY` the
service falls back to a deterministic local search so the demo stays runnable.

## Production deployment

### Database — Supabase

1. Create a Supabase project; copy the **Connection string (URI)** under Settings → Database.
2. Run the schema migration on first deploy: Hibernate creates tables when
   `ddl-auto=update`, or you can apply `schema.sql` / `data.sql` manually.

### Backend — Google Cloud Run

```bash
cd backend
./mvnw package -DskipTests
gcloud run deploy ai-phone-order-backend \
  --source . \
  --region us-west1 \
  --set-env-vars SPRING_PROFILES_ACTIVE=prod,DATABASE_URL=jdbc:postgresql://…,DATABASE_USER=…,DATABASE_PASSWORD=…,ANTHROPIC_API_KEY=…
```

### Frontend — Google Cloud Run / Firebase Hosting

```bash
cd frontend
VITE_API_BASE=https://<backend-cloud-run-url> npm run build
```

Serve `dist/` from Cloud Run (Nginx container), Firebase Hosting, or any static
host. Either bake `VITE_API_BASE` into the build or set it at build time so
`/api/*` calls hit the deployed backend.

## Project layout

```
ai-phone-order/
├── backend/
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/restaurant/order/
│       │   ├── OrderApplication.java
│       │   ├── config/CorsConfig.java
│       │   ├── controller/{Menu,Order,Chat}Controller.java
│       │   ├── dto/{ChatRequest,ChatResponse,OrderRequest}.java
│       │   ├── model/{MenuItem,CustomerOrder,OrderItem}.java
│       │   ├── repository/*.java
│       │   └── service/{Menu,Order,AiChat}Service.java
│       └── resources/{application,application-dev,application-prod}.yml + data.sql
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── api/client.js
        ├── components/{ChatView,MenuView,CartView,MessageBubble}.jsx
        └── styles/index.css
```

## Notes

- Mobile-first CSS: single column under 768px, two-column menu grid at desktop
  widths, safe-area padding for notched iPhones, `font-size: 16px` on inputs
  to prevent iOS zoom.
- Prompt caching is enabled on the system prompt to keep AI cost predictable
  across long calls.
- Never use SQLite — local dev uses H2 in Postgres-compatibility mode, prod
  uses real PostgreSQL on Supabase.
