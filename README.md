# Powerswap Subgraph

TheGraph exposes a GraphQL endpoint to query the events and entities within the Meter chain


## Subgraphs


1. **[Exchange V2]**: Tracks all Powerswap V2 Exchange data with price, volume, liquidity, ...


2. **Exchange (v3)**: Tracks all Powerswap V3 Exchange data with price, volume, liquidity
  

## Dependencies

- [Graph CLI](https://github.com/graphprotocol/graph-cli)
  - Required to generate and build local GraphQL dependencies.

```shell
yarn global add @graphprotocol/graph-cli
```

## Deployment

For any of the subgraph: `blocks` as `[subgraph]`

1. Run the `cd subgraphs/[subgraph]` command to move to the subgraph directory.

2. Run the `yarn codegen` command to prepare the TypeScript sources for the GraphQL (generated/\*).

3. Run the `yarn build` command to build the subgraph, and check compilation errors before deploying.

4. Run the `create-mainnet` command to create the subgraph

5. Run the `deploy-mainnet` command to deploy the subgraph
