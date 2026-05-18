PACKAGE := @mis/auth-middleware

.PHONY: help install auth build test lint pack publish clean

help:                  ## Show this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install:               ## Install deps for this package (standalone)
	npm install

auth:                  ## Authenticate npm to the @mis Azure Artifacts feed
	@test -f .npmrc || { echo "no .npmrc — cp .npmrc.example .npmrc and set <org>/<project>/<feed>"; exit 1; }
	npx -y vsts-npm-auth -config .npmrc

build:                 ## Compile TS to dist/
	rm -rf dist && npx tsc -p tsconfig.json

test:                  ## Run tests (stub)
	@echo "test: no tests yet for $(PACKAGE)"

lint:                  ## Lint (stub)
	@echo "lint: not configured yet for $(PACKAGE)"

pack:                  ## Build then npm pack
	$(MAKE) build && npm pack

publish: auth build    ## Publish this package to the @mis Azure Artifacts feed
	npm publish

clean:                 ## Remove artefacts
	rm -rf dist node_modules *.tgz
