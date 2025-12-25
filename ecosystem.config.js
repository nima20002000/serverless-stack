module.exports = {
  apps: [
    {
      name: 'kitia',
      script: 'npm',
      args: 'start',
      cwd: '/home/dexter/kitia',
      instances: 1, // Start with 1, can scale to 2 after stability confirmed
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
