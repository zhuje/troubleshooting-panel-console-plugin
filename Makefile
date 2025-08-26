.PHONY: test
test: test-frontend

.PHONY: test-frontend
test-frontend: lint-frontend
	cd web && npm run test:unit

.PHONY: install-frontend
install-frontend:
	cd web && npm install

.PHONY: install-frontend-ci
install-frontend-ci:
	cd web && npm ci --ignore-scripts

.PHONY: install-frontend-ci-clean
install-frontend-ci-clean: install-frontend-ci
	cd web && npm cache clean --force

.PHONY: build-frontend
build-frontend:
	cd web && npm run i18n && npm run build

.PHONY: start-frontend
start-frontend:
	cd web && npm run start

.PHONY: start-console
start-console:
	./scripts/start-console.sh

.PHONY: lint-frontend
lint-frontend:
	cd web && npm run lint

.PHONY: install-backend
install-backend:
	go mod download

.PHONY: build-backend
build-backend:
	go build $(BUILD_OPTS) -o plugin-backend -mod=readonly cmd/plugin-backend.go

.PHONY: start-backend
start-backend:
	go run ./cmd/plugin-backend.go -port='9002' -config-path='./web/dist' -static-path='./web/dist' -plugin-config-path='ct.yaml'

.PHONY: install
install: install-frontend install-backend

.PHONY: build-image
build-image: test-frontend
	./scripts/build-image.sh

.PHONY: start-forward
start-forward:
	./scripts/start-forward.sh

export REGISTRY_ORG?=openshift-observability-ui
export TAG?=latest
IMAGE=quay.io/${REGISTRY_ORG}/troubleshooting-panel-console-plugin:${TAG}

.PHONY: deploy
deploy:	test-frontend		## Build and push image, reinstall on cluster using helm.
	helm uninstall troubleshooting-panel-console-plugin -n troubleshooting-panel-console-plugin || true
	PUSH=1 scripts/build-image.sh
	helm install troubleshooting-panel-console-plugin charts/openshift-console-plugin -n troubleshooting-panel-console-plugin --create-namespace --set plugin.image=$(IMAGE)

.PHONY: start-devspace-backend
start-devspace-backend:
	/opt/app-root/plugin-backend -port=9443 -cert=/var/serving-cert/tls.crt -key=/var/serving-cert/tls.key -plugin-config-path=/etc/plugin/config.yaml -static-path=/opt/app-root/web/dist -config-path=/opt/app-root/web/dist

## Code generation
gen-client: web/src/korrel8r/client

# NOTE: copied from https://github.com/korrel8r/korrel8r/blob/main/pkg/rest/docs/swagger.json
web/src/korrel8r/client: korrel8r/swagger.json
	cd web && npx openapi-typescript-codegen --indent 2 --input ../$< --output ../$@ --name Korrel8rClient
	@touch $@
