$inFile = [System.IO.Path]::GetTempFileName()
$outFile = [System.IO.Path]::GetTempFileName()
$errFile = [System.IO.Path]::GetTempFileName()

try {
    [System.IO.File]::WriteAllText($inFile, "protocol=https`nhost=github.com`n`n")
    $p = Start-Process -FilePath "git" -ArgumentList "credential-manager", "get" -NoNewWindow -Wait -PassThru -RedirectStandardInput $inFile -RedirectStandardOutput $outFile -RedirectStandardError $errFile
    $lines = Get-Content $outFile
    $token = ""
    foreach ($line in $lines) {
        if ($line.StartsWith("password=")) {
            $token = $line.Substring(9).Trim()
            break
        }
    }

    if ($token) {
        Write-Host "GitHub Token extracted successfully from Git Credential Manager."
        $token | gh auth login --with-token
        gh auth status
    } else {
        Write-Host "Could not find password in output:"
        Get-Content $outFile
        Get-Content $errFile
    }
}
finally {
    Remove-Item $inFile, $outFile, $errFile -Force -ErrorAction SilentlyContinue
}
