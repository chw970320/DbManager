용어 변환기의 변환 결과 복사 기능 오류가 발생했어.

C05qsKUQ.js:1 POST http://ecobank-dev-was:63000/api/term/validate 400 (Bad Request)
window.fetch @ C05qsKUQ.js:1
Be @ 10.CXoKHger.js:8
Y @ 10.CXoKHger.js:8
await in Y
W @ 10.CXoKHger.js:8
await in W
s @ DzbSKew1.js:1
setTimeout
r @ DzbSKew1.js:1
(anonymous) @ 10.CXoKHger.js:8
Ee @ DzWeWARa.js:1
Rt @ DzWeWARa.js:1
rn @ DzWeWARa.js:1
Et @ DzWeWARa.js:1
B_QheGpw.js:1 Uncaught TypeError: Cannot read properties of undefined (reading 'writeText')
at F (10.CXoKHger.js:8:1279)
at HTMLButtonElement.Co (10.CXoKHger.js:8:3688)
at HTMLDivElement.m (B_QheGpw.js:1:2039)
F @ 10.CXoKHger.js:8
Co @ 10.CXoKHger.js:8
m @ B_QheGpw.js:1
C05qsKUQ.js:1 POST http://ecobank-dev-was:63000/api/term/validate 400 (Bad Request)
window.fetch @ C05qsKUQ.js:1
Be @ 10.CXoKHger.js:8
Y @ 10.CXoKHger.js:8
await in Y
W @ 10.CXoKHger.js:8
await in W
s @ DzbSKew1.js:1
setTimeout
r @ DzbSKew1.js:1
(anonymous) @ 10.CXoKHger.js:8
Ee @ DzWeWARa.js:1
Rt @ DzWeWARa.js:1
rn @ DzWeWARa.js:1
Et @ DzWeWARa.js:1

@docs/ 참고해서 TDD로 수정 진행해.

---

용어 변환 결과 validation check에서 오류가 발생해. 발생 상황은 이하와 같아.

1. input : 시험\_코드, 매핑된 단어 파일 : biomimicry.json, 매핑된 도메인 파일 : biomimicry.json
2. "'코드'은(는) 형식단어가 아니므로 용어명의 접미사로 사용할 수 없습니다. (형식단어여부: N)"
3. 단어 파일 biomimicry.json에는 형식단어여부가 Y이며 도메인도 정상 매핑되어 있음.

@docs/ 참고해서 TDD로 오류 수정해.

---

용어 변환기에 '특허\_연계\_URL'로 검색하는데 이하의 에러가 발생해.

chunk-A7MI4VLN.js?v=b38fc8cf:182 Uncaught Svelte error: each_key_duplicate
Keyed each block has duplicate key `PTNT` at indexes 0 and 1
https://svelte.dev/e/each_key_duplicate

    in <unknown>
    in TermGenerator.svelte
    in +page.svelte
    in +layout.svelte
    in root.svelte

    at each_key_duplicate (chunk-A7MI4VLN.js?v=b38fc8cf:182:19)
    at chunk-VUMTVNUW.js?v=b38fc8cf:3698:9
    at update_reaction (chunk-A7MI4VLN.js?v=b38fc8cf:1690:23)
    at update_effect (chunk-A7MI4VLN.js?v=b38fc8cf:1810:21)
    at create_effect (chunk-A7MI4VLN.js?v=b38fc8cf:2206:7)
    at render_effect (chunk-A7MI4VLN.js?v=b38fc8cf:2335:10)
    at Module.validate_each_keys (chunk-VUMTVNUW.js?v=b38fc8cf:3686:3)
    at consequent_10 (TermGenerator.svelte:442:34)
    at chunk-VUMTVNUW.js?v=b38fc8cf:612:42
    at update_reaction (chunk-A7MI4VLN.js?v=b38fc8cf:1690:23)

