const debug = require('debug')('bandwidth:phoneNumber');
const _ = require('lodash');

async function listPhoneNumbers(bandwidthApi, applicationId) {
	return (await bandwidthApi.PhoneNumber.list({size: 1000, applicationId})).phoneNumbers;
}

async function getPhoneNumber(bandwidthApi, applicationId, name = '') {
	return (await bandwidthApi.PhoneNumber.list({size: 1000, applicationId, name})).phoneNumbers[0];
}

async function createPhoneNumber(bandwidthApi, applicationId, options, phoneType = 'local') {
	debug(`Reserving a phone number for ${applicationId}`);
	const opts = _.omit(_.assign({}, options, {quantity: 1}), 'name');
	const result = (await bandwidthApi.AvailableNumber.searchAndOrder(phoneType, opts))[0];
	await bandwidthApi.PhoneNumber.update(result.id, {applicationId, name: options.name});
	return result.number;
}

async function getOrCreatePhoneNumber(bandwidthApi, applicationId, options, phoneType = 'local') {
	debug(`Getting phone number for ${applicationId}`);
	const phoneNumber = await getPhoneNumber(bandwidthApi, applicationId, options.name);
	if (!phoneNumber) {
		return createPhoneNumber(bandwidthApi, applicationId, options, phoneType);
	}
	debug(`Phone number for ${applicationId} is ${phoneNumber.number}`);
	return phoneNumber.number;
}

module.exports = {listPhoneNumbers, createPhoneNumber, getPhoneNumber, getOrCreatePhoneNumber};
