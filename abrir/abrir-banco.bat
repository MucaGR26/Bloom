@echo off
setlocal
chcp 65001 >nul
title Bloom - Banco de dados
rem ---- Vai para a pasta do projeto (funciona com o .bat na raiz ou numa subpasta, como "abrir")
cd /d "%~dp0"
if not exist "package.json" cd ..
if not exist "package.json" (
    echo Nao encontrei a pasta do projeto. Deixe este arquivo na pasta do Bloom ou numa subpasta dela.
    pause
    exit /b 1
)

echo ==============================================
echo   Bloom - Banco de dados
echo ==============================================
echo.

rem ---- Procura o cliente do MySQL (PATH, XAMPP, MySQL Server ou MariaDB)
set "MYSQL="
for /f "delims=" %%m in ('where mysql 2^>nul') do if not defined MYSQL set "MYSQL=%%m"
if not defined MYSQL if exist "C:\xampp\mysql\bin\mysql.exe" set "MYSQL=C:\xampp\mysql\bin\mysql.exe"
if not defined MYSQL for /d %%d in ("%ProgramFiles%\MySQL\MySQL Server*") do if exist "%%d\bin\mysql.exe" set "MYSQL=%%d\bin\mysql.exe"
if not defined MYSQL for /d %%d in ("%ProgramFiles%\MariaDB*") do if exist "%%d\bin\mysql.exe" set "MYSQL=%%d\bin\mysql.exe"
if not defined MYSQL (
    echo Nao encontrei o mysql.exe. Instale o MySQL ou coloque a pasta bin dele no PATH.
    pause
    exit /b 1
)
echo MySQL encontrado em: %MYSQL%
echo.

rem ---- Usuario: pergunta se usa o root automaticamente; se nao, pede o nome.
set "DB_USER=root"
choice /c SN /n /m "Usar o usuario root automaticamente? [S/N]: "
if errorlevel 2 set /p "DB_USER=Usuario do MySQL: "
echo Usuario: %DB_USER%

rem ---- Senha: pergunta se o MySQL esta sem senha (padrao do XAMPP); se nao, pede a senha
rem      escondida ao digitar. Ela vai direto para um arquivo temporario, para nao aparecer
rem      na tela nem na linha de comando.
set "CNF=%TEMP%\bloom-mysql-%RANDOM%.cnf"
choice /c SN /n /m "O MySQL esta sem senha? [S/N]: "
if errorlevel 2 (
    powershell -NoProfile -Command "$s = Read-Host 'Senha do MySQL (Enter se nao tiver)' -AsSecureString; $p = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)); $q = [char]34; [IO.File]::WriteAllText($env:CNF, '[client]' + [Environment]::NewLine + 'user=' + $env:DB_USER + [Environment]::NewLine + 'password=' + $q + $p + $q + [Environment]::NewLine)"
) else (
    > "%CNF%" echo [client]
    >> "%CNF%" echo user=%DB_USER%
    >> "%CNF%" echo password=""
)
if not exist "%CNF%" (
    echo Nao foi possivel ler a senha.
    pause
    exit /b 1
)

echo.
echo Criando o banco "bloom" e as tabelas (Script do banco\criar_tabelas.sql)...
"%MYSQL%" --defaults-extra-file="%CNF%" --default-character-set=utf8mb4 < "Script do banco\criar_tabelas.sql"
if errorlevel 1 (
    del "%CNF%" >nul 2>&1
    echo.
    echo Nao deu certo. Confira se o MySQL esta ligado e se o usuario e a senha estao certos.
    pause
    exit /b 1
)
echo Pronto: banco e tabelas criados.
echo.
echo Abrindo o MySQL no banco "bloom". Exemplos:
echo    SHOW TABLES;
echo    SELECT nome, email, criado_em FROM usuarios;
echo Para sair, digite: exit
echo.
"%MYSQL%" --defaults-extra-file="%CNF%" --default-character-set=utf8mb4 bloom
del "%CNF%" >nul 2>&1
endlocal
