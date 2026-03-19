.PHONY: help test-backend test-web lint-web build-web preflight-kvm2 smoke-kvm2

help:
	@echo "Alvos disponiveis:"
	@echo "  test-backend   -> roda testes do backend"
	@echo "  test-web       -> roda lint do web"
	@echo "  build-web      -> gera build do web"
	@echo "  preflight-kvm2 -> valida variaveis e arquivos da esteira do kvm2"
	@echo "  smoke-kvm2     -> roda smoke publico (exige API_URL e WEB_URL)"

test-backend:
	cd backend && PYTHONPATH=$$(pwd) python3 -m pytest -q tests

test-web:
	cd web && npm run lint

build-web:
	cd web && NEXT_PUBLIC_RUPTUR_API_BASE_URL=$${NEXT_PUBLIC_RUPTUR_API_BASE_URL:-https://api.ruptur.cloud} npm run build

preflight-kvm2:
	bash ops/kvm2/preflight.sh

smoke-kvm2:
	@test -n "$$API_URL" || (echo "API_URL obrigatoria" >&2; exit 1)
	@test -n "$$WEB_URL" || (echo "WEB_URL obrigatoria" >&2; exit 1)
	bash ops/kvm2/smoke.sh "$$API_URL" "$$WEB_URL" "$$WARMUP_URL"
