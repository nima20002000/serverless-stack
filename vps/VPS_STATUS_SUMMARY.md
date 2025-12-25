# VPS Migration Status Summary

**Generated**: 2025-12-25
**VPS IP**: 87.107.108.75

---

## Executive Summary

The VPS is **partially configured** and currently serving the **payment proxy service** (Digipay gateway) on `payment.kitia.ir`. The infrastructure foundation is ready, but the main Kitia application has not been deployed yet.

**Key Point**: The VPS can safely run **both** payment proxy (port 3000) and Kitia (port 3001) simultaneously without conflicts. This provides a **zero-risk testing environment**.

---

## Current VPS State

### ✅ What's Working

| Component            | Status        | Details                                   |
| -------------------- | ------------- | ----------------------------------------- |
| **Operating System** | ✅ Active     | Ubuntu 24.04 LTS                          |
| **Node.js**          | ✅ Installed  | v20.19.6                                  |
| **npm**              | ✅ Installed  | 10.8.2                                    |
| **Nginx**            | ✅ Running    | 1.24.0, uptime 15+ hours                  |
| **PM2**              | ✅ Running    | Payment proxy service active              |
| **SSL**              | ✅ Configured | Let's Encrypt for payment.kitia.ir        |
| **Payment Proxy**    | ✅ Production | Port 3000, cluster mode, 13+ hours uptime |

### ❌ What's Not Configured

| Component            | Status            | Reason                             |
| -------------------- | ----------------- | ---------------------------------- |
| **Firewall (ufw)**   | ❌ Not enabled    | Security hardening pending         |
| **fail2ban**         | ❌ Not installed  | SSH brute-force protection pending |
| **Kitia user**       | ❌ Not created    | Running as `dexter` user           |
| **Kitia app**        | ❌ Not deployed   | Repository not cloned              |
| **kitia.ir Nginx**   | ❌ Not configured | Only payment-proxy config exists   |
| **kitia.ir SSL**     | ❌ Not obtained   | Requires DNS switch                |
| **PM2 log rotation** | ❌ Not configured | Logs will grow unbounded           |

### ⚠️ Current Risks

1. **No firewall** - SSH port 22 exposed to internet
2. **No fail2ban** - Vulnerable to SSH brute-force attacks
3. **Single point of failure** - No monitoring/alerting configured
4. **Log growth** - PM2 logs not rotated

**Mitigation**: Payment proxy is low-traffic, stable for 13+ hours. Risk is acceptable for short-term testing.

---

## System Resources

```
CPU: x86_64
RAM: 3.8GB total, 490MB used, 3.3GB available (13% utilization)
Disk: 35GB total, 7.0GB used, 26GB available (22% utilization)
Swap: 2.1GB available
```

**Capacity Analysis**:

- ✅ Sufficient for both payment proxy + Kitia
- ✅ Can run 2-3 PM2 instances without issues
- ✅ 26GB free disk space for logs, builds, uploads

---

## Active Services

### Payment Proxy (Production)

```
Process Name: payment-proxy
Status: Online
Uptime: 13+ hours
Restarts: 7 (stable after initial setup)
Port: 3000
Mode: Cluster (1 instance)
Memory: 86.1MB
CPU: 0%
Domain: payment.kitia.ir (HTTPS)
SSL: Let's Encrypt (valid)
Location: /home/dexter/payment-proxy
Branch: master
Last Commit: 4924a1f
Uncommitted: src/lib/digipay.ts (1 file)
```

**Purpose**: Proxies Digipay payment requests to bypass VPN/SSL issues.

**Health**: ✅ Stable, no errors in logs

---

## Git Status (Payment Proxy)

```bash
Repository: /home/dexter/payment-proxy
Branch: master
Last Commit: 4924a1f - "chore: add .gitignore and remove tracked build artifacts"
Uncommitted Changes: 1 file (src/lib/digipay.ts)
```

**Action Required**: Commit changes and tag stable version before Kitia migration.

---

## DNS Configuration

| Domain             | Points To           | Status                    |
| ------------------ | ------------------- | ------------------------- |
| `kitia.ir`         | Vercel              | ✅ Production (unchanged) |
| `www.kitia.ir`     | Vercel (CNAME)      | ✅ Production (unchanged) |
| `payment.kitia.ir` | VPS (87.107.108.75) | ✅ Active with SSL        |
| `cdn.kitia.ir`     | Cloudflare R2       | ✅ Active (unchanged)     |

