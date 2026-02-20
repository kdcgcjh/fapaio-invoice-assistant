@echo off
title 发票识别助手 - 开发模式

echo ========================================
echo   发票识别助手 - 开发环境启动器
echo ========================================
echo.

:: 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到Node.js，请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

:: 显示Node.js版本
echo [信息] Node.js版本:
node --version
echo.

:: 检查npm是否可用
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] npm不可用
    pause
    exit /b 1
)

:: 启动开发服务器
echo [信息] 正在启动开发服务器...
echo.
npm run dev

:: 如果出错则暂停
if %errorlevel% neq 0 (
    echo.
    echo [错误] 启动失败，请检查错误信息
    pause
)