PORT ?= 8124

.PHONY: serve test lint check icons

serve:
	python3 scripts/serve.py $(PORT)

# Data integrity, pattern parsing, i18n parity and the release files; node --test needs Node 18 or newer.
test:
	node --test tests/*.test.mjs

lint:
	@for f in js/*.js data/*.js data/*/*.js tests/*.mjs scripts/*.mjs; do node --check $$f || exit 1; done; echo "syntax ok"

check: lint test

# Render the favicon and Open Graph image from icons/*.svg (macOS: QuickLook + sips, no other tools needed).
icons:
	node scripts/icons.mjs
