$ErrorActionPreference = 'Stop'
$expectedRoot = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'KlavyeTrain'))
$actualRoot = [IO.Path]::GetFullPath($PSScriptRoot)
if ($actualRoot -ne $expectedRoot) {
  throw 'Kaldırma yalnızca kurulu klasörden yapılabilir: %LOCALAPPDATA%\KlavyeTrain\Kaldir.cmd'
}
# Only remove known application files, never unrelated files or browser records.
foreach ($name in @('index.html','version.json','Kaldir.cmd','ONCE-OKUYUN.txt','uninstall.ps1')) {
  $target = Join-Path $expectedRoot $name
  if (Test-Path -LiteralPath $target -PathType Leaf) { Remove-Item -LiteralPath $target -Force }
}
foreach ($folder in @([Environment]::GetFolderPath('Desktop'),[Environment]::GetFolderPath('Programs'))) {
  $shortcut = Join-Path $folder 'KlavyeTrain.url'
  if (Test-Path -LiteralPath $shortcut -PathType Leaf) {
    $expectedUri = [Uri]::new((Join-Path $expectedRoot 'index.html')).AbsoluteUri
    if ((Get-Content -LiteralPath $shortcut -Raw).Contains("URL=$expectedUri")) { Remove-Item -LiteralPath $shortcut -Force }
  }
}
Write-Output 'Uygulama kaldırıldı. Tarayıcıdaki çalışma kayıtlarınız silinmedi.'
