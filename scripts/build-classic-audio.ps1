$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$sourcePath = Join-Path $projectRoot 'artifacts/classics-audio/source.json'
$manifestPath = Join-Path $projectRoot 'src/lib/classic-audio.json'
$ffmpegPath = (Get-Command ffmpeg -ErrorAction Stop).Source
$ffprobePath = (Get-Command ffprobe -ErrorAction Stop).Source
$books = Get-Content -LiteralPath $sourcePath -Raw -Encoding UTF8 | ConvertFrom-Json
$voice = New-Object -ComObject SAPI.SpVoice
$available = @($voice.GetVoices())
$voices = @{
  ko = $available | Where-Object { $_.GetDescription() -match 'Heami.*Korean' } | Select-Object -First 1
  en = $available | Where-Object { $_.GetDescription() -match 'Zira.*English' } | Select-Object -First 1
}
foreach ($locale in @('ko','en')) { if ($null -eq $voices[$locale]) { throw "Required installed local voice missing: $locale" } }
$voice.Rate = -1
$voice.Volume = 100
$manifest = [ordered]@{ version = 1; engine = 'Windows SAPI 5 local voices'; voices = @{ ko = $voices.ko.GetDescription(); en = $voices.en.GetDescription() }; books = @{} }
foreach ($book in $books) {
  if ($book.id -notmatch '^[a-z0-9-]+$') { throw 'Unsafe book identifier.' }
  $outputDir = [System.IO.Path]::GetFullPath((Join-Path $projectRoot ('public/audio/classics/' + $book.id)))
  if (-not $outputDir.StartsWith($projectRoot + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Audio output is outside the workspace.' }
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
  $manifest.books[$book.id] = @{}
  foreach ($locale in @('ko','en')) {
    $voice.Voice = $voices[$locale]
    $entries = @()
    for ($index = 0; $index -lt $book.pages.Count; $index++) {
      $name = '{0}-{1:D2}' -f $locale, ($index + 1)
      $wavPath = Join-Path $outputDir ($name + '.wav')
      $mp3Path = Join-Path $outputDir ($name + '.mp3')
      $stream = New-Object -ComObject SAPI.SpFileStream
      try {
        $stream.Open($wavPath, 3, $false)
        $voice.AudioOutputStream = $stream
        [void]$voice.Speak($book.pages[$index].$locale.text, 0)
      } finally { $stream.Close() }
      & $ffmpegPath -nostdin -y -hide_banner -loglevel error -i $wavPath -codec:a libmp3lame -b:a 48k -ac 1 -ar 24000 $mp3Path
      if ($LASTEXITCODE -ne 0) { throw "Audio encoding failed: $name" }
      $durationText = & $ffprobePath -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $mp3Path
      if ($LASTEXITCODE -ne 0) { throw "Audio validation failed: $name" }
      $duration = [double]::Parse($durationText, [Globalization.CultureInfo]::InvariantCulture)
      if ($duration -lt 1) { throw "Empty narration: $name" }
      $entries += [ordered]@{ src = "/audio/classics/$($book.id)/$name.mp3"; duration = $duration; sha256 = $book.pages[$index].$locale.sha256 }
      Remove-Item -LiteralPath $wavPath
    }
    $manifest.books[$book.id][$locale] = $entries
  }
  Write-Output "Rendered $($book.id): $($book.pages.Count) scenes, Korean and English."
}
[System.IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 12), (New-Object System.Text.UTF8Encoding($false)))
Write-Output 'Completed local narration and duration manifest. No external API was called.'
