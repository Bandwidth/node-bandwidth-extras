const util = require('util');
const _ = require('lodash');
const debug = require('debug')('bandwidth:middlewares');
const Bandwidth = require('node-bandwidth');
const application = require('./application');
const phoneNumber = require('./phone-number');
const endpoint = require('./endpoint');

async function callbackEvent(callbackHandler, eventData, ctx) {
	try {
		const handler = callbackHandler[eventData.eventType];
		if (handler) {
			await handler(eventData, ctx);
		} else {
			debug('Unhandled event "%s"', eventData.eventType);
		}
	}	catch (err) {
		debug(err);
	}
}

/**
 * Koa middleware
 * @param {object} options middleware's options
 * @param {string} options.name application name on Bandwidth server
 * @param {object} options.auth Auth data fof Bandwidth API
 * @param {string} options.auth.userId User ID
 * @param {string} options.auth.apiToken API token
 * @param {string} options.auth.apiSecret API secret
 * @param {object} options.phoneNumber Options for reserving phone number
 * @param {string} [options.phoneNumber.name] Name of reserved phone number
 * @param {string} [options.phoneNumber.phoneType] 'local' or 'tollFree'
 * @param {string} [options.phoneNumber.*] Other options will be passed directly to POST /availableNumbers/local or /availableNumbers/tollFree (see for more details http://dev.bandwidth.com/ap-docs/methods/availableNumbers/postAvailableNumbersLocal.html)
 * @param {object} [options.sip] Sip domain options
 * @param {string} [options.sip.domain] Sip domain name to use (not more than 16 low cased symbols )
 * @param {function|object} [options.callCallback] Function like async function(eventData, ctx){} or object like {'eventName': async function eventHandler(eventData, ctx){}} to handle calls callback events
 * @param {function|object} [options.messageCallback] Function like async function(eventData, ctx){} or object like {'eventName': async function eventHandler(eventData, ctx){}} to handle message callback events
 * @example
 *app.use(middlewares.koa({
 *	name: 'My app',
 *	auth: {userId: 'bandwidthUserId', apiToken: 'bandwidthApiToken', apiSecret: 'bandwidthSecret'},
 *	phoneNumber: {
 *		phoneType: 'local',
 *		areaCode: '910'
 *	},
 *	callCallback: async (data, ctx) => {
 *		// Handle calls events here
 *		if(data.eventType === 'answer' && ctx.phoneNumber === data.to){
 *			console.log('Answered');
 *		}
 *	}
 *}));
 *
 *app.use(middlewares.koa({
 *	name: 'My app1',
 *	auth: {userId: 'bandwidthUserId', apiToken: 'bandwidthApiToken', apiSecret: 'bandwidthSecret'},
 *	phoneNumber: {
 *		phoneType: 'local',
 *		state: 'NC',
 *		city: 'Cary'
 *	},
 *	callCallback: {
 *		answer: async (data, {phoneNumber}) => {
 *			// Handle event 'answer'
 *			if(phoneNumber === data.to){
 *				console.log('Answered');
 *			}
 *		}
 *	}
 *}));
 */
