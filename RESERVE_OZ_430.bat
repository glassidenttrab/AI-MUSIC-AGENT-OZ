@echo off
title [RESERVE] AI MUSIC AGENT OZ - Hybrid Auto-Start
cd /d "%~dp0"

echo ==================================================
echo   🎷 AI MUSIC AGENT [OZ] 예약 가동 시스템
echo ==================================================
echo.
echo [현재 시간] %TIME%
echo [가동 예정] 16:30:00 (유튜브 쿼터 리셋 대응)
echo.
echo 이 창을 켜두시면 오후 4시 30분에 하이브리드 지능이
echo 자동으로 깨어나 제작 및 업로드를 시작합니다.
echo.
echo ==================================================

:WAIT_LOOP
set "CURRENT_TIME=%TIME: =0%"
set "HOUR=%CURRENT_TIME:~0,2%"
set "MIN=%CURRENT_TIME:~3,2%"

:: 오후 4시 30분(16:30) 체크
if "%HOUR%" GEQ "16" (
    if "%MIN%" GEQ "30" (
        goto :START_OZ
    )
)

timeout /t 60 /nobreak > nul
goto :WAIT_LOOP

:START_OZ
echo.
echo 🚀 [TIME HIT] 쿼터 리셋 감지! 하이브리드 OZ 소환...
call OZ_START.bat
exit
