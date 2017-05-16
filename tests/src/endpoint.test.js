const test = require('ava');
const td = require('testdouble');
const endpoint = require('../../lib/endpoint');

test.beforeEach(t => {
	t.context.api = {
		Domain: {
			list: td.function(),
			create: td.function()
		},
		Endpoint: {
			list: td.function(),
			create: td.function(),
			get: td.function()
		}
	};
});

test('listDomains() should return list of domains', async t => {
	td.when(t.context.api.Domain.list({size: 100})).thenResolve({domains: [{}]});
	const domains = await endpoint.listDomains(t.context.api);
	t.is(domains.length, 1);
});

test('getDomain() should return a domain by name', async t => {
	td.when(t.context.api.Domain.list({size: 100})).thenResolve({domains: [{name: 'domain1'}, {name: 'domain2'}]});
	const domain = await endpoint.getDomain(t.context.api, 'domain1');
	t.truthy(domain);
});

test('getOrCreateDomain() should return a existing domain', async t => {
	td.when(t.context.api.Domain.list({size: 100})).thenResolve({domains: [{name: 'domain1', id: 'id1'}, {name: 'domain2'}]});
	const id = await endpoint.getOrCreateDomain(t.context.api, 'domain1');
	t.is(id, 'id1');
});

test('getOrCreateDomain() should create a domain', async t => {
	td.when(t.context.api.Domain.list({size: 100})).thenResolve({domains: []});
	td.when(t.context.api.Domain.create({name: 'domain2'})).thenResolve({id: 'id2'});
	const id = await endpoint.getOrCreateDomain(t.context.api, 'domain2');
	t.is(id, 'id2');
});

test('listEndpoints() should return list of endpoints', async t => {
	td.when(t.context.api.Endpoint.list('domainId', {size: 1000})).thenResolve({endpoints: [{}]});
	const endpoints = await endpoint.listEndpoints(t.context.api, 'domainId');
	t.is(endpoints.length, 1);
});

test('getEndpoint() should return an endpoint', async t => {
	td.when(t.context.api.Endpoint.list('domainId', {size: 1000})).thenResolve({endpoints: [{name: 'user1'}]});
	const point = await endpoint.getEndpoint(t.context.api, 'domainId', 'user1');
	t.truthy(point);
});

test('getOrCreateEndpoint() should return an existing endpoint', async t => {
	td.when(t.context.api.Endpoint.list('domainId', {size: 1000})).thenResolve({endpoints: [{name: 'user2'}]});
	const point = await endpoint.getOrCreateEndpoint(t.context.api, 'appId', 'domainId', 'user2');
	t.is(point.name, 'user2');
});

test('getOrCreateEndpoint() should create an endpoint', async t => {
	td.when(t.context.api.Endpoint.list('domainId', {size: 1000})).thenResolve({endpoints: []});
	td.when(t.context.api.Endpoint.create('domainId', {
		name: 'user3',
		domainId: 'domainId',
		applicationId: 'appId',
		enabled: true,
		credentials: {
			password: '123'
		}
	})).thenResolve({id: 'id3'});
	td.when(t.context.api.Endpoint.get('domainId', 'id3')).thenResolve({name: 'user3'});
	const point = await endpoint.getOrCreateEndpoint(t.context.api, 'appId', 'domainId', {name: 'user3', password: '123'});
	t.is(point.name, 'user3');
});
