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
		console.trace(err);
	}
}

async function koa(options) {
	return async (ctx, next) => {
		if (!options.userId || !options.apiToken || !options.apiSecret) {
			throw new Error('Missing Bandwidth credentials. Please fill middleware options: userId, apiToke and apiSecret');
		}
		ctx.bandwidthApi = new Bandwidth(options);
		ctx.applicationId = await application.getOrCreateApplication(ctx.bandwidthApi, options.name, ctx.host, util.isUndefined(options.useHttps) ? true : options.useHttps);
		ctx.phoneNumber = await phoneNumber.getOrCreatePhoneNumber(ctx.bandwidthApi, ctx.applicationId, _.omit(options.phoneNumber, 'phoneType'), options.phoneNumber.phoneType || 'local');
		if (options.sip) {
			ctx.domainId = await endpoint.getOrCreateDomain(ctx.bandwidthApi, options.sip.domain);
			ctx.getOrCreateEndpoint = endpoint.getOrCreateEndpoint.bind(null, ctx.bandwidthApi, ctx.applicationId, ctx.domainId);
		}
		const body = (ctx.request || ctx).body;
		if (ctx.method === 'POST' && body) {
			const handleEvent = async (path, handler) => {
				if (ctx.path === path) {
					if (util.isFunction(handler)) {
						try {
							debug(body);
							await handler(body, ctx);
						} catch (err) {
							console.trace(err);
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
			if (handleEvent(application.MESSAGE_CALLBACK_PATH, options.messageCallback) ||
				handleEvent(application.CALL_CALLBACK_PATH, options.callCallback)) {
				ctx.body = '';
				ctx.sendResponse = '';
				return;
			}
		}
		await next();
	};
}

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
