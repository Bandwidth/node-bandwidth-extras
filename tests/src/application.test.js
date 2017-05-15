const test = require('ava');
const td = require('testdouble');
const application = require('../../lib/application');

test.beforeEach(t => {
	t.context.api = {
		Application: {
			list: td.function(),
			create: td.function()
		}
	};
});

test('listApplications() should returns list of applications', async t => {
	td.when(t.context.api.Application.list({size: 1000})).thenResolve({applications: [{}]});
	const apps = await application.listApplications(t.context.api);
	t.is(apps.length, 1);
});

test('getApplication() should return an application', async t => {
	td.when(t.context.api.Application.list({size: 1000})).thenResolve({applications: [{name: 'app1'}, {name: 'app2'}]});
	const app = await application.getApplication(t.context.api, 'app1');
	t.truthy(app);
});

test('getOrCreateApplication() should return an existing application', async t => {
	td.when(t.context.api.Application.list({size: 1000})).thenResolve({applications: [{name: 'app1 on localhost', id: 'id1'}]});
	const id = await application.getOrCreateApplication(t.context.api, {name: 'app1'}, 'localhost');
	t.is(id, 'id1');
});

test('getOrCreateApplication() should create an app', async t => {
	td.when(t.context.api.Application.list({size: 1000})).thenResolve({applications: []});
	td.when(t.context.api.Application.create({
		incomingMessageUrl: 'https://localhost/bandwidth/callback/message',
		incomingCallUrl: 'https://localhost/bandwidth/callback/call',
		autoAnswer: true,
		callbackHttpMethod: 'POST',
		name: 'app3 on localhost'
	})).thenResolve({id: 'id3'});
	const id = await application.getOrCreateApplication(t.context.api, 'app3', 'localhost');
	t.is(id, 'id3');
});