each_key_duplicate @ chunk-A7MI4VLN.js?v=b38fc8cf:182
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:3698
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
render_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2335
validate_each_keys @ chunk-VUMTVNUW.js?v=b38fc8cf:3686
consequent_10 @ TermGenerator.svelte:442
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:612
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
branch @ chunk-A7MI4VLN.js?v=b38fc8cf:2358
update_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:612
set_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:580
(anonymous) @ TermGenerator.svelte:494
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:637
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
block @ chunk-A7MI4VLN.js?v=b38fc8cf:2355
if_block @ chunk-VUMTVNUW.js?v=b38fc8cf:635
alternate_2 @ TermGenerator.svelte:623
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:623
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
branch @ chunk-A7MI4VLN.js?v=b38fc8cf:2358
update_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:623
set_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:580
(anonymous) @ TermGenerator.svelte:471
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:637
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
process_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1943
flush_queued_root_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1880
TermGenerator.svelte:155 POST http://localhost:5173/api/term/validate?filename=bksp.json 400 (Bad Request)
window.fetch @ fetcher.js?v=b38fc8cf:66
validateSegmentResults @ TermGenerator.svelte:155
convertToFinal @ TermGenerator.svelte:123
await in convertToFinal
findCombinations @ TermGenerator.svelte:77
await in findCombinations
later @ debounce.ts:18
setTimeout
executedFunction @ debounce.ts:22
$effect @ TermGenerator.svelte:43
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
flush_queued_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1901
flush_queued_root_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1881
chunk-A7MI4VLN.js?v=b38fc8cf:182 Uncaught Svelte error: each_key_duplicate
Keyed each block has duplicate key `PTNT_LINK` at indexes 0 and 1
https://svelte.dev/e/each_key_duplicate

    in <unknown>
    in TermGenerator.svelte
    in +page.svelte
    in +layout.svelte
    in root.svelte

    at each_key_duplicate (chunk-A7MI4VLN.js?v=b38fc8cf:182:19)
    at chunk-VUMTVNUW.js?v=b38fc8cf:3698:9
    at update_reaction (chunk-A7MI4VLN.js?v=b38fc8cf:1690:23)
    at update_effect (chunk-A7MI4VLN.js?v=b38fc8cf:1810:21)
    at create_effect (chunk-A7MI4VLN.js?v=b38fc8cf:2206:7)
    at render_effect (chunk-A7MI4VLN.js?v=b38fc8cf:2335:10)
    at Module.validate_each_keys (chunk-VUMTVNUW.js?v=b38fc8cf:3686:3)
    at consequent_10 (TermGenerator.svelte:442:34)
    at chunk-VUMTVNUW.js?v=b38fc8cf:612:42
    at update_reaction (chunk-A7MI4VLN.js?v=b38fc8cf:1690:23)

each_key_duplicate @ chunk-A7MI4VLN.js?v=b38fc8cf:182
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:3698
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
render_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2335
validate_each_keys @ chunk-VUMTVNUW.js?v=b38fc8cf:3686
consequent_10 @ TermGenerator.svelte:442
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:612
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
branch @ chunk-A7MI4VLN.js?v=b38fc8cf:2358
update_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:612
set_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:580
(anonymous) @ TermGenerator.svelte:494
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:637
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
block @ chunk-A7MI4VLN.js?v=b38fc8cf:2355
if_block @ chunk-VUMTVNUW.js?v=b38fc8cf:635
alternate_2 @ TermGenerator.svelte:623
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:623
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
branch @ chunk-A7MI4VLN.js?v=b38fc8cf:2358
update_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:623
set_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:580
(anonymous) @ TermGenerator.svelte:471
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:637
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
process_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1943
flush_queued_root_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1880
TermGenerator.svelte:155 POST http://localhost:5173/api/term/validate?filename=bksp.json 400 (Bad Request)
window.fetch @ fetcher.js?v=b38fc8cf:66
validateSegmentResults @ TermGenerator.svelte:155
convertToFinal @ TermGenerator.svelte:123
await in convertToFinal
findCombinations @ TermGenerator.svelte:77
await in findCombinations
later @ debounce.ts:18
setTimeout
executedFunction @ debounce.ts:22
$effect @ TermGenerator.svelte:43
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
flush_queued_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1901
flush_queued_root_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1881
chunk-A7MI4VLN.js?v=b38fc8cf:182 Uncaught Svelte error: each_key_duplicate
Keyed each block has duplicate key `PTNT_LINK` at indexes 0 and 1
https://svelte.dev/e/each_key_duplicate

    in <unknown>
    in TermGenerator.svelte
    in +page.svelte
    in +layout.svelte
    in root.svelte

    at each_key_duplicate (chunk-A7MI4VLN.js?v=b38fc8cf:182:19)
    at chunk-VUMTVNUW.js?v=b38fc8cf:3698:9
    at update_reaction (chunk-A7MI4VLN.js?v=b38fc8cf:1690:23)
    at update_effect (chunk-A7MI4VLN.js?v=b38fc8cf:1810:21)
    at create_effect (chunk-A7MI4VLN.js?v=b38fc8cf:2206:7)
    at render_effect (chunk-A7MI4VLN.js?v=b38fc8cf:2335:10)
    at Module.validate_each_keys (chunk-VUMTVNUW.js?v=b38fc8cf:3686:3)
    at consequent_10 (TermGenerator.svelte:442:34)
    at chunk-VUMTVNUW.js?v=b38fc8cf:612:42
    at update_reaction (chunk-A7MI4VLN.js?v=b38fc8cf:1690:23)

