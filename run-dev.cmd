@echo off
set "JAVA_HOME=C:\Users\i213\.jdks\openjdk-25.0.2"
set "PATH=%JAVA_HOME%\bin;%PATH%"
call "C:\Users\i213\Desktop\quickmart\Roadsidegarage-main\Roadsidegarage-main\mvnw.cmd" -f "C:\Users\i213\Desktop\quickmart\Roadsidegarage-main\Roadsidegarage-main\pom.xml" spring-boot:run
