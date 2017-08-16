# ketherhomepage

> Thousand Ether Homepage

## Build Setup

``` bash
# install dependencies
yarn install

# serve with hot reload at localhost:8080
yarn run dev

# build for production with minification
yarn run build
```

For detailed explanation on how things work, consult the [docs for vue-loader](http://vuejs.github.io/vue-loader).


## How to run stuff on Rinkeby

In one terminal:

```
geth --networkid=4 --datadir=. --syncmode=light --ethstats='yournode:Respect my authoritah!@stats.rinkeby.io' --bootnodes=enode://a24ac7c5484ef4ed0c5eb2d36620ba4e4aa13b8c84684e1b4aab0cebea2ae45cb4d375b77eab56516d34bfbd3c1a833fc51296ff084b770b94fb9028c4d25ccf@52.169.42.101:30303?discport=30304 --rpc
```

In another terminal:

```
geth attach ipc:geth.ipc
```

Unlock an account, then we can...

```
truffle deploy --network rinkeby
```
