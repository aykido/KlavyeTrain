param(
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA 'KlavyeTrain'),
  [switch]$NoShortcuts
)
$ErrorActionPreference = 'Stop'
$requiredFiles = @('index.html', 'version.json', 'Kaldir.cmd', 'uninstall.ps1', 'ONCE-OKUYUN.txt')
foreach ($file in $requiredFiles) {
  if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot $file) -PathType Leaf)) {
    throw "Paket eksik: $file. ZIP dosyasını bir klasöre çıkardıktan sonra Kur.cmd dosyasını çalıştırın."
  }
}
$destination = [IO.Path]::GetFullPath($InstallRoot)
if ($destination -eq [IO.Path]::GetPathRoot($destination)) { throw 'Disk köküne kurulum yapılamaz.' }
New-Item -ItemType Directory -Path $destination -Force | Out-Null
foreach ($file in $requiredFiles) {
  $source = Join-Path $PSScriptRoot $file
  $target = Join-Path $destination $file
  if ([IO.Path]::GetFullPath($source) -ne [IO.Path]::GetFullPath($target)) { Copy-Item -LiteralPath $source -Destination $target -Force }
}
if (-not $NoShortcuts) {
  $uri = [Uri]::new((Join-Path $destination 'index.html')).AbsoluteUri
  foreach ($folder in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
    $shortcut = Join-Path $folder 'KlavyeTrain.url'
    "[InternetShortcut]`r`nURL=$uri`r`n" | Set-Content -LiteralPath $shortcut -Encoding ASCII
  }
}
$version = (Get-Content -Raw -LiteralPath (Join-Path $destination 'version.json') -Encoding UTF8 | ConvertFrom-Json).version
Write-Output "Türkçe Klavye Antrenörü v$version kuruldu."
Write-Output 'Hazırlayan: Aykut BOZALAN'
Write-Output "Konum: $destination"
Write-Output 'Masaüstündeki KlavyeTrain kısayoluyla başlayabilirsiniz. Yönetici yetkisi gerekmez.'
