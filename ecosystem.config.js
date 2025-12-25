module.exports = {
  apps: [
    {
      name: 'kitia',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      cwd: '/home/dexter/kitia',
      instances: 2, // 2 instances for zero-downtime rolling reloads
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
      min_uptime: '30s',
      max_restarts: 5,
      restart_delay: 5000,
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,
    },
  ],
};
