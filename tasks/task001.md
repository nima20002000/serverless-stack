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

```bash
# SSH to VPS
ssh root@87.107.108.75

# Update system packages
apt update && apt upgrade -y

# Install essential tools
apt install -y git curl build-essential certbot python3-certbot-nginx ufw fail2ban

# Configure firewall
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# Configure fail2ban for SSH brute-force protection
systemctl enable fail2ban
systemctl start fail2ban
```

### 1.2 Create Application User (Security Best Practice)

```bash
# Create non-root user for running Node.js app
useradd -m -s /bin/bash kitia
usermod -aG sudo kitia

# Set up SSH key access for kitia user (optional)
mkdir -p /home/kitia/.ssh
cp /root/.ssh/authorized_keys /home/kitia/.ssh/
chown -R kitia:kitia /home/kitia/.ssh
chmod 700 /home/kitia/.ssh
chmod 600 /home/kitia/.ssh/authorized_keys
```

### 1.3 Install PM2 Globally (if not already)

```bash
npm install -g pm2

# Configure PM2 to start on system boot
pm2 startup systemd -u kitia --hp /home/kitia
# Run the command it outputs (as root)

# Install PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
```

### 1.4 Clone Repository & Install Dependencies

```bash
# Switch to kitia user
su - kitia

# Clone repository (use HTTPS or SSH based on credentials)
cd /home/kitia
git clone https://github.com/your-username/kitia.git
cd kitia

# Checkout migration branch
git checkout migration/vercel-to-vps

# Install dependencies
npm ci --omit=dev

# Build application
npm run build
```

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

- [ ] System packages updated
- [ ] Firewall configured (ports 22, 80, 443)
- [ ] Fail2ban enabled
- [ ] Application user `kitia` created
- [ ] Repository cloned
- [ ] Dependencies installed (`node_modules`)
- [ ] Production build successful (`.next` directory created)
- [ ] `.env.production` file created with all credentials
- [ ] PM2 configured for auto-start

---

## Phase 2: Nginx Configuration & SSL Setup

**Duration**: ~1 hour
**Risk**: Low (VPS not yet in DNS)
**Rollback**: Delete Nginx config, restart Nginx

### 2.1 Create Nginx Configuration for Kitia

```bash
# Switch to root
exit  # from kitia user

# Create Nginx site configuration
nano /etc/nginx/sites-available/kitia.ir
```

**Nginx Configuration** (`/etc/nginx/sites-available/kitia.ir`):

```nginx
# Upstream to Node.js PM2 cluster
upstream kitia_backend {
    # PM2 cluster mode will spawn multiple instances
    # Nginx will load balance between them
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP server - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name kitia.ir www.kitia.ir;

    # Allow Certbot ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name kitia.ir www.kitia.ir;

    # SSL certificates (will be configured after Certbot)
    ssl_certificate /etc/letsencrypt/live/kitia.ir/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kitia.ir/privkey.pem;

    # SSL configuration (Mozilla Intermediate)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/kitia.access.log;
    error_log /var/log/nginx/kitia.error.log;

    # Client body size (for file uploads)
    client_max_body_size 60M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Proxy to Next.js application
    location / {
        proxy_pass http://kitia_backend;
        proxy_http_version 1.1;

        # WebSocket support (for HMR in dev, not needed in prod but harmless)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # Static files caching (Next.js _next/static)
    location /_next/static {
        proxy_pass http://kitia_backend;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://kitia_backend;
        access_log off;
    }
}
```

### 2.2 Enable Site & Test Configuration

```bash
# Create symlink to enable site
ln -s /etc/nginx/sites-available/kitia.ir /etc/nginx/sites-enabled/

# Remove default site (optional)
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# If test passes, reload Nginx (don't restart yet - SSL not configured)
# We'll do this after SSL setup
```

### 2.3 SSL Certificate Setup (Let's Encrypt)

**IMPORTANT**: SSL setup requires DNS to point to VPS. We'll do this in Phase 4.

For now, prepare the Certbot command:

```bash
# This command will be run in Phase 4 after DNS switch
# certbot --nginx -d kitia.ir -d www.kitia.ir --non-interactive --agree-tos --email nimarezapoor@gmail.com

# Auto-renewal is enabled by default (systemd timer)
systemctl status certbot.timer
```