function koa(options) {
	return async (ctx, next) => {
		if (!options.auth) {
			throw new Error('Missing Bandwidth credentials. Please fill middleware options: auth.userId, auth.apiToken and auth.apiSecret');
		}
		const getOrCreateApplication = _.memoize(application.getOrCreateApplication, () => `${options.name}##${ctx.host}`);
		const getOrCreatePhoneNumber = _.memoize(phoneNumber.getOrCreatePhoneNumber, () => ctx.applicationId);
		ctx.bandwidthApi = new Bandwidth(options.auth);
		ctx.applicationId = await getOrCreateApplication(ctx.bandwidthApi, options.name, ctx.host, util.isUndefined(options.useHttps) ? true : options.useHttps);
		ctx.phoneNumber = await getOrCreatePhoneNumber(ctx.bandwidthApi, ctx.applicationId, _.omit(options.phoneNumber, 'phoneType'), options.phoneNumber.phoneType || 'local');
		if (options.sip && options.sip.domain) {
			const getOrCreateDomain = _.memoize(endpoint.getOrCreateDomain, () => options.sip.domain);
			ctx.domainId = await getOrCreateDomain(ctx.bandwidthApi, options.sip.domain);
			ctx.getOrCreateEndpoint = endpoint.getOrCreateEndpoint.bind(null, ctx.bandwidthApi, ctx.applicationId, ctx.domainId);
		}
		const body = (ctx.request || ctx).body;
		if (ctx.method === 'POST' && body) {
			const handleEvent = async (path, handler) => {
				if (ctx.path === path && handler) {
					if (util.isFunction(handler)) {
						try {
							debug(body);
							await handler(body, ctx);
						} catch (err) {
							debug(err);
						}
						return true;
					} else if (util.isObject(handler)) {
						debug(body);
						await callbackEvent(handler, body, ctx);
						return true;
					}
				}
				return false;
			};
			const [messageResult, callResult] = await Promise.all([handleEvent(application.MESSAGE_CALLBACK_PATH, options.messageCallback),
				handleEvent(application.CALL_CALLBACK_PATH, options.callCallback)]);
			if (messageResult || callResult)	{
				ctx.body = '';
				ctx.sendResponse = '';
				return;
			}
		}
		await next();
	};
}

/**
 * Express middleware
 * @param {object} options middleware's options
 * @param {string} options.name application name on Bandwidth server
 * @param {object} options.auth Auth data fof Bandwidth API
 * @param {string} options.auth.userId User ID
 * @param {string} options.auth.apiToken API token
 * @param {string} options.auth.apiSecret API secret
 * @param {object} options.phoneNumber Options for reserving phone number
 * @param {string} [options.phoneNumber.name] Name of reserved phone number
 * @param {string} [options.phoneNumber.phoneType] 'local' or 'tollFree'
 * @param {string} [options.phoneNumber.*] Other options will be passed directly to POST /availableNumbers/local or /availableNumbers/tollFree (see for more details http://dev.bandwidth.com/ap-docs/methods/availableNumbers/postAvailableNumbersLocal.html)
 * @param {object} [options.sip] Sip domain options
 * @param {string} [options.sip.domain] Sip domain name to use (not more than 16 low cased symbols )
 * @param {function|object} [options.callCallback] Function like async function(eventData, req){} or object like {'eventName': async function eventHandler(eventData, req){}} to handle calls callback events
 * @param {function|object} [options.messageCallback] Function like async function(eventData, req){} or object like {'eventName': async function eventHandler(eventData, req){}} to handle message callback events
 * @example
 *app.use(middlewares.express({
 *	name: 'My app',
 *	auth: {userId: 'bandwidthUserId', apiToken: 'bandwidthApiToken', apiSecret: 'bandwidthSecret'},
 *	phoneNumber: {
 *		phoneType: 'local',
 *		areaCode: '910'
 *	},
 *	callCallback: async (data, ctx) => {
 *		// Handle calls events here
 *		if(data.eventType === 'answer' && ctx.phoneNumber === data.to){
 *			console.log('Answered');
 *		}
 *	}
 *}));
 *
 *app.use(middlewares.koa({
 *	name: 'My app1',
 *	auth: {userId: 'bandwidthUserId', apiToken: 'bandwidthApiToken', apiSecret: 'bandwidthSecret'},
 *	phoneNumber: {
 *		phoneType: 'local',
 *		state: 'NC',
 *		city: 'Cary'
 *	},
 *	callCallback: {
 *		answer: async (data, {phoneNumber}) => {
 *			// Handle event 'answer'
 *			if(phoneNumber === data.to){
 *				console.log('Answered');
 *			}
 *		}
 *	}
 *}));
 */
function express(options) {
	const middleware = koa(options);
	return (req, res, next) => {
		middleware(req, async () => next()).then(() => {
			if (!util.isUndefined(req.sendResponse)) {
				res.send(req.sendResponse);
			}
		}, err => next(err));
	};
}

module.exports = {koa, express};
