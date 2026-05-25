# Inkstone — top-level project tasks.
# Conventions: every target is idempotent and prints what it does.

SHELL        := /bin/bash
.DEFAULT_GOAL := help

NODE         ?= npm
TAURI        ?= npx tauri
PROJECT_NAME := inkstone
ARTIFACTS    := ./artifacts
BUNDLE_DIR   := src-tauri/target/release/bundle

.PHONY: help install dev tauri-dev build typecheck lint test fmt \
        bundle bundle-macos bundle-windows bundle-linux \
        docker-web docker-linux clean release version

help: ## Show this help.
	@awk 'BEGIN{FS=":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install npm dependencies.
	$(NODE) ci --no-audit --no-fund

dev: ## Run Vite dev server (web only).
	$(NODE) run dev

tauri-dev: ## Run Tauri desktop dev shell.
	$(NODE) run tauri:dev

typecheck: ## Run TypeScript type-checking.
	$(NODE) run typecheck

lint: ## Run ESLint (zero warnings).
	$(NODE) run lint

test: ## Run unit tests.
	$(NODE) run test

fmt: ## Format code with Prettier.
	$(NODE) run format

build: typecheck ## Build the frontend bundle.
	$(NODE) run build

bundle: build ## Build the desktop app for the current OS (all targets).
	$(NODE) run tauri:build

bundle-macos: build ## Build macOS .app and .dmg.
	$(TAURI) build --bundles app,dmg

bundle-windows: build ## Build Windows .msi and NSIS installer.
	$(TAURI) build --bundles msi,nsis

bundle-linux: build ## Build Linux .deb, .rpm, and AppImage.
	$(TAURI) build --bundles deb,rpm,appimage

artifacts: ## Collect installers into ./artifacts.
	@mkdir -p $(ARTIFACTS)
	@if [ -d "$(BUNDLE_DIR)" ]; then \
	  cp -R $(BUNDLE_DIR)/* $(ARTIFACTS)/ ; \
	  echo "✔ Artifacts in $(ARTIFACTS)" ; \
	else \
	  echo "✘ No bundle output at $(BUNDLE_DIR)" >&2 ; exit 1 ; \
	fi

docker-web: ## Build the web Docker image.
	docker build --target web -t $(PROJECT_NAME):web .

docker-linux: ## Build the Linux installers inside Docker.
	docker build --target tauri-runtime -t $(PROJECT_NAME):linux .
	@mkdir -p $(ARTIFACTS)
	@cid=$$(docker create $(PROJECT_NAME):linux) ; \
	 docker cp $$cid:/artifacts/bundle/. $(ARTIFACTS)/ ; \
	 docker rm $$cid >/dev/null ; \
	 echo "✔ Linux installers in $(ARTIFACTS)"

version: ## Print the current package version.
	@node -p "require('./package.json').version"

release: ## Tag the current version (use VERSION=x.y.z).
	@test -n "$(VERSION)" || (echo "Usage: make release VERSION=x.y.z" && exit 1)
	@node -e "const p=require('./package.json');p.version='$(VERSION)';require('fs').writeFileSync('./package.json',JSON.stringify(p,null,2)+'\n');"
	@sed -i.bak -E 's/"version": "[^"]+"/"version": "$(VERSION)"/' src-tauri/tauri.conf.json && rm src-tauri/tauri.conf.json.bak
	git add package.json src-tauri/tauri.conf.json
	git commit -m "chore(release): v$(VERSION)"
	git tag -a "v$(VERSION)" -m "Inkstone v$(VERSION)"
	@echo "✔ Tagged v$(VERSION). Push with: git push --follow-tags"

clean: ## Remove build artifacts.
	rm -rf dist $(ARTIFACTS) src-tauri/target
