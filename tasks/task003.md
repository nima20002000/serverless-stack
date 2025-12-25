## Phase 3: PM2 Process Manager Setup

**Duration**: ~30 minutes
**Risk**: Low (local testing only)
**Rollback**: `pm2 delete kitia`

**STATUS**: ⚠️ PARTIALLY COMPLETE (payment proxy configured)

**CURRENT STATE**:

- ✅ PM2 installed globally
- ✅ Payment proxy running in cluster mode (1 instance, port 3000)
- ❌ Kitia app not yet configured

**IMPORTANT**: Use different process name and port for Kitia to avoid conflicts.

### 3.1 Create PM2 Ecosystem File

**STATUS**: ❌ NOT STARTED

```bash
# Navigate to kitia directory (using dexter user initially)
cd /home/dexter/kitia

# Create PM2 ecosystem configuration
nano ecosystem.config.js
```

**PM2 Ecosystem Configuration** (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [
    {
      name: 'kitia-test', // Different name to avoid conflicts
      script: 'npm',
      args: 'start',
      cwd: '/home/dexter/kitia', // Update path based on user choice
      instances: 1, // Start with 1 instance for testing (can scale later)
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001, // Different port - payment proxy uses 3000
      },
      env_file: '.env.production',
      error_file: '/home/dexter/logs/kitia-error.log',
      out_file: '/home/dexter/logs/kitia-out.log',
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

**NOTE**:

- Port 3001 (not 3000) to avoid conflict with payment proxy
- Process name `kitia-test` to distinguish from payment-proxy
- Start with 1 instance for testing, scale to 2 after stability confirmed

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

**COMPLETED**:

- [x] PM2 installed and running
- [x] Payment proxy service stable

**PENDING**:

- [ ] PM2 ecosystem file created for Kitia
- [ ] Logs directory created: `/home/dexter/logs` (or `/home/kitia/logs`)
- [ ] Kitia application started: `pm2 status` shows "kitia-test: online"
- [ ] Local access works: `curl http://localhost:3001` returns HTML
- [ ] PM2 process saved for auto-start
- [ ] No errors in logs: `pm2 logs kitia-test`
- [ ] Payment proxy still running: `pm2 list` shows both services

---
