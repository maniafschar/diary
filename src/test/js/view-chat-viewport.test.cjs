const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const babel = require('@babel/core');

const source = fs.readFileSync(path.join(__dirname, '../../web/js/element/ViewChat.js'), 'utf8');
const code = babel.transformSync(source, {
	presets: [['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }]]
}).code;
const moduleExports = {};
const window = { visualViewport: { height: 800, offsetTop: 0 } };
vm.runInNewContext(code, { exports: moduleExports, require: () => ({}), HTMLElement: class {}, window });

test('chat height follows the visible viewport and restores when the keyboard closes', () => {
	const properties = new Map();
	const chat = {
		parentElement: { getBoundingClientRect: () => ({ top: 50, height: 700 }) },
		style: {
			setProperty: (name, value) => properties.set(name, value),
			removeProperty: name => properties.delete(name)
		}
	};
	const sync = () => moduleExports.ViewChat.prototype.syncVisualViewport.call(chat);

	sync();
	assert.equal(properties.has('--chat-height'), false);
	assert.equal(properties.has('--chat-offset'), false);
	window.visualViewport.height = 400;
	sync();
	assert.equal(properties.get('--chat-height'), '350px');
	window.visualViewport.offsetTop = 100;
	sync();
	assert.equal(properties.get('--chat-height'), '400px');
	assert.equal(properties.get('--chat-offset'), '50px');
	window.visualViewport.offsetTop = 200;
	sync();
	assert.equal(properties.get('--chat-height'), '400px');
	assert.equal(properties.get('--chat-offset'), '150px');
	window.visualViewport.offsetTop = 0;
	sync();
	assert.equal(properties.get('--chat-height'), '350px');
	assert.equal(properties.has('--chat-offset'), false);
	window.visualViewport.height = 800;
	sync();
	assert.equal(properties.has('--chat-height'), false);
	window.visualViewport = undefined;
	sync();
	assert.equal(properties.has('--chat-height'), false);
	assert.equal(properties.has('--chat-offset'), false);
});
