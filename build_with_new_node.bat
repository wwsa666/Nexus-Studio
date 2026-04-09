@echo off
echo ==========================================
echo Nexus Studio Build Script
echo ==========================================

REM 尝试将常见的 Node.js 安装路径添加到 PATH
set "PATH=C:\Program Files\nodejs;%PATH%"

REM 检查 Node 版本
echo Checking Node.js version...
node --version

REM 检查是否满足版本要求 (简单检查是否不是 v14)
node -e "if(process.version.startsWith('v14')) { console.error('Error: Node.js version is too old. Please install Node.js 18+'); process.exit(1); }"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Deteced old Node.js version.
    echo Please make sure Node.js v18+ is installed at C:\Program Files\nodejs
    pause
    exit /b 1
)

echo.
echo Starting Build Process...

echo 0. Cleaning up...
taskkill /F /IM "Nexus Studio.exe" >nul 2>&1
if exist release (
    echo Removing release folder...
    rmdir /s /q release
)

echo 1. Building Renderer (Frontend)...
call npx vite build -c vite.config.renderer.ts
if %errorlevel% neq 0 goto error

echo.
echo 2. Building Electron (Main Process)...
call npx vite build -c vite.config.electron.ts
if %errorlevel% neq 0 goto error

echo.
echo 3. Packaging Application...
call npx electron-builder
if %errorlevel% neq 0 goto error

echo.
echo ==========================================
echo Build Success!
echo Output: release\Nexus Studio Setup 1.0.0.exe
echo ==========================================
pause
exit /b 0

:error
echo.
echo [ERROR] Build Failed!
pause
exit /b 1
