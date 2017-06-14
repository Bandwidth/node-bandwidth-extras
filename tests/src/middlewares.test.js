const util = require('util');
const test = require('ava');
const td = require('testdouble');
const middlewares = require('../../lib/middlewares');
const application = require('../../lib/application');
const phoneNumber = require('../../lib/phone-number');
const endpoint = require('../../lib/endpoint');

td.replace(application, 'getOrCreateApplication');
td.replace(phoneNumber, 'getOrCreatePhoneNumber');
td.replace(endpoint, 'getOrCreateDomain');
td.replace(endpoint, 'getOrCreateEndpoint');

const auth = {userId: 'userId', apiToken: 'token', apiSecret: 'secret'};

test.beforeEach(t => {
	t.context.host = 'localhost';
	t.context.next = td.function();
	td.when(t.context.next()).thenResolve();
});

test('koa() should fail on missing Bandwidth auth data', async t => {
	const middleware = middlewares.koa({});
	try {
		await middleware(t.context, t.context.next);
		t.fail('An error is estimated');
	} catch (err) {
		t.pass();
	}
});

test('koa() should fill context by Bandwidth data', async t => {
	const middleware = middlewares.koa({
		name: 'testApp',
		auth,
		phoneNumber: {
			phoneType: 'local',
			areaCode: '910'
		}
	});
	td.when(application.getOrCreateApplication(td.matchers.anything(), 'testApp', 'localhost', true)).thenResolve('applicationId');
	td.when(phoneNumber.getOrCreatePhoneNumber(td.matchers.anything(), 'applicationId', {areaCode: '910'}, 'local')).thenResolve('+1234567890');
	await middleware(t.context, t.context.next);
	t.truthy(t.context.bandwidthApi);
	t.truthy(t.context.cache);
	t.is(t.context.applicationId, 'applicationId');
	t.is(t.context.phoneNumber, '+1234567890');
	t.falsy(t.context.domainId);
});

test('koa() should provide cache manager', async t => {
	const middleware = middlewares.koa({
		name: 'testApp',
		auth,
		phoneNumber: {
			phoneType: 'local',
			areaCode: '910'
		}
	});
	await middleware(t.context, t.context.next);
	const cache = t.context.cache;
	const test = td.function();
	td.when(test(), {times: 1}).thenResolve(10);
	const cached1 = await cache.wrap('key', () => test());
	const cached2 = await cache.wrap('key', () => test());
	const cached3 = await cache.wrap('key', () => test());
	t.is(10, cached1);
	t.is(10, cached2);
	t.is(10, cached3);
});

test('koa() should fill context by Bandwidth data (without phone number)', async t => {
	const middleware = middlewares.koa({
		name: 'testApp1',
		auth
	});
	td.when(application.getOrCreateApplication(td.matchers.anything(), 'testApp1', 'localhost', true)).thenResolve('applicationId1');
	await middleware(t.context, t.context.next);
	t.truthy(t.context.bandwidthApi);
	t.is(t.context.applicationId, 'applicationId1');
	t.falsy(t.context.phoneNumber);
	t.falsy(t.context.domainId);
});

test('koa() should fill context by Bandwidth data (with SIP)', async t => {
	const middleware = middlewares.koa({
		name: 'testApp2',
		auth,
		phoneNumber: {
			phoneType: 'local',
			areaCode: '910'
		},
		sip: {
			domain: 'domain'
		}
	});
	td.when(application.getOrCreateApplication(td.matchers.anything(), 'testApp2', 'localhost', true)).thenResolve('applicationId2');
	td.when(phoneNumber.getOrCreatePhoneNumber(td.matchers.anything(), 'applicationId2', {areaCode: '910'}, 'local')).thenResolve('+1234567891');
	td.when(endpoint.getOrCreateDomain(td.matchers.anything(), 'domain')).thenResolve('domainId2');
	td.when(endpoint.getOrCreateEndpoint(td.matchers.anything(), 'applicationId2', 'domainId2', 'user2')).thenResolve({});
	await middleware(t.context, t.context.next);
	t.truthy(t.context.bandwidthApi);
	t.is(t.context.applicationId, 'applicationId2');
	t.is(t.context.phoneNumber, '+1234567891');
	t.is(t.context.domainId, 'domainId2');
	t.true(util.isFunction(t.context.getOrCreateEndpoint));
	const point = await t.context.getOrCreateEndpoint('user2');
	t.truthy(point);
});

test('koa() should add route to handle call callbacks (function)', async t => {
	const callCallback = td.function();
	const middleware = middlewares.koa({
		name: 'testApp3',
		auth,
		phoneNumber: {
			phoneType: 'local',
			areaCode: '910'
		},
		callCallback
	});
	td.when(application.getOrCreateApplication(td.matchers.anything(), 'testApp3', 'localhost', true)).thenResolve('applicationId3');
	td.when(phoneNumber.getOrCreatePhoneNumber(td.matchers.anything(), 'applicationId3', {areaCode: '910'}, 'local')).thenResolve('+1234567893');
	t.context.path = application.CALL_CALLBACK_PATH;
	t.context.method = 'POST';
	t.context.request = {
		body: {
			eventType: 'answer'
		}
	};
	td.when(callCallback({eventType: 'answer'}, t.context)).thenResolve();
	await middleware(t.context, t.context.next);
	t.is(t.context.body, '');
	t.is(td.explain(callCallback).callCount, 1);
});

