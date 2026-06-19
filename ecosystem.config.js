module.exports = {
  apps: [
    {
      name: 'OZ_MUSIC_MASTER_SCHEDULER',
      script: 'src/apps/master_scheduler.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'OZ_HEALTH_CHECK',
      script: 'src/apps/health_check.js',
      cron_restart: '0 */4 * * *',
      autorestart: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'oz_cafe_publish',
      script: 'publish_oz_cafe.js',
      cron_restart: '0 2 * * *', // 매일 새벽 2시 정각에 자동 실행
      autorestart: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
