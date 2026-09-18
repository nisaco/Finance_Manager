Add-Type -AssemblyName System.Drawing

$brainDir = "C:\Users\NII KPAKPO\.gemini\antigravity\brain\087a558d-b782-4cbb-be5f-44a5bb09a18c"
$srcStudio = Join-Path $brainDir "fimara_f_icon_studio_1789762878378.jpg"
$publicDir = "d:\All Projects\Finance_Manager-main\public"
$assetsDir = "d:\All Projects\Finance_Manager-main\playstore-assets"
$publicAssetsDir = "d:\All Projects\Finance_Manager-main\public\playstore-assets"

if (!(Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir | Out-Null }
if (!(Test-Path $publicAssetsDir)) { New-Item -ItemType Directory -Path $publicAssetsDir | Out-Null }

$src = [System.Drawing.Image]::FromFile($srcStudio)

function Generate-Icon {
    param(
        [int]$size,
        [string]$outputPath,
        [bool]$isMaskable
    )

    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # 1. 100% full-bleed background in Fimara obsidian dark #0B0E14 (prevents white borders on Android)
    $bgColor = [System.Drawing.ColorTranslator]::FromHtml('#0B0E14')
    $g.Clear($bgColor)

    # 2. Radial ambient dark glow
    $radialPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $radialPath.AddEllipse(0, 0, $size, $size)
    $pbr = New-Object System.Drawing.Drawing2D.PathGradientBrush($radialPath)
    $pbr.CenterColor = [System.Drawing.ColorTranslator]::FromHtml('#141A24')
    $pbr.SurroundColors = @($bgColor)
    $g.FillEllipse($pbr, 0, 0, $size, $size)

    # 3. Inner F emblem:
    # Source crop in 1024x1024
    $innerCrop = New-Object System.Drawing.Rectangle(180, 150, 680, 720)
    
    if ($isMaskable) {
        # Safe zone: F mark occupies ~68% of canvas, staying strictly inside 80% circle
        $destW = [int]($size * 0.66)
        $destH = [int]($size * 0.70)
    } else {
        # Standard icon: F mark occupies ~76% of canvas
        $destW = [int]($size * 0.74)
        $destH = [int]($size * 0.78)
    }
    
    $destX = [int](($size - $destW) / 2)
    $destY = [int](($size - $destH) / 2)
    $destRect = New-Object System.Drawing.Rectangle($destX, $destY, $destW, $destH)

    $g.DrawImage($src, $destRect, $innerCrop, [System.Drawing.GraphicsUnit]::Pixel)

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $pbr.Dispose()
    $radialPath.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    
    Write-Output "Generated: $outputPath ($sizex$size)"
}

# Generate PWA icons
Generate-Icon -size 192 -outputPath (Join-Path $publicDir "icon-192x192.png") -isMaskable $false
Generate-Icon -size 512 -outputPath (Join-Path $publicDir "icon-512x512.png") -isMaskable $false
Generate-Icon -size 192 -outputPath (Join-Path $publicDir "icon-maskable-192x192.png") -isMaskable $true
Generate-Icon -size 512 -outputPath (Join-Path $publicDir "icon-maskable-512x512.png") -isMaskable $true

# Generate Play Store App Icon (512x512, Safe Zone Padded, Full Bleed #0B0E14)
Generate-Icon -size 512 -outputPath (Join-Path $assetsDir "app-icon-512x512.png") -isMaskable $true
Generate-Icon -size 512 -outputPath (Join-Path $publicAssetsDir "app-icon-512x512.png") -isMaskable $true

$src.Dispose()
Write-Output "All icons generated successfully with full-bleed zero-white-border guarantee!"
