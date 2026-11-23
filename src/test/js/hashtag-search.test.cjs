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
const document = {
	querySelector: () => ({ list: events }),
	createTreeWalker: element => ({
		currentNode: null,
		nextNode() {
			if (this.currentNode)
				return false;
			this.currentNode = element.textNode;
			return true;
		}
	}),
	createDocumentFragment: () => ({ children: [], appendChild(node) { this.children.push(node); } }),
	createElement: tagName => ({ tagName, textContent: '' }),
	createTextNode: textContent => ({ textContent })
};
const { ViewSearch } = load('element/ViewSearch.js', {
	document,
	NodeFilter: { SHOW_TEXT: 4 },
	HTMLElement: class { attachShadow() { return {}; } },
	require: module => {
		if (module.includes('hashtags')) return hashtags;
		if (module.includes('FuzzyMatcher')) return fuzzy;
		if (module.includes('/ui')) return { ui: { formatTime: () => 'Datum' } };
		if (module.includes('/api')) return { api: {} };
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

test('text search matches hashtags with or without a leading hash', () => {
	const view = new ViewSearch();
	const expected = [3, 1];
	assert.deepEqual(Array.from(view.hits('freunde'), hit => hit.item.id), expected);
	assert.deepEqual(Array.from(view.hits('#freunde'), hit => hit.item.id), expected);
});

test('highlight includes the leading hash when matching a hashtag', () => {
	const view = new ViewSearch();
	const cell = {
		textNode: {
			nodeValue: '#freunde',
			parentElement: { closest: () => null },
			replaceWith(fragment) { cell.highlighted = fragment.children; }
		}
	};
	view.highlight(cell, fuzzy.FuzzyMatcher.terms('#freunde'));
	assert.deepEqual(Array.from(cell.highlighted, node => [node.tagName || 'text', node.textContent]), [
		['mark', '#freunde']
	]);
});

test('a hashtag button search highlights only the selected complete tags', () => {
	const view = new ViewSearch();
	view.input = { value: '' };
	view.selectedHashtags = ['FREUNDE', 'me-time'];
	view.clearResults = () => {};
	const event = { id: 4, note: 'freunde', hashtags: 'Freunde, me-time, wasser', date: '2026-01-01' };
	events.push(event);
	try {
		view.render = (hits, terms) => {
			view.terms = terms;
			assert.deepEqual(Array.from(hits, hit => hit.item.id), [4]);
			assert.equal(view.eventRow(hits[0])[1].text,
				'<note>freunde</note><note><mark>#Freunde</mark> <mark>#me-time</mark> #wasser</note>');
		};
		view.search();
	} finally {
		events.pop();
	}
});

test('text highlighting does not nest marks inside selected hashtags', () => {
	const view = new ViewSearch();
	const cell = {
		textNode: {
			nodeValue: '#Freunde',
			parentElement: { closest: selector => selector.split(', ').includes('mark') },
			replaceWith() { assert.fail('selected hashtag should remain marked'); }
		}
	};
	view.highlight(cell, fuzzy.FuzzyMatcher.terms('freunde'));
});
