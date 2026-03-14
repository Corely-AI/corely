param(
  [string]$Source = "assets/logo/corely-logo.png"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-HexColor {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Hex
  )

  $value = $Hex.TrimStart("#")
  if ($value.Length -ne 6) {
    throw "Expected a 6-digit hex color, received '$Hex'."
  }

  return [System.Drawing.Color]::FromArgb(
    255,
    [Convert]::ToInt32($value.Substring(0, 2), 16),
    [Convert]::ToInt32($value.Substring(2, 2), 16),
    [Convert]::ToInt32($value.Substring(4, 2), 16)
  )
}

function Get-MaskAlpha {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Color]$Color
  )

  $max = [Math]::Max($Color.R, [Math]::Max($Color.G, $Color.B))
  $min = [Math]::Min($Color.R, [Math]::Min($Color.G, $Color.B))
  $chroma = $max - $min
  $distanceFromWhite = 255 - $min

  $alphaFromChroma = [Math]::Min(255, [Math]::Max(0, ($chroma - 8) * 255 / 42))
  $alphaFromWhite = [Math]::Min(255, [Math]::Max(0, ($distanceFromWhite - 18) * 255 / 56))

  return [int][Math]::Round([Math]::Max($alphaFromChroma, $alphaFromWhite))
}

function Remove-WhiteMatte {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Channel,
    [Parameter(Mandatory = $true)]
    [int]$Alpha
  )

  if ($Alpha -le 0) {
    return 0
  }

  $value = 255 * ($Channel - 255 + $Alpha) / $Alpha
  return [int][Math]::Round([Math]::Min(255, [Math]::Max(0, $value)))
}

function Save-Png {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Bitmap]$Bitmap,
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $directory = Split-Path -Parent $Path
  if ($directory) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }

  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Keep-SignificantComponents {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Bitmap]$Bitmap,
    [int]$SolidAlphaThreshold = 32,
    [int]$HaloRadius = 2
  )

  $width = $Bitmap.Width
  $height = $Bitmap.Height
  $visited = New-Object 'bool[]' ($width * $height)
  $components = New-Object 'System.Collections.Generic.List[object]'
  $largestCount = 0
  $neighborOffsets = @(
    @(-1, 0),
    @(1, 0),
    @(0, -1),
    @(0, 1)
  )

  for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
      $index = ($y * $width) + $x
      if ($visited[$index]) {
        continue
      }

      $visited[$index] = $true
      $pixel = $Bitmap.GetPixel($x, $y)
      if ($pixel.A -lt $SolidAlphaThreshold) {
        continue
      }

      $component = New-Object 'System.Collections.Generic.List[int]'
      $queue = New-Object 'System.Collections.Generic.Queue[int]'
      $queue.Enqueue($index)
      $component.Add($index)

      while ($queue.Count -gt 0) {
        $current = $queue.Dequeue()
        $currentX = $current % $width
        $currentY = [Math]::Floor($current / $width)

        foreach ($offset in $neighborOffsets) {
          $nextX = $currentX + $offset[0]
          $nextY = $currentY + $offset[1]

          if ($nextX -lt 0 -or $nextY -lt 0 -or $nextX -ge $width -or $nextY -ge $height) {
            continue
          }

          $nextIndex = ($nextY * $width) + $nextX
          if ($visited[$nextIndex]) {
            continue
          }

          $visited[$nextIndex] = $true
          $nextPixel = $Bitmap.GetPixel($nextX, $nextY)
          if ($nextPixel.A -lt $SolidAlphaThreshold) {
            continue
          }

          $queue.Enqueue($nextIndex)
          $component.Add($nextIndex)
        }
      }

      $components.Add($component)
      if ($component.Count -gt $largestCount) {
        $largestCount = $component.Count
      }
    }
  }

  $keep = New-Object 'bool[]' ($width * $height)
  $minimumComponentSize = [Math]::Max(120, [int][Math]::Round($largestCount * 0.05))
  foreach ($component in $components) {
    if ($component.Count -lt $minimumComponentSize) {
      continue
    }

    foreach ($index in $component) {
      $keep[$index] = $true
    }
  }

  for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
      $index = ($y * $width) + $x
      $pixel = $Bitmap.GetPixel($x, $y)
      if ($pixel.A -eq 0) {
        continue
      }

      $shouldKeep = $keep[$index]
      if (-not $shouldKeep) {
        for ($dy = -$HaloRadius; $dy -le $HaloRadius -and -not $shouldKeep; $dy++) {
          for ($dx = -$HaloRadius; $dx -le $HaloRadius -and -not $shouldKeep; $dx++) {
            $nextX = $x + $dx
            $nextY = $y + $dy
            if ($nextX -lt 0 -or $nextY -lt 0 -or $nextX -ge $width -or $nextY -ge $height) {
              continue
            }

            if ($keep[($nextY * $width) + $nextX]) {
              $shouldKeep = $true
            }
          }
        }
      }

      if (-not $shouldKeep) {
        $Bitmap.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
      }
    }
  }
}

