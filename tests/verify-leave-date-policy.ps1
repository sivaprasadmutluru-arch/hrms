$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:8080/api'
$login = Invoke-RestMethod "$base/auth/login" -Method Post -ContentType application/json -Body '{"usernameOrEmail":"admin","password":"admin123"}'
$headers = @{ Authorization = "Bearer $($login.token)" }
$companies = @(Invoke-RestMethod "$base/platform/scope/companies" -Headers $headers | ForEach-Object { $_ })
$employee = $null
foreach ($company in ($companies | Where-Object type -eq 'HEAD_OFFICE')) {
    $headers['X-Company-Id'] = [string]$company.id
    $response = Invoke-RestMethod "$base/employees?size=1" -Headers $headers
    $employees = @(if ($null -ne $response.content) { $response.content } else { $response })
    if ($employees.Count -gt 0 -and $employees[0].id) { $employee = $employees[0]; break }
}
if (!$employee) { throw 'No existing employee available for the read-only API validation check.' }
$cutoff = [DateTime]::Today.AddMonths(-2)
foreach ($case in @(
    @{ Date = $cutoff.AddDays(-1); Status = 400; Message = '2 months' },
    @{ Date = $cutoff; Status = 404; Message = 'LeaveType' },
    @{ Date = [DateTime]::Today.AddDays(1); Status = 404; Message = 'LeaveType' }
)) {
    # A deliberately nonexistent leave type ensures no request or balance can be written.
    $body = @{ employeeId = $employee.id; leaveTypeId = -1; startDate = $case.Date.ToString('yyyy-MM-dd'); endDate = $case.Date.ToString('yyyy-MM-dd') } | ConvertTo-Json
    try {
        Invoke-WebRequest "$base/leave/apply" -Headers $headers -Method Post -ContentType application/json -Body $body -UseBasicParsing | Out-Null
        throw 'Expected validation failure for the nonexistent test leave type.'
    } catch {
        $response = $_.Exception.Response
        if (!$response -or [int]$response.StatusCode -ne $case.Status) { throw }
        $reader = New-Object IO.StreamReader($response.GetResponseStream())
        try { $message = $reader.ReadToEnd() } finally { $reader.Dispose() }
        if ($message -notmatch $case.Message) { throw "Unexpected API validation response: $message" }
    }
}
foreach ($asset in @('leave-date-window.js','ESSPage-DUzgNWLy.js','LeavePage-CCb9a5cC.js')) {
    $response = Invoke-WebRequest "http://127.0.0.1:8080/assets/$asset" -UseBasicParsing
    if ($response.StatusCode -ne 200 -or $response.Content -notmatch 'earliestLeaveDate') { throw "Updated asset missing: $asset" }
}
Write-Host "PASS: API rejects dates before $($cutoff.ToString('yyyy-MM-dd')), accepts the cutoff and future dates through date validation, and serves both updated forms. No leave requests or balances were changed."
