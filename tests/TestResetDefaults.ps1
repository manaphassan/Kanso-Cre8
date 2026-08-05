Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

[System.Reflection.Assembly]::LoadFrom("e:\Dev\Projects\SS-Brand-Assets\src\SS-CAM\bin\Release\SS-CAM.exe") | Out-Null

Write-Host "1. Testing ResetToDefaults()..." -ForegroundColor Cyan
$p = [SS_CAM.Services.UserProfileService]::ResetToDefaults()

Write-Host "Designer Name : " $p.DesignerName
Write-Host "Department    : " $p.Department
Write-Host "Email         : " $p.Email
Write-Host "Staff ID      : " $p.StaffId

if ($p.DesignerName -eq "SS Branding" -and $p.Department -eq "Creative Department" -and $p.Email -eq "branding@suamisihat.com" -and $p.StaffId -eq "SS000X") {
    Write-Host "[PASS] Profile defaults reset cleanly to SS Branding credentials!" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Profile defaults do not match requested SS Branding values!" -ForegroundColor Red
}