function New-VariantBitmap {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Bitmap]$MarkBitmap,
    [Parameter(Mandatory = $true)]
    [int]$Size,
    [System.Drawing.Color]$BackgroundColor = [System.Drawing.Color]::Empty,
    [double]$Scale = 0.76
  )

  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

    if (-not $BackgroundColor.IsEmpty) {
      $graphics.Clear($BackgroundColor)
    } else {
      $graphics.Clear([System.Drawing.Color]::Transparent)
    }

    $maxDimension = [double][Math]::Max($MarkBitmap.Width, $MarkBitmap.Height)
    $targetMax = $Size * $Scale
    $drawWidth = [double]$MarkBitmap.Width * $targetMax / $maxDimension
    $drawHeight = [double]$MarkBitmap.Height * $targetMax / $maxDimension
    $x = ($Size - $drawWidth) / 2
    $y = ($Size - $drawHeight) / 2

    $graphics.DrawImage($MarkBitmap, [System.Drawing.RectangleF]::new([single]$x, [single]$y, [single]$drawWidth, [single]$drawHeight))
  } finally {
    $graphics.Dispose()
  }

  return $bitmap
}

function New-SolidMaskVariant {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Bitmap]$MaskBitmap,
    [Parameter(Mandatory = $true)]
    [System.Drawing.Color]$FillColor
  )

  $bitmap = New-Object System.Drawing.Bitmap($MaskBitmap.Width, $MaskBitmap.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

  for ($y = 0; $y -lt $MaskBitmap.Height; $y++) {
    for ($x = 0; $x -lt $MaskBitmap.Width; $x++) {
      $maskPixel = $MaskBitmap.GetPixel($x, $y)
      if ($maskPixel.A -eq 0) {
        $bitmap.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
        continue
      }

      $bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($maskPixel.A, $FillColor.R, $FillColor.G, $FillColor.B))
    }
  }

  return $bitmap
}

function Write-IcoFromPngs {
  param(
    [Parameter(Mandatory = $true)]
    [array]$PngEntries,
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $directory = Split-Path -Parent $Path
  if ($directory) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }

  $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
  $writer = New-Object System.IO.BinaryWriter($stream)

  try {
    $writer.Write([UInt16]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]$PngEntries.Count)

    $offset = 6 + (16 * $PngEntries.Count)
    foreach ($entry in $PngEntries) {
      $dimension = [int]$entry.Size
      $bytes = [byte[]]$entry.Bytes

      $writer.Write([byte]($(if ($dimension -ge 256) { 0 } else { $dimension })))
      $writer.Write([byte]($(if ($dimension -ge 256) { 0 } else { $dimension })))
      $writer.Write([byte]0)
      $writer.Write([byte]0)
      $writer.Write([UInt16]1)
      $writer.Write([UInt16]32)
      $writer.Write([UInt32]$bytes.Length)
      $writer.Write([UInt32]$offset)
      $offset += $bytes.Length
    }

    foreach ($entry in $PngEntries) {
      $writer.Write([byte[]]$entry.Bytes)
    }
  } finally {
    $writer.Dispose()
    $stream.Dispose()
  }
}

$root = Resolve-Path "."
$sourcePath = Join-Path $root $Source

if (-not (Test-Path $sourcePath)) {
  throw "Source logo not found: $sourcePath"
}

$generatedDir = Join-Path $root "assets/logo/generated"
$sourceBitmap = [System.Drawing.Bitmap]::FromFile($sourcePath)
$markBitmap = $null
$whiteMaskBitmap = $null
$navyMaskBitmap = $null

$backgroundDark = New-HexColor "#0B0F14"
$backgroundLight = New-HexColor "#FFFFFF"
$fillNavy = New-HexColor "#0F172A"
$fillWhite = New-HexColor "#FFFFFF"