each_key_duplicate @ chunk-A7MI4VLN.js?v=b38fc8cf:182
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:3698
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
render_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2335
validate_each_keys @ chunk-VUMTVNUW.js?v=b38fc8cf:3686
consequent_10 @ TermGenerator.svelte:442
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:612
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
branch @ chunk-A7MI4VLN.js?v=b38fc8cf:2358
update_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:612
set_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:580
(anonymous) @ TermGenerator.svelte:494
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:637
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
block @ chunk-A7MI4VLN.js?v=b38fc8cf:2355
if_block @ chunk-VUMTVNUW.js?v=b38fc8cf:635
alternate_2 @ TermGenerator.svelte:623
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:623
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
branch @ chunk-A7MI4VLN.js?v=b38fc8cf:2358
update_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:623
set_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:580
(anonymous) @ TermGenerator.svelte:471
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:637
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
process_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1943
flush_queued_root_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1880
TermGenerator.svelte:155 POST http://localhost:5173/api/term/validate?filename=bksp.json 400 (Bad Request)
window.fetch @ fetcher.js?v=b38fc8cf:66
validateSegmentResults @ TermGenerator.svelte:155
convertToFinal @ TermGenerator.svelte:123
await in convertToFinal
findCombinations @ TermGenerator.svelte:77
await in findCombinations
later @ debounce.ts:18
setTimeout
executedFunction @ debounce.ts:22
$effect @ TermGenerator.svelte:43
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
flush_queued_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1901
flush_queued_root_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1881
chunk-A7MI4VLN.js?v=b38fc8cf:182 Uncaught Svelte error: each_key_duplicate
Keyed each block has duplicate key `PTNT_LINK_URL` at indexes 0 and 1
https://svelte.dev/e/each_key_duplicate

    in <unknown>
    in TermGenerator.svelte
    in +page.svelte
    in +layout.svelte
    in root.svelte

    at each_key_duplicate (chunk-A7MI4VLN.js?v=b38fc8cf:182:19)
    at chunk-VUMTVNUW.js?v=b38fc8cf:3698:9
    at update_reaction (chunk-A7MI4VLN.js?v=b38fc8cf:1690:23)
    at update_effect (chunk-A7MI4VLN.js?v=b38fc8cf:1810:21)
    at create_effect (chunk-A7MI4VLN.js?v=b38fc8cf:2206:7)
    at render_effect (chunk-A7MI4VLN.js?v=b38fc8cf:2335:10)
    at Module.validate_each_keys (chunk-VUMTVNUW.js?v=b38fc8cf:3686:3)
    at consequent_10 (TermGenerator.svelte:442:34)
    at chunk-VUMTVNUW.js?v=b38fc8cf:612:42
    at update_reaction (chunk-A7MI4VLN.js?v=b38fc8cf:1690:23)

