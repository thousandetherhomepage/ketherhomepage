build: deps contracts
	npm run build

test: deps contracts
	npm run truffle-test

run: deps contracts
	npm run dev

deploy:
	./node_modules/.bin/truffle migrate -f 2 --network rinkeby --reset

deps: node_modules/

contracts: build/contracts/*

build/contracts/%.json: contracts/%.sol
	npm run truffle-compile

node_modules/: package.json
	npm install
	touch node_modules/
