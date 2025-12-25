## Phase 7: Post-Migration Optimization (Optional)

**Duration**: Ongoing
**Risk**: Low
**Goal**: Maximize performance and reliability

**STATUS**: ⏳ PENDING (Optional, can be done after 7-day stability period)

### 7.1 CDN Configuration (Cloudflare)

**Already using Cloudflare as proxy**, optimize settings:

1. **Caching Rules**:
   - Cache Level: Standard
   - Browser Cache TTL: 4 hours
   - Always Online: Enabled (serves cached version if origin down)

2. **Page Rules** (create at dash.cloudflare.com):
   - `kitia.ir/_next/static/*` → Cache Level: Cache Everything, Edge TTL: 1 month
   - `kitia.ir/api/*` → Cache Level: Bypass (dynamic content)
   - `kitia.ir/admin/*` → Cache Level: Bypass, Security Level: High

3. **Firewall Rules**:
   - Block countries with no legitimate traffic (optional)
   - Rate limiting rules (supplement Upstash Redis)
   - Challenge bots and scrapers

### 7.2 Database Connection Pooling

**Already using Supabase pooler** (pgBouncer) - no changes needed.

Verify connection string includes `?pgbouncer=true`:

```bash
# In .env.production
NEXT_PUBLIC_SUPABASE_URL="https://tanqgnztclrucfldxhuk.supabase.co"
# Connection uses Supabase client which handles pooling
```

### 7.3 Application Performance Monitoring

**Install APM tool** (optional):

**A. New Relic** (free tier available):

```bash
npm install newrelic
# Configure newrelic.js
# Add to ecosystem.config.js: node_args: '-r newrelic'
```

**B. Sentry** (error tracking):

```bash
npm install @sentry/nextjs
# Configure sentry.config.js
# Provides real-time error alerts
```

### 7.4 Load Testing

**Before production traffic increases**, perform load test:

```bash
# Install Apache Bench
apt install apache2-utils

# Test 1000 requests, 10 concurrent
ab -n 1000 -c 10 https://kitia.ir/

# Install k6 (modern load testing)
apt install k6

# Create test script
cat > loadtest.js <<'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down to 0
  ],
};

export default function () {
  let res = http.get('https://kitia.ir');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
EOF

# Run test
k6 run loadtest.js
```

**Analyze results**:

- Response time should be < 500ms (p95)
- Error rate should be < 0.1%
- If issues, scale PM2 instances or upgrade VPS

### 7.5 Automated Deployment (CI/CD)

**GitHub Actions** (for automated deployments):

Create `.github/workflows/deploy-vps.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: 87.107.108.75
          username: kitia
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /home/kitia/kitia
            git pull origin main
            npm ci --omit=dev
            npm run build
            pm2 reload ecosystem.config.js
            pm2 logs kitia --lines 50 --nostream
```

**Setup**:

1. Generate SSH key: `ssh-keygen -t ed25519 -C "github-actions"`
2. Add public key to VPS: `/home/kitia/.ssh/authorized_keys`
3. Add private key to GitHub: Settings → Secrets → `VPS_SSH_KEY`

### 7.6 Database Migration (If Needed Later)

**If you want to migrate DB from Supabase to VPS PostgreSQL**:

**WARNING**: Not recommended unless Supabase becomes limiting factor.

Supabase advantages:

- Automatic backups
- Built-in connection pooling
- Realtime subscriptions
- Auto-scaling
- Zero maintenance

**If still needed**, create new phase document.

---
