const util = require('util');
const randomstring = require('randomstring');
const debug = require('debug')('bandwidth:endpoint');

async function listDomains(bandwidthApi) {
	return (await bandwidthApi.Domain.list({size: 100})).domains;
}

async function getDomain(bandwidthApi, name) {
	return (await listDomains(bandwidthApi)).filter(d => d.name === name)[0];
}

async function getOrCreateDomain(bandwidthApi, name) {
	if (!name) {
		name = `d${randomstring.generate({
			length: 15,
			readable: true,
			capitalization: 'lowercase'
		})}`;
	}
	let domain = await getDomain(bandwidthApi, name);
	if (!domain) {
		debug('Creating new domain %s on Bandwidth', name);
		domain = await bandwidthApi.Domain.create({name});
	}
	return domain.id;
}

async function listEndpoints(bandwidthApi, domainId) {
	return (await bandwidthApi.Endpoint.list(domainId, {size: 1000})).endpoints;
}

async function getEndpoint(bandwidthApi, domainId, name) {
	return (await listEndpoints(bandwidthApi, domainId)).filter(e => e.name === name)[0];
}

async function getOrCreateEndpoint(bandwidthApi, applicationId, domainId, sipAccount) {
	let sipUserName;
	let sipPassword;
	if (util.isString(sipAccount)) {
		sipUserName = sipAccount;
		sipPassword = randomstring.generate(16);
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
