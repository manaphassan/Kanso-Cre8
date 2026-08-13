$t = Get-Content 'src\SS-CAM\Views\TaskManagerPage.xaml' -Raw
$matches = [regex]::Matches($t, '(?:Text|Content|ToolTip|Header|Tag|Title|PlaceholderText)\s*=\s*"([^"]*)"')
foreach ($m in $matches) {
    foreach ($ch in $m.Groups[1].Value.ToCharArray()) {
        if ([int]$ch -gt 255) {
            Write-Host "Match:" $m.Value "Code:" ([int]$ch)
        }
    }
}