each_key_duplicate @ chunk-A7MI4VLN.js?v=b38fc8cf:182
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:3698
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
render_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2335
validate_each_keys @ chunk-VUMTVNUW.js?v=b38fc8cf:3686
consequent_10 @ TermGenerator.svelte:442
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:612
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
branch @ chunk-A7MI4VLN.js?v=b38fc8cf:2358
update_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:612
set_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:580
(anonymous) @ TermGenerator.svelte:494
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:637
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
block @ chunk-A7MI4VLN.js?v=b38fc8cf:2355
if_block @ chunk-VUMTVNUW.js?v=b38fc8cf:635
alternate_2 @ TermGenerator.svelte:623
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:623
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
branch @ chunk-A7MI4VLN.js?v=b38fc8cf:2358
update_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:623
set_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:580
(anonymous) @ TermGenerator.svelte:471
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:637
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
process_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1943
flush_queued_root_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1880
chunk-A7MI4VLN.js?v=b38fc8cf:182 Uncaught Svelte error: each_key_duplicate
Keyed each block has duplicate key `PTNT` at indexes 0 and 1
https://svelte.dev/e/each_key_duplicate

    in <unknown>
    in TermGenerator.svelte
    in +page.svelte
    in +layout.svelte
    in root.svelte

    at each_key_duplicate (chunk-A7MI4VLN.js?v=b38fc8cf:182:19)
    at chunk-VUMTVNUW.js?v=b38fc8cf:3698:9
    at update_reaction (chunk-A7MI4VLN.js?v=b38fc8cf:1690:23)
    at update_effect (chunk-A7MI4VLN.js?v=b38fc8cf:1810:21)
    at create_effect (chunk-A7MI4VLN.js?v=b38fc8cf:2206:7)
    at render_effect (chunk-A7MI4VLN.js?v=b38fc8cf:2335:10)
    at Module.validate_each_keys (chunk-VUMTVNUW.js?v=b38fc8cf:3686:3)
    at consequent_10 (TermGenerator.svelte:442:34)
    at chunk-VUMTVNUW.js?v=b38fc8cf:612:42
    at update_reaction (chunk-A7MI4VLN.js?v=b38fc8cf:1690:23)

each_key_duplicate @ chunk-A7MI4VLN.js?v=b38fc8cf:182
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:3698
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
render_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2335
validate_each_keys @ chunk-VUMTVNUW.js?v=b38fc8cf:3686
consequent_10 @ TermGenerator.svelte:442
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:612
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
branch @ chunk-A7MI4VLN.js?v=b38fc8cf:2358
update_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:612
set_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:580
(anonymous) @ TermGenerator.svelte:494
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:637
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
block @ chunk-A7MI4VLN.js?v=b38fc8cf:2355
if_block @ chunk-VUMTVNUW.js?v=b38fc8cf:635
alternate_2 @ TermGenerator.svelte:623
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:623
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
branch @ chunk-A7MI4VLN.js?v=b38fc8cf:2358
update_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:623
set_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:580
(anonymous) @ TermGenerator.svelte:471
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:637
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
process_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1943
flush_queued_root_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1880
TermGenerator.svelte:155 POST http://localhost:5173/api/term/validate?filename=bksp.json 400 (Bad Request)
window.fetch @ fetcher.js?v=b38fc8cf:66
validateSegmentResults @ TermGenerator.svelte:155
convertToFinal @ TermGenerator.svelte:123
await in convertToFinal
findCombinations @ TermGenerator.svelte:77
await in findCombinations
later @ debounce.ts:18
setTimeout
executedFunction @ debounce.ts:22
$effect @ TermGenerator.svelte:43
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
flush_queued_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1901
flush_queued_root_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1881
chunk-A7MI4VLN.js?v=b38fc8cf:182 Uncaught Svelte error: each_key_duplicate
Keyed each block has duplicate key `PTNT_LINK` at indexes 0 and 1
https://svelte.dev/e/each_key_duplicate

    in <unknown>
    in TermGenerator.svelte
    in +page.svelte
    in +layout.svelte
    in root.svelte

    at each_key_duplicate (chunk-A7MI4VLN.js?v=b38fc8cf:182:19)
    at chunk-VUMTVNUW.js?v=b38fc8cf:3698:9
    at update_reaction (chunk-A7MI4VLN.js?v=b38fc8cf:1690:23)
    at update_effect (chunk-A7MI4VLN.js?v=b38fc8cf:1810:21)
    at create_effect (chunk-A7MI4VLN.js?v=b38fc8cf:2206:7)
    at render_effect (chunk-A7MI4VLN.js?v=b38fc8cf:2335:10)
    at Module.validate_each_keys (chunk-VUMTVNUW.js?v=b38fc8cf:3686:3)
    at consequent_10 (TermGenerator.svelte:442:34)
    at chunk-VUMTVNUW.js?v=b38fc8cf:612:42
    at update_reaction (chunk-A7MI4VLN.js?v=b38fc8cf:1690:23)

