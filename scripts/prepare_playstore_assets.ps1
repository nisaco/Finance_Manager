Add-Type -AssemblyName System.Drawing

$brainDir = "C:\Users\NII KPAKPO\.gemini\antigravity\brain\087a558d-b782-4cbb-be5f-44a5bb09a18c"
$assetsDir = "d:\All Projects\Finance_Manager-main\playstore-assets"
$publicAssetsDir = "d:\All Projects\Finance_Manager-main\public\playstore-assets"

if (!(Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir | Out-Null }
if (!(Test-Path $publicAssetsDir)) { New-Item -ItemType Directory -Path $publicAssetsDir | Out-Null }

# 1. Feature Graphic (1024 x 500)
$srcGraphic = Join-Path $brainDir "fimara_feature_graphic_1789760060445.jpg"
$outGraphic = Join-Path $assetsDir "feature-graphic-1024x500.png"
$publicGraphic = Join-Path $publicAssetsDir "feature-graphic-1024x500.png"

$src = [System.Drawing.Image]::FromFile($srcGraphic)
$targetWidth = 1024
$targetHeight = 500

$bmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$bgColor = [System.Drawing.ColorTranslator]::FromHtml('#0B0E14')
$g.Clear($bgColor)

# Source 1376x768. Target 1024:500 (2.048 ratio). Desired crop height in source = 1376 / 2.048 = 672
$srcCropWidth = $src.Width
$srcCropHeight = [int]($src.Width * ($targetHeight / $targetWidth))
if ($srcCropHeight -gt $src.Height) {
    $srcCropHeight = $src.Height
    $srcCropWidth = [int]($src.Height * ($targetWidth / $targetHeight))
}
$srcX = [int](($src.Width - $srcCropWidth) / 2)
$srcY = [int](($src.Height - $srcCropHeight) / 2)

$destRect = New-Object System.Drawing.Rectangle(0, 0, $targetWidth, $targetHeight)
$srcRect = New-Object System.Drawing.Rectangle($srcX, $srcY, $srcCropWidth, $srcCropHeight)

$g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

$bmp.Save($outGraphic, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save($publicGraphic, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$src.Dispose()

Write-Output "Successfully generated: $outGraphic"

# 2. Screenshots (Copy and export as both JPEG and PNG for convenience)
$screenshots = @(
    @{ src = "screen_dashboard_1789760079292.jpg"; name = "screenshot-1-dashboard" },
    @{ src = "screen_transactions_1789760092899.jpg"; name = "screenshot-2-transactions" },
    @{ src = "screen_vaults_1789760109235.jpg"; name = "screenshot-3-savings-vaults" },
    @{ src = "screen_ai_offline_1789760125125.jpg"; name = "screenshot-4-fima-ai-offline" }
)

foreach ($sc in $screenshots) {
    $srcPath = Join-Path $brainDir $sc.src
    $img = [System.Drawing.Image]::FromFile($srcPath)
    
    # Save PNG
    $pngPath1 = Join-Path $assetsDir ($sc.name + ".png")
    $pngPath2 = Join-Path $publicAssetsDir ($sc.name + ".png")
    $img.Save($pngPath1, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Save($pngPath2, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Also save JPG
    $jpgPath1 = Join-Path $assetsDir ($sc.name + ".jpg")
    $jpgPath2 = Join-Path $publicAssetsDir ($sc.name + ".jpg")
    $img.Save($jpgPath1, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $img.Save($jpgPath2, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    
    $img.Dispose()
    Write-Output "Successfully generated screenshot: $pngPath1 ($($img.Width)x$($img.Height))"
}

Write-Output "All Play Store assets prepared successfully!"
