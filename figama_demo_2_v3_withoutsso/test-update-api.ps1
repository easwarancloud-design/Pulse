# PowerShell script to test the conversation update API
# This tests the actual EKS endpoint

$baseUrl = "https://workforceagent.elevancehealth.com"
$conversationId = "conv_8047f3cb-a64a-48ac-86b7-fdcce1910868"
$domainId = "AG04333"
$newTitle = "API Test - PowerShell $(Get-Date -Format 'HH:mm:ss')"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Testing Conversation Update API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Endpoint: $baseUrl" -ForegroundColor White
Write-Host "Conversation ID: $conversationId" -ForegroundColor White
Write-Host "Domain ID: $domainId" -ForegroundColor White
Write-Host "New Title: $newTitle" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Get the conversation first (to see if it exists)
Write-Host "Step 1: Getting current conversation..." -ForegroundColor Yellow
$getUrl = "$baseUrl/api/conversations/$conversationId`?domain_id=$domainId"
Write-Host "GET $getUrl" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $getUrl -Method Get -ContentType "application/json" -ErrorAction Stop
    Write-Host "SUCCESS - Conversation exists" -ForegroundColor Green
    Write-Host "  Current Title: $($response.title)" -ForegroundColor White
    Write-Host "  Status: $($response.status)" -ForegroundColor White
    Write-Host "  Message Count: $($response.message_count)" -ForegroundColor White
    Write-Host "  Updated At: $($response.updated_at)" -ForegroundColor White
} catch {
    Write-Host "FAILED to get conversation" -ForegroundColor Red
    Write-Host "  Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}

# Test 2: Update the conversation title
Write-Host "`nStep 2: Updating conversation title..." -ForegroundColor Yellow
$updateUrl = "$baseUrl/api/conversations/$conversationId/update?domain_id=$domainId"
Write-Host "POST $updateUrl" -ForegroundColor Gray

$body = @{
    title = $newTitle
} | ConvertTo-Json

Write-Host "Request Body: $body" -ForegroundColor Gray

try {
    $updateResponse = Invoke-RestMethod -Uri $updateUrl -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host "SUCCESS - Title updated!" -ForegroundColor Green
    Write-Host "  New Title: $($updateResponse.title)" -ForegroundColor White
    Write-Host "  Updated At: $($updateResponse.updated_at)" -ForegroundColor White
    
    if ($updateResponse.title -eq $newTitle) {
        Write-Host "`nVERIFICATION PASSED - Title matches!" -ForegroundColor Green
    } else {
        Write-Host "`nVERIFICATION FAILED - Title mismatch" -ForegroundColor Yellow
        Write-Host "  Expected: $newTitle" -ForegroundColor Yellow
        Write-Host "  Got: $($updateResponse.title)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "FAILED to update conversation" -ForegroundColor Red
    Write-Host "  Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "`n  Detailed Error Response:" -ForegroundColor Red
            
            try {
                $errorJson = $responseBody | ConvertFrom-Json
                Write-Host "  $($errorJson | ConvertTo-Json -Depth 5)" -ForegroundColor Red
            } catch {
                Write-Host "  $responseBody" -ForegroundColor Red
            }
        } catch {
            Write-Host "  Could not read response body" -ForegroundColor Red
        }
    }
    
    Write-Host "`n  Full Exception Details:" -ForegroundColor Red
    Write-Host "  $($_ | Format-List -Force | Out-String)" -ForegroundColor Red
    
    exit 1
}

# Test 3: Verify by getting the conversation again
Write-Host "`nStep 3: Verifying update by fetching conversation again..." -ForegroundColor Yellow

try {
    $verifyResponse = Invoke-RestMethod -Uri $getUrl -Method Get -ContentType "application/json" -ErrorAction Stop
    Write-Host "SUCCESS - Verification complete" -ForegroundColor Green
    Write-Host "  Final Title: $($verifyResponse.title)" -ForegroundColor White
    Write-Host "  Updated At: $($verifyResponse.updated_at)" -ForegroundColor White
    
    if ($verifyResponse.title -eq $newTitle) {
        Write-Host "`n========================================" -ForegroundColor Green
        Write-Host "ALL TESTS PASSED" -ForegroundColor Green
        Write-Host "========================================`n" -ForegroundColor Green
    } else {
        Write-Host "`n========================================" -ForegroundColor Yellow
        Write-Host "Update succeeded but verification failed" -ForegroundColor Yellow
        Write-Host "========================================`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "FAILED to verify" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}