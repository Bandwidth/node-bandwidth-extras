const test = require('ava');
const index = require('../index');

test('index.js should export objects', t => {
	t.truthy(index.application);
	t.truthy(index.endpoint);
	t.truthy(index.middlewares);
	t.truthy(index.phoneNumber);
});
