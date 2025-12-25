# VPS Revert Strategy & Safe Migration Testing

**Created**: 2025-12-25
**Purpose**: Establish a safe rollback point for VPS migration testing

---

## Current VPS State (Baseline)

### Production Service (Active)

- **Service**: Payment Proxy (Digipay gateway bypass)
- **Domain**: `payment.kitia.ir` (SSL configured)
- **Port**: 3000
- **Process Manager**: PM2 (cluster mode, 1 instance)
- **Location**: `/home/dexter/payment-proxy`
- **Branch**: `master`
- **Status**: Running stable for 13+ hours
- **Git Status**: 1 uncommitted change in `src/lib/digipay.ts`

### Infrastructure (Configured)

- **Nginx**: Running with `payment-proxy` site enabled
- **SSL**: Let's Encrypt certificate for `payment.kitia.ir`
- **Firewall**: Not configured (ufw disabled)
- **System Resources**:
  - RAM: 3.8GB total, 490MB used, 3.3GB available
  - Disk: 35GB total, 7.0GB used (22%), 26GB available
  - Node.js: v20.19.6
  - npm: 10.8.2

### Not Configured Yet

- No dedicated `kitia` user (running as `dexter`)
- No SSL for `kitia.ir` domain
- No Kitia application repository
- No firewall rules
- No fail2ban
- No monitoring beyond PM2

---

## Revert Point Strategy

### Scenario: Keep Payment Proxy, Test Full Migration

This is the **SAFEST** approach:

1. **Payment proxy remains untouched** on port 3000
2. **Kitia app will run on port 3001** (different port)
3. **Two separate services** can coexist
4. **Easy rollback**: Just stop Kitia service, keep payment proxy running

### Critical Revert Point (Current Commit)

```bash
# Payment Proxy Repository
Location: /home/dexter/payment-proxy
Branch: master
Last Commit: 4924a1f - "chore: add .gitignore and remove tracked build artifacts"
Uncommitted Changes: src/lib/digipay.ts (1 file)
```

**To preserve this exact state:**

```bash
# On VPS - Commit current work
ssh vps
cd /home/dexter/payment-proxy
git add .
git commit -m "checkpoint: stable payment proxy before kitia migration"
git tag -a v1.0-stable -m "Stable payment proxy - pre-kitia-migration checkpoint"
```

---

## Safe Migration Testing Plan

### Phase 1: Create Parallel Environment (NO INTERFERENCE)

**Goal**: Run Kitia alongside payment proxy without conflicts

```bash
# 1. Clone Kitia repo (separate directory)
cd /home/dexter
git clone <kitia-repo-url> kitia
cd kitia
git checkout -b vps-migration-test

# 2. Configure Kitia for port 3001 (NOT 3000 - payment proxy uses that)
# Edit .env.production:
PORT=3001
NEXTAUTH_URL="http://87.107.108.75:3001"  # Test without SSL first

# 3. Build Kitia
npm ci --omit=dev
npm run build

# 4. Create PM2 ecosystem for Kitia
cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: 'kitia-test',
    script: 'npm',
    args: 'start',
    cwd: '/home/dexter/kitia',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    env_file: '.env.production',
  }]
};
EOF

# 5. Start Kitia (payment proxy keeps running on 3000)
pm2 start ecosystem.config.js
pm2 save

# 6. Test Kitia on port 3001
curl http://localhost:3001
```

**Result**: Two services running independently:

- Payment proxy: `http://localhost:3000` → `https://payment.kitia.ir`
- Kitia test: `http://localhost:3001` (not public yet)

### Phase 2: Test Kitia Without DNS Change

**Create Nginx config for testing** (separate from payment proxy):

```nginx
# /etc/nginx/sites-available/kitia-test
server {
    listen 8080;  # Different port for testing
    server_name _;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable test site
sudo ln -s /etc/nginx/sites-available/kitia-test /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Test from local machine
curl http://87.107.108.75:8080
```

**Payment proxy still works**: `https://payment.kitia.ir` → unchanged

### Phase 3: Full Rollback Options

#### Option A: Instant Rollback (Payment Proxy Only)

**If Kitia migration fails completely:**

```bash
# Stop Kitia
pm2 stop kitia-test
pm2 delete kitia-test

# Remove Kitia Nginx config
sudo rm /etc/nginx/sites-enabled/kitia-test
sudo systemctl reload nginx

# Payment proxy continues running normally
pm2 list  # Should show payment-proxy: online

# Optionally delete Kitia directory
rm -rf /home/dexter/kitia
```

**Result**: VPS returns to payment proxy only, exactly as before.

#### Option B: Revert to Exact Checkpoint

**If you need to restore payment proxy to exact pre-migration state:**