### 2.4 Verification Checklist

- [ ] Nginx config created: `/etc/nginx/sites-available/kitia.ir`
- [ ] Symlink created: `/etc/nginx/sites-enabled/kitia.ir`
- [ ] Nginx config test passed: `nginx -t`
- [ ] Certbot installed and ready
- [ ] Certbot auto-renewal timer active

---

## Phase 3: PM2 Process Manager Setup

**Duration**: ~30 minutes
**Risk**: Low (local testing only)
**Rollback**: `pm2 delete kitia`

### 3.1 Create PM2 Ecosystem File

```bash
# Switch to kitia user
su - kitia
cd /home/kitia/kitia

# Create PM2 ecosystem configuration
nano ecosystem.config.js
```

**PM2 Ecosystem Configuration** (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [
    {
      name: 'kitia',
      script: 'npm',
      args: 'start',
      cwd: '/home/kitia/kitia',
      instances: 2, // Run 2 instances for 4GB RAM (adjust based on load)
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_file: '.env.production',
      error_file: '/home/kitia/logs/kitia-error.log',
      out_file: '/home/kitia/logs/kitia-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
```

### 3.2 Create Logs Directory

```bash
mkdir -p /home/kitia/logs
```

### 3.3 Start Application with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Verify it's running
pm2 status

# Check logs
pm2 logs kitia --lines 100

# Test local access
curl http://localhost:3000

# Save PM2 process list (for auto-start on reboot)
pm2 save
```

### 3.4 PM2 Monitoring & Management Commands

```bash
# View real-time logs
pm2 logs kitia

# Monitor resources
pm2 monit

# Restart application (zero-downtime reload)
pm2 reload kitia

# View detailed info
pm2 info kitia

# Stop application
pm2 stop kitia

# Delete application from PM2
pm2 delete kitia
```

### 3.5 Verification Checklist

- [ ] PM2 ecosystem file created
- [ ] Logs directory created: `/home/kitia/logs`
- [ ] Application started: `pm2 status` shows "online"
- [ ] Local access works: `curl http://localhost:3000` returns HTML
- [ ] PM2 process saved for auto-start
- [ ] No errors in logs: `pm2 logs kitia`

---

## Phase 4: DNS Cutover & SSL Setup

**Duration**: ~30 minutes (plus DNS propagation 5-60 minutes)
**Risk**: Medium (DNS change affects production)
**Rollback**: Revert DNS A record to Vercel IP

### 4.1 Pre-Cutover Verification

**Before changing DNS, verify:**

```bash
# On VPS: Check PM2 is running
pm2 status

# Check application responds locally
curl -I http://localhost:3000

# Check Nginx is running
systemctl status nginx

# Check disk space
df -h

# Check memory
free -h
```

### 4.2 Cloudflare DNS Configuration

**Current Setup** (check first):

```bash
# Query current DNS
dig +short kitia.ir
dig +short www.kitia.ir

# Expected: Vercel CNAME (76.76.21.21 or similar)
```

**New Configuration**:

1. Log in to Cloudflare Dashboard: https://dash.cloudflare.com
2. Navigate to `kitia.ir` zone
3. Go to DNS → Records
4. **Modify A record**:
   - Type: `A`
   - Name: `@` (kitia.ir)
   - IPv4 address: `87.107.108.75`
   - Proxy status: **Proxied** (orange cloud) - enables Cloudflare CDN
   - TTL: Auto

5. **Modify www record**:
   - Type: `CNAME`
   - Name: `www`
   - Target: `kitia.ir`
   - Proxy status: **Proxied**
   - TTL: Auto

6. **Enable Cloudflare Settings**:
   - SSL/TLS → Overview → Set to "Full (strict)" mode
   - SSL/TLS → Edge Certificates → Enable "Always Use HTTPS"
   - Speed → Optimization → Enable "Auto Minify" (JS, CSS, HTML)
   - Speed → Optimization → Enable "Brotli"
   - Caching → Configuration → Set "Browser Cache TTL" to 4 hours

### 4.3 SSL Certificate Generation (After DNS Propagation)

**Wait for DNS propagation** (~5-60 minutes):

```bash
# Check DNS from VPS
dig +short kitia.ir @8.8.8.8
# Should return: 87.107.108.75

# Check from multiple locations
# https://www.whatsmydns.net/#A/kitia.ir
```

**Once DNS is propagated**:

```bash
# Switch to root
su - root

# Stop Nginx temporarily (Certbot standalone mode)
systemctl stop nginx

# Generate SSL certificate
certbot certonly --standalone -d kitia.ir -d www.kitia.ir \
  --non-interactive --agree-tos --email nimarezapoor@gmail.com

# Start Nginx
systemctl start nginx

# Test SSL renewal (dry run)
certbot renew --dry-run
```

**Alternative (Nginx plugin - recommended)**:

```bash
# If Nginx is already running (preferred method)
certbot --nginx -d kitia.ir -d www.kitia.ir \
  --non-interactive --agree-tos --email nimarezapoor@gmail.com

# Certbot will automatically update Nginx config
```

### 4.4 Reload Nginx with SSL

```bash
# Test Nginx config
nginx -t

# Reload Nginx
systemctl reload nginx
```

### 4.5 Post-Cutover Verification

```bash
# Test HTTPS access
curl -I https://kitia.ir

# Test HTTP → HTTPS redirect
curl -I http://kitia.ir

# Test application functionality
curl https://kitia.ir/api/health

# Check SSL certificate
echo | openssl s_client -servername kitia.ir -connect kitia.ir:443 2>/dev/null | openssl x509 -noout -dates

# Monitor PM2 logs for errors
pm2 logs kitia --lines 50

# Monitor Nginx access logs
tail -f /var/log/nginx/kitia.access.log

# Monitor Nginx error logs
tail -f /var/log/nginx/kitia.error.log
```

### 4.6 Rollback Procedure (if issues occur)

**If critical issues arise within 1 hour of DNS cutover:**

1. **Revert DNS immediately**:
   - Cloudflare Dashboard → DNS → Records
   - Change A record back to Vercel IP (or delete and restore CNAME)
   - Disable "Proxied" temporarily for faster propagation

2. **Keep VPS running** for investigation:

   ```bash
   # Check logs
   pm2 logs kitia --err --lines 200
   tail -100 /var/log/nginx/kitia.error.log

   # Check application
   curl -v http://localhost:3000

   # Check resources
   free -h
   df -h
   pm2 monit
   ```

3. **Debug and retry**:
   - Fix issues on VPS
   - Test locally: `curl http://VPS_IP` (if firewall allows)
   - Retry DNS cutover when ready

### 4.7 Verification Checklist

- [ ] DNS A record updated to VPS IP (87.107.108.75)
- [ ] DNS propagated globally (check whatsmydns.net)
- [ ] SSL certificate generated successfully
- [ ] HTTPS works: `https://kitia.ir` returns 200
- [ ] HTTP redirects to HTTPS
- [ ] www subdomain works
- [ ] Application loads correctly in browser
- [ ] Admin panel accessible
- [ ] Payment flow works (test transaction)
- [ ] Image uploads work (admin)
- [ ] Email notifications work
- [ ] SMS OTP works
- [ ] No errors in PM2 logs
- [ ] No errors in Nginx logs

---

## Phase 5: Monitoring & Optimization

**Duration**: Ongoing (7-day monitoring period)
**Risk**: Low (production is live on VPS)
**Rollback**: Revert DNS if severe issues

### 5.1 Install Monitoring Tools

```bash
# Install htop for resource monitoring
apt install -y htop

# Install iotop for disk I/O monitoring
apt install -y iotop

# Install netdata for comprehensive monitoring (optional)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
# Access at: http://87.107.108.75:19999
```

### 5.2 PM2 Plus (Optional Cloud Monitoring)

```bash
# Sign up for PM2 Plus (free tier): https://app.pm2.io/
# Link PM2 instance
pm2 link <secret_key> <public_key>

# This provides:
# - Real-time metrics
# - Error tracking
# - Custom metrics
# - Alerting
```

### 5.3 Log Rotation Setup

**Nginx logs** (already handled by logrotate):

```bash
# Check config
cat /etc/logrotate.d/nginx

# Manual rotation test
logrotate -f /etc/logrotate.d/nginx
```

**PM2 logs** (already configured with pm2-logrotate in Phase 1.3):

```bash
# Check status
pm2 conf pm2-logrotate

# Logs are in: /home/kitia/logs/
# Rotated when > 100MB, retained for 7 days
```

### 5.4 Performance Optimization

**A. Enable Node.js Production Optimizations**:

```bash
# Already set in ecosystem.config.js:
# NODE_ENV=production
# This enables:
# - Faster template caching
# - Less verbose error messages
# - Optimized resource loading
```

**B. Nginx Caching (Optional - for high traffic)**:

```nginx
# Add to /etc/nginx/sites-available/kitia.ir (inside http block)

# Cache configuration (uncomment if needed)
# proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=kitia_cache:10m max_size=1g inactive=60m use_temp_path=off;

# Then in location / block:
# proxy_cache kitia_cache;
# proxy_cache_valid 200 1m;
# proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
# add_header X-Cache-Status $upstream_cache_status;
```

**C. PM2 Instance Scaling** (if needed):

```bash
# Scale to 4 instances (for higher load)
pm2 scale kitia 4

# Or edit ecosystem.config.js → instances: 4
# Then: pm2 reload ecosystem.config.js
```

### 5.5 Daily Monitoring Routine

**Week 1 - Daily Checks**:

```bash
# System resources
htop
df -h
free -h

# PM2 status
pm2 status
pm2 logs kitia --lines 50 --err

# Nginx logs (check for errors)
tail -100 /var/log/nginx/kitia.error.log

# Check for failed systemd services
systemctl --failed

# Check disk I/O
iotop -o -b -n 3
```

**Automated Monitoring** (set up cron job):

```bash
# Create monitoring script
cat > /home/kitia/monitor.sh <<'EOF'
#!/bin/bash
DATE=$(date +"%Y-%m-%d %H:%M:%S")
echo "[$DATE] Monitoring Check"

# Check PM2 status
if ! pm2 pid kitia > /dev/null 2>&1; then
  echo "❌ PM2 process 'kitia' is not running!"
  pm2 restart kitia
fi

# Check disk space (alert if > 80%)
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
  echo "⚠️ Disk usage is at ${DISK_USAGE}%"
fi

# Check memory usage
MEM_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USAGE" -gt 90 ]; then
  echo "⚠️ Memory usage is at ${MEM_USAGE}%"
fi

echo "✅ All checks passed"
EOF

chmod +x /home/kitia/monitor.sh

# Add to crontab (run every 15 minutes)
crontab -e
# Add line:
# */15 * * * * /home/kitia/monitor.sh >> /home/kitia/logs/monitor.log 2>&1
```

### 5.6 Backup Strategy

**A. Database Backups** (Supabase handles this):

- Supabase automatic backups: 7-day retention (free tier)
- Manual backups: Supabase Dashboard → Database → Backups

**B. Application Code Backups**:

```bash
# Already handled by Git repository
# Ensure regular pushes to remote

# Daily cron to backup .env.production
cat > /home/kitia/backup-env.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/home/kitia/backups"
mkdir -p $BACKUP_DIR
cp /home/kitia/kitia/.env.production $BACKUP_DIR/.env.production.$(date +%Y%m%d)
# Keep last 7 days
find $BACKUP_DIR -name ".env.production.*" -mtime +7 -delete
EOF

chmod +x /home/kitia/backup-env.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line:
# 0 2 * * * /home/kitia/backup-env.sh
```

**C. Nginx Configuration Backup**:

```bash
# Backup Nginx config
cp /etc/nginx/sites-available/kitia.ir /home/kitia/backups/nginx-kitia.ir.conf
```

### 5.7 Alerting Setup (Optional)

**Simple Email Alerts** (using Resend):

```bash
# Create alert script
cat > /home/kitia/alert.sh <<'EOF'
#!/bin/bash
# Send email alert using Resend API
RESEND_API_KEY="re_2hC7ug9u_FyEgD87HBNxAMkYu6EHBemQX"
SUBJECT="$1"
MESSAGE="$2"

curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": \"alerts@kitia.ir\",
    \"to\": \"admin@kitia.ir\",
    \"subject\": \"$SUBJECT\",
    \"text\": \"$MESSAGE\"
  }"
EOF

chmod +x /home/kitia/alert.sh

# Usage: /home/kitia/alert.sh "Subject" "Message body"
```

### 5.8 Security Hardening

```bash
# Disable password authentication for SSH (key-only)
nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
systemctl restart ssh

# Install and configure logwatch (daily log summaries)
apt install -y logwatch
logwatch --detail high --mailto admin@kitia.ir --service all --range today

# Install ClamAV antivirus (optional)
apt install -y clamav clamav-daemon
freshclam
systemctl enable clamav-daemon
```

### 5.9 Verification Checklist (7-Day Period)

**Daily Checks**:

- [ ] PM2 status: all processes "online"
- [ ] No errors in PM2 logs
- [ ] No 500 errors in Nginx access logs
- [ ] Disk usage < 80%
- [ ] Memory usage < 90%
- [ ] CPU load average < 4.0
- [ ] Application accessible via HTTPS
- [ ] SSL certificate valid (90 days remaining)

**Weekly Checks**:

- [ ] Test complete user flow (register → browse → checkout → payment)
- [ ] Test admin panel (login → create product → upload images)
- [ ] Test email notifications (OTP, order confirmation)
- [ ] Test SMS OTP
- [ ] Review error logs for patterns
- [ ] Check for security updates: `apt update && apt list --upgradable`

**Critical Metrics** (set thresholds):

- Response time: < 500ms (p95)
- Uptime: > 99.9%
- Error rate: < 0.1%
- Memory usage: < 2.5GB
- Disk usage: < 20GB

---

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

````

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

## Phase 7: Post-Migration Optimization (Optional)

**Duration**: Ongoing
**Risk**: Low
**Goal**: Maximize performance and reliability

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
````

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

## Cost Comparison

### Vercel (Current)

- **Hobby Plan**: $0/month (if within limits)
- **Pro Plan**: $20/month per member (likely current)
- **Serverless Functions**: $40/month (estimated for API routes)
- **Bandwidth**: Included (100GB/month)
- **Build Time**: Included
- **Preview Deployments**: Included
- **Total**: ~$60-100/month

### VPS (New)

- **VPS Hosting**: ~$10-20/month (estimate for 4GB RAM VPS)
- **Bandwidth**: Usually unlimited or generous
- **Supabase**: $0/month (free tier, up to 500MB DB)
- **Cloudflare**: $0/month (free tier)
- **Upstash Redis**: $0/month (free tier)
- **Resend**: $0/month (free tier, 3000 emails/month)
- **R2 Storage**: $0/month (free tier, 10GB)
- **SSL**: $0/month (Let's Encrypt)
- **Total**: ~$10-20/month

**Savings**: $40-80/month (~60-80% cost reduction)

---

## Timeline Summary

| Phase                        | Duration                            | Cumulative      | Can Rollback?         |
| ---------------------------- | ----------------------------------- | --------------- | --------------------- |
| Phase 1: VPS Preparation     | 2 hours                             | 2 hours         | N/A                   |
| Phase 2: Nginx & SSL Setup   | 1 hour                              | 3 hours         | Yes (easy)            |
| Phase 3: PM2 Setup           | 30 min                              | 3.5 hours       | Yes (easy)            |
| Phase 4: DNS Cutover         | 30 min + DNS propagation (5-60 min) | 4-5 hours       | Yes (medium)          |
| Phase 5: Monitoring (7 days) | Ongoing                             | 7 days          | Yes (revert DNS)      |
| Phase 6: Vercel Decommission | 30 min                              | 7 days + 30 min | Yes (restore archive) |
| Phase 7: Optimization        | Ongoing                             | Ongoing         | N/A                   |

**Total Migration Time**: ~4-5 hours active work + 7 days monitoring

---

## Contact & Escalation

**If issues arise during migration**:

1. **Check logs first**:
   - PM2: `pm2 logs kitia --err --lines 200`
   - Nginx: `/var/log/nginx/kitia.error.log`
   - System: `journalctl -xe`

2. **Common issues and fixes**:
   - **502 Bad Gateway**: PM2 not running → `pm2 restart kitia`
   - **SSL errors**: Certbot failed → Re-run certbot command
   - **Out of memory**: Scale down PM2 instances → `pm2 scale kitia 1`
   - **Disk full**: Clean up logs → `pm2 flush` and check `/var/log`

3. **Emergency rollback**: Revert DNS to Vercel (see Rollback Strategy)

4. **Escalate to**: Senior DevOps engineer or infrastructure team

---

## Appendix: Additional Resources

### A. Useful Commands Cheat Sheet

```bash
# VPS Access
ssh root@87.107.108.75
su - kitia

# PM2 Management
pm2 status
pm2 logs kitia
pm2 restart kitia
pm2 reload kitia  # Zero-downtime
pm2 monit
pm2 info kitia

# Nginx Management
nginx -t  # Test config
systemctl status nginx
systemctl reload nginx
systemctl restart nginx
tail -f /var/log/nginx/kitia.access.log
tail -f /var/log/nginx/kitia.error.log

# System Monitoring
htop
df -h
free -h
uptime
iotop

# Git Operations
git pull origin main
git log --oneline -10
git reset --hard <commit>

# Build & Deploy
npm ci --omit=dev
npm run build
pm2 reload ecosystem.config.js
```

### B. Troubleshooting Guide

**Issue**: Application not starting

```bash
# Check Node.js version
node --version  # Should be v20.x

# Check dependencies
cd /home/kitia/kitia
npm ci --omit=dev

# Check .env.production exists
ls -la .env.production

# Check build
rm -rf .next
npm run build

# Try starting manually
npm start
```

**Issue**: High memory usage

```bash
# Check memory
free -h

# Check PM2 instances
pm2 list

# Scale down
pm2 scale kitia 1

# Restart to clear memory leaks
pm2 restart kitia
```

**Issue**: SSL certificate expired

```bash
# Renew manually
certbot renew --force-renewal

# Reload Nginx
systemctl reload nginx

# Check auto-renewal
systemctl status certbot.timer
```

### C. Security Checklist

- [ ] Firewall enabled (ufw)
- [ ] Fail2ban active (SSH protection)
- [ ] SSH password auth disabled (key-only)
- [ ] Root login disabled (use sudo)
- [ ] SSL certificates valid
- [ ] Automatic security updates enabled
- [ ] Nginx security headers configured
- [ ] Application runs as non-root user (kitia)
- [ ] Environment variables not in git
- [ ] Database credentials secured
- [ ] API keys rotated regularly

### D. Performance Checklist

- [ ] PM2 cluster mode enabled (2+ instances)
- [ ] Nginx gzip compression enabled
- [ ] Cloudflare CDN enabled (proxied)
- [ ] Static assets cached (long TTL)
- [ ] Database connection pooling (Supabase)
- [ ] Redis caching active (Upstash)
- [ ] Images optimized (Cloudflare Image Resizing)
- [ ] Build optimizations enabled (swcMinify)
- [ ] Unnecessary packages removed (--omit=dev)

---

## Conclusion

This migration plan provides a comprehensive, phased approach to moving Kitia from Vercel to VPS infrastructure. The strategy prioritizes:

1. **Safety**: Multiple verification checkpoints, rollback at every phase
2. **Minimal Downtime**: DNS cutover is instant, application pre-tested
3. **Reversibility**: Can rollback to Vercel at any point
4. **Cost Efficiency**: 60-80% cost reduction
5. **Production Quality**: PM2 clustering, Nginx optimization, SSL, monitoring

**Next Steps**:

1. Review this plan with the team
2. Schedule a maintenance window (preferably low-traffic period)
3. Execute Phase 1-3 (VPS preparation - no production impact)
4. Execute Phase 4 (DNS cutover - go live)
5. Monitor for 7 days (Phase 5)
6. Archive Vercel (Phase 6)
7. Optimize and improve (Phase 7)

**Estimated Total Cost**: $10-20/month (vs $60-100/month on Vercel)
**Estimated Total Time**: 4-5 hours active work + 7 days monitoring
**Risk Level**: Medium (DNS cutover), mitigated by rollback plan

---

**Document Version**: 1.0
**Last Updated**: 2025-12-25
**Author**: Migration Planning Team
**Status**: Ready for Execution
