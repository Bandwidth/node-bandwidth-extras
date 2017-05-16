const util = require('util');
const randomstring = require('randomstring');
const debug = require('debug')('bandwidth:endpoint');

/**
 * Return list of sip domains
 * @param {any} bandwidthApi API instance
 * @returns list of domains
 * @example
 * const domains = await extra.endpoint.listDomains(api);
 */
async function listDomains(bandwidthApi) {
	return (await bandwidthApi.Domain.list({size: 100})).domains;
}

/**
 * Return domain data by name
 * @param {any} bandwidthApi API instance
 * @param {string} name domain name
 * @returns domain data or undefined
 * @example
 * const domain = await extra.endpoint.getDomain(api, 'your.domain');
 */
async function getDomain(bandwidthApi, name) {
	return (await listDomains(bandwidthApi)).filter(d => d.name === name)[0];
}

/**
 * Create or return existing domain by name
 * @param {any} bandwidthApi API instance
 * @param {string} name Domain name
 * @returns Created (or existing) domain id
 * @example
 * const domainId = await extra.endpoint.getOrCreateDomain(api, 'your.domain'); // domain will be created if need
 */
async function getOrCreateDomain(bandwidthApi, name) {
	let domain = await getDomain(bandwidthApi, name);
	if (!domain) {
		debug('Creating new domain %s on Bandwidth', name);
		domain = await bandwidthApi.Domain.create({name});
	}
	return domain.id;
}

/**
 * Return all endpoints of given domain id
 * @param {any} bandwidthApi API instance
 * @param {string} domainId domain id
 * @returns list of endpoints
 * @example
 * const endpoints = await extra.endpoint.listEndpoints(api, 'domainId');
 */
async function listEndpoints(bandwidthApi, domainId) {
	return (await bandwidthApi.Endpoint.list(domainId, {size: 1000})).endpoints;
}

/**
 * Return endpoint for given domain by name
 * @param {any} bandwidthApi API instance
 * @param {string} domainId  domain id
 * @param {string} name name of endpoint
 * @returns endpoint data or undefined
 * @example
 * const endpoint = await extra.endpoint.getEndpoint(api, 'domainId', 'user1');
 */
async function getEndpoint(bandwidthApi, domainId, name) {
	return (await listEndpoints(bandwidthApi, domainId)).filter(e => e.name === name)[0];
}

/**
 * Create or return existing endpoint by name
 * @param {any} bandwidthApi API instance
 * @param {any} applicationId application id
 * @param {string} domainId  domain id
 * @param {object|string} sipAccount sip account user name as string or object like {name: 'sipAccountName', password: ''}
 * @returns Created (or existing) endpoint data
 * @example
 * const endpoint = await extra.endpoint.getOrCreateEndpoint(api, 'applicationId', 'domainId', 'user1');
 * const endpoint2 = await extra.endpoint.getOrCreateEndpoint(api, 'applicationId', 'domainId', {name: 'user2', password: '111'});
 */
async function getOrCreateEndpoint(bandwidthApi, applicationId, domainId, sipAccount) {
	let sipUserName;
	let sipPassword;
	if (util.isString(sipAccount)) {
		sipUserName = sipAccount;
		sipPassword = randomstring.generate(16); // Usefull for authorization via token
	} else {
		sipUserName = sipAccount.name || sipAccount.userName;
		sipPassword = sipAccount.password;
	}
	let endpoint = await getEndpoint(bandwidthApi, domainId, sipUserName);
	if (!endpoint) {
		debug('Creating new SIP endpoint on Bandwidth');
		endpoint = await bandwidthApi.Endpoint.create(domainId, {
			name: sipUserName.toLowerCase(),
			domainId,
			applicationId,
			enabled: true,
			credentials: {
				password: sipPassword
			}
		});
		endpoint = await bandwidthApi.Endpoint.get(domainId, endpoint.id);
	}
	return endpoint;
}

module.exports = {
	listDomains, getDomain, getOrCreateDomain, listEndpoints, getEndpoint, getOrCreateEndpoint
};
