import { relative } from 'path';
import { resetTestData } from '../src/lib/utils/test-data-reset.js';

function printFiles(label, dataDir, files) {
	if (files.length === 0) {
		return;
	}

	console.log(`${label} (${files.length}개)`);
	for (const file of files) {
		console.log(`- ${relative(dataDir, file)}`);
	}
}

async function main() {
	const result = await resetTestData();

	console.log('테스트 데이터 초기화 완료');
	console.log(`데이터 경로: ${result.dataDir}`);
	console.log(`기본 파일 재생성: ${result.rewrittenFiles.length}개`);
	console.log(`레지스트리 초기화: ${relative(result.dataDir, result.registryPath)}`);
	console.log(`공통 파일 매핑 초기화: ${relative(result.dataDir, result.sharedFileMappingsPath)}`);
	console.log('유지되는 설정: settings/domain-data-type-mappings.json');

	printFiles('삭제된 JSON 파일', result.dataDir, result.removedFiles);
}

main().catch((error) => {
	console.error(
		'테스트 데이터 초기화 실패:',
		error instanceof Error ? error.message : String(error)
	);
	process.exitCode = 1;
});
