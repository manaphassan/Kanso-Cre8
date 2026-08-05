$shell = New-Object -ComObject Shell.Application
$folder = $shell.NameSpace("E:\Dev\Projects\SS-Brand-Assets\payload\Audio")
$f1 = $folder.ParseName("break.mp3")
$f2 = $folder.ParseName("breathing.mp3")
Write-Host "break.mp3 length: "$folder.GetDetailsOf($f1, 27)
Write-Host "breathing.mp3 length: "$folder.GetDetailsOf($f2, 27)
