Add-Type -AssemblyName System.Drawing

$brainDir = "C:\Users\NII KPAKPO\.gemini\antigravity\brain\087a558d-b782-4cbb-be5f-44a5bb09a18c"
$srcStudio = Join-Path $brainDir "fimara_f_icon_studio_1789762878378.jpg"
$testOut = Join-Path $brainDir "test_maskable_512.png"

$src = [System.Drawing.Image]::FromFile($srcStudio)

$targetSize = 512
$bmp = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

# 1. 100% full-bleed background in Fimara obsidian dark #0B0E14
$bgColor = [System.Drawing.ColorTranslator]::FromHtml('#0B0E14')
$g.Clear($bgColor)

# 2. Draw soft dark gradient in the center
$radialPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$radialPath.AddEllipse(0, 0, $targetSize, $targetSize)
$pbr = New-Object System.Drawing.Drawing2D.PathGradientBrush($radialPath)
$pbr.CenterColor = [System.Drawing.ColorTranslator]::FromHtml('#141A24')
$pbr.SurroundColors = @($bgColor)
$g.FillEllipse($pbr, 0, 0, $targetSize, $targetSize)

# 3. Inner F emblem:
# In 1024x1024, the F mark is at x: 220..820 (width 600), y: 180..840 (height 660).
# Let's crop x: 180, y: 150, w: 680, h: 720.
# We draw it into the 512x512 canvas scaled to w: 340, h: 360, centered at x: 86, y: 76.
$innerCrop = New-Object System.Drawing.Rectangle(180, 150, 680, 720)
$destW = 340
$destH = 360
$destX = [int]((512 - $destW) / 2)
$destY = [int]((512 - $destH) / 2)
$destRect = New-Object System.Drawing.Rectangle($destX, $destY, $destW, $destH)

$g.DrawImage($src, $destRect, $innerCrop, [System.Drawing.GraphicsUnit]::Pixel)

$bmp.Save($testOut, [System.Drawing.Imaging.ImageFormat]::Png)

# 4. Circular mask test
$circleTestOut = Join-Path $brainDir "test_circle_masked_512.png"
$circleBmp = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$cg = [System.Drawing.Graphics]::FromImage($circleBmp)
$cg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddEllipse(0, 0, $targetSize, $targetSize)
$cg.SetClip($path)
$cg.DrawImage($bmp, 0, 0)

$circleBmp.Save($circleTestOut, [System.Drawing.Imaging.ImageFormat]::Png)

$cg.Dispose()
$circleBmp.Dispose()
$path.Dispose()

$pbr.Dispose()
$radialPath.Dispose()
$g.Dispose()
$bmp.Dispose()
$src.Dispose()

Write-Output "Generated padded safe-zone maskable test"
