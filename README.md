# Geo Web Cadastre

### Getting Started

Start by setting up the local environment variables. 

```
cp .env.example .env
```

#### Mapbox
Create an account on [mapbox](https://www.mapbox.com/).
Once you have an account, create a token on mapbox.
Update the .env file in the Cadastre folder with this line of code and your new token from mapbox:
```
NEXT_PUBLIC_REACT_APP_MAPBOX_TOKEN=your_mapbox_token
```
#### Infura
If you don't already have an account, create one at [Infura](https://www.infura.io/).
Once you have an account, create a project for GeoWeb and copy the API key.
Update the .env file in the Cadastre folder with this line of code:
(Note: you may need to activate the addon for Optimism):
```
NEXT_PUBLIC_INFURA_PROJECT_ID=your_infura_project_id
```
#### Web3 Storage
If you don't already have an account, create one at [Web3 Storage](https://web3.storage/).
Once you have an account, create a new API Token and copy it.
Update the .env file in the Cadastre folder with this line of code:
```
NEXT_PUBLIC_WEB3_STORAGE_TOKEN=your_web3storage_api_token
```

#### Gelato Relay
If you don't already have an account, create one at [Gelato](https://www.gelato.network/relay).
*TODO: ADD ANY GELATO SPECIFIC INSTRUCTIONS*
Once you have an account, create a new API Key and copy it.
Update the .env file in the Cadastre folder with this line of code:
```
NEXT_PUBLIC_RELAY_APP_API_KEY=your_gelato_relay_api_key
```

#### Install Dependencies

Install *Node Version 16* if you don't have it but stay within LTS.
If you have a Mac, you can use this command
```
brew install node@16
```

Otherwise download from [node](https://nodejs.org/en/download) and stay within LTS.

Use yarn to download and install all your dependencies
```
yarn
OR
yarn install
```

#### Run Project

To run locally
```
yarn dev
```

### Testing

During development cycles you will need Optimism Goerli ETH. There are two ways to obtain OP Goerli ETH.
1. Faucet
    Head over to the [Paradigm Faucet](https://faucet.paradigm.xyz/) and enter the address of the wallet you would like to fund.

2. Bridge
    If you already have Goerli ETH you can use the [Optimism Bridge](https://app.optimism.io/bridge/deposit). Connect you wallet, select the Goerli Test net and the amount you would like to bridge.

### Branching & Commits

TODO Add Branch strategy & link to conventional commits