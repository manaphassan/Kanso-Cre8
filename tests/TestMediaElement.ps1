Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$app = [System.Windows.Application]::Current
if (-not $app) { $app = New-Object System.Windows.Application }

$me = New-Object System.Windows.Controls.MediaElement
$me.LoadedBehavior = [System.Windows.Controls.MediaState]::Manual
$me.UnloadedBehavior = [System.Windows.Controls.MediaState]::Stop

$p = "E:\Dev\Projects\SS-Brand-Assets\payload\Audio\break.mp3"
$me.Source = New-Object System.Uri($p, [System.UriKind]::Absolute)

$me.add_MediaOpened({
    Write-Host "[SUCCESS] MediaElement opened break.mp3 cleanly!" -ForegroundColor Green
})

$win = New-Object System.Windows.Window
$win.Content = $me
$win.Width = 100
$win.Height = 100
$win.Show()

$me.Play()

$start = [DateTime]::Now
while (([DateTime]::Now - $start).TotalSeconds -lt 2) {
    [System.Windows.Threading.Dispatcher]::CurrentDispatcher.Invoke([Action]{}, [System.Windows.Threading.DispatcherPriority]::Background)
    Start-Sleep -Milliseconds 50
}
$win.Close()
