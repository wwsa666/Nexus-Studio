@echo off
echo Starting Nexus Studio in Development Mode...

REM 尝试将常见的 Node.js 安装路径添加到 PATH
set "PATH=C:\Program Files\nodejs;%PATH%"

REM 启动开发服务器
npm run electron:dev

pause
