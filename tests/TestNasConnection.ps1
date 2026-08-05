[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
try {
    $r = [System.Net.HttpWebRequest]::Create("https://suamisihat.myds.my")
    $r.Timeout = 5000
    $r.Method = "HEAD"
    $resp = $r.GetResponse()
    Write-Host "[ONLINE] Status Code: " $resp.StatusCode -ForegroundColor Green
    $resp.Close()
} catch [System.Net.WebException] {
    if ($_.Response) {
        Write-Host "[ONLINE] Server responded with error code: " $_.Response.StatusCode -ForegroundColor Green
    } else {
        Write-Host "[OFFLINE] Cannot reach suamisihat.myds.my: " $_.Exception.Message -ForegroundColor Red
    }
} catch {
    Write-Host "[OFFLINE] Error: " $_.Exception.Message -ForegroundColor Red
}
