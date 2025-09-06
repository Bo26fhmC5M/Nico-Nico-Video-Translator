@echo off
pushd %~dp0
cmd /c npm install
node --use-system-ca app.js 
pause