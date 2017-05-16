const util = require('util');
const debug = require('debug')('bandwidth:application');
const _ = require('lodash');

const MESSAGE_CALLBACK_PATH = '/bandwidth/callback/message';
const CALL_CALLBACK_PATH = '/bandwidth/callback/call';

/**
 * Return all Bandwidth applications
 * @param {any} bandwidthApi API instance
 * @returns list of application
 * @example
 * const applications = await extra.application.listApplications(api);
 */
async function listApplications(bandwidthApi) {
	return (await bandwidthApi.Application.list({size: 1000})).applications;
}

/**
 * Return Bandwidth application data by name
 * @param {any} bandwidthApi API instance
 * @param {string} name application name
 * @returns application instance or undefined
 * @example
 * const application = await extra.application.getApplication(api, 'My App');
 */
async function getApplication(bandwidthApi, name) {
	return (await listApplications(bandwidthApi)).filter(app => app.name === name)[0];
}

/**
 * Create or return existing instance (by name) of Bandwidth application
 * @param {any} bandwidthApi API instance
 * @param {object|string} options Options to create an application (property `name` is required) or application name (if string)
 * @param {string} host Host name of web application
 * @param {boolean} [useHttps=true] Use or not HTTPS for callback routes
 * @returns Created (or existing) application id
 * @example
 * const applicationId = await extra.application.getOrCreateApplication(api, 'Your App', 'your.domain.org');
 */
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
