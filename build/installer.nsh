!macro customInstall
  DetailPrint "Refreshing Windows Tile Cache..."
  ; 使用 WScript.Shell 打开并保存快捷方式，强制刷新 AUMID 和 Manifest 链接
  ${If} ${FileExists} "$SMPROGRAMS\Nexus Studio.lnk"
    ; 注意: 在 NSIS 中，$ 符号需要转义为 $$，否则会被当做 NSIS 变量处理
    nsExec::Exec 'powershell -NoProfile -WindowStyle Hidden -Command "$$s=(New-Object -COM WScript.Shell).CreateShortcut(''$SMPROGRAMS\Nexus Studio.lnk'');$$s.Save()"'
  ${EndIf}
!macroend
