const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const babel = require('@babel/core');

const source = fs.readFileSync(path.join(__dirname, '../../web/js/listener.js'), 'utf8');
const code = babel.transformSync(source, {
	presets: [['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }]]
}).code;
const moduleExports = {};
const document = {
	createElement: tagName => ({ tagName, textContent: '' }),
	createTextNode: textContent => ({ textContent })
};
vm.runInNewContext(code, {
	exports: moduleExports,
	require: module => module === './ui' ? { ui: { formatTime: () => 'Datum' } } : {},
	document,
	CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } }
});
const placeName = moduleExports.listener.placeName;

test('removes Dutch postal codes and groups the city with enriched locations', () => {
	for (const address of ['Straat 1\n1234 PP Amsterdam\nNederland', '1234PP Amsterdam\nNederland']) {
		const place = placeName({ address });
		assert.equal(place.name, 'Amsterdam');
		assert.equal(place.key, placeName({ city: 'Amsterdam' }).key);
	}
});

test('preserves ordinary city names and other postal code formats', () => {
	assert.equal(placeName({ address: 'Straat 1\n1234 AB De Bilt\nNederland' }).name, 'De Bilt');
	assert.equal(placeName({ address: 'Straße 1\n80331 München\nDeutschland' }).name, 'München');
	assert.equal(placeName({ address: 'Street 1\n12345-678 Springfield\nUSA' }).name, 'Springfield');
	assert.equal(placeName({ city: 'Den Haag', address: 'Straat 1\n1234 AB Den Haag\nNederland' }).name, 'Den Haag');
});

test('highlights every matching form without matching parts of other words', () => {
	const note = { children: [], appendChild(child) { this.children.push(child); return child; } };
	moduleExports.listener.highlightStatisticNote(note, 'Alten, alter und älterer Alten.\n<test>',
		['Alten', 'alter']);
	assert.deepEqual(note.children.map(node => [node.tagName || 'text', node.textContent]), [
		['text', ''], ['b', 'Alten'], ['text', ', '], ['b', 'alter'],
		['text', ' und älterer '], ['b', 'Alten'], ['text', '.\n<test>']
	]);
});

test('highlights complete phrases and escapes regex characters', () => {
	const note = { children: [], appendChild(child) { this.children.push(child); return child; } };
	moduleExports.listener.highlightStatisticNote(note, 'Neue, Planung und Neue Planung. C++',
		['Neue', 'Neue, Planung', 'Neue Planung', 'C++']);
	assert.deepEqual(note.children.map(node => [node.tagName || 'text', node.textContent]), [
		['text', ''], ['b', 'Neue, Planung'], ['text', ' und '], ['b', 'Neue Planung'],
		['text', '. '], ['b', 'C++'], ['text', '']
	]);
});

test('the statistics popup highlights all supplied forms in each entry', () => {
	const createElement = tagName => ({
		tagName, children: [], classList: { add() {} },
		appendChild(child) { this.children.push(child); return child; },
		setAttribute() {}, addEventListener() {}
	});
	const originalCreateElement = document.createElement;
	document.createElement = createElement;
	document.querySelector = () => ({ list: [
		{ id: 10, date: '2026-01-01', note: 'Alten.', eventImages: [] },
		{ id: 11, date: '2026-01-02', note: 'alter.', eventImages: [] }
	] });
	let popup;
	document.dispatchEvent = event => { popup = event; };
	try {
		moduleExports.listener.statisticDetail({
			detail: { text: 'Alten', count: 2, ids: [0, 1], matches: ['Alten', 'alter'] }
		});
		const list = popup.detail.body.children.find(child => child.tagName === 'list');
		const notes = list.children.filter(child => child.tagName === 'value').map(value => value.children[0]);
		assert.deepEqual(notes.map(note => note.children.find(child => child.tagName === 'b').textContent),
			['Alten', 'alter']);
	} finally {
		document.createElement = originalCreateElement;
	}
});
