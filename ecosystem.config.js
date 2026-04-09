module.exports = {
  apps: [
    {
      name: 'OZ_MUSIC_MASTER_SCHEDULER',
      script: 'master_scheduler.js',
      // 인스턴스 개수 (단일 백그라운드 스케줄러이므로 1로 고정)
      instances: 1,
      // 프로세스가 죽을 경우 1초 만에 자동 재시작 (불사조 모드 핵심 기능)
      autorestart: true,
      // 파일 변경 감지 후 재시작 여부 (직접 파일 수정 시 재시작되지 않도록 false 설정)
      watch: false,
      // 메모리 누수 방지 (1GB 이상 사용 시 재시작)
      max_memory_restart: '1G',
      // 환경변수
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'OZ_HEALTH_CHECK',
      script: 'health_check.js',
      // 4시간마다 한 번씩 실행 (크론 형식: 분 시 일 월 요일)
      cron_restart: '0 */4 * * *',
      // 즉시 실행 후 종료되므로 자동 재시작 방지 (크론에 의해서만 실행되도록)
      autorestart: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
