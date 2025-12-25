## Phase 2: Nginx Configuration & SSL Setup

**Duration**: ~1 hour
**Risk**: Low (VPS not yet in DNS)
**Rollback**: Delete Nginx config, restart Nginx

**STATUS**: ⚠️ PARTIALLY COMPLETE (payment proxy configured)

**CURRENT STATE**:

- ✅ Nginx installed and running
- ✅ SSL configured for `payment.kitia.ir`
- ❌ No configuration for `kitia.ir` yet

**IMPORTANT**: Payment proxy already uses port 3000. Kitia must use port 3001.

### 2.1 Create Nginx Configuration for Kitia

**STATUS**: ❌ NOT STARTED

**EXISTING CONFIG**: `/etc/nginx/sites-available/payment-proxy` (active on port 3000)

```bash
# Switch to root (if needed)
sudo su

# Create Nginx site configuration
nano /etc/nginx/sites-available/kitia.ir
```

**Nginx Configuration** (`/etc/nginx/sites-available/kitia.ir`):

```nginx
# Upstream to Node.js PM2 cluster
upstream kitia_backend {
    # PM2 cluster mode will spawn multiple instances
    # Nginx will load balance between them
    # NOTE: Port 3001 to avoid conflict with payment-proxy (port 3000)
    server 127.0.0.1:3001;
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

**COMPLETED**:

- [x] Certbot installed
- [x] SSL certificate exists for payment.kitia.ir
- [x] Nginx running successfully
- [x] Payment proxy nginx config active

**PENDING**:

- [ ] Nginx config created: `/etc/nginx/sites-available/kitia.ir`
- [ ] Symlink created: `/etc/nginx/sites-enabled/kitia.ir`
- [ ] Nginx config test passed: `nginx -t`
- [ ] Certbot auto-renewal timer verified
- [ ] SSL certificate for kitia.ir obtained (after DNS switch)

---
