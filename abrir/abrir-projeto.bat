@echo off
setlocal
chcp 65001 >nul
title Bloom - Iniciar projeto
rem ---- Vai para a pasta do projeto (funciona com o .bat na raiz ou numa subpasta, como "abrir")
cd /d "%~dp0"
if not exist "package.json" cd ..
if not exist "package.json" (
    echo Nao encontrei a pasta do projeto. Deixe este arquivo na pasta do Bloom ou numa subpasta dela.
    pause
    exit /b 1
)

echo ==============================================
echo   Bloom - Iniciar o projeto
echo ==============================================
echo.

where node >nul 2>&1 || (echo O Node.js nao esta instalado. Baixe em https://nodejs.org & pause & exit /b 1)
where java >nul 2>&1 || (echo O Java nao esta instalado. Instale o Java 17 ou mais novo. & pause & exit /b 1)

echo Deixe o MySQL ligado antes de continuar.
echo.

rem ---- Usuario (Enter = root) e senha (escondida ao digitar; Enter = sem senha) que a API vai usar
set "DB_USER=root"
set /p "DB_USER=Usuario do MySQL [root]: "
set "DB_PASSWORD="
set "PWF=%TEMP%\bloom-senha-%RANDOM%.txt"
powershell -NoProfile -Command "$s = Read-Host 'Senha do MySQL (Enter se nao tiver)' -AsSecureString; $p = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)); [IO.File]::WriteAllText($env:PWF, $p)"
if exist "%PWF%" (
    set /p DB_PASSWORD=<"%PWF%"
    del "%PWF%" >nul 2>&1
)
echo.

if not exist "node_modules" (
    echo Instalando as dependencias do front-end, so na primeira vez...
    call npm install || (echo Falha no npm install. & pause & exit /b 1)
    echo.
)

echo Abrindo a API (back-end) em outra janela...
start "Bloom - API (porta 3000)" cmd /k "npm run backend"

echo Abrindo o site (front-end) em outra janela...
start "Bloom - Site (porta 4200)" cmd /k "npm start -- --open"

echo.
echo Pronto! O navegador abre sozinho em http://localhost:4200 quando o site terminar de carregar.
echo Para parar, feche as janelas "Bloom - API" e "Bloom - Site".
echo.
pause
endlocal
