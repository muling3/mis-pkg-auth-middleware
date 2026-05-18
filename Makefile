PACKAGE := @mis/auth-middleware

.PHONY: help install auth build test lint pack clean

help:                  ## Show this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install:               ## Install (delegates to workspace root)
	cd $(realpath ..) && npm install

auth:                  ## No-op in PoC (no Azure Artifacts feed)
	@echo "auth: skipped — PoC uses npm workspaces, not Azure Artifacts"

build:                 ## Compile TS to dist/
	rm -rf dist && npx tsc -p tsconfig.json

test:                  ## Run tests (stub)
	@echo "test: no tests yet for $(PACKAGE)"

lint:                  ## Lint (stub)
	@echo "lint: not configured yet for $(PACKAGE)"

pack:                  ## Build then npm pack
	$(MAKE) build && npm pack

clean:                 ## Remove artefacts
	rm -rf dist node_modules *.tgz
