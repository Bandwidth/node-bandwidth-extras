const test = require('ava');
const td = require('testdouble');
const phoneNumber = require('../../lib/phone-number');

test.beforeEach(t => {
	t.context.api = {
		PhoneNumber: {
			list: td.function(),
			update: td.function()
		},
		AvailableNumber: {
			searchAndOrder: td.function()
		}
	};
});

test('listPhoneNumbers() should returns list of numbers', async t => {
	td.when(t.context.api.PhoneNumber.list({size: 1000, applicationId: 'appId'})).thenResolve({phoneNumbers: [{}]});
	const apps = await phoneNumber.listPhoneNumbers(t.context.api, 'appId');
	t.is(apps.length, 1);
});

test('getPhoneNumber() should return a phone number', async t => {
	td.when(t.context.api.PhoneNumber.list({size: 1000, applicationId: 'appId', name: 'test'})).thenResolve({phoneNumbers: [{id: 'id'}]});
	const number = await phoneNumber.getPhoneNumber(t.context.api, 'appId', 'test');
	t.truthy(number);
});

test('createPhoneNumber() should reserve a number', async t => {
	td.when(t.context.api.AvailableNumber.searchAndOrder('local', {areaCode: '910', quantity: 1})).thenResolve([{id: 'id', number: '+1234567890'}]);
	td.when(t.context.api.PhoneNumber.update('id', {applicationId: 'appId', name: 'test'}));
	const number = await phoneNumber.createPhoneNumber(t.context.api, 'appId', {name: 'test', areaCode: '910'});
	t.is(number, '+1234567890');
});

test('getOrCreatePhoneNumber() should reserve a number', async t => {
	td.when(t.context.api.PhoneNumber.list({size: 1000, applicationId: 'appId', name: 'test'})).thenResolve({phoneNumbers: []});
	td.when(t.context.api.AvailableNumber.searchAndOrder('local', {areaCode: '910', quantity: 1})).thenResolve([{id: 'id', number: '+1234567890'}]);
	td.when(t.context.api.PhoneNumber.update('id', {applicationId: 'appId', name: 'test'}));
	const number = await phoneNumber.getOrCreatePhoneNumber(t.context.api, 'appId', {name: 'test', areaCode: '910'});
	t.is(number, '+1234567890');
});

test('getOrCreatePhoneNumber() should return an existing number', async t => {
	td.when(t.context.api.PhoneNumber.list({size: 1000, applicationId: 'appId', name: 'test'})).thenResolve({phoneNumbers: [{id: 'id', number: '+1234567891'}]});
	const number = await phoneNumber.getOrCreatePhoneNumber(t.context.api, 'appId', {name: 'test', areaCode: '910'});
	t.is(number, '+1234567891');
});
