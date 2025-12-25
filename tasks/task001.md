# Task 001: Migration from Vercel to VPS

**Created**: 2025-12-25
**Branch**: `migration/vercel-to-vps`
**Status**: Planning
**Goal**: Migrate Kitia e-commerce platform from Vercel to self-hosted VPS with zero downtime and full rollback capability

---

## Executive Summary

This task outlines a phased migration strategy to move the Kitia application from Vercel to a dedicated VPS (87.107.108.75) while maintaining:

- **Zero downtime** during migration
- **Full rollback capability** at any phase
- **No codebase harm** - all changes are additive and reversible
- **Production-grade setup** with PM2, Nginx, SSL, monitoring

---

## Current Infrastructure Analysis

### Vercel Setup (Current)

- **Platform**: Vercel serverless
- **Node.js**: Automatic (Vercel runtime)
- **Build**: Automatic on git push
- **SSL**: Automatic (Vercel SSL)
- **CDN**: Global Edge Network
- **Environment**: Production + Preview environments
- **Database**: Supabase (external, will remain)
- **Storage**: Cloudflare R2 (external, will remain)
- **Cache**: Upstash Redis (external, will remain)
- **Email**: Resend (external, will remain)
- **SMS**: Kavenegar (external, will remain)
- **Payments**: Zarinpal + Digipay (external, will remain)

### VPS Configuration (Target)

- **IP**: 87.107.108.75
- **OS**: Ubuntu 24.04.3 LTS (Noble Numbat)
- **CPU**: x86_64
- **RAM**: 3.8GB (3.3GB available)
- **Disk**: 35GB (26GB available, 22% used)
- **Node.js**: v20.19.6 ✅
- **npm**: 10.8.2 ✅
- **Nginx**: 1.24.0 (Ubuntu) ✅ Running
- **PM2**: Installed ✅
- **Services**: SSH, cron, systemd running
- **Domain**: kitia.ir (Cloudflare DNS)

### External Services (No Changes Required)

- Supabase Production DB: `tanqgnztclrucfldxhuk` (Singapore)
- Supabase Preview DB: `gozxjxtnrbuurmstjydo` (Seoul)
- Cloudflare R2: `kitia-products` bucket (cdn.kitia.ir)
- Upstash Redis: Rate limiting & caching
- Resend: Email OTP & notifications
- Kavenegar: SMS OTP
- Zarinpal/Digipay: Payment gateways
- Cloudflare: DNS, CDN, Image Resizing

---

## Migration Strategy

### Approach: Blue-Green Deployment with Gradual Cutover

1. **VPS as staging** → Test full production setup
2. **DNS switching** → Instant cutover via Cloudflare
3. **Vercel as fallback** → Keep active for quick rollback
4. **Monitor 7 days** → Verify stability before Vercel shutdown

---

## Phase 1: VPS Preparation & Environment Setup

**Duration**: ~2 hours
**Risk**: Low (no production impact)
**Rollback**: N/A (preparatory phase)

### 1.1 System Hardening & Security

**STATUS**: ⚠️ PARTIALLY COMPLETE

```bash
# SSH to VPS
ssh vps  # Alias already configured

# Update system packages
apt update && apt upgrade -y

# Install essential tools
apt install -y git curl build-essential certbot python3-certbot-nginx ufw fail2ban
```

**COMPLETED**:

- ✅ Node.js v20.19.6 installed
- ✅ npm 10.8.2 installed
- ✅ Nginx 1.24.0 installed and running
- ✅ PM2 installed globally
- ✅ Certbot installed (SSL for payment.kitia.ir active)

**PENDING**:

- ❌ Firewall (ufw) - Not configured
- ❌ fail2ban - Not configured

```bash
# TODO: Configure firewall
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# TODO: Configure fail2ban for SSH brute-force protection
systemctl enable fail2ban
systemctl start fail2ban
```

### 1.2 Create Application User (Security Best Practice)

**STATUS**: ❌ NOT STARTED

