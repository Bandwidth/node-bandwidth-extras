# node-bandwidth-extras

[![npm version](https://badge.fury.io/js/%40bandwidth%2Fnode-bandwidth-extra.svg)](https://badge.fury.io/js/%40bandwidth%2Fnode-bandwidth-extra)
[![Build Status](https://travis-ci.org/Bandwidth/node-bandwidth-extras.svg?branch=master)](https://travis-ci.org/Bandwidth/node-bandwidth-extras)
[![dependencies](https://david-dm.org/Bandwidth/node-bandwidth-extras.svg)](https://david-dm.org/Bandwidth/node-bandwidth-extras)
[![Known Vulnerabilities](https://snyk.io/test/npm/@bandwidth/node-bandwidth-extra/badge.svg)](https://snyk.io/test/npm/@bandwidth/node-bandwidth-extra/)

Helper functions and middlewares for node-bandwidth. Read more documentation [here](http://dev.bandwidth.com/node-bandwidth-extras/).

## Install

Run

```
npm install @bandwidth/node-bandwidth-extra
```

## Examples

### Helpers

```js
const {application, phoneNumber} = require("@bandwidth/node-bandwidth-extra");

const appId = await application.getOrCreateApplication(api, 'My app', 'my.domain.com'); // It will return exisitng application Id or create it otherwise

const phoneNumber = await getOrCreateApplication.getOrCreatePhoneNumber(api, appId, {name: 'Support', areaCode: '910'}); // It will reserve a linked to this app phone number and assign name to it. If number with such name already exists it returns it.
```

### Middlewares

#### Koa

```js
const {middlewares} = require("@bandwidth/node-bandwidth-extra");

const app = new Koa();
app.use(middlewares.koa({
	name: 'My app', // application name on Bandwidth server
	auth: {userId: 'bandwidthUserId', apiToken: 'bandwidthApiToken', apiSecret: 'bandwidthSecret'}, // Bandwidth auth data
	phoneNumber: { // Options to reserve phone number
		phoneType: 'local',
		areaCode: '910'
	},
	callCallback: async (data, ctx) => {
		// Handle calls events here
		if(data.eventType === 'answer' && ctx.phoneNumber === data.to){
			console.log('Answered');
		}
	}
}));

app.use(async (ctx, next) => {
	console.log(ctx.phoneNumber); // calls and messages to this phone number will be handled by this web app
	await next();
});

```

#### Express

```js
const {middlewares} = require("@bandwidth/node-bandwidth-extra");

const app = express();
app.use(middlewares.express({
	name: 'My app', // application name on Bandwidth server
	auth: {userId: 'bandwidthUserId', apiToken: 'bandwidthApiToken', apiSecret: 'bandwidthSecret'}, // Bandwidth auth data
	phoneNumber: { // Options to reserve phone number
		phoneType: 'local',
		areaCode: '910'
	},
	callCallback: async (data, req) => {
		// Handle calls events here
		if(data.eventType === 'answer' && req.phoneNumber === data.to){
			console.log('Answered');
		}
	}
}));

app.use((req, res, next) => {
	console.log(req.phoneNumber); // calls and messages to this phone number will be handled by this web app
	next();
});

```
