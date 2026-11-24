@echo off
setlocal
chcp 65001 >nul
title Bloom - Projeto (API + site)
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

rem ---- API (back-end): roda escondida nesta mesma janela, com o log num arquivo
set "LOG=%TEMP%\bloom-api.log"
echo Iniciando a API (back-end)... o log fica em %LOG%
start "" /b cmd /c npm run backend ^> "%LOG%" 2^>^&1

rem ---- Espera a API responder em /api/health (ate uns 2 minutos; a primeira vez demora mais)
set /a TENTATIVAS=0
:esperar_api
ping -n 3 127.0.0.1 >nul
curl -s -o nul http://localhost:3000/api/health && goto api_ok
set /a TENTATIVAS+=1
if %TENTATIVAS% geq 60 goto api_falhou
goto esperar_api

:api_falhou
echo.
echo A API nao subiu. Ultimas linhas do log:
echo ----------------------------------------------
powershell -NoProfile -Command "Get-Content -Tail 25 $env:LOG"
echo ----------------------------------------------
echo Confira se o MySQL esta ligado e se o usuario e a senha estao certos.
pause
exit /b 1

:api_ok
echo API no ar em http://localhost:3000
echo.

rem ---- Site (front-end): roda nesta janela; o navegador abre sozinho
echo Iniciando o site (front-end)... o navegador abre sozinho em http://localhost:4200
echo Para parar tudo (site e API), feche esta janela ou aperte Ctrl+C.
echo.
call npm start -- --open
endlocal
