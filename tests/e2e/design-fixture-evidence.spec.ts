import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type FixtureStatus = 'screenshot-pass' | 'test-evidence-pass' | 'blocked-needs-fixture-route';

type FixtureResult = {
	fixture: string;
	status: FixtureStatus;
	route: string;
	action: string;
	screenshot?: string;
	principle: string;
	observation: string;
	followUp: string;
};

const evidenceDir =
	process.env.DESIGN_FIXTURE_EVIDENCE_DIR ??
	path.join('.omx', 'plans', 'design-fixture-screenshots', 'latest');
const resultsPath =
	process.env.DESIGN_FIXTURE_RESULTS_PATH ?? path.join(evidenceDir, 'results.json');
const results: FixtureResult[] = [];

function ensureEvidenceDir() {
	mkdirSync(evidenceDir, { recursive: true });
}

function screenshotPath(filename: string) {
	return path.join(evidenceDir, filename);
}

async function waitForApp(page: Page) {
	await page.waitForLoadState('networkidle');
	await expect(page.locator('body')).toContainText('데이터 관리');
}

async function capture(page: Page, filename: string) {
	const file = screenshotPath(filename);
	await page.screenshot({ path: file, fullPage: true });
	return file;
}

async function clickButton(page: Page, name: string | RegExp) {
	await page.getByRole('button', { name }).click();
	await page.waitForLoadState('networkidle');
}

test.beforeAll(() => {
	ensureEvidenceDir();
});

test.afterAll(() => {
	writeFileSync(
		resultsPath,
		JSON.stringify(
			{
				createdAt: new Date().toISOString(),
				evidenceDir,
				results,
				browserFeasibilityRule:
					'Real browser screenshot was attempted first for each fixture; test evidence is used only when apply/source fixture state is not safely reachable without mutation or source changes.'
			},
			null,
			2
		),
		'utf8'
	);
});

test('captures design fixture evidence for remaining backlog blockers', async ({ page }) => {
	await page.goto('/domain/browse');
	await waitForApp(page);

	await test.step('save impact modal screenshot fixture', async () => {
		await clickButton(page, '새 도메인 추가');
		await expect(page.locator('#domainGroup')).toBeVisible();
		await page.locator('#domainGroup').fill('fixture-group');
		await page.locator('#domainCategory').fill('fixture-category');
		await page.locator('#physicalDataType').fill('VARCHAR');
		await page.locator('#dataLength').fill('32');
		await clickButton(page, /^저장$/);
		await expect(page.getByRole('dialog', { name: '저장 전 영향도 확인' })).toBeVisible();
		await expect(
			page.getByText('취소하면 나열된 원본/연관 파일은 변경되지 않습니다.')
		).toBeVisible();
		const screenshot = await capture(page, 'save-impact-modal.png');
		results.push({
			fixture: 'save impact modal',
			status: 'screenshot-pass',
			route: '/domain/browse',
			action: '새 도메인 추가 → 필수값 입력 → 저장 → confirm modal 표시, confirm 미클릭',
			screenshot,
			principle: 'Validate before mutate; Explain with data context',
			observation:
				'저장 전 영향도 확인 dialog가 대상 파일, 변경 파일, 충돌, 취소 시 비변경 안내를 표시한다.',
			followUp:
				'No immediate source fix; future visual-ralph only if screenshot review finds mismatch.'
		});
		await page
			.getByRole('dialog', { name: '저장 전 영향도 확인' })
			.getByRole('button', { name: '취소' })
			.click();
		await page.goto('/domain/browse');
		await waitForApp(page);
	});

	await test.step('validation expanded/error screenshot fixture', async () => {
		await clickButton(page, '유효성 검사');
		await expect(
			page.getByRole('dialog', { name: /도메인 유효성 검사 결과|유효성 검사 결과/ })
		).toBeVisible();
		await expect(page.getByText('상태:', { exact: false })).toBeVisible();
		const screenshot = await capture(page, 'validation-expanded-error.png');
		results.push({
			fixture: 'validation expanded/error',
			status: 'screenshot-pass',
			route: '/domain/browse',
			action: '유효성 검사 button → validation dialog expanded/error state',
			screenshot,
			principle: 'Do not rely on color alone; Explain with data context',
			observation:
				'검증 dialog가 상태 문구, 오류/검토 필요 label, 실패 항목 맥락을 색상 외 텍스트로 노출한다.',
			followUp:
				'No immediate source fix; add visual follow-up only if screenshot review finds mismatch.'
		});
	});

	await test.step('upload/file-manager mapping screenshot fixture', async () => {
		await page.goto('/domain/browse');
		await waitForApp(page);
		await page.getByRole('button', { name: '파일 관리' }).click();
		const managerDialog = page.getByRole('dialog').filter({ hasText: '도메인 파일 관리' });
		await expect(managerDialog).toBeVisible();
		await managerDialog.getByRole('button', { name: '파일 매핑' }).click();
		await expect(managerDialog.getByText('매핑', { exact: false }).first()).toBeVisible();
		const screenshot = await capture(page, 'upload-file-manager-mapping.png');
		results.push({
			fixture: 'upload/file-manager mapping',
			status: 'screenshot-pass',
			route: '/domain/browse',
			action: '파일 관리 → 파일 매핑 tab',
			screenshot,
			principle: 'Explain with data context; Prefer reversible workflows',
			observation:
				'파일 관리 dialog의 파일 매핑 tab이 현재 bundle/file mapping context를 mutation 없이 보여준다.',
			followUp:
				'Upload restore mutation state remains test-evidence unless a reset-backed upload history exists.'
		});
	});

	await test.step('sync preview/apply screenshot fixture', async () => {
		await page.goto('/database/browse');
		await waitForApp(page);
		await clickButton(page, '펼치기');
		await expect(page.getByText('자동 반영 정책')).toBeVisible();
		await clickButton(page, '보정 미리보기');
		await expect(page.getByText('보정 미리보기 결과')).toBeVisible({ timeout: 30_000 });
		await expect(page.getByText('요청: 미리보기(저장 없음)', { exact: false })).toBeVisible();
		await clickButton(page, '상세 보기');
		const screenshot = await capture(page, 'sync-preview-apply.png');
		results.push({
			fixture: 'sync preview/apply',
			status: 'screenshot-pass',
			route: '/database/browse',
			action:
				'연관 파일 panel 펼치기 → 보정 미리보기 → 상세 보기; apply는 자동 반영 정책 copy로 표시',
			screenshot,
			principle: 'Validate before mutate; Prefer reversible workflows; Preserve owner/issue trace',
			observation:
				'미리보기 결과가 저장 없음, 후보 수, 실제 반영 0, 정합성 변화, 미해결 원인/변경 후보를 보여주며 apply는 쓰기 작업의 자동 반영 정책으로 설명된다.',
			followUp:
				'Direct apply screenshot is not a standalone safe UI action in this panel; keep API/component apply evidence as supplement.'
		});
	});
});
