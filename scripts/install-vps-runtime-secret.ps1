[CmdletBinding()]
param(
  [string]$SshTarget = "alirezaafshan.com",
  [string]$EnvFile = "",
  [switch]$WhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($SshTarget -notmatch '^[A-Za-z0-9][A-Za-z0-9._@-]*$') {
  throw "SshTarget contains unsupported characters."
}

if (-not $EnvFile) {
  $EnvFile = Join-Path $PSScriptRoot "..\.env.local"
}
$resolvedEnvFile = (Resolve-Path -LiteralPath $EnvFile).Path
$apiKeyLine = Get-Content -LiteralPath $resolvedEnvFile |
  Where-Object { $_ -match '^\s*OPENAI_API_KEY\s*=' } |
  Select-Object -First 1

if ($null -eq $apiKeyLine) {
  throw "OPENAI_API_KEY is missing from the selected env file."
}

$apiKeyValue = ($apiKeyLine -replace '^\s*OPENAI_API_KEY\s*=\s*', '').Trim().Trim('"').Trim("'")
if ($apiKeyValue.Length -lt 20 -or $apiKeyValue.Contains("`r") -or $apiKeyValue.Contains("`n")) {
  throw "OPENAI_API_KEY is not usable."
}

if ($WhatIf) {
  Write-Output "VPS_RUNTIME_SECRET_INSTALL_READY target=$SshTarget env=OPENAI_API_KEY"
  exit 0
}

function Send-PrivatePayload {
  param(
    [Parameter(Mandatory = $true)][string]$Payload,
    [Parameter(Mandatory = $true)][string]$RemoteCommand
  )

  $encodedPayload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Payload))
  $sshOutput = $encodedPayload | & ssh -o BatchMode=yes -o ConnectTimeout=10 $SshTarget $RemoteCommand 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "SSH staging failed: $($sshOutput -join [Environment]::NewLine)"
  }
}

$runtimePayload = "OPENAI_API_KEY=$apiKeyValue`nDETECTIVE_ALLOWED_ORIGIN=https://conspiracy.alirezaafshan.com`n"
$stageRuntimeCommand = 'umask 077; install -d -m 0700 "$HOME/.config/conspiracy"; base64 -d > "$HOME/.config/conspiracy/runtime.env.pending"; chmod 0600 "$HOME/.config/conspiracy/runtime.env.pending"'
Send-PrivatePayload -Payload $runtimePayload -RemoteCommand $stageRuntimeCommand

$installerPayload = @'
#!/bin/sh
set -eu

app_config=/etc/deploy-manager/apps/conspiracy.env
runtime_dir=/etc/deploy-manager/runtime-env
runtime_file=$runtime_dir/conspiracy.env

if [ -z "${SUDO_USER:-}" ]; then
  echo "install-runtime: run this script through sudo" >&2
  exit 1
fi

staging_home=$(getent passwd "$SUDO_USER" | cut -d: -f6)
pending_file=$staging_home/.config/conspiracy/runtime.env.pending
installer_file=$staging_home/.config/conspiracy/install-runtime.sh

test -r "$pending_file"
test -f "$app_config"
grep -Eq '^OPENAI_API_KEY=.{20,}$' "$pending_file"

install -d -o root -g root -m 0700 "$runtime_dir"
install -o root -g root -m 0600 "$pending_file" "$runtime_file"

if grep -q '^CONTAINER_ENV_FILE=' "$app_config"; then
  sed -i "s|^CONTAINER_ENV_FILE=.*$|CONTAINER_ENV_FILE=$runtime_file|" "$app_config"
else
  printf '\nCONTAINER_ENV_FILE=%s\n' "$runtime_file" >> "$app_config"
fi

grep -Fxq "CONTAINER_ENV_FILE=$runtime_file" "$app_config"
rm -f "$pending_file" "$installer_file"
echo "VPS_RUNTIME_SECRET_READY app=conspiracy env=OPENAI_API_KEY"
'@
$installerPayload = ($installerPayload -replace "`r`n", "`n") + "`n"
$stageInstallerCommand = 'umask 077; install -d -m 0700 "$HOME/.config/conspiracy"; base64 -d > "$HOME/.config/conspiracy/install-runtime.sh"; chmod 0700 "$HOME/.config/conspiracy/install-runtime.sh"'
Send-PrivatePayload -Payload $installerPayload -RemoteCommand $stageInstallerCommand

Write-Output "The runtime secret is staged. The VPS will now ask for your sudo password."
& ssh -t $SshTarget 'sudo /bin/sh "$HOME/.config/conspiracy/install-runtime.sh"'
if ($LASTEXITCODE -ne 0) {
  throw "The privileged VPS installation did not complete. The staged files remain private for a retry."
}

Write-Output "VPS_RUNTIME_SECRET_INSTALL_OK target=$SshTarget env=OPENAI_API_KEY"
