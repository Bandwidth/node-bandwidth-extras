# node-bandwidth-extras

[![Build](https://travis-ci.org/Bandwidth/node-bandwidth-extras.png)](https://travis-ci.org/Bandwidth/node-bandwidth-extras)

Extra functions and middlewares for node-bandwidth

## Install

Run

```
npm install node-bandwidth-extras
```

## Examples

### Middlewares

#### Koa

```js
const {middlewares} = require("node-bandwidth-extras");

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
const {middlewares} = require("node-bandwidth-extras");

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
	console.log(req .phoneNumber); // calls and messages to this phone number will be handled by this web app
	next();
});

```

