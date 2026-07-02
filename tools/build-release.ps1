param(
  [string]$OutDir = "release\globert-works"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$out = Join-Path $root $OutDir
$releaseRoot = Join-Path $root "release"
$resolvedParent = Resolve-Path (Split-Path $out -Parent) -ErrorAction SilentlyContinue
if($resolvedParent -and -not $resolvedParent.Path.StartsWith($releaseRoot, [System.StringComparison]::OrdinalIgnoreCase)){
  throw "Refusing to clean output outside release directory: $out"
}
if(Test-Path $out){
  $resolvedOut = Resolve-Path $out
  if(-not $resolvedOut.Path.StartsWith($releaseRoot, [System.StringComparison]::OrdinalIgnoreCase)){
    throw "Refusing to clean output outside release directory: $resolvedOut"
  }
  Remove-Item -LiteralPath $resolvedOut.Path -Recurse -Force
}
New-Item -ItemType Directory -Force $out | Out-Null

$files = @(
  "index.html","Globert.html","Globert Factory.html","Globert Roadmap.html",
  "glob.css","home.css","glogo.svg",
  "sim.js","floor.js","erp.js","chapters.js","mascot.js","levels.js","adventure.js","tutorial.js","release.js","main.js","home.js",
  ".thumbnail","README.md"
)

foreach($file in $files){
  Copy-Item -LiteralPath (Join-Path $root $file) -Destination (Join-Path $out $file) -Force
}
Copy-Item -LiteralPath (Join-Path $root "compiled") -Destination (Join-Path $out "compiled") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root "uploads") -Destination (Join-Path $out "uploads") -Recurse -Force
New-Item -ItemType Directory -Force (Join-Path $out "tools") | Out-Null
Copy-Item -LiteralPath (Join-Path $root "tools\smoke.html") -Destination (Join-Path $out "tools\smoke.html") -Force
Copy-Item -LiteralPath (Join-Path $root "tools\balance.html") -Destination (Join-Path $out "tools\balance.html") -Force

$zip = Join-Path $releaseRoot "globert-works-release.zip"
if(Test-Path $zip){ Remove-Item -LiteralPath $zip -Force }
Compress-Archive -Path (Join-Path $out "*") -DestinationPath $zip -Force
if(-not (Test-Path $zip)){ throw "Release zip was not created: $zip" }
Write-Output "Release folder: $out"
Write-Output "Release zip: $zip"
