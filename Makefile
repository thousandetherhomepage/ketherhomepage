build: deps contracts
	npx nuxt generate

test: deps contracts
	npx hardhat test

run: deps contracts
	npm run dev

deploy-dapp: build ../thousandetherhomepage.github.io
	rm -rf ../thousandetherhomepage.github.io/_nuxt
	rsync -rv dist/* ../thousandetherhomepage.github.io/
	cd ../thousandetherhomepage.github.io; git add -v -A; git commit -v -a
	echo "Push it."

deploy-contract:
	npx hardhat run scripts/deployKetherNFT.js --network rinkeby

withdraw:
	npx hardhat run scripts/withdraw.js --network mainnet

deps: node_modules/

contracts: artifacts/contracts/*

artifacts/contracts/%: contracts/%.sol
	npx hardhat compile

node_modules/: package.json package-lock.json
	npm install
	touch node_modules/
