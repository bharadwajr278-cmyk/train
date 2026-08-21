@echo off
title RailVista Launcher
start "RailVista Server" /D "%~dp0local-demo" cmd.exe /k python -m http.server 3000 --bind 0.0.0.0
timeout /t 3 /nobreak >nul
start "" http://localhost:3000/
