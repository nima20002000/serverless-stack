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