**Safe State**: Main site (`kitia.ir`) on Vercel, subdomain (`payment.kitia.ir`) on VPS. No conflicts.

---

## Migration Plan Summary

### Phase 0: Create Revert Point ⭐ **DO THIS FIRST**

```bash
ssh vps
cd /home/dexter/payment-proxy
git add .
git commit -m "checkpoint: stable payment proxy before kitia migration"
git tag -a v1.0-stable -m "Stable payment proxy checkpoint"
git push origin master --tags
```

### Phase 1: Deploy Kitia (Port 3001, No DNS Change)

1. Clone Kitia repo → `/home/dexter/kitia`
2. Create `vps-migration-test` branch
3. Configure `.env.production` (port 3001)
4. Build and test locally
5. Start with PM2 as `kitia-test` process
6. Test at `http://87.107.108.75:3001`

**Risk**: ✅ Zero - isolated from payment proxy and production

### Phase 2: Test & Verify (24+ Hours)

1. Test all features (auth, payments, uploads, emails, SMS)
2. Monitor logs for errors
3. Verify payment proxy still works
4. Load testing (optional)

**Risk**: ✅ Low - not public yet

### Phase 3: Configure Nginx & SSL

1. Create `/etc/nginx/sites-available/kitia.ir`
2. Point to port 3001
3. Enable site
4. Obtain SSL certificate (after DNS switch)

**Risk**: ⚠️ Low - prep work only

### Phase 4: DNS Cutover

1. Change `kitia.ir` A record to VPS IP
2. Wait for propagation (5-60 min)
3. Obtain SSL cert via Certbot
4. Test HTTPS access

**Risk**: ⚠️ Medium - production DNS change

**Rollback**: Revert DNS to Vercel (5-60 min recovery)

### Phase 5: Monitor (7 Days)

1. Check logs daily
2. Test critical flows
3. Monitor resources
4. Keep Vercel active as backup

**Risk**: ⚠️ Medium - production on VPS

**Rollback**: DNS revert to Vercel

### Phase 6: Decommission Vercel (Optional, After 30 Days)

1. Archive Vercel project
2. Wait 30 days
3. Delete if VPS stable

**Risk**: ✅ Low - VPS proven stable

---

## Rollback Scenarios

### Scenario A: Kitia Won't Start (Phase 1)

**Impact**: None (payment proxy unaffected)

**Action**:

```bash
pm2 logs kitia-test --err
pm2 stop kitia-test
pm2 delete kitia-test
# Debug and retry
```

**Recovery Time**: Immediate

### Scenario B: DNS Switch Fails (Phase 4)

**Impact**: Main site (`kitia.ir`) affected, payment proxy OK

**Action**:

```bash
# Cloudflare Dashboard → DNS
# Revert A record to Vercel IP
```

**Recovery Time**: 5-60 minutes (DNS propagation)

### Scenario C: Payment Proxy Breaks (Accidental)

**Impact**: Payment proxy affected, main site OK (on Vercel)

**Action**:

```bash
cd /home/dexter/payment-proxy
git reset --hard v1.0-stable
pm2 restart payment-proxy
```

**Recovery Time**: 2 minutes

### Scenario D: Complete VPS Failure

**Impact**: Payment proxy down, main site OK (on Vercel)

**Action**:

- Vercel continues serving `kitia.ir`
- Payment proxy subdomain affected only
- Rebuild VPS or restore from backup

**Recovery Time**: N/A (Vercel handles traffic)

---

## Port Allocation Plan

| Port | Service            | Domain           | Status                       |
| ---- | ------------------ | ---------------- | ---------------------------- |
| 22   | SSH                | -                | ✅ Active                    |
| 80   | Nginx (HTTP)       | \*               | ✅ Active (redirects to 443) |
| 443  | Nginx (HTTPS)      | \*               | ✅ Active                    |
| 3000 | Payment Proxy      | payment.kitia.ir | ✅ Active (via Nginx)        |
| 3001 | Kitia (Test)       | (local only)     | ❌ Not deployed              |
| 3001 | Kitia (Prod)       | kitia.ir         | ❌ After DNS switch          |
| 8080 | Kitia (Test Nginx) | (optional)       | ❌ For testing               |

**Key Point**: Ports 3000 and 3001 do not conflict. Both can run simultaneously.

---

## Security Hardening TODO

**Critical** (do before production):

