# ketherhomepage

> Thousand Ether Homepage

This is Version 1, the 2017 Edition.

## Build Setup

``` bash
# run in development mode
make run
```

For detailed explanation on how things work, consult the [docs for vue-loader](http://vuejs.github.io/vue-loader).

## Testing

```bash
# Use the in memory test network
truffle test --network=test
```

## How to run stuff on Rinkeby

In one terminal:

```
geth --networkid=4 --datadir=. --syncmode=light --ethstats='yournode:Respect my authoritah!@stats.rinkeby.io' --bootnodes=enode://a24ac7c5484ef4ed0c5eb2d36620ba4e4aa13b8c84684e1b4aab0cebea2ae45cb4d375b77eab56516d34bfbd3c1a833fc51296ff084b770b94fb9028c4d25ccf@52.169.42.101:30303?discport=30304 --rpc
```

(or this also works for Max)
```
geth --rinkeby --rpc --datadir=. --syncmode=light
```

In another terminal:

```
geth attach ipc:geth.ipc
```

Unlock an account, then we can...

```
truffle deploy --network rinkeby
```