try {
  $minX = $sourceBitmap.Width
  $minY = $sourceBitmap.Height
  $maxX = -1
  $maxY = -1

  for ($y = 0; $y -lt $sourceBitmap.Height; $y++) {
    for ($x = 0; $x -lt $sourceBitmap.Width; $x++) {
      $alpha = Get-MaskAlpha -Color $sourceBitmap.GetPixel($x, $y)
      if ($alpha -le 0) {
        continue
      }

      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }

  if ($maxX -lt 0 -or $maxY -lt 0) {
    throw "Could not detect a foreground mark in $sourcePath"
  }

  $padding = 18
  $cropX = [Math]::Max(0, $minX - $padding)
  $cropY = [Math]::Max(0, $minY - $padding)
  $cropWidth = [Math]::Min($sourceBitmap.Width - $cropX, ($maxX - $minX + 1) + (2 * $padding))
  $cropHeight = [Math]::Min($sourceBitmap.Height - $cropY, ($maxY - $minY + 1) + (2 * $padding))

  $markBitmap = New-Object System.Drawing.Bitmap($cropWidth, $cropHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

  for ($y = 0; $y -lt $cropHeight; $y++) {
    for ($x = 0; $x -lt $cropWidth; $x++) {
      $sourcePixel = $sourceBitmap.GetPixel($cropX + $x, $cropY + $y)
      $alpha = Get-MaskAlpha -Color $sourcePixel
      if ($alpha -le 0) {
        $markBitmap.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
        continue
      }

      $r = Remove-WhiteMatte -Channel $sourcePixel.R -Alpha $alpha
      $g = Remove-WhiteMatte -Channel $sourcePixel.G -Alpha $alpha
      $b = Remove-WhiteMatte -Channel $sourcePixel.B -Alpha $alpha
      $markBitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $r, $g, $b))
    }
  }

  Keep-SignificantComponents -Bitmap $markBitmap

  Save-Png -Bitmap $markBitmap -Path (Join-Path $generatedDir "corely-mark-source-transparent.png")

  $transparentSizes = @(64, 128, 256, 512, 1024)
  foreach ($size in $transparentSizes) {
    $variant = New-VariantBitmap -MarkBitmap $markBitmap -Size $size -Scale 0.76
    try {
      Save-Png -Bitmap $variant -Path (Join-Path $generatedDir "corely-mark-transparent-$size.png")
    } finally {
      $variant.Dispose()
    }
  }

  $lightSizes = @(64, 128, 256, 512, 1024)
  foreach ($size in $lightSizes) {
    $variant = New-VariantBitmap -MarkBitmap $markBitmap -Size $size -BackgroundColor $backgroundLight -Scale 0.76
    try {
      Save-Png -Bitmap $variant -Path (Join-Path $generatedDir "corely-mark-light-$size.png")
    } finally {
      $variant.Dispose()
    }
  }

  $darkSizes = @(64, 128, 256, 512, 1024)
  foreach ($size in $darkSizes) {
    $variant = New-VariantBitmap -MarkBitmap $markBitmap -Size $size -BackgroundColor $backgroundDark -Scale 0.76
    try {
      Save-Png -Bitmap $variant -Path (Join-Path $generatedDir "corely-mark-dark-$size.png")
    } finally {
      $variant.Dispose()
    }
  }

  $whiteMaskBitmap = New-SolidMaskVariant -MaskBitmap $markBitmap -FillColor $fillWhite
  $navyMaskBitmap = New-SolidMaskVariant -MaskBitmap $markBitmap -FillColor $fillNavy

  foreach ($size in @(256, 512, 1024)) {
    $whiteVariant = New-VariantBitmap -MarkBitmap $whiteMaskBitmap -Size $size -Scale 0.76
    try {
      Save-Png -Bitmap $whiteVariant -Path (Join-Path $generatedDir "corely-mark-white-transparent-$size.png")
    } finally {
      $whiteVariant.Dispose()
    }

    $navyVariant = New-VariantBitmap -MarkBitmap $navyMaskBitmap -Size $size -Scale 0.76
    try {
      Save-Png -Bitmap $navyVariant -Path (Join-Path $generatedDir "corely-mark-navy-transparent-$size.png")
    } finally {
      $navyVariant.Dispose()
    }
  }

  $faviconSizes = @(16, 32, 48)
  $faviconEntries = @()
  foreach ($size in $faviconSizes) {
    $favicon = New-VariantBitmap -MarkBitmap $markBitmap -Size $size -Scale 0.84
    $faviconPath = Join-Path $generatedDir "favicon-$($size)x$($size).png"

    try {
      Save-Png -Bitmap $favicon -Path $faviconPath
    } finally {
      $favicon.Dispose()
    }

    $faviconEntries += @{
      Size = $size
      Bytes = [System.IO.File]::ReadAllBytes($faviconPath)
    }
  }

  Write-IcoFromPngs -PngEntries $faviconEntries -Path (Join-Path $generatedDir "favicon.ico")

  $appleTouch = New-VariantBitmap -MarkBitmap $markBitmap -Size 180 -BackgroundColor $backgroundLight -Scale 0.76
  try {
    Save-Png -Bitmap $appleTouch -Path (Join-Path $generatedDir "apple-touch-icon.png")
  } finally {
    $appleTouch.Dispose()
  }

  foreach ($size in @(192, 512)) {
    $pwaIcon = New-VariantBitmap -MarkBitmap $markBitmap -Size $size -BackgroundColor $backgroundLight -Scale 0.76
    try {
      Save-Png -Bitmap $pwaIcon -Path (Join-Path $generatedDir "icon-$($size)x$($size).png")
    } finally {
      $pwaIcon.Dispose()
    }
  }

  $expoIcon = New-VariantBitmap -MarkBitmap $markBitmap -Size 1024 -BackgroundColor $backgroundLight -Scale 0.76
  try {
    Save-Png -Bitmap $expoIcon -Path (Join-Path $generatedDir "expo-icon-1024.png")
  } finally {
    $expoIcon.Dispose()
  }

  $expoAdaptive = New-VariantBitmap -MarkBitmap $whiteMaskBitmap -Size 1024 -Scale 0.68
  try {
    Save-Png -Bitmap $expoAdaptive -Path (Join-Path $generatedDir "expo-adaptive-foreground-1024.png")
  } finally {
    $expoAdaptive.Dispose()
  }

  $syncTargets = @(
    @{ Source = "favicon-16x16.png"; Targets = @("assets/favicon-16x16.png", "apps/web/public/favicon-16x16.png", "apps/public-web/public/favicon-16x16.png", "apps/freelancer/public/favicon-16x16.png", "apps/crm/public/favicon-16x16.png", "apps/landing/assets/public/favicon-16x16.png") },
    @{ Source = "favicon-32x32.png"; Targets = @("assets/favicon-32x32.png", "apps/web/public/favicon-32x32.png", "apps/public-web/public/favicon-32x32.png", "apps/freelancer/public/favicon-32x32.png", "apps/crm/public/favicon-32x32.png", "apps/landing/assets/public/favicon-32x32.png") },
    @{ Source = "favicon.ico"; Targets = @("assets/favicon.ico", "apps/landing/assets/public/favicon.ico") },
    @{ Source = "apple-touch-icon.png"; Targets = @("apps/web/public/apple-touch-icon.png", "apps/public-web/public/apple-touch-icon.png", "apps/freelancer/public/apple-touch-icon.png", "apps/crm/public/apple-touch-icon.png", "apps/landing/assets/public/apple-touch-icon.png") },
    @{ Source = "icon-192x192.png"; Targets = @("apps/web/public/icon-192x192.png", "apps/public-web/public/icon-192x192.png", "apps/freelancer/public/icon-192x192.png", "apps/crm/public/icon-192x192.png", "apps/landing/assets/public/icon-192x192.png") },
    @{ Source = "icon-512x512.png"; Targets = @("apps/web/public/icon-512x512.png", "apps/public-web/public/icon-512x512.png", "apps/freelancer/public/icon-512x512.png", "apps/crm/public/icon-512x512.png", "apps/landing/assets/public/icon-512x512.png") },
    @{ Source = "expo-icon-1024.png"; Targets = @("apps/pos/assets/icon.png") },
    @{ Source = "expo-adaptive-foreground-1024.png"; Targets = @("apps/pos/assets/adaptive-icon.png") },
    @{ Source = "favicon-48x48.png"; Targets = @("apps/pos/assets/favicon.png") }
  )

  foreach ($sync in $syncTargets) {
    $sourceFile = Join-Path $generatedDir $sync.Source
    foreach ($targetRelative in $sync.Targets) {
      $targetPath = Join-Path $root $targetRelative
      $targetDirectory = Split-Path -Parent $targetPath
      if ($targetDirectory) {
        New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
      }

      Copy-Item -Force -Path $sourceFile -Destination $targetPath
    }
  }

  Write-Output "Generated logo variants in $generatedDir"
} finally {
  if ($navyMaskBitmap) { $navyMaskBitmap.Dispose() }
  if ($whiteMaskBitmap) { $whiteMaskBitmap.Dispose() }
  if ($markBitmap) { $markBitmap.Dispose() }
  $sourceBitmap.Dispose()
}
