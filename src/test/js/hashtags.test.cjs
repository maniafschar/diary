const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const babel = require('@babel/core');

const source = fs.readFileSync(path.join(__dirname, '../../web/js/hashtags.js'), 'utf8');
const code = babel.transformSync(source, {
	presets: [['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }]]
}).code;
const moduleExports = {};
const document = { createElement: () => ({ setAttribute(name, value) { this[name] = value; } }) };
vm.runInNewContext(code, { exports: moduleExports, document });

test('hashtag buttons reflect and toggle case-insensitive selections', () => {
	const selected = moduleExports.splitHashtags(' #Freunde, wasser, ');
	const container = {
		children: [],
		replaceChildren() { this.children = []; },
		appendChild(button) { this.children.push(button); return button; }
	};
	let clicked;
	moduleExports.renderHashtagButtons(container, ['freunde', 'familie'], selected, tag => clicked = tag);
	assert.equal(container.children[0].textContent, '#freunde');
	assert.equal(container.children[0]['aria-pressed'], 'true');
	assert.equal(container.children[1]['aria-pressed'], 'false');
	container.children[1].onclick();
	assert.equal(clicked, 'familie');
});
