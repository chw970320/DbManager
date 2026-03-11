param(
	[Parameter(Position = 0)]
	[string]$BranchName,
	[string]$MainBranch = 'main',
	[string]$RemoteName = 'origin',
	[string]$VerificationCommand = 'pnpm check',
	[string]$AdditionalTestCommand,
	[switch]$SkipVerification,
	[switch]$DeleteRemote = $true
)

$ErrorActionPreference = 'Stop'

function Invoke-Step {
	param([string]$CommandText)

	Write-Host ">> $CommandText"
	Invoke-Expression $CommandText

	if ($LASTEXITCODE -ne 0) {
		throw "명령 실행에 실패했습니다: $CommandText"
	}
}

function Test-GitRef {
	param([string]$RefName)

	git rev-parse --verify $RefName *> $null
	return $LASTEXITCODE -eq 0
}

function Test-RemoteBranch {
	param(
		[string]$Remote,
		[string]$Branch
	)

	$remoteResult = git ls-remote --heads $Remote $Branch
	return -not [string]::IsNullOrWhiteSpace($remoteResult)
}

$currentBranch = (git branch --show-current).Trim()

if ([string]::IsNullOrWhiteSpace($currentBranch)) {
	throw '현재 Git 브랜치를 확인할 수 없습니다.'
}

if ([string]::IsNullOrWhiteSpace($BranchName)) {
	$BranchName = $currentBranch
}

if ($BranchName -eq $MainBranch) {
	Write-Host "'$MainBranch'에서 직접 작업 중이므로 병합 및 브랜치 삭제 절차를 건너뜁니다."
	exit 0
}

$statusOutput = git status --short
if (-not [string]::IsNullOrWhiteSpace(($statusOutput | Out-String).Trim())) {
	throw '브랜치 정리 전에는 작업 트리가 깨끗해야 합니다.'
}

if (-not (Test-GitRef $BranchName)) {
	throw "브랜치 '$BranchName'을(를) 찾을 수 없습니다."
}

if (-not (Test-GitRef $MainBranch)) {
	throw "기준 브랜치 '$MainBranch'을(를) 찾을 수 없습니다."
}

$remoteExists = -not [string]::IsNullOrWhiteSpace((git remote | Select-String -Pattern "^$RemoteName$"))

if ($currentBranch -ne $BranchName) {
	Invoke-Step "git checkout $BranchName"
}

if ($remoteExists -and (Test-RemoteBranch -Remote $RemoteName -Branch $MainBranch)) {
	Invoke-Step "git fetch $RemoteName $MainBranch"
	Invoke-Step "git merge --no-edit $RemoteName/$MainBranch"
} else {
	Write-Host "원격 '$RemoteName/$MainBranch'를 찾지 못해 원격 기준 반영은 건너뜁니다."
}

if (-not $SkipVerification) {
	Invoke-Step $VerificationCommand

	if (-not [string]::IsNullOrWhiteSpace($AdditionalTestCommand)) {
		Invoke-Step $AdditionalTestCommand
	}
} else {
	Write-Host '검증 단계는 요청에 따라 건너뜁니다.'
}

Invoke-Step "git checkout $MainBranch"
Invoke-Step "git merge --ff-only $BranchName"
Invoke-Step "git branch -d $BranchName"

if ($DeleteRemote -and $remoteExists -and (Test-RemoteBranch -Remote $RemoteName -Branch $BranchName)) {
	Invoke-Step "git push $RemoteName --delete $BranchName"
} elseif ($DeleteRemote) {
	Write-Host "삭제할 원격 브랜치 '$RemoteName/$BranchName'가 없어 원격 삭제는 건너뜁니다."
}

Write-Host "브랜치 '$BranchName' 정리가 완료되었습니다."
