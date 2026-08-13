$t = Get-Content 'src\SS-CAM\Views\TaskManagerPage.xaml'
for ($i = 0; $i -lt $t.Length; $i++) {
    $line = $t[$i]
    foreach ($ch in $line.ToCharArray()) {
        if ([int]$ch -gt 255) {
            Write-Host "Line" ($i + 1) ":" $line
            break
        }
    }
}
