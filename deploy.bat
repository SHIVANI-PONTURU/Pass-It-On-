@echo off
title Deploy Pass It On to Vercel
cd /d "%~dp0"
echo Deploying Pass It On to Vercel...
node scripts\deploy.mjs
echo.
pause
