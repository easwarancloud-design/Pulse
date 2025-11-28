# PowerShell script to create venv, install requirements, and run uvicorn
param(
    [switch]$ForceReinstall
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# Try common python executables
$pyCandidates = @('py', 'python', 'python3')
$py = $null
foreach ($p in $pyCandidates) {
    if (Get-Command $p -ErrorAction SilentlyContinue) { $py = $p; break }
}

if (-not $py) {
    Write-Error "Python was not found on the PATH. Please install Python 3.8+ and ensure 'python' or 'py' is available."
    exit 1
}

if (!(Test-Path ".venv")) {
    & $py -m venv .venv
}

$activate = ".\.venv\Scripts\Activate.ps1"
if (Test-Path $activate) {
    . $activate
} else {
    Write-Host "Could not find virtualenv activate script at $activate"
}

# ensure pip is available from the venv
if ($ForceReinstall -or -not (Get-Command pip -ErrorAction SilentlyContinue)) {
    & $py -m pip install -r requirements.txt
}

# Run uvicorn with reload for development
& $py -m uvicorn backend.main:app --reload
