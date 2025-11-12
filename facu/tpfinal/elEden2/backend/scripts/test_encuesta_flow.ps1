# Test end-to-end del flujo de encuesta (finalizar servicio -> email link -> responder)
# Requisitos:
# - Backend corriendo (docker-compose) y accesible en $BASE
# - Usuario ADMIN válido para finalizar servicio
# - Usuario CLIENTE dueño de la reserva a finalizar
# - Id de reserva existente perteneciente al cliente

param(
  [string]$BASE = "http://localhost:8000/api/v1",
  [Parameter(Mandatory=$true)][string]$AdminUsername,
  [Parameter(Mandatory=$true)][string]$AdminPassword,
  [Parameter(Mandatory=$true)][string]$ClientUsername,
  [Parameter(Mandatory=$true)][string]$ClientPassword,
  [Parameter(Mandatory=$true)][int]$ReservaId
)

function Get-JwtToken {
  param(
    [string]$Base,
    [string]$Username,
    [string]$Password
  )
  $body = @{ username = $Username; password = $Password } | ConvertTo-Json
  $resp = Invoke-RestMethod -Method Post -Uri "$Base/token/" -Headers @{ 'Content-Type'='application/json' } -Body $body -ErrorAction Stop
  return $resp.access
}

function Invoke-Api {
  param(
    [ValidateSet('Get','Post','Put','Patch','Delete')][string]$Method,
    [string]$Url,
    [string]$Token,
    $BodyObj
  )
  $headers = @{ 'Authorization' = "Bearer $Token"; 'Content-Type'='application/json' }
  if ($PSBoundParameters.ContainsKey('BodyObj') -and $null -ne $BodyObj) {
    $json = $BodyObj | ConvertTo-Json -Depth 6
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -Body $json -ErrorAction Stop
  } else {
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -ErrorAction Stop
  }
}

Write-Host "1) Autenticando ADMIN..." -ForegroundColor Cyan
$adminToken = Get-JwtToken -Base $BASE -Username $AdminUsername -Password $AdminPassword
Write-Host "   OK" -ForegroundColor Green

Write-Host "2) Finalizando servicio de la reserva #$ReservaId..." -ForegroundColor Cyan
$finalUrl = "$BASE/servicios/reservas/$ReservaId/finalizar-servicio/"
$finalResp = Invoke-Api -Method Post -Url $finalUrl -Token $adminToken -BodyObj @{}
Write-Host "   Estado: $($finalResp.message)" -ForegroundColor Green

Write-Host "3) Autenticando CLIENTE..." -ForegroundColor Cyan
$clientToken = Get-JwtToken -Base $BASE -Username $ClientUsername -Password $ClientPassword
Write-Host "   OK" -ForegroundColor Green

Write-Host "4) Obteniendo encuesta activa..." -ForegroundColor Cyan
$encActiva = Invoke-Api -Method Get -Url "$BASE/encuestas/activa/" -Token $clientToken
if (-not $encActiva) {
  Write-Error "No hay encuesta activa. Aborta."
  exit 1
}
Write-Host "   Encuesta: $($encActiva.titulo) (#$($encActiva.id_encuesta))" -ForegroundColor Green

# 5) Armar respuestas según tipo de pregunta
$respuestas = @()
foreach ($p in $encActiva.preguntas) {
  # Nota: $pid es una variable reservada en PowerShell (Process ID). Usar otro nombre.
  $qId = $p.id_pregunta
  switch ($p.tipo) {
    'texto'   { $respuestas += @{ pregunta_id = $qId; valor_texto = 'Prueba automatizada' } }
    'numero'  { $respuestas += @{ pregunta_id = $qId; valor_numerico = 5 } }
    'escala'  { $respuestas += @{ pregunta_id = $qId; valor_numerico = 5 } }
    'si_no'   { $respuestas += @{ pregunta_id = $qId; valor_boolean = $true } }
    'multiple' {
      $choice = $null
      if ($p.opciones -and $p.opciones.Count -gt 0) { $choice = $p.opciones[0] } else { $choice = 'Opcion A' }
      $respuestas += @{ pregunta_id = $qId; valor_texto = [string]$choice }
    }
    default   { $respuestas += @{ pregunta_id = $qId; valor_texto = 'N/A' } }
  }
}

Write-Host "5) Enviando respuestas..." -ForegroundColor Cyan
$payload = @{ reserva_id = $ReservaId; respuestas = $respuestas }
$respOk = Invoke-Api -Method Post -Url "$BASE/encuestas/responder/" -Token $clientToken -BodyObj $payload
Write-Host "   Resultado: $($respOk.mensaje) | encuesta_respuesta_id=$($respOk.encuesta_respuesta_id)" -ForegroundColor Green

Write-Host "Listo. Flujo validado end-to-end." -ForegroundColor Green
