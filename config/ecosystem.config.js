module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || 'commerce-boilerplate',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: process.env.APP_DIR || process.cwd(),
      instances: Number(process.env.PM2_INSTANCES || 2),
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '.env.production',
      error_file: process.env.PM2_ERROR_LOG || './logs/app-error.log',
      out_file: process.env.PM2_OUT_LOG || './logs/app-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      min_uptime: '30s',
      max_restarts: 5,
      restart_delay: 5000,
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,
    },
  ],
};