test('koa() should add route to handle call callbacks (object handlers)', async t => {
	const callCallback = {answer: td.function()};
	const middleware = middlewares.koa({
		name: 'testApp4',
		auth,
		phoneNumber: {
			phoneType: 'local',
			areaCode: '910'
		},
		callCallback
	});
	td.when(application.getOrCreateApplication(td.matchers.anything(), 'testApp4', 'localhost', true)).thenResolve('applicationId4');
	td.when(phoneNumber.getOrCreatePhoneNumber(td.matchers.anything(), 'applicationId4', {areaCode: '910'}, 'local')).thenResolve('+1234567894');
	t.context.path = application.CALL_CALLBACK_PATH;
	t.context.method = 'POST';
	t.context.request = {
		body: {
			eventType: 'answer'
		}
	};
	td.when(callCallback.answer({eventType: 'answer'}, t.context)).thenResolve();
	await middleware(t.context, t.context.next);
	t.is(t.context.body, '');
	t.is(td.explain(callCallback.answer).callCount, 1);
});

test('koa() should add route to handle which handles unhandled errors', async t => {
	const callCallback = td.function();
	const middleware = middlewares.koa({
		name: 'testApp31',
		auth,
		phoneNumber: {
			phoneType: 'local',
			areaCode: '910'
		},
		callCallback: async () => {
			throw new Error('Error');
		}
	});
	td.when(application.getOrCreateApplication(td.matchers.anything(), 'testApp31', 'localhost', true)).thenResolve('applicationId31');
	td.when(phoneNumber.getOrCreatePhoneNumber(td.matchers.anything(), 'applicationId31', {areaCode: '910'}, 'local')).thenResolve('+1234567893');
	t.context.path = application.CALL_CALLBACK_PATH;
	t.context.method = 'POST';
	t.context.request = {
		body: {
			eventType: 'answer'
		}
	};
	td.when(callCallback({eventType: 'answer'}, t.context)).thenResolve();
	await middleware(t.context, t.context.next);
	t.is(t.context.body, '');
});

test('koa() should add route to handle call callbacks (object handlers, unhandled event)', async t => {
	const middleware = middlewares.koa({
		name: 'testApp5',
		auth,
		phoneNumber: {
			phoneType: 'local',
			areaCode: '910'
		},
		callCallback: {}
	});
	td.when(application.getOrCreateApplication(td.matchers.anything(), 'testApp5', 'localhost', true)).thenResolve('applicationId5');
	td.when(phoneNumber.getOrCreatePhoneNumber(td.matchers.anything(), 'applicationId5', {areaCode: '910'}, 'local')).thenResolve('+1234567895');
	t.context.path = application.CALL_CALLBACK_PATH;
	t.context.method = 'POST';
	t.context.request = {
		body: {
			eventType: 'answer'
		}
	};
	await middleware(t.context, t.context.next);
	t.is(t.context.body, '');
});

test('koa() should add route to handle message callbacks', async t => {
	const messageCallback = td.function();
	const middleware = middlewares.koa({
		name: 'testApp6',
		auth,
		phoneNumber: {
			phoneType: 'local',
			areaCode: '910'
		},
		messageCallback
	});
	td.when(application.getOrCreateApplication(td.matchers.anything(), 'testApp6', 'localhost', true)).thenResolve('applicationId6');
	td.when(phoneNumber.getOrCreatePhoneNumber(td.matchers.anything(), 'applicationId6', {areaCode: '910'}, 'local')).thenResolve('+1234567896');
	t.context.path = application.MESSAGE_CALLBACK_PATH;
	t.context.method = 'POST';
	t.context.request = {
		body: {
			eventType: 'sms'
		}
	};
	td.when(messageCallback({eventType: 'sms'}, t.context)).thenResolve();
	await middleware(t.context, t.context.next);
	t.is(t.context.body, '');
	t.is(td.explain(messageCallback).callCount, 1);
});

test.cb('express() should fill req by Bandwidth data', t => {
	const middleware = middlewares.express({
		name: 'testApp7',
		auth,
		phoneNumber: {
			phoneType: 'local',
			areaCode: '910'
		}
	});
	td.when(application.getOrCreateApplication(td.matchers.anything(), 'testApp7', 'localhost', true)).thenResolve('applicationId7');
	td.when(phoneNumber.getOrCreatePhoneNumber(td.matchers.anything(), 'applicationId7', {areaCode: '910'}, 'local')).thenResolve('+1234567897');
	middleware(t.context, {}, () => {
		t.truthy(t.context.bandwidthApi);
		t.is(t.context.applicationId, 'applicationId7');
		t.is(t.context.phoneNumber, '+1234567897');
		t.falsy(t.context.domainId);
		t.end();
	});
});

test.cb('express() should add route to handle callbacks', t => {
	const callCallback = td.function();
	const middleware = middlewares.express({
		name: 'testApp8',
		auth,
		phoneNumber: {
			phoneType: 'local',
			areaCode: '910'
		},
		callCallback
	});
	td.when(application.getOrCreateApplication(td.matchers.anything(), 'testApp8', 'localhost', true)).thenResolve('applicationId8');
	td.when(phoneNumber.getOrCreatePhoneNumber(td.matchers.anything(), 'applicationId8', {areaCode: '910'}, 'local')).thenResolve('+1234567898');
	t.context.path = application.CALL_CALLBACK_PATH;
	t.context.method = 'POST';
	t.context.body = {
		eventType: 'answer'
	};
	td.when(callCallback({eventType: 'answer'}, t.context)).thenResolve();
	const res = {
		send: td.function()
	};
	const next = td.function();
	middleware(t.context, res, next);
	setTimeout(() => {
		t.is(t.context.body, '');
		t.is(td.explain(callCallback).callCount, 1);
		td.verify(res.send(''));
		td.verify(next(td.matchers.anything()), {times: 0});
		t.end();
	}, 70);
});

test.cb('express() should fail on missing Bandwidth auth data', t => {
	const middleware = middlewares.express({});
	middleware(t.context, {}, err => {
		t.truthy(err);
		t.end();
	});
});
