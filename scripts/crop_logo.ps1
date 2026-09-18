Add-Type -AssemblyName System.Drawing

$brainDir = "C:\Users\NII KPAKPO\.gemini\antigravity\brain\087a558d-b782-4cbb-be5f-44a5bb09a18c"
$srcGraphic = Join-Path $brainDir "fimara_feature_graphic_1789760060445.jpg"
$outLogo = Join-Path $brainDir "fimara_f_logo_extracted.png"

$src = [System.Drawing.Image]::FromFile($srcGraphic)
# Centering the 'F' icon nicely with clean margins:
$cropX = 68
$cropY = 50
$cropW = 60
$cropH = 70

$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$bmp = New-Object System.Drawing.Bitmap($cropW, $cropH)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$destRect = New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)
$g.DrawImage($src, $destRect, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)

$bmp.Save($outLogo, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$src.Dispose()

Write-Output "Extracted logo to $outLogo"

