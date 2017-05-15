const util = require('util');
const debug = require('debug')('bandwidth:application');
const _ = require('lodash');

const MESSAGE_CALLBACK_PATH = '/bandwidth/callback/message';
const CALL_CALLBACK_PATH = '/bandwidth/callback/call';

async function listApplications(bandwidthApi) {
	return (await bandwidthApi.Application.list({size: 1000})).applications;
}

async function getApplication(bandwidthApi, name) {
	return (await listApplications(bandwidthApi)).filter(app => app.name === name)[0];
}

async function getOrCreateApplication(bandwidthApi, options, host, useHttps = true) {
	debug('Getting Bandwidth application Id');
	const baseUrl = `http${useHttps ? 's' : ''}://${host}`;
	if (util.isString(options)) {
		options = {name: options};
	}
	const applicationOptions = _.assign({
		incomingMessageUrl: `${baseUrl}${MESSAGE_CALLBACK_PATH}`,
		incomingCallUrl: `${baseUrl}${CALL_CALLBACK_PATH}`,
		autoAnswer: true,
		callbackHttpMethod: 'POST'
	}, options);
	applicationOptions.name = `${options.name} on ${host}`;
	let applicationId = (await getApplication(bandwidthApi, applicationOptions.name) || {}).id;
	if (!applicationId) {
		debug('Creating new application on Bandwidth');
		applicationId = (await bandwidthApi.Application.create(applicationOptions)).id;
	}
	return applicationId;
}

module.exports = {listApplications, getApplication, getOrCreateApplication, MESSAGE_CALLBACK_PATH, CALL_CALLBACK_PATH};
