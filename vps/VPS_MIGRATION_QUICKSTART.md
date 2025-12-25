# VPS Migration Quick Start Guide

**Date**: 2025-12-25
**Purpose**: Fast-track guide to safely test Kitia on VPS alongside payment proxy

---

## Current Situation

✅ **What's Working**:

- VPS running at 87.107.108.75
- Payment proxy service (Digipay) on port 3000
- Domain: `payment.kitia.ir` (SSL configured)
- PM2, Nginx, Node.js all installed and running

❌ **What's Not Done**:

- Kitia app not deployed yet
- No firewall configured
- No dedicated app user
- `kitia.ir` still points to Vercel (production)

---

## Safe Testing Strategy

### Option 1: Quick Parallel Test (Recommended for Testing)

Run Kitia on **port 3001** alongside payment proxy (port 3000). No conflicts, easy rollback.

```bash
# 1. SSH to VPS
ssh vps

# 2. Clone Kitia repository
cd /home/dexter
git clone <REPO_URL> kitia
cd kitia

# 3. Create testing branch
git checkout -b vps-migration-test

# 4. Install dependencies
npm ci --omit=dev

# 5. Create .env.production (port 3001)
cat > .env.production <<'EOF'
# Database (Supabase Production)
NEXT_PUBLIC_SUPABASE_URL="https://tanqgnztclrucfldxhuk.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_Z7kHgWWDwizlMMFXfFmiJw_ZG7C-ORU"
SUPABASE_SECRET_KEY="sb_secret_MBrV6R-b0brFZq1l6FgBew_vxnHMTO5"

# NextAuth
NEXTAUTH_URL="http://87.107.108.75:3001"  # Local testing first
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"

# App
NEXT_PUBLIC_APP_URL="http://87.107.108.75:3001"
PORT=3001

# ... (copy rest from CREDENTIALS.md)
EOF

# 6. Build
npm run build

# 7. Create PM2 config
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

# 8. Start Kitia
pm2 start ecosystem.config.js
pm2 save

# 9. Test both services
curl http://localhost:3001  # Kitia
curl http://localhost:3000  # Payment proxy
pm2 list  # Should show both: kitia-test, payment-proxy
```

**Result**: Two services running independently. Payment proxy untouched.

---

## Before Starting: Create Revert Point

**CRITICAL**: Backup payment proxy before any changes!

```bash
ssh vps
cd /home/dexter/payment-proxy
git add .
git commit -m "checkpoint: stable payment proxy before kitia migration"
git tag -a v1.0-stable -m "Stable payment proxy - pre-kitia-migration"
git push origin master --tags
```

**To revert**: `git reset --hard v1.0-stable && pm2 restart payment-proxy`

---

## Testing Checklist

Before DNS switch, verify:

- [ ] Kitia accessible at `http://87.107.108.75:3001`
- [ ] Homepage loads correctly
- [ ] Can browse products
- [ ] Can add to cart
- [ ] Login/register works (email & SMS OTP)
- [ ] Admin panel accessible
- [ ] Image uploads work (R2 storage)
- [ ] Payment test transaction (Zarinpal sandbox)
- [ ] Email notifications sent
- [ ] SMS notifications sent
- [ ] No errors in PM2 logs: `pm2 logs kitia-test --err`
- [ ] Payment proxy still works: `curl https://payment.kitia.ir`
- [ ] Stable for 24+ hours

---

## Next Steps (After Successful Testing)

1. **Configure Nginx for kitia.ir** (see task002.md)
2. **Obtain SSL certificate** for kitia.ir
3. **Switch DNS** from Vercel to VPS (see task004.md)
4. **Monitor for 7 days**
5. **Decommission Vercel** (optional, after stability confirmed)

---

## Emergency Rollback

### If Kitia Fails to Start

```bash
# Check logs
pm2 logs kitia-test --err --lines 100

# Stop and remove
pm2 stop kitia-test
pm2 delete kitia-test

# Payment proxy unaffected
pm2 list  # Should show payment-proxy: online
```

### If Payment Proxy Breaks (Accidental)

```bash
cd /home/dexter/payment-proxy
git reset --hard v1.0-stable
pm2 restart payment-proxy
```

### If DNS Switch Goes Wrong

```bash
# Revert DNS in Cloudflare Dashboard
# Change A record back to Vercel IP
# Takes 5-60 minutes to propagate
```

---

## Port Assignments

| Service            | Port | Domain           | Status              |
| ------------------ | ---- | ---------------- | ------------------- |
| Payment Proxy      | 3000 | payment.kitia.ir | ✅ Active           |
| Kitia (Test)       | 3001 | (local only)     | ❌ Not deployed     |
| Kitia (Production) | 3001 | kitia.ir         | ❌ After DNS switch |

---

## Task File Summary

- **task001.md**: VPS setup (Node, Nginx, PM2) - ⚠️ Partial
- **task002.md**: Nginx config for kitia.ir - ❌ Pending
- **task003.md**: PM2 setup for Kitia - ❌ Pending
- **task004.md**: DNS switch & SSL - ❌ Pending
- **task005.md**: Monitoring - ❌ Pending
- **task006.md**: Vercel decommission - ❌ Pending
- **task007.md**: Post-migration optimization - ❌ Pending

---

## Key Files

- **VPS_REVERT_STRATEGY.md** - Detailed rollback procedures
- **VPS_MIGRATION_QUICKSTART.md** - This file (quick start)
- **tasks/task001.md** - Full phase 1 details
- **CREDENTIALS.md** - Environment variables (local only)

---

## Need Help?

1. Check PM2 logs: `pm2 logs kitia-test`
2. Check Nginx logs: `sudo tail -100 /var/log/nginx/error.log`
3. Check system resources: `htop`, `df -h`, `free -h`
4. Review VPS_REVERT_STRATEGY.md for rollback options

---

## Repository URL Needed

To proceed, provide the Git repository URL for Kitia:

```bash
# Example:
git clone https://github.com/username/kitia.git
# Or:
git clone git@github.com:username/kitia.git
```
