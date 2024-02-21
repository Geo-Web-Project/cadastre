# Geo Web Cadastre

### Getting Started

Start by setting up the local environment variables.

```
cp .env.example .env.local
```

#### Mapbox

Create an account on [mapbox](https://www.mapbox.com/).
Once you have an account, create a token on mapbox.
Update the `.env.local` file in the Cadastre folder with this line of code and your new token from mapbox:

```
VITE_MAPBOX_TOKEN=your_mapbox_token
```

#### Alchemy

If you don't already have an account, create one at [Alchemy](https://www.alchemy.com/).
Once you have an account, create a project for GeoWeb and copy the API key.
Update the `.env.local` file in the Cadastre folder with this line of code:
```
VITE_ALCHEMY_API_KEY=your_alchemy_api_key
```

#### Install Dependencies

Install _Node Version 18_ if you don't have it but stay within LTS.

Use yarn to download and install all your dependencies

```
yarn
```

#### Run Project

To run locally

```
yarn dev
```

## Docker Deployment

To deploy to production, you will need to install docker and run

```
docker build -t cadastre .
docker run -p 3000:3000 cadastre
```

### Testing

During development cycles you will need Optimism Sepolia ETH. There are two ways to obtain OP Sepolia ETH.

1. Faucet
   Head over to the [Optimism faucets list](https://docs.optimism.io/builders/tools/build/faucets) and enter the address of the wallet you would like to fund.

2. Bridge
   If you already have Sepolia ETH you can use the [Optimism Bridge](https://app.optimism.io/bridge/deposit). Connect you wallet, select the Sepolia testnet and the amount you would like to bridge.

### Branching & Commits

If you'd like to contribute create a branch based on `develop` and make a PR to be merged in `develop`, commits should follow the [Conventional Commits](https://www.conventionalcommits.org) specification.
