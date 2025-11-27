# PowerShell script to fix duplicate catch blocks in ChatPage.jsx

$filePath = "c:\Users\Easwar\Github\Pulse\figma_demo_2_v1\src\ChatPage.jsx"

# Read all lines
$lines = Get-Content $filePath

# Find and fix the issues
$newLines = @()
$skipNext = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    
    # Skip the duplicate catch blocks at lines 1799 and 1889 (0-based: 1798 and 1888)
    if ($i -eq 1798 -or $i -eq 1888) {
        if ($line.Trim() -eq "} catch (error) {") {
            # This is the duplicate catch block - skip it and the next line
            $skipNext = $true
            continue
        }
    }
    
    if ($skipNext) {
        if ($line.Contains("âŒ Failed to store") -and $line.Contains("feedback")) {
            # Skip this line too (it's the duplicate console.error)
            $skipNext = $false
            continue
        }
    }
    
    $newLines += $line
}

# Write back to file
$newLines | Set-Content $filePath -Encoding UTF8

Write-Host "Fixed duplicate catch blocks in ChatPage.jsx"