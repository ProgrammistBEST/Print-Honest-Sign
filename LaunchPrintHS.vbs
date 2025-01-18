Set WshShell = CreateObject("WScript.Shell")

' Получаем путь к текущей директории
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Запуск PrintHSBatFront.bat в скрытом режиме
WshShell.Run "cmd.exe /c """ & currentDir & "\PrintHSBatFront.bat""", 0, False

' Запуск PrintHSBatBack.bat в скрытом режиме
WshShell.Run "cmd.exe /c """ & currentDir & "\PrintHSBatBack.bat""", 0, False
