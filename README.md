# Code Talk
> Real-time messaging and code collaboration environment

<h1 align="center"><img width=100% src=https://github.com/maxjeffwell/code-talk-graphql-client/blob/master/src/components/Images/Logo/CodeTalk_Title_Logo.png alt="Code Talk Logo"></h1>


## Build Status
[![npm version](https://img.shields.io/badge/npm%20package-6.4.1-orange.svg)](https://badge.fury.io/js/npm) [![Build Status](https://travis-ci.org/maxjeffwell/code-talk-graphql-client.svg?branch=master)](https://travis-ci.org/maxjeffwell/code-talk-graphql-server) ![Dependencies](https://img.shields.io/badge/dependencies-up%20to%20date-brightgreen.svg) [![Live Demo](https://img.shields.io/badge/demo-online-green.svg)](https://jmaxwell-code-talk-server.herokuapp.com/graphql)

## [GraphQL Playground](https://jmaxwell-code-talk-server.herokuapp.com/graphql)

## [Live App](https://jmaxwell-code-talk-client.herokuapp.com)

```
Demo Accounts

username: demo
password: demopassword

username: demo2
password: demopassword
```

## Motivation
Code Talk is a code collaboration tool with real-time text editing and real-time messaging features. It emerged from a fascination with GraphQL subscriptions as well as from the immediate satisfaction inherent to real-time applications.

## Screenshots

[![GraphQL Playground Query](https://i.gyazo.com/d6fd9aa100d384ffa77676a4de49aff7.png)](https://gyazo.com/d6fd9aa100d384ffa77676a4de49aff7)

[![GraphQL Playground Mutation](https://i.gyazo.com/e6253780a5b0c37f5ea074afb2b841d6.png)](https://gyazo.com/e6253780a5b0c37f5ea074afb2b841d6)

[![GraphQL Playground Subscription Listening](https://i.gyazo.com/f7a98c8c3075133efa612a5ecdff09e4.png)](https://gyazo.com/f7a98c8c3075133efa612a5ecdff09e4)

[![GraphQL Playground Subscription with Mutation](https://i.gyazo.com/d6f75081e41e03028e7bb5a123597453.png)](https://gyazo.com/d6f75081e41e03028e7bb5a123597453)

[![Code Talk Landing](https://i.gyazo.com/2c79818082923f3328d830a02e90a2e7.png)](https://gyazo.com/2c79818082923f3328d830a02e90a2e7)

[![Code Talk Room - Desktop View](https://i.gyazo.com/e9c5d834029981dabe5da31660a14fd0.png)](https://gyazo.com/e9c5d834029981dabe5da31660a14fd0)

[![Code Talk Login](https://i.gyazo.com/09e498593bdf0113793a21096ae94edb.png)](https://gyazo.com/09e498593bdf0113793a21096ae94edb)

[![Code Talk Registration](https://i.gyazo.com/0b77085d85be51cdaeaf2c985f50e6d0.png)](https://gyazo.com/0b77085d85be51cdaeaf2c985f50e6d0)

## Technology Stack
**Front End** [Client GitHub Repo](https://github.com/maxjeffwell/code-talk-graphql-client)

* React with Apollo Client
    * Queries, Mutations, Subscriptions
* CSS styling implemented with Styled Components

**Back End** [Explore the API in GraphQL Playground](https://jmaxwell-code-talk-server.herokuapp.com/graphql)

Please note that in order to perform queries, mutations (other than the login mutation), or subscriptions using GraphQL Playground, you will have to provide an authorization token in the Playground's http headers, which can be found in the lower left corner of the Playground.

The format of the header is as follows:

{"x-token": "your token here"}

You can retrieve a token by performing a login mutation and requesting the token in the return object. Or, you can log in client-side and your token will be available in your browser's local storage.

* GraphQL API built using Apollo Server with Express middleware
* Security
    * JWT authentication and password hashing with bcrypt.js
* Testing
     * Integration and End-to-End testing using Mocha and Chai
* Authorization
    * Session-based protected resolvers
    * Session-based protected routes

**Data Persistence**
* PostgreSQL connected to Express via Sequelize

**Hosting / SaaS / DBaaS / CICD**
* Github
* TravisCI
* Heroku
* Heroku Redis
* ElephantSQL

**Optimizations**
* Cursor-based pagination
* Implementation of Facebook's DataLoader
* Redis Pub/Sub Engine supporting a scalable GraphQL subscriptions server 

## Next Steps
* Implement RedisCache as a shared cache storage backend for retrieval of data from the 
code collaboration textarea. Currently, users who join subsequent to another user's
input of text in the textarea are not able to see that prior textarea history. 

## Meta

by Jeff Maxwell maxjeffwell@gmail.com | [https://github.com/maxjeffwell](https://github.com/maxjeffwell)

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
Distributed under the GNU GPLv3 License. See ``LICENSE`` for more information.

