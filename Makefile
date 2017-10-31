TRUFFLEBIN := ./node_modules/.bin/truffle

build: deps contracts
	npm run build

test: deps contracts
	npm run truffle-test

run: deps contracts
	npm run dev

deploy-dapp: build ../thousandetherhomepage.github.io
	tar -C build -c js css img press faq index.html | tar -C ../thousandetherhomepage.github.io/ -xv
	cd ../thousandetherhomepage.github.io; git add -v -A; git commit -v -a
	echo "Push it."

deploy-contract:
	$(TRUFFLEBIN) migrate -f 2 --network rinkeby --reset

withdraw:
	$(TRUFFLEBIN) exec scripts/withdraw.js --network live

deps: node_modules/

contracts: build/contracts/*

build/contracts/%.json: contracts/%.sol
	npm run truffle-compile

node_modules/: package.json
	npm install
	touch node_modules/
