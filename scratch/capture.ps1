$exe = 'src\SS-CAM\bin\Release\SS-CAM.exe'
$proc = Start-Process -FilePath $exe -PassThru
Start-Sleep -Seconds 3
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap(1280, 800)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen(0, 0, 0, 0, (New-Object System.Drawing.Size(1280, 800)))
$out = "$PWD\scratch\titlebar_flush_check.png"
$bmp.Save($out)
Stop-Process -Id $proc.Id -Force
Write-Host "Captured screenshot to $out"
