<h1>Flock Trades Backend System</h1>

## Requirement

```bash
$ install docker and docker-compose: https://docs.docker.com/engine/install/ubuntu/
$ install hasura-cli (v2.0.8): https://hasura.io/docs/latest/graphql/core/hasura-cli/install-hasura-cli.html#install-hasura-cli
```

## Installation

```bash
$ npm install
```

## Running docker

```bash
$ docker-compose up
$ config API_INTERNAL_URL webhook enviroment
```

## Running console hasura

```bash

$ cd hasura
$ hasura console --admin-secret <private key>
$ open localhost:8080 and localhost:9695 

```

```bash
$ using migration in url : https://hasura.io/docs/latest/graphql/core/migrations/migrations-setup.html
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

```bash
# migrate data
$ hasura migrate apply --admin-secret <secret_key>

# migrate meta data
$ hasura metadata apply --admin-secret <secret_key>
```
