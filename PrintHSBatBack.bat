@echo off
chcp 65001 >nul

:: Устанавливаем текущую директорию как путь, где находится этот скрипт
set "script_dir=%~dp0"

:: Переход в директорию backend и запуск серверного приложения
set "backend_path=%script_dir%backend\src"
cd /d "%backend_path%"
if exist server.js (
    echo Запуск backend...
    node server.js >nul 2>&1
) else (
    echo Ошибка: Файл server.js не найден в папке backend\src.
    exit /b 1
)

:: Завершение
exit /b 0