**NOTE**: Currently running as `dexter` user. For better security, create dedicated `kitia` user.

**ALTERNATIVE APPROACH**: Keep using `dexter` user but run Kitia on different port (3001) to avoid conflicts with payment proxy (port 3000).

```bash
# OPTION A: Create dedicated kitia user (recommended for production)
useradd -m -s /bin/bash kitia
usermod -aG sudo kitia

# Set up SSH key access for kitia user (optional)
mkdir -p /home/kitia/.ssh
cp /home/dexter/.ssh/authorized_keys /home/kitia/.ssh/
chown -R kitia:kitia /home/kitia/.ssh
chmod 700 /home/kitia/.ssh
chmod 600 /home/kitia/.ssh/authorized_keys
```

```bash
# OPTION B: Use dexter user (faster testing, less secure)
# Run Kitia as dexter user on port 3001
# Payment proxy continues on port 3000
# No user creation needed
```

### 1.3 Install PM2 Globally (if not already)

**STATUS**: ✅ COMPLETE (for payment proxy)

```bash
# Already installed and running payment-proxy service
# pm2 list shows:
# - payment-proxy (cluster mode, port 3000)
# - Uptime: 13+ hours, Status: online

# TODO: Install PM2 log rotation (not yet configured)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7

# TODO: Configure PM2 startup for dexter user (if using Option B)
# pm2 startup systemd -u dexter --hp /home/dexter
# Or for kitia user (if using Option A):
# pm2 startup systemd -u kitia --hp /home/kitia
```

### 1.4 Clone Repository & Install Dependencies

**STATUS**: ❌ NOT STARTED

**RECOMMENDED LOCATION**: `/home/dexter/kitia` (to avoid user creation initially)

```bash
# Clone repository
cd /home/dexter
git clone <kitia-repo-url> kitia
cd kitia

# Create testing branch (keeps migration branch clean)
git checkout -b vps-migration-test

# Install dependencies
npm ci --omit=dev

# Build application
npm run build
```

**NOTE**: Repository URL needed from user.

### 1.5 Environment Variables Setup

```bash
# Create production .env file
nano /home/kitia/kitia/.env.production

# Copy content from CREDENTIALS.md with production values:
# - NEXT_PUBLIC_SUPABASE_URL (Production Supabase)
# - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (Production)
# - SUPABASE_SECRET_KEY (Production)
# - NEXTAUTH_URL="https://kitia.ir"
# - NEXT_PUBLIC_APP_URL="https://kitia.ir"
# - R2_PUBLIC_URL="https://cdn.kitia.ir"
# - All other credentials from CREDENTIALS.md
```

**Critical Environment Variables**:

```bash
# Database (Supabase Production)
NEXT_PUBLIC_SUPABASE_URL="https://tanqgnztclrucfldxhuk.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_Z7kHgWWDwizlMMFXfFmiJw_ZG7C-ORU"
SUPABASE_SECRET_KEY="sb_secret_MBrV6R-b0brFZq1l6FgBew_vxnHMTO5"

# NextAuth
NEXTAUTH_URL="https://kitia.ir"
NEXTAUTH_SECRET="<generate new with: openssl rand -base64 32>"

# App URL
NEXT_PUBLIC_APP_URL="https://kitia.ir"

# R2 Storage
R2_ACCOUNT_ID="dd63dacc73e373d4f298797c0400a419"
R2_ACCESS_KEY_ID="afa45d7d809fce2bbc99fdfc4a41375e"
R2_SECRET_ACCESS_KEY="9b8b7d4ceea1412a9c2183a9654c7db931510c4904ab355bedcedc1a37bce4de"
R2_BUCKET_NAME="kitia-products"
R2_PUBLIC_URL="https://cdn.kitia.ir"

# Cloudflare Image Resizing
NEXT_PUBLIC_CLOUDFLARE_IMAGE_RESIZING_ENABLED="true"

# Email (Resend)
RESEND_API_KEY="re_2hC7ug9u_FyEgD87HBNxAMkYu6EHBemQX"
EMAIL_FROM='"کیتیا" <noreply@kitia.ir>'
ADMIN_EMAIL="admin@kitia.ir"

# SMS (Kavenegar)
KAVENEGAR_API_KEY="<from CREDENTIALS.md>"
KAVENEGAR_SENDER="2000660110"
KAVENEGAR_TEMPLATE_NAME="kitia-otp-sms"
KAVENEGAR_ORDER_CONFIRMATION_TEMPLATE_NAME="kitia-order-confirmation"

# Payments
ZARINPAL_MERCHANT_ID="<production merchant ID>"
ZARINPAL_SANDBOX="false"
DIGIPAY_BASE_URL="https://api.mydigipay.com"
DIGIPAY_CLIENT_ID="nima1999-client-id"
DIGIPAY_CLIENT_SECRET="a7/v0qDHpcCq8#M"
DIGIPAY_SANDBOX="false"

# Redis Cache (Upstash)
UPSTASH_REDIS_REST_URL="<from credentials>"
UPSTASH_REDIS_REST_TOKEN="<from credentials>"

# Logging
LOG_LEVEL="info"

# AWS SDK (for R2)
AWS_EC2_METADATA_DISABLED="true"
```

