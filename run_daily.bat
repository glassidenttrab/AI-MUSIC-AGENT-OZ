@echo off
REM AI MUSIC AGENT OZ - Daily Automation Wrapper
cd /d "f:\ProJectHome\AI MUSIC AGENT OZ"
"C:\Program Files\nodejs\node.exe" src/apps/master_scheduler.js >> scheduler_auto.log 2>&1
