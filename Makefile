.PHONY: install-frontend
install-frontend:
	cd web && npm install

.PHONY: install-frontend-ci
install-frontend-ci:
	cd web && npm ci

.PHONY: lint-frontend
lint-frontend:
	cd web && npm run lint

.PHONY: build-frontend
build-frontend:
	cd web && npm run build

.PHONY: start-console
start-console:
	./scripts/start-console.sh

.PHONY: start-frontend
start-frontend: 
	cd web && npm run start

.PHONY: build-image
build-image:
	./scripts/build-image.sh