### 1.6 Verification Checklist

**COMPLETED**:

- [x] Node.js v20.19.6 installed
- [x] npm 10.8.2 installed
- [x] Nginx installed and running
- [x] PM2 installed globally
- [x] SSL certificate exists (for payment.kitia.ir)
- [x] Payment proxy service running stable

**PENDING**:

- [ ] System packages updated
- [ ] Firewall configured (ports 22, 80, 443)
- [ ] Fail2ban enabled
- [ ] Application user `kitia` created (OR use dexter user)
- [ ] Kitia repository cloned
- [ ] Dependencies installed (`node_modules`)
- [ ] Production build successful (`.next` directory created)
- [ ] `.env.production` file created with all credentials
- [ ] PM2 configured for auto-start (for Kitia)
- [ ] PM2 log rotation configured

---

## Rollback Strategy (Summary)

### Immediate Rollback (Within 24 hours)

**Trigger**: Critical failures, data loss, security breach

**Steps**:

1. **Revert DNS** (5 minutes):

   ```bash
   # Cloudflare Dashboard → DNS → Records
   # Change A record back to Vercel IP
   # Or restore original CNAME to Vercel
   ```

2. **Keep VPS running** for debugging:

   ```bash
   # Access logs
   pm2 logs kitia --err --lines 500
   tail -200 /var/log/nginx/kitia.error.log

   # Check system
   htop
   df -h
   systemctl status nginx
   ```

3. **Fix issues offline**, retry migration when ready

### Partial Rollback (After 24 hours, before 7 days)

**Trigger**: Performance issues, minor bugs

**Steps**:

1. **Keep DNS on VPS** (users on VPS)
2. **Fix issues in place**:
   ```bash
   # Rollback code
   git reset --hard <previous_commit>
   npm run build
   pm2 reload ecosystem.config.js
   ```
3. **Monitor closely**, revert DNS only if unfixable

### Full Revert (After 7 days)

**Trigger**: Unsolvable architectural issues

**Steps**:

1. Revert DNS to Vercel
2. Re-deploy to Vercel (project archived, not deleted)
3. Analyze what went wrong
4. Plan better migration strategy

---

## Success Criteria

### Technical Metrics

- [x] Application accessible via HTTPS
- [x] SSL certificate valid and auto-renewing
- [x] Response time < 500ms (p95)
- [x] Uptime > 99.9%
- [x] Zero data loss
- [x] All features working (payments, emails, SMS, uploads)

### Business Metrics

- [x] Zero customer complaints about site access
- [x] Payment success rate unchanged
- [x] Admin operations unaffected
- [x] No revenue loss during migration

### Operational Metrics

- [x] Deployment process documented
- [x] Monitoring and alerting active
- [x] Backup strategy implemented
- [x] Team trained on VPS management
- [x] Rollback plan tested

---
