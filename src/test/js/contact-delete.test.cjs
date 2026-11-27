const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function load(file, name, context) {
	const source = fs.readFileSync(path.join(__dirname, '../../web/js', file), 'utf8')
		.replace(/^import .*;\r?$/gm, '')
		.replace(/^export \{ .* \};\r?$/gm, '');
	return vm.runInNewContext(source + '\n' + name, context);
}

test('contact deletion sends DELETE to the contact endpoint', () => {
	const api = load('api.js', 'api', { JSEncrypt: class {} });
	let request;
	api.ajax = value => request = value;
	const success = () => {};
	api.contact.delete(success);
	assert.equal(request.url, 'contact');
	assert.equal(request.method, 'DELETE');
	assert.equal(request.success, success);
});

test('confirmed deletion clears the saved login and logs out only after success', () => {
	let confirmed = false;
	let callback;
	const calls = [];
	const button = { classList: {
		contains: () => confirmed,
		add: () => confirmed = true
	} };
	const api = { contact: { delete: success => callback = success } };
	const elements = Object.fromEntries([
		'DialogPopup', 'InputCheckbox', 'InputDate', 'InputImage', 'InputMap', 'InputPassword', 'InputRating',
		'InputSelection', 'InputTextarea', 'ProgressBar', 'ViewCalendar', 'ViewChat', 'ViewImage', 'ViewMap',
		'ViewSearch', 'ViewStatistics', 'ViewTable'
	].map(name => [name, class {}]));
	const action = load('action.js', 'action', {
		...elements,
		api,
		document: { querySelector: () => ({ content: () => ({ querySelector: () => button }) }) },
		window: { addEventListener() {}, localStorage: { removeItem: key => calls.push(key) } },
		customElements: { define() {} },
		listener: {}, dialog: {}, ui: {}
	});
	action.logoff = access => calls.push(access);
	action.contactDelete();
	assert.equal(callback, undefined);
	action.contactDelete();
	assert.deepEqual(calls, []);
	callback();
	assert.deepEqual(calls, ['login', true]);
});
