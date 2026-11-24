const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const babel = require('@babel/core');

const source = fs.readFileSync(path.join(__dirname, '../../web/js/element/ViewStatistics.js'), 'utf8');
const code = babel.transformSync(source, {
	presets: [['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }]]
}).code;
const moduleExports = {};
const document = {
	body: { style: { fontSize: '10px' } },
	createElement: () => ({
		style: {},
		offsetWidth: 10,
		offsetHeight: 10,
		addEventListener(type, handler) { this[type] = handler; }
	})
};
vm.runInNewContext(code, {
	exports: moduleExports,
	document,
	CustomEvent: class {
		constructor(type, options) { this.type = type; Object.assign(this, options); }
	},
	HTMLElement: class {
		attachShadow() { return {}; }
	}
});

function extract(text) {
	const statistics = new moduleExports.ViewStatistics();
	statistics.text = text;
	return statistics.extract();
}

test('returns entry IDs for repeated words and merged spelling variants', () => {
	const results = extract([
		{ id: 8, text: 'Gartenarbeit Gartenarbeit.' },
		{ id: 4, text: 'Gartenarbeitt.' },
		{ id: 2, text: 'Urlaub.' }
	]);
	const word = results.find(item => item.keyword === 'Gartenarbeit');
	assert.equal(word.text, word.keyword);
	assert.equal(word.count, 3);
	assert.deepEqual(Array.from(word.ids).sort(), [4, 8]);
	assert.deepEqual(Array.from(word.variants), ['Gartenarbeit (2)', 'Gartenarbeitt (1)']);
	assert.deepEqual(Array.from(results.find(item => item.keyword === 'Urlaub').ids), [2]);
});

test('tracks phrase IDs without creating phrases across entry boundaries', () => {
	const results = extract([
		{ id: 1, text: 'Neue Planung. Zukunft' },
		{ id: 2, text: 'Planung. Neue Planung.' },
		{ id: 3, text: 'Zukunft' },
		{ id: 4, text: 'Planung' }
	]);
	const phrase = results.find(item => item.keyword === 'Neue Planung');
	assert.equal(phrase.count, 2);
	assert.deepEqual(Array.from(phrase.ids).sort(), [1, 2]);
	assert.equal(results.some(item => item.keyword === 'Zukunft Planung'), false);
});

test('returns no results for an empty list of entries', () => {
	assert.equal(extract([]).length, 0);
});

test('renders score-ordered results and dispatches their entry IDs', () => {
	const words = [];
	const cloud = { offsetWidth: 200, offsetHeight: 100, appendChild: word => words.push(word) };
	const statistics = new moduleExports.ViewStatistics();
	statistics._root.querySelector = () => cloud;
	statistics.positionNext = position => { position.x = 0; position.y = 0; return true; };
	let event;
	statistics.dispatchEvent = value => { event = value; };
	const tokens = [
		{ text: 'Planung', count: 2, ids: [1] },
		{ text: 'Urlaub', count: 10, ids: [2, 3] },
		{ text: 'Reise', count: 5, ids: [4] }
	];
	statistics.renderWordcloud(tokens);
	assert.deepEqual(words.map(word => word.style.fontSize), ['8px', '18px', '11.75px']);
	words[1].click();
	assert.equal(event.type, 'details');
	assert.equal(event.detail, tokens[1]);
	assert.equal(event.bubbles, true);
	assert.equal(event.composed, true);

	words.length = 0;
	statistics.renderWordcloud([tokens[0]]);
	assert.equal(words[0].style.fontSize, '18px');
	assert.doesNotMatch(words[0].style.color, /NaN/);
});