```bash
cd /home/dexter/payment-proxy
git reset --hard v1.0-stable  # Tagged checkpoint
pm2 restart payment-proxy
```

#### Option C: Full VPS Reset (Nuclear Option)

**If everything breaks:**

1. **Keep Vercel active** (already serving kitia.ir)
2. **VPS only affects** `payment.kitia.ir` subdomain
3. **Worst case**: Delete payment proxy DNS, requests fail but main site works
4. **Rebuild VPS**: Fresh install, restore payment proxy from git

---

## New Branch Strategy for Migration Testing

### Recommended Workflow

```bash
# Local machine
cd /home/dexter/Desktop/kitia
git checkout migration/vercel-to-vps

# Create testing branch
git checkout -b vps-migration-test
git push -u origin vps-migration-test

# On VPS
cd /home/dexter/kitia
git fetch origin
git checkout vps-migration-test

# Test, iterate, commit to this branch
# Only merge to migration/vercel-to-vps when stable
```

### Branch Strategy

- `migration/vercel-to-vps` - Main migration branch (current work)
- `vps-migration-test` - Testing branch on VPS (new)
- `main` - Production (Vercel, untouched)

**Safety**: VPS testing branch is isolated, doesn't affect Vercel production.

---

## Critical Checkpoints

### Checkpoint 1: Payment Proxy Baseline (NOW)

```bash
# On VPS
cd /home/dexter/payment-proxy
git add .
git commit -m "checkpoint: stable payment proxy before kitia migration"
git tag -a v1.0-stable -m "Stable payment proxy checkpoint"
git push origin master --tags
```

### Checkpoint 2: Kitia Test Deployment

```bash
# After Kitia successfully runs on port 3001
cd /home/dexter/kitia
git add .
git commit -m "checkpoint: kitia running on VPS port 3001"
git tag -a vps-test-v1 -m "First successful VPS deployment"
git push origin vps-migration-test --tags
```

### Checkpoint 3: Pre-DNS Switch

```bash
# Before changing kitia.ir DNS
cd /home/dexter/kitia
git tag -a pre-dns-switch -m "Stable state before DNS cutover"
git push origin --tags
```

---

## Rollback Decision Matrix

| Scenario                | Action                     | Impact                          | Recovery Time                  |
| ----------------------- | -------------------------- | ------------------------------- | ------------------------------ |
| Kitia won't start       | Stop Kitia PM2, debug logs | None (payment proxy OK)         | Immediate                      |
| Port conflicts          | Change Kitia to 3001       | None                            | 5 minutes                      |
| Nginx misconfiguration  | Revert Nginx config        | None                            | 5 minutes                      |
| DNS issues after switch | Revert DNS to Vercel       | Main site affected              | 5-60 minutes (DNS propagation) |
| Payment proxy breaks    | Revert to v1.0-stable tag  | Payment proxy affected          | 2 minutes                      |
| Complete VPS failure    | Keep Vercel active         | VPS services down, main site OK | N/A (Vercel handles traffic)   |

---

## Pre-Migration Checklist

Before making ANY changes:

- [ ] Commit payment proxy changes: `git add . && git commit`
- [ ] Tag payment proxy stable state: `git tag v1.0-stable`
- [ ] Verify payment proxy is running: `pm2 list`
- [ ] Test payment proxy endpoint: `curl https://payment.kitia.ir`
- [ ] Document current PM2 config: `pm2 info payment-proxy > backup-pm2.txt`
- [ ] Backup Nginx configs: `cp -r /etc/nginx/sites-available ~/nginx-backup`
- [ ] Verify Vercel is active: `curl https://kitia.ir`

**CRITICAL**: Never modify payment proxy while testing Kitia migration!

---

## Emergency Contacts / Documentation

- **VPS IP**: 87.107.108.75
- **SSH Access**: `ssh vps` (alias configured)
- **PM2 Logs**: `/home/dexter/.pm2/logs/`
- **Nginx Logs**: `/var/log/nginx/`
- **Payment Proxy Repo**: `/home/dexter/payment-proxy`
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Cloudflare Dashboard**: https://dash.cloudflare.com

---

## Success Criteria for Full Migration

Only proceed to DNS switch when:

1. ✅ Kitia runs stable on port 3001 for 24+ hours
2. ✅ All features tested and working (payments, uploads, emails, SMS)
3. ✅ No errors in PM2 logs
4. ✅ SSL configured for kitia.ir on VPS
5. ✅ Nginx properly configured with HTTPS redirect
6. ✅ Payment proxy still running normally (regression test)
7. ✅ Load testing completed successfully
8. ✅ Backup/rollback plan tested

**DO NOT** switch DNS until all criteria are met!