- [ ] Enable firewall: `ufw allow 22,80,443/tcp && ufw enable`
- [ ] Install fail2ban: `apt install fail2ban && systemctl enable fail2ban`
- [ ] Disable SSH password auth (key-only)
- [ ] Configure PM2 log rotation
- [ ] Set up monitoring/alerting

**Optional** (nice to have):

- [ ] Create dedicated `kitia` user
- [ ] Install ClamAV antivirus
- [ ] Set up automated backups
- [ ] Configure logwatch (daily summaries)

---

## Task Files Progress

| Task       | Phase                        | Status         | Completion |
| ---------- | ---------------------------- | -------------- | ---------- |
| task001.md | Phase 1: VPS Setup           | ⚠️ Partial     | ~40%       |
| task002.md | Phase 2: Nginx & SSL         | ⚠️ Partial     | ~30%       |
| task003.md | Phase 3: PM2 Setup           | ⚠️ Partial     | ~40%       |
| task004.md | Phase 4: DNS Cutover         | ❌ Not Started | 0%         |
| task005.md | Phase 5: Monitoring          | ❌ Not Started | 0%         |
| task006.md | Phase 6: Vercel Decommission | ❌ Not Started | 0%         |
| task007.md | Phase 7: Optimization        | ❌ Not Started | 0%         |

**Overall Progress**: ~15% (infrastructure ready, app deployment pending)

---

## Next Actions

### Immediate (Today)

1. ✅ **Create revert point** (commit + tag payment proxy)

   ```bash
   ssh vps
   cd /home/dexter/payment-proxy
   git add . && git commit -m "checkpoint: stable payment proxy"
   git tag -a v1.0-stable -m "Pre-migration checkpoint"
   git push origin master --tags
   ```

2. ⭐ **Get Kitia repository URL** from user

3. ⭐ **Deploy Kitia on port 3001** (follow VPS_MIGRATION_QUICKSTART.md)

### Short-term (This Week)

4. Test Kitia for 24+ hours
5. Configure Nginx for `kitia.ir`
6. Enable firewall and fail2ban
7. Configure PM2 log rotation

### Medium-term (Next Week)

8. Switch DNS to VPS
9. Obtain SSL for `kitia.ir`
10. Monitor for 7 days

### Long-term (After 30 Days)

11. Decommission Vercel (optional)
12. Set up automated deployments (CI/CD)
13. Performance optimization

---

## Documentation Files

| File                            | Purpose                                        |
| ------------------------------- | ---------------------------------------------- |
| **VPS_STATUS_SUMMARY.md**       | This file (status overview)                    |
| **VPS_REVERT_STRATEGY.md**      | Detailed rollback procedures & safety measures |
| **VPS_MIGRATION_QUICKSTART.md** | Fast-track deployment guide                    |
| **tasks/task001-007.md**        | Phase-by-phase detailed instructions           |
| **CREDENTIALS.md**              | Environment variables (local only, not on VPS) |

---

## Key Decisions Made

1. **Parallel deployment** (port 3001) instead of replacing payment proxy
2. **Testing branch** (`vps-migration-test`) instead of direct merge
3. **Dexter user initially** instead of creating dedicated user (faster testing)
4. **Cloudflare proxy enabled** for CDN and DDoS protection
5. **Gradual cutover** with 7-day monitoring period

---

## Contact & Access

- **VPS IP**: 87.107.108.75
- **SSH Alias**: `ssh vps` (already configured in local SSH config)
- **PM2 Logs**: `/home/dexter/.pm2/logs/`
- **Nginx Logs**: `/var/log/nginx/`
- **Payment Proxy**: `/home/dexter/payment-proxy`
- **Kitia (planned)**: `/home/dexter/kitia`

---

## Questions to Answer Before Proceeding

1. ❓ **Kitia repository URL?** (needed to clone)
2. ❓ **Dedicated user or dexter user?** (security vs speed)
3. ❓ **Timeline for DNS switch?** (after 24h testing or longer?)
4. ❓ **Keep payment proxy long-term?** (or migrate back to Vercel later?)

---

## Success Criteria

**Before DNS switch:**

- [x] VPS infrastructure ready (Node, Nginx, PM2)
- [x] Payment proxy stable
- [ ] Kitia deployed and tested on port 3001
- [ ] All features working (auth, payments, uploads)
- [ ] No errors in logs
- [ ] Stable for 24+ hours
- [ ] Firewall and fail2ban configured
- [ ] Backup/rollback plan tested

**Only switch DNS when ALL criteria met!**
