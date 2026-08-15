Add-Type -AssemblyName System.Drawing

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$assetRoot = Join-Path $root 'public\picture'
$backupRoot = Join-Path $root '_original-assets\picture'

Get-ChildItem -LiteralPath $assetRoot -Recurse -Filter '*.tmp.jpg' -File -ErrorAction SilentlyContinue | Remove-Item -Force

if (-not (Test-Path -LiteralPath $backupRoot)) {
  New-Item -ItemType Directory -Force -Path (Split-Path $backupRoot -Parent) | Out-Null
  Copy-Item -LiteralPath $assetRoot -Destination (Split-Path $backupRoot -Parent) -Recurse -Force
}

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

function Optimize-Jpeg([string]$Path, [int]$MaxWidth, [int]$Quality) {
  $before = (Get-Item -LiteralPath $Path).Length
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  $stream = New-Object System.IO.MemoryStream(,$bytes)
  $image = [System.Drawing.Image]::FromStream($stream)

  try {
    $scale = if ($MaxWidth -gt 0) { [Math]::Min(1.0, $MaxWidth / [double]$image.Width) } else { 1.0 }
    $width = [Math]::Max(1, [int][Math]::Round($image.Width * $scale))
    $height = [Math]::Max(1, [int][Math]::Round($image.Height * $scale))
    $canvas = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)

    try {
      $graphics.Clear([System.Drawing.Color]::White)
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.DrawImage($image, 0, 0, $width, $height)
    } finally {
      $graphics.Dispose()
    }

    $temp = "$Path.tmp.jpg"
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)

    try {
      $canvas.Save($temp, $jpegCodec, $encoderParams)
    } finally {
      $encoderParams.Dispose()
      $canvas.Dispose()
    }
  } finally {
    $image.Dispose()
    $stream.Dispose()
  }

  Remove-Item -LiteralPath $Path -Force
  Move-Item -LiteralPath "$Path.tmp.jpg" -Destination $Path
  $after = (Get-Item -LiteralPath $Path).Length

  return [pscustomobject]@{
    Before = $before
    After = $after
  }
}

$rules = @(
  @{ Dir = 'public\picture\gtm\thumbs'; Pattern = '*.jpg'; MaxWidth = 1000; Quality = 80 },
  @{ Dir = 'public\picture\gtm\long'; Pattern = '*.jpg'; MaxWidth = 1500; Quality = 84 },
  @{ Dir = 'public\picture\marketing\thumbs'; Pattern = '*.jpg'; MaxWidth = 900; Quality = 78 },
  @{ Dir = 'public\picture\marketing\full'; Pattern = '*.jpg'; MaxWidth = 1800; Quality = 82 },
  @{ Dir = 'public\picture\practice\thumbs'; Pattern = 'pr-*-t.jpg'; MaxWidth = 900; Quality = 78 },
  @{ Dir = 'public\picture\practice\full'; Pattern = '*.jpg'; MaxWidth = 1800; Quality = 82 }
)

$totalBefore = 0L
$totalAfter = 0L
$count = 0

foreach ($rule in $rules) {
  $dir = Join-Path $root $rule.Dir
  Get-ChildItem -LiteralPath $dir -Filter $rule.Pattern -File | ForEach-Object {
    $result = Optimize-Jpeg $_.FullName $rule.MaxWidth $rule.Quality
    $totalBefore += $result.Before
    $totalAfter += $result.After
    $count += 1
  }
}

"Optimized $count files: $([math]::Round($totalBefore / 1MB, 2)) MB -> $([math]::Round($totalAfter / 1MB, 2)) MB"
