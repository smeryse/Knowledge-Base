# AGENTS.md

## Repo Shape
- This repository is an Obsidian vault, not a conventional app/library repo. There is no root build, test, lint, CI, or package manifest to rely on.
- The only substantial automation lives in `Templates/scripts/` and is invoked through Obsidian Templater templates.
- Do not assume `.obsidian/` is throwaway just because `.gitignore` lists it; multiple `.obsidian/*` files are already tracked and are the live source of plugin configuration.

## Obsidian / Templater Wiring
- Templater is configured with `Templates` as the templates folder and `Templates/scripts` as the user scripts folder: see `.obsidian/plugins/templater-obsidian/data.json`.
- Current entrypoints are thin wrappers:
  - `Projects/Кухня/Templates/Скан товара.md` -> `tp.user.food_scan(tp)`
  - `Projects/Кухня/Templates/Новый чек.md` -> `tp.user.food_db(tp)`
  - `Projects/Кухня/Templates/Проверка LLM.md` -> `tp.user.food_llm_check(tp)`
  - `Projects/Кухня/Templates/OCR чек.md` -> `tp.user.food_receipt_ocr(tp)`
  - `Templates/Food/QR чек ФНС.md` -> `tp.user.food_receipt_api(tp)` (устаревший, ФНС API)
  - `Templates/Food/Добавить чек по QR.md` -> `tp.user.food_receipt_api(tp)` + `tp.user.food_import_api(tp)` (основной, proverkacheka.com)

## Verification
- There is no repo-wide automated test suite. For Templater JS changes, the reliable fast check is syntax only:
  - `node --check "Templates/scripts/food_scan.js"`
  - `node --check "Templates/scripts/food_db.js"`
  - `node --check "Templates/scripts/food_llm_check.js"`
  - `node --check "Templates/scripts/food_receipt_ocr.js"`
  - `node --check "Templates/scripts/food_receipt_api.js"`
  - `node --check "Templates/scripts/food_import_api.js"`
- After changing the food schema or prompts, also verify the paired Markdown templates/docs stay aligned. The important files are:
  - `Projects/Кухня/Templates/*.md`
  - `Projects/Кухня/Docs/Schema.md`
  - `Projects/Кухня/Docs/README.md`

## Food Project
- `Projects/Кухня/Кухня.md` is the navigation hub for the food database; `Projects/Кухня/Docs/Schema.md` is the architecture reference.
- The barcode/LLM resolver config is `Projects/Кухня/resolver-config.json`. Verified defaults are `provider: lmstudio`, endpoint `http://127.0.0.1:1234/v1`, model `qwen2.5-3b-instruct`.
- The food scripts are Obsidian-runtime scripts, not standalone Node CLIs. They use globals like `app`, `Notice`, `requestUrl`, and Templater's `tp` object.
- `food_receipt_ocr.js` depends on a local `tesseract` binary and is intentionally a draft OCR helper, not a full receipt parser.

## Tasks / Score Requests
- For requests like `проставь баллы` or `проставь баллы за YYYY-MM-DD`, follow `Tasks/.qwen-task-rules.md`.
- Edit `Tasks/Daily/YYYY-MM-DD.md` and append scores as `(+N)` to unchecked tasks only.
- Never change task status while scoring: keep `[ ]` as `[ ]`, do not touch `[x]`, and do not add completion dates.
- Task plugin statuses are configured as: `[ ]` todo, `[x]` done, `[/]` in progress, `[-]` cancelled.
