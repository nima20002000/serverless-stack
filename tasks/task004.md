## Phase 4: DNS Cutover & SSL Setup

**Duration**: ~30 minutes (plus DNS propagation 5-60 minutes)
**Risk**: Medium (DNS change affects production)
**Rollback**: Revert DNS A record to Vercel IP

**STATUS**: ❌ NOT STARTED

**CRITICAL**: Do NOT proceed until:

1. ✅ Kitia runs stable on port 3001 for 24+ hours
2. ✅ All features tested and working
3. ✅ Payment proxy still functioning (regression test)

**CURRENT DNS STATE**:

- `kitia.ir` → Vercel (production)
- `payment.kitia.ir` → VPS (87.107.108.75, active)
- No changes needed until Kitia is ready

### 4.1 Pre-Cutover Verification

**CRITICAL CHECKPOINT**: Create payment proxy backup before proceeding!

```bash
# 1. FIRST: Backup payment proxy state (on VPS)
ssh vps
cd /home/dexter/payment-proxy
git add .
git commit -m "checkpoint: stable payment proxy before kitia DNS cutover"
git tag -a v1.0-stable -m "Stable payment proxy - pre-kitia-dns-switch"
git push origin master --tags
```

**Before changing DNS, verify:**

```bash
# On VPS: Check PM2 is running (both services)
pm2 status

# Check Kitia responds locally
curl -I http://localhost:3001

# Check payment proxy still works
curl -I http://localhost:3000
curl -I https://payment.kitia.ir

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
