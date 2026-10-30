@echo off
rem Starts English For Children and opens it in the default browser.
cd /d "%~dp0"
if not exist node_modules call npm install
start "" http://localhost:5173
call npm run dev
