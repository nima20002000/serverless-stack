## Phase 6: Vercel Decommissioning (After 7 Days)

**Duration**: ~30 minutes
**Risk**: Low (VPS proven stable)
**Rollback**: N/A (can re-deploy to Vercel if needed)

### 6.1 Final Verification Before Decommission

```bash
# Verify VPS has been stable for 7 days
# Check uptime
uptime

# Check PM2 uptime
pm2 info kitia

# Review monitoring logs
tail -200 /home/kitia/logs/monitor.log

# Check Nginx logs for errors
grep -i error /var/log/nginx/kitia.error.log | tail -50

# Verify all features working
# - User registration (email & phone OTP)
# - Product browsing
# - Add to cart
# - Checkout
# - Payment (Zarinpal & Digipay)
# - Order confirmation (email & SMS)
# - Admin panel (all CRUD operations)
# - Image uploads (R2 storage)
```

### 6.2 Archive Vercel Project

**Do NOT delete immediately - archive for 30 days**:

1. Log in to Vercel Dashboard
2. Navigate to `kitia` project
3. Settings → General → Archive Project
4. Confirm archive

**What this does**:

- Project becomes inaccessible
- No builds or deployments
- No billing charges
- Can be restored within 30 days if needed

### 6.3 Update Repository Deployment Configuration

```bash
# On local machine (or VPS)
cd /home/dexter/Desktop/kitia

# Switch to main branch
git checkout main

# Merge migration branch
git merge migration/vercel-to-vps

# Update README or add DEPLOYMENT.md with VPS instructions
# (Optional - only if requested)

# Commit and push
git add .
git commit -m "Migration to VPS complete"
git push origin main
```

### 6.4 Create VPS Deployment Documentation

**Create**: `/home/kitia/kitia/VPS_DEPLOYMENT.md`

````markdown
# VPS Deployment Guide

## Server Details

- IP: 87.107.108.75
- OS: Ubuntu 24.04 LTS
- Node.js: v20.19.6
- PM2: Cluster mode (2 instances)
- Nginx: 1.24.0
- SSL: Let's Encrypt (auto-renewal enabled)

## Deployment Process

### 1. Pull Latest Code

```bash
su - kitia
cd /home/kitia/kitia
git pull origin main
```
````

### 2. Install Dependencies (if package.json changed)

```bash
npm ci --omit=dev
```

### 3. Build Application

```bash
npm run build
```

### 4. Reload PM2 (Zero-Downtime)

```bash
pm2 reload ecosystem.config.js
```

### 5. Verify Deployment

```bash
pm2 logs kitia --lines 50
curl https://kitia.ir/api/health
```

## Rollback Procedure

```bash
git log --oneline -10  # Find commit to rollback to
git reset --hard <commit_hash>
npm run build
pm2 reload ecosystem.config.js
```

## Monitoring

- PM2 Dashboard: `pm2 monit`
- Logs: `pm2 logs kitia`
- Nginx Logs: `/var/log/nginx/kitia.{access,error}.log`
- System Resources: `htop`

## SSL Certificate Renewal

Automatic via certbot systemd timer. Manual renewal:

```bash
certbot renew
systemctl reload nginx
```

```

### 6.5 Permanent Vercel Deletion (After 30 Days)

**Only after 30 days of stable VPS operation**:

1. Vercel Dashboard → Project Settings → General
2. Click "Delete Project"
3. Confirm deletion

### 6.6 Cleanup Checklist

- [ ] VPS stable for 7+ days
- [ ] All features verified working
- [ ] Vercel project archived (not deleted)
- [ ] Repository main branch updated
- [ ] VPS deployment documentation created
- [ ] Team trained on VPS deployment process
- [ ] Monitoring and alerting active
- [ ] Backups configured and tested

---
```
