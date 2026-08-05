Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$path = "E:\Dev\Projects\SS-Brand-Assets\payload\Audio\break.mp3"
Write-Host "Testing break.mp3 path: $path"

$player = New-Object System.Windows.Media.MediaPlayer

$player.add_MediaFailed({
    param($sender, $e)
    Write-Host "MediaFailed: $($e.ErrorException)" -ForegroundColor Red
})

$player.add_MediaOpened({
    param($sender, $e)
    Write-Host "MediaOpened successfully!" -ForegroundColor Green
    $player.Play()
})

$uri = New-Object System.Uri($path, [System.UriKind]::Absolute)
$player.Open($uri)
$player.Volume = 1.0

# Keep dispatcher alive for 3 seconds
$start = [DateTime]::Now
while (([DateTime]::Now - $start).TotalSeconds -lt 3) {
    [System.Windows.Threading.Dispatcher]::CurrentDispatcher.Invoke([Action]{}, [System.Windows.Threading.DispatcherPriority]::Background)
    Start-Sleep -Milliseconds 50
}

Write-Host "Player position: $($player.Position)"
$player.Close()