each*key_duplicate @ chunk-A7MI4VLN.js?v=b38fc8cf:182
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:3698
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
render_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2335
validate_each_keys @ chunk-VUMTVNUW.js?v=b38fc8cf:3686
consequent_10 @ TermGenerator.svelte:442
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:612
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
branch @ chunk-A7MI4VLN.js?v=b38fc8cf:2358
update_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:612
set_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:580
(anonymous) @ TermGenerator.svelte:494
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:637
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
block @ chunk-A7MI4VLN.js?v=b38fc8cf:2355
if_block @ chunk-VUMTVNUW.js?v=b38fc8cf:635
alternate_2 @ TermGenerator.svelte:623
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:623
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
branch @ chunk-A7MI4VLN.js?v=b38fc8cf:2358
update_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:623
set_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:580
(anonymous) @ TermGenerator.svelte:471
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:637
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
process_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1943
flush_queued_root_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1880
TermGenerator.svelte:155 POST http://localhost:5173/api/term/validate?filename=bksp.json 400 (Bad Request)
window.fetch @ fetcher.js?v=b38fc8cf:66
validateSegmentResults @ TermGenerator.svelte:155
convertToFinal @ TermGenerator.svelte:123
await in convertToFinal
findCombinations @ TermGenerator.svelte:77
await in findCombinations
later @ debounce.ts:18
setTimeout
executedFunction @ debounce.ts:22
$effect @ TermGenerator.svelte:43
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
flush_queued_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1901
flush_queued_root_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1881
chunk-A7MI4VLN.js?v=b38fc8cf:182 Uncaught Svelte error: each_key_duplicate
Keyed each block has duplicate key `PTNT*##` at indexes 0 and 1
https://svelte.dev/e/each_key_duplicate

    in <unknown>
    in TermGenerator.svelte
    in +page.svelte
    in +layout.svelte
    in root.svelte

    at each_key_duplicate (chunk-A7MI4VLN.js?v=b38fc8cf:182:19)
    at chunk-VUMTVNUW.js?v=b38fc8cf:3698:9
    at update_reaction (chunk-A7MI4VLN.js?v=b38fc8cf:1690:23)
    at update_effect (chunk-A7MI4VLN.js?v=b38fc8cf:1810:21)
    at create_effect (chunk-A7MI4VLN.js?v=b38fc8cf:2206:7)
    at render_effect (chunk-A7MI4VLN.js?v=b38fc8cf:2335:10)
    at Module.validate_each_keys (chunk-VUMTVNUW.js?v=b38fc8cf:3686:3)
    at consequent_10 (TermGenerator.svelte:442:34)
    at chunk-VUMTVNUW.js?v=b38fc8cf:612:42
    at update_reaction (chunk-A7MI4VLN.js?v=b38fc8cf:1690:23)

each_key_duplicate @ chunk-A7MI4VLN.js?v=b38fc8cf:182
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:3698
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
render_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2335
validate_each_keys @ chunk-VUMTVNUW.js?v=b38fc8cf:3686
consequent_10 @ TermGenerator.svelte:442
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:612
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
branch @ chunk-A7MI4VLN.js?v=b38fc8cf:2358
update_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:612
set_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:580
(anonymous) @ TermGenerator.svelte:494
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:637
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
block @ chunk-A7MI4VLN.js?v=b38fc8cf:2355
if_block @ chunk-VUMTVNUW.js?v=b38fc8cf:635
alternate_2 @ TermGenerator.svelte:623
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:623
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
create_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:2206
branch @ chunk-A7MI4VLN.js?v=b38fc8cf:2358
update_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:623
set_branch @ chunk-VUMTVNUW.js?v=b38fc8cf:580
(anonymous) @ TermGenerator.svelte:471
(anonymous) @ chunk-VUMTVNUW.js?v=b38fc8cf:637
update_reaction @ chunk-A7MI4VLN.js?v=b38fc8cf:1690
update_effect @ chunk-A7MI4VLN.js?v=b38fc8cf:1810
process_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1943
flush_queued_root_effects @ chunk-A7MI4VLN.js?v=b38fc8cf:1880
