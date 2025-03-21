@echo off
chcp 65001 >nul

:: Устанавливаем текущую директорию как путь, где находится этот скрипт
set "script_dir=%~dp0"

:: Переход в директорию frontend и запуск фронтенд приложения
set "backend_path=%script_dir%backend"
cd /d "%backend_path%"
if exist package.json (
    echo Запуск frontend...
    npm start >nul 2>&1
) else (
    echo Ошибка: Файл package.json не найден в папке backend.
    exit /b 1
)

:: Завершение
exit /b 0
