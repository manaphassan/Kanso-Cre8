Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

Write-Host "Testing break.ogg playback in WPF MediaPlayer:"
$p1 = "E:\Dev\Projects\SS-Brand-Assets\payload\Audio\break.ogg"
$mp1 = New-Object System.Windows.Media.MediaPlayer
$mp1.add_MediaFailed({
    param($s, $e)
    Write-Host "   [FAIL] break.ogg MediaFailed: $($e.ErrorException)" -ForegroundColor Red
})
$mp1.add_MediaOpened({
    param($s, $e)
    Write-Host "   [OK] break.ogg MediaOpened!" -ForegroundColor Green
})
$mp1.Open((New-Object System.Uri($p1, [System.UriKind]::Absolute)))

Write-Host "`nTesting break.mp3 playback in WPF MediaPlayer:"
$p2 = "E:\Dev\Projects\SS-Brand-Assets\payload\Audio\break.mp3"
$mp2 = New-Object System.Windows.Media.MediaPlayer
$mp2.add_MediaFailed({
    param($s, $e)
    Write-Host "   [FAIL] break.mp3 MediaFailed: $($e.ErrorException)" -ForegroundColor Red
})
$mp2.add_MediaOpened({
    param($s, $e)
    Write-Host "   [OK] break.mp3 MediaOpened!" -ForegroundColor Green
})
$mp2.Open((New-Object System.Uri($p2, [System.UriKind]::Absolute)))

$start = [DateTime]::Now
while (([DateTime]::Now - $start).TotalSeconds -lt 2) {
    [System.Windows.Threading.Dispatcher]::CurrentDispatcher.Invoke([Action]{}, [System.Windows.Threading.DispatcherPriority]::Background)
    Start-Sleep -Milliseconds 50
}
