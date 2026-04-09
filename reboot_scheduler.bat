@echo off
TITLE [AI MUSIC AGENT OZ] PM2 Scheduler Launcher
cd /d "f:\ProJectHome\AI MUSIC AGENT OZ"

echo ==================================================
echo [AI MUSIC AGENT OZ] PM2 (불사조 모드) 가동 시작...
echo ==================================================

:: 백그라운드 구동을 위해 기존 락 파일이 있다면 제거
if exist master.lock del master.lock
if exist scheduler.lock del scheduler.lock

:: 만약 찌꺼기 프로세스가 존재하면 끄고 재등록 (에러 무시)
call pm2 delete OZ_MASTER_SCHEDULER 2>nul
call pm2 start ecosystem.config.js
call pm2 save

echo.
echo ✅ 상시 가동 스케줄러가 백그라운드에 안착했습니다!
echo 이 창을 닫아도 프로세스는 죽지 않고 24시간 자율 가동됩니다.
echo 프로세스 상태 모니터링은 터미널 창(PowerShell 등)에서
echo pm2 status 혹은 pm2 logs 치시면 언제든 확인할 수 있습니다!
echo ==================================================
pause
