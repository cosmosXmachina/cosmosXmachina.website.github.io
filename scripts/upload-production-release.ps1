<#
Uploads a locally verified release through SFTP. The .ready marker is always
sent last, so the production cron cannot activate an incomplete upload.

Example:
  .\scripts\upload-production-release.ps1 `
    -RemoteIncoming incoming/cosmosxmachina `
    -KeyPath .\cosmos_key
#>
[CmdletBinding()]
param(
  [string]$ReleaseDirectory = "release-output",
  [string]$ReleaseId,
  [string]$HostName = "cosmos-x-machina.it",
  [string]$UserName = "vash",
  [Parameter(Mandatory = $true)][string]$RemoteIncoming,
  [string]$KeyPath = ".\cosmos_key"
)

$ErrorActionPreference = "Stop"
$releaseRoot = (Resolve-Path -LiteralPath $ReleaseDirectory).Path
$key = (Resolve-Path -LiteralPath $KeyPath).Path
if (-not $ReleaseId) {
  $marker = Get-ChildItem -LiteralPath $releaseRoot -Filter "cosmos-release-*.ready" |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $marker) { throw "No ready marker exists in $releaseRoot" }
} else {
  $marker = Get-Item -LiteralPath (Join-Path $releaseRoot "cosmos-release-$ReleaseId.ready")
}

$ready = Get-Content -LiteralPath $marker.FullName -Raw | ConvertFrom-Json
if ($ready.schemaVersion -ne 1 -or $ready.releaseId -notmatch '^[a-z0-9][a-z0-9.-]{6,94}[a-z0-9]$') {
  throw "The ready marker is invalid."
}
if ($ready.releaseId -match '-dirty-') { throw "Dirty local test releases cannot be uploaded to production." }
$archive = Join-Path $releaseRoot $ready.archive
$checksum = "$archive.sha256"
foreach ($file in @($archive, $checksum, $marker.FullName)) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing release file: $file" }
}
$actual = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $ready.sha256) { throw "The archive does not match the ready marker." }
if ($RemoteIncoming -notmatch '^[A-Za-z0-9_./-]+$') { throw "RemoteIncoming contains unsupported characters." }

function SftpPath([string]$path) { return $path.Replace('\', '/') }
$remote = $RemoteIncoming.TrimEnd('/')
$batch = [IO.Path]::GetTempFileName()
try {
  @(
    "put `"$(SftpPath $archive)`" `"$remote/$([IO.Path]::GetFileName($archive))`""
    "put `"$(SftpPath $checksum)`" `"$remote/$([IO.Path]::GetFileName($checksum))`""
    "put `"$(SftpPath $marker.FullName)`" `"$remote/$($marker.Name)`""
    "ls -l `"$remote/$($marker.Name)`""
    "bye"
  ) | Set-Content -LiteralPath $batch -Encoding ascii
  & sftp -b $batch -i $key -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new "$UserName@$HostName"
  if ($LASTEXITCODE -ne 0) { throw "SFTP upload failed with exit code $LASTEXITCODE" }
} finally {
  Remove-Item -LiteralPath $batch -Force -ErrorAction SilentlyContinue
}
Write-Host "Uploaded release $($ready.releaseId); production cron will process the marker within its configured interval."
