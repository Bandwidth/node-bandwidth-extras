const debug = require('debug')('bandwidth:phoneNumber');
const _ = require('lodash');

/**
 * Return list of phone numbers assigned to given application
 * @param {any} bandwidthApi API instance
 * @param {any} applicationId application id
 * @returns list of numbers
 * @example
 * const numbers = await extra.phoneNumber.listPhoneNumbers(api, 'applicationId');
 */
async function listPhoneNumbers(bandwidthApi, applicationId) {
	return (await bandwidthApi.PhoneNumber.list({size: 1000, applicationId})).phoneNumbers;
}

/**
 * Return a phone number assigned to give application by name
 * @param {any} bandwidthApi API instance
 * @param {any} applicationId  application id
 * @param {string} [name=''] name of phone number
 * @returns phone number data
 * @example
 * const number = await extra.phoneNumber.getPhoneNumber(api, 'applicationId', 'support');
 */
async function getPhoneNumber(bandwidthApi, applicationId, name = '') {
	return (await bandwidthApi.PhoneNumber.list({size: 1000, applicationId, name})).phoneNumbers[0];
}

/**
 * Allocate new phone number for the applciation
 * @param {any} bandwidthApi API instance
 * @param {string} applicationId application id
 * @param {object} options options to create number (property `name` is required)
 * @param {string} [phoneType='local'] type of created phone number
 * @returns allocated phone number
 * @example
 * const number = await extra.phoneNumber.createPhoneNumber(api, 'applicationId', {areaCode: '910'});
 */
async function createPhoneNumber(bandwidthApi, applicationId, options, phoneType = 'local') {
	debug(`Reserving a phone number for ${applicationId}`);
	const opts = _.omit(_.assign({}, options, {quantity: 1}), 'name');
	const result = (await bandwidthApi.AvailableNumber.searchAndOrder(phoneType, opts))[0];
	await bandwidthApi.PhoneNumber.update(result.id, {applicationId, name: options.name});
	return result.number;
}

/**
 * Create new or return existing assigned to the application phone number by name
 * @param {any} bandwidthApi API instance
 * @param {string} applicationId application id
 * @param {object} options options to create number (property `name` is required)
 * @param {string} [phoneType='local'] type of created phone number
 * @returns allocated (or existing) phone number
 * @example
 * const number = await extra.phoneNumber.getOrCreatePhoneNumber(api, 'applicationId', {name: 'support', areaCode: '910'});
 */
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
