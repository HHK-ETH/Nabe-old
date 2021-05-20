# Nabe - liquidity aggregator for kashi

Nabe is a liquidity aggregator for for kashi.
It chase APYs between all pairs following the rules set by users that deposited liquidity inside.

## Why use Nabe ?

Kashi is one of the best lending solution in the market right now. It Allows you to borrow and lend your assets and manage the risks easily because each money market is a pair composed of an asset and a collateral. So when you lend you only need to trust 1 collateral ! In other money markets like Aave or Compound you need to trust multiple ones.

It brings another cool feature, because risks are isolated you can create a pair for every asset and collateral you want (as long as an oracle price is available for them).

But there is major problem, because everything is isolated if you want to lend on multiple pairs, you'll need to monitor them to allways get the best APY.

### Example

You trust ETH and YFI and have 1k USDC :

Lend APY on ETH is 10% and 3% on YFI.
So you will probably lend 1k USDC in the ETH pair.

It's a good idea but as utilization will go down because you provided liquidity, in few hours/days ETH APY will probably be lower than the YFI one, you will need to rebalance it !
So you need to monitor APYs on your different trusted assets, it takes time and have a cost in gas especially on layer 1.

### Here is Nabe

Nabe is a smart contract where you can put your usdc, and say what are your trusted assets.
Nabe will chase APY's for you against a small performance fees and respect your assets allocations.

### Rebalance

Nabe is a smart contract so it needs people to call it every day, to rebalance all pairs.
But as we said previously layer 1 gas cost are huge and if a rebalance needs to check all pairs, calculating best APYs will cost a lot of gas.

There is 2 ways to resolve this :

- Give rewards to users that call for a rebalance, that's why the performance fees are for, and because it's a vault when you rebalance pairs in common with other users, you share this performance fees and get enough fees to make it profitable for someone to call a rebalance.
- Reduce logic inside the contract, the user will submit an array with new allocations between all pairs and Nabe will only check if APYs are better than the actual ones and if it respects risk setted by depositors.
