프로젝트를 서버에 배포하는데 에러가 발생해. @Dockerfile 과 @docker-compose.yml 을 참고해서 이하 오류를 수정해.

[오류 내용]
[+] Building 38.3s (11/14) docker:default
=> [app internal] load build definition from Dockerfile 0.3s
=> => transferring dockerfile: 749B 0.0s
=> [app internal] load metadata for docker.io/library/node:20-alpine 2.1s
=> [app internal] load .dockerignore 0.2s
=> => transferring context: 196B 0.0s
=> [app internal] load build context 0.3s
=> => transferring context: 4.08MB 0.1s
=> [app builder 1/7] FROM docker.io/library/node:20-alpine@sha256:658d0f63e501824d6c23e06d4bb95c7 0.0s
=> CACHED [app builder 2/7] WORKDIR /app 0.0s
=> CACHED [app builder 3/7] RUN npm install -g pnpm 0.0s
=> [app builder 4/7] COPY package.json pnpm-lock.yaml ./ 3.6s
=> [app builder 5/7] RUN pnpm install --frozen-lockfile 13.7s
=> [app builder 6/7] COPY . . 2.4s
=> ERROR [app builder 7/7] RUN pnpm run build 11.5s

---

> [app builder 7/7] RUN pnpm run build:
> 6.440
> 6.440 > dbmanager@0.0.1 build /app
> 6.440 > vite build && npm run prepack
> 6.440
> 6.575 ▲ [WARNING] Cannot find base config file "./.svelte-kit/tsconfig.json" [tsconfig.json]
> 6.575
> 6.575 tsconfig.json:2:12:
> 6.575 2 │ "extends": "./.svelte-kit/tsconfig.json",
> 6.575 ╵ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
> 6.575
> 7.163 1:38:51 AM [vite-plugin-svelte] WARNING: The following packages have a svelte field in their package.json but no exports condition for svelte.
> 7.163
> 7.163 svelte-copy-to-clipboard@0.2.5
> 7.163
> 7.163 Please see https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/faq.md#missing-exports-condition for details.
> 7.173 error during build:
> 7.173 Error: Files prefixed with + are reserved (saw src/routes/api/attribute/+server.test.ts)
> 7.173 at analyze (file:///app/node*modules/.pnpm/@sveltejs+kit@2.22.2*@sveltejs+vite-plugin-svelte@5.1.0_svelte@5.34.8_vite@6.3.5_@types*b5b7d01a57b18157414fc1cb8304b9cb/node_modules/@sveltejs/kit/src/core/sync/create_manifest_data/index.js:501:10)
> 7.173 at walk (file:///app/node_modules/.pnpm/@sveltejs+kit@2.22.2*@sveltejs+vite-plugin-svelte@5.1.0_svelte@5.34.8_vite@6.3.5_@types*b5b7d01a57b18157414fc1cb8304b9cb/node_modules/@sveltejs/kit/src/core/sync/create_manifest_data/index.js:267:18)
> 7.173 at walk (file:///app/node_modules/.pnpm/@sveltejs+kit@2.22.2*@sveltejs+vite-plugin-svelte@5.1.0_svelte@5.34.8_vite@6.3.5_@types*b5b7d01a57b18157414fc1cb8304b9cb/node_modules/@sveltejs/kit/src/core/sync/create_manifest_data/index.js:353:6)
> 7.173 at walk (file:///app/node_modules/.pnpm/@sveltejs+kit@2.22.2*@sveltejs+vite-plugin-svelte@5.1.0_svelte@5.34.8_vite@6.3.5_@types*b5b7d01a57b18157414fc1cb8304b9cb/node_modules/@sveltejs/kit/src/core/sync/create_manifest_data/index.js:353:6)
> 7.173 at create_routes_and_nodes (file:///app/node_modules/.pnpm/@sveltejs+kit@2.22.2*@sveltejs+vite-plugin-svelte@5.1.0_svelte@5.34.8_vite@6.3.5_@types*b5b7d01a57b18157414fc1cb8304b9cb/node_modules/@sveltejs/kit/src/core/sync/create_manifest_data/index.js:358:3)
> 7.173 at create_manifest_data (file:///app/node_modules/.pnpm/@sveltejs+kit@2.22.2*@sveltejs+vite-plugin-svelte@5.1.0_svelte@5.34.8_vite@6.3.5_@types*b5b7d01a57b18157414fc1cb8304b9cb/node_modules/@sveltejs/kit/src/core/sync/create_manifest_data/index.js:29:28)
> 7.173 at create (file:///app/node_modules/.pnpm/@sveltejs+kit@2.22.2*@sveltejs+vite-plugin-svelte@5.1.0_svelte@5.34.8_vite@6.3.5_@types*b5b7d01a57b18157414fc1cb8304b9cb/node_modules/@sveltejs/kit/src/core/sync/sync.js:27:24)
> 7.173 at Module.all (file:///app/node_modules/.pnpm/@sveltejs+kit@2.22.2*@sveltejs+vite-plugin-svelte@5.1.0_svelte@5.34.8_vite@6.3.5_@types*b5b7d01a57b18157414fc1cb8304b9cb/node_modules/@sveltejs/kit/src/core/sync/sync.js:58:9)
> 7.173 at config (file:///app/node_modules/.pnpm/@sveltejs+kit@2.22.2*@sveltejs+vite-plugin-svelte@5.1.0_svelte@5.34.8_vite@6.3.5_@types*b5b7d01a57b18157414fc1cb8304b9cb/node_modules/@sveltejs/kit/src/exports/vite/index.js:348:27)
> 7.173 at async runConfigHook (file:///app/node_modules/.pnpm/vite@6.3.5*@types+node@24.0.4_jiti@2.4.2_lightningcss@1.30.1_yaml@2.8.0/node_modules/vite/dist/node/chunks/dep-DBxKXgDP.js:49444:17)

## 7.187  ELIFECYCLE  Command failed with exit code 1.

failed to solve: process "/bin/sh -c pnpm run build" did not complete successfully: exit code: 1

[배포 shell]
[ecobank@localhost etc]$ cat deploy_dbmanager.sh
#!/bin/bash

# 스크립트 에러 발생 시 중단

set -e

# 대상 디렉토리로 이동

cd "$HOME/etc/DbManager"

# Git 최신 코드 가져오기

git fetch
git pull

# Docker compose로 app 서비스 빌드 및 재기동

docker compose up -d --build app

# 완료 메시지 출력

echo "DbManager 배포 완료"
