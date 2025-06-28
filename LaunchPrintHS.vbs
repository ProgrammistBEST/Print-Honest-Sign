Set WshShell = CreateObject("WScript.Shell")

' Получаем путь к текущей директории
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Функция для проверки занятости порта
Function IsPortInUse(port)
    Dim result
    On Error Resume Next
    ' Выполняем команду netstat для проверки порта
    result = WshShell.Run("cmd.exe /c netstat -ano | findstr :" & port, 0, True)
    If result = 0 Then
        IsPortInUse = True ' Порт занят
    Else
        IsPortInUse = False ' Порт свободен
    End If
    On Error GoTo 0
End Function

' Проверка портов 6501 и 6502
port6501InUse = IsPortInUse(6501)
port6502InUse = IsPortInUse(6502)

If Not port6501InUse Then
    WshShell.Run "cmd.exe /c """ & currentDir & "\Start.bat""", 0, False
End If

WshShell.Run "http://localhost:6501", 1, False

' Запуск Start.bat в скрытом режиме
WshShell.Run "cmd.exe /c """ & currentDir & "\Start.bat""", 0, False

' Открываем браузер с localhost:6501 (независимо от состояния портов)
WshShell.Run "http://localhost:6501", 1, False