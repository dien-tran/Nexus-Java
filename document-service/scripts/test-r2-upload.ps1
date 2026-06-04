param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [string]$ApiBaseUrl = "http://localhost:8080/api",

    [string]$Token = $env:NEXUS_AUTH_TOKEN
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $FilePath)) {
    throw "File not found: $FilePath"
}

if ([string]::IsNullOrWhiteSpace($Token)) {
    throw "Missing JWT token. Pass -Token '<jwt>' or set environment variable NEXUS_AUTH_TOKEN."
}

function Get-ContentType {
    param([string]$Path)

    $extension = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
    switch ($extension) {
        ".pdf"  { return "application/pdf" }
        ".txt"  { return "text/plain" }
        ".doc"  { return "application/msword" }
        ".docx" { return "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
        ".xlsx" { return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
        ".png"  { return "image/png" }
        ".jpg"  { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        default { throw "Unsupported file extension for Phase 1 upload test: $extension" }
    }
}

$resolvedFile = Resolve-Path -LiteralPath $FilePath
$fileInfo = Get-Item -LiteralPath $resolvedFile
$contentType = Get-ContentType -Path $fileInfo.FullName
$checksumSha256 = (Get-FileHash -LiteralPath $fileInfo.FullName -Algorithm SHA256).Hash.ToLowerInvariant()

$headers = @{
    Authorization = if ($Token.StartsWith("Bearer ")) { $Token } else { "Bearer $Token" }
}

$initBody = @{
    originalFilename = $fileInfo.Name
    contentType = $contentType
    sizeBytes = $fileInfo.Length
    checksumSha256 = $checksumSha256
} | ConvertTo-Json

Write-Host "Initializing upload..."
Write-Host "File: $($fileInfo.FullName)"
Write-Host "Content-Type: $contentType"
Write-Host "Size: $($fileInfo.Length) bytes"
Write-Host "SHA-256: $checksumSha256"

$initResponse = Invoke-RestMethod `
    -Method Post `
    -Uri "$ApiBaseUrl/documents/uploads/init" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $initBody

$documentId = $initResponse.document.id
$uploadUrl = $initResponse.uploadUrl

if ([string]::IsNullOrWhiteSpace($documentId) -or [string]::IsNullOrWhiteSpace($uploadUrl)) {
    throw "Invalid init response. Expected document.id and uploadUrl."
}

Write-Host "Document ID: $documentId"
Write-Host "Uploading directly to R2..."

$fileBytes = [System.IO.File]::ReadAllBytes($fileInfo.FullName)
Invoke-WebRequest `
    -Method Put `
    -Uri $uploadUrl `
    -ContentType $contentType `
    -Body $fileBytes `
    | Out-Null

Write-Host "Completing upload..."
$completeResponse = Invoke-RestMethod `
    -Method Post `
    -Uri "$ApiBaseUrl/documents/$documentId/uploads/complete" `
    -Headers $headers

Write-Host "Upload completed."
Write-Host "Status: $($completeResponse.status)"
Write-Host "R2 Bucket: $($completeResponse.r2Bucket)"
Write-Host "R2 Key: $($completeResponse.r2Key)"

Write-Host "Requesting signed download URL..."
$downloadResponse = Invoke-RestMethod `
    -Method Get `
    -Uri "$ApiBaseUrl/documents/$documentId/download-url?disposition=inline" `
    -Headers $headers

Write-Host "Download URL expires at: $($downloadResponse.expiresAt)"
Write-Host "Download URL:"
Write-Host $downloadResponse.url
