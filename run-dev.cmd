@echo off
rem Portable dev launcher: uses JAVA_HOME if set, otherwise the newest JDK found in %USERPROFILE%\.jdks
if not defined JAVA_HOME (
  for /f "delims=" %%D in ('dir /b /ad /o-n "%USERPROFILE%\.jdks\openjdk-*" 2^>nul') do (
    if not defined JAVA_HOME set "JAVA_HOME=%USERPROFILE%\.jdks\%%D"
  )
)
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"
call "%~dp0mvnw.cmd" -f "%~dp0pom.xml" spring-boot:run
