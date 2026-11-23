const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const babel = require('@babel/core');

function load(file, context) {
	const source = fs.readFileSync(path.join(__dirname, '../../web/js', file), 'utf8');
	const code = babel.transformSync(source, {
		presets: [['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }]]
	}).code;
	const exports = {};
	vm.runInNewContext(code, { exports, ...context });
	return exports;
}

const hashtags = load('hashtags.js', {});
const fuzzy = load('FuzzyMatcher.js', {});
const events = [
	{ id: 1, note: 'Ausflug am See', hashtags: 'Wasser, freunde', date: '2026-01-01', rating: 80, ratingCount: 1 },
	{ id: 2, note: 'Ausflug', hashtags: 'wasser', date: '2026-01-02', rating: 60, ratingCount: 1 },
	{ id: 3, note: 'Ruhe', hashtags: 'wasser, freunde', date: '2026-01-03', rating: 80, ratingCount: 1 }
];
const document = { querySelector: () => ({ list: events }) };
const { ViewSearch } = load('element/ViewSearch.js', {
	document,
	HTMLElement: class { attachShadow() { return {}; } },
	require: module => {
		if (module.includes('hashtags')) return hashtags;
		if (module.includes('FuzzyMatcher')) return fuzzy;
		return {};
	}
});

test('selected hashtags filter events exactly and combine with text and rating', () => {
	const view = new ViewSearch();
	view.selectedHashtags = ['wasser', 'FREUNDE'];
	view.stars = 4;
	assert.deepEqual(Array.from(view.hits('Ausflug'), hit => hit.item.id), [1]);
	view.selectedHashtags = ['wass'];
	assert.equal(view.hits('').length, 0);
	view.selectedHashtags = ['WASSER'];
	assert.deepEqual(Array.from(view.hits(''), hit => hit.item.id), [3, 1]);
});
