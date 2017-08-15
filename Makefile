NODEBIN := ./node_modules/.bin

build: deps contracts
	yarn build

test: deps contracts
	yarn run truffle-test

run: deps contracts
	yarn run dev

deps: node_modules/

contracts: build/contracts/*

build/contracts/%.json: contracts/%.sol
	yarn run truffle-compile

node_modules/: package.json yarn.lock
	yarn install
	touch node_modules/
