# Test script for regenerate/update message API endpoint
# Tests the new UPDATE message content endpoint

Write-Host "`n=== Testing Message Update API ===" -ForegroundColor Cyan
Write-Host "Testing: POST /api/conversations/{id}/messages/{chat_id}/update" -ForegroundColor Yellow

$baseUrl = "https://workforceagent.elevancehealth.com"
$conversationId = "conv_5bba0236-7a1b-453a-8951-5f1726daf570"
$chatId = "msg_86c9f2bd-b633-4805-9ed8-644a6fefceb1"
$domainId = "AG04333"

# Step 1: First, get the conversation to see current message content
Write-Host "`nStep 1: Getting conversation to see current message..." -ForegroundColor Cyan
$getUrl = "$baseUrl/api/conversations/$conversationId?domain_id=$domainId"
Write-Host "GET: $getUrl" -ForegroundColor Gray

try {
    $getResponse = Invoke-RestMethod -Uri $getUrl -Method Get -ContentType "application/json"
    Write-Host "SUCCESS - Current conversation retrieved" -ForegroundColor Green
    
    # Find the message with this chat_id
    $message = $getResponse.messages | Where-Object { $_.chat_id -eq $chatId }
    if ($message) {
        Write-Host "  Found message with chat_id: $chatId" -ForegroundColor Green
        Write-Host "  Current content: $($message.content.Substring(0, [Math]::Min(100, $message.content.Length)))..." -ForegroundColor Gray
        Write-Host "  Message ID: $($message.id)" -ForegroundColor Gray
    } else {
        Write-Host "  WARNING: Message with chat_id=$chatId not found in conversation" -ForegroundColor Yellow
        Write-Host "  Available chat_ids in conversation:" -ForegroundColor Yellow
        $getResponse.messages | ForEach-Object { 
            Write-Host "    - $($_.chat_id) ($($_.message_type))" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "ERROR getting conversation: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
}

# Step 2: Update the message content
Write-Host "`nStep 2: Updating message content..." -ForegroundColor Cyan
$updateUrl = "$baseUrl/api/conversations/$conversationId/messages/$chatId/update?domain_id=$domainId"
Write-Host "POST: $updateUrl" -ForegroundColor Gray

$updatePayload = @{
    message_type = "assistant"
    content = "This is a REGENERATED response - Updated via API test at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    metadata = @{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        regenerated = $true
        source = "api_test_script"
        chat_type = "bot"
    }
} | ConvertTo-Json -Depth 10

Write-Host "Payload:" -ForegroundColor Gray
Write-Host $updatePayload -ForegroundColor DarkGray

try {
    $updateResponse = Invoke-RestMethod -Uri $updateUrl -Method Post -Body $updatePayload -ContentType "application/json"
    Write-Host "SUCCESS - Message updated!" -ForegroundColor Green
    Write-Host "  Updated Message ID: $($updateResponse.id)" -ForegroundColor Green
    Write-Host "  Updated Content: $($updateResponse.content.Substring(0, [Math]::Min(100, $updateResponse.content.Length)))..." -ForegroundColor Gray
    Write-Host "  Updated At: $($updateResponse.updated_at)" -ForegroundColor Gray
    Write-Host "  Metadata regenerated: $($updateResponse.metadata.regenerated)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR updating message: $($_.Exception.Message)" -ForegroundColor Red
    
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status Code: $statusCode" -ForegroundColor Red
    
    if ($statusCode -eq 404) {
        Write-Host "`nPossible reasons for 404:" -ForegroundColor Yellow
        Write-Host "  1. Backend server not restarted after adding new route" -ForegroundColor Yellow
        Write-Host "  2. Route not registered in FastAPI app" -ForegroundColor Yellow
        Write-Host "  3. Message with chat_id=$chatId not found in database" -ForegroundColor Yellow
        Write-Host "`nSolution: Restart your backend server (uvicorn/gunicorn)" -ForegroundColor Cyan
    } elseif ($statusCode -eq 500) {
        Write-Host "`nServer error - check backend logs for details" -ForegroundColor Yellow
    }
    
    # Try to get error details
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        $reader.Close()
        Write-Host "`nError Response Body:" -ForegroundColor Yellow
        Write-Host $errorBody -ForegroundColor DarkYellow
    } catch {
        Write-Host "Could not read error response body" -ForegroundColor DarkGray
    }
}

# Step 3: Verify the update by getting the conversation again
Write-Host "`nStep 3: Verifying update by retrieving conversation again..." -ForegroundColor Cyan

try {
    $verifyResponse = Invoke-RestMethod -Uri $getUrl -Method Get -ContentType "application/json"
    $updatedMessage = $verifyResponse.messages | Where-Object { $_.chat_id -eq $chatId }
    
    if ($updatedMessage) {
        Write-Host "SUCCESS - Message verified!" -ForegroundColor Green
        Write-Host "  New Content: $($updatedMessage.content.Substring(0, [Math]::Min(100, $updatedMessage.content.Length)))..." -ForegroundColor Gray
        Write-Host "  Updated At: $($updatedMessage.updated_at)" -ForegroundColor Gray
        Write-Host "  Regenerated: $($updatedMessage.metadata.regenerated)" -ForegroundColor Gray
    } else {
        Write-Host "WARNING: Could not find updated message" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR verifying update: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
