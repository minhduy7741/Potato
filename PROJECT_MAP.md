# Potato Project Map (IDP Platform)
## Tech Stack
- **BE**: NestJS (Port 3000), Docker Engine SDK, Prisma ORM, PostgreSQL (Port 5433).
- **FE**: Next.js 16 (Port 3001), TailwindCSS 4, Lucide Icons, Socket.io-client.

## DB Schema (Prisma)
- `User`: Accounts & credentials.
- `Project`: Container ID, state, resource limits (RAM/CPU), Git repo & token, subdomain, SSL status, restart policy, auto-scale flag, Slack webhook.
- `EnvVariable`: Key-value pairs linked to projects.
- `DeploymentLog`: Git commit details, build logs, and status history.
- `ActivityLog`: System event log for actions (deploy, scale, heal).
- `ProjectStat`: 5-min CPU & RAM history.
- `DatabaseInstance`: DB type (postgres/mysql/mongo/redis), connections, and parent project.
- `DatabaseActivityLog`: SQL query logs, backups, and restores.

## Core Features & Logic Flows
1. **App Deployment Pipeline**:
   - Path: [projects.service.ts](file:///C:/Users/minhd/OneDrive/Desktop/Potato/be/src/projects/projects.service.ts)
   - Flow: Check host RAM -> Allocate port (10000-19999) -> Git clone -> Auto Dockerfile detection/generation -> Build Image -> Run temp container -> Health Check (15s) -> Route via Nginx configs -> Stop/delete old container -> Rename new -> Slack webhook status update.
2. **Zero-downtime & Rollback**:
   - Path: [projects.service.ts](file:///C:/Users/minhd/OneDrive/Desktop/Potato/be/src/projects/projects.service.ts) & [git-deploy.tsx](file:///C:/Users/minhd/OneDrive/Desktop/Potato/fe/components/project/git-deploy.tsx)
   - Custom tags per deploy (`potato-app-X:dep-Y`). Rollback endpoint: `/api/projects/:id/rollback/:depId`.
3. **Auto Scale Down**:
   - Path: [stats-collector.service.ts](file:///C:/Users/minhd/OneDrive/Desktop/Potato/be/src/projects/stats-collector.service.ts)
   - Flow: Cron 5m -> CPU < 15% -> reduce limits (`-256MB RAM`, `-0.5 CPU`) -> min limit: `256MB RAM / 1 CPU`.
4. **Auto-heal (Container Monitoring)**:
   - Path: [stats-collector.service.ts](file:///C:/Users/minhd/OneDrive/Desktop/Potato/be/src/projects/stats-collector.service.ts)
   - Flow: Cron 1m -> check running containers -> if crashed -> restart based on project policy -> Slack notify.
5. **SQL Query Runner**:
   - Path: [databases.service.ts](file:///C:/Users/minhd/OneDrive/Desktop/Potato/be/src/databases/databases.service.ts) & [page.tsx](file:///C:/Users/minhd/OneDrive/Desktop/Potato/fe/app/dashboard/databases/page.tsx)
   - Flow: Endpoint `/api/databases/:id/query` -> uses safe `docker cp` for query file (prevents injection) -> exec via CLI inside container -> parses TSV -> UI interactive table.
6. **Real-time Metrics (WebSockets)**:
   - Path: [stats-collector.service.ts](file:///C:/Users/minhd/OneDrive/Desktop/Potato/be/src/projects/stats-collector.service.ts) & [stats.gateway.ts](file:///C:/Users/minhd/OneDrive/Desktop/Potato/be/src/projects/stats.gateway.ts)
   - Room-based socket.io room `project-stats:id`. Polls Docker stats only if clients are subscribed in the room.

## Frontend Layout & Pages
- **Auth (Login)**: `fe/app/login/page.tsx`
- **Dashboard Home (Projects List)**: `fe/app/dashboard/page.tsx`
- **Project Details**: `fe/app/dashboard/project/[id]/page.tsx`
  - Overview: `fe/components/project/project-overview.tsx`
  - Git Deploy / Rollback: `fe/components/project/git-deploy.tsx`
  - Env Vars Manager: `fe/components/project/env-variables-manager.tsx`
  - Resource Control (RAM/CPU limit): `fe/components/project/resource-control.tsx`
  - Real-time Terminal Logs: `fe/components/project/terminal-logs.tsx`
  - Historical Metrics: `fe/components/project/metrics-charts.tsx`
- **Databases Manager**: `fe/app/dashboard/databases/page.tsx` (handles list, edit pass, backups, SQL playground)
- **System Monitoring**: `fe/app/dashboard/system/page.tsx`
- **User Settings**: `fe/app/dashboard/settings/page.tsx`

## Key Configs & Entrypoints
- **BE Main Config**: [be/.env](file:///C:/Users/minhd/OneDrive/Desktop/Potato/be/.env)
- **Database Schema**: [schema.prisma](file:///C:/Users/minhd/OneDrive/Desktop/Potato/be/prisma/schema.prisma)
- **NestJS Entrypoint**: [main.ts](file:///C:/Users/minhd/OneDrive/Desktop/Potato/be/src/main.ts)
- **NextJS Config**: [next.config.mjs](file:///C:/Users/minhd/OneDrive/Desktop/Potato/fe/next.config.mjs)
