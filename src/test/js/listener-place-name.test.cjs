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
const api = {};
const dialogModule = {};
const ui = { formatTime: () => 'Datum' };
const window = { addEventListener() {} };
const CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options?.detail; } };
vm.runInNewContext(code, {
	exports: moduleExports,
	require: module => module === './ui' ? { ui } : module === './api' ? { api } : module === './dialog' ? dialogModule : {},
	document, window, CustomEvent
});
const dialogCode = babel.transformSync(fs.readFileSync(path.join(__dirname, '../../web/js/dialog.js'), 'utf8'), {
	presets: [['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }]]
}).code;
vm.runInNewContext(dialogCode, {
	exports: dialogModule,
	require: module => module === './ui' ? { ui } : module === './api' ? { api } : module === './listener' ? moduleExports : {},
	document, CustomEvent
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
	dialogModule.dialog.highlightStatisticNote(note, 'Alten, alter und älterer Alten.\n<test>',
		['Alten', 'alter']);
	assert.deepEqual(note.children.map(node => [node.tagName || 'text', node.textContent]), [
		['text', ''], ['b', 'Alten'], ['text', ', '], ['b', 'alter'],
		['text', ' und älterer '], ['b', 'Alten'], ['text', '.\n<test>']
	]);
});

test('highlights complete phrases and escapes regex characters', () => {
	const note = { children: [], appendChild(child) { this.children.push(child); return child; } };
	dialogModule.dialog.highlightStatisticNote(note, 'Neue, Planung und Neue Planung. C++',
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
		{ id: 10, date: '2026-01-01', location: { name: '' }, note: 'Alten.', eventImages: [] },
		{ id: 11, date: '2026-01-02', location: { name: '' }, note: 'alter.', eventImages: [] }
	] });
	let popup;
	document.dispatchEvent = event => { popup = event; };
	try {
		dialogModule.dialog.eventList({
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

test('the day popup uses its date as heading and lists all supplied entries without highlighting it', () => {
	const createElement = tagName => ({
		tagName, children: [], classList: { add() {} },
		appendChild(child) { this.children.push(child); return child; },
		setAttribute() {}, addEventListener() {}
	});
	const originalCreateElement = document.createElement;
	document.createElement = createElement;
	document.querySelector = () => ({ list: [
		{ id: 10, date: '2026-01-02', location: { name: 'Berlin' }, note: '2.1.2026', eventImages: [] },
		{ id: 11, date: '2026-01-02', location: { name: 'Hamburg' }, note: 'Unbewertet', eventImages: [] }
	] });
	let popup;
	document.dispatchEvent = event => { popup = event; };
	try {
		dialogModule.dialog.eventList({ detail: { dateLabel: '2.1.2026', ids: [0, 1] } });
		const body = popup.detail.body;
		assert.equal(body.children.find(child => child.tagName === 'word').textContent, '2.1.2026');
		const list = body.children.find(child => child.tagName === 'list');
		const notes = list.children.filter(child => child.tagName === 'value').map(value => value.children[0]);
		assert.deepEqual(notes.map(note => note.textContent), ['2.1.2026', 'Unbewertet']);
	} finally {
		document.createElement = originalCreateElement;
	}
});

test('calendar and statistics open the moved dialog and empty days still add events', () => {
	let calendarOpen, statisticsOpen, opened, added;
	const originalEventList = dialogModule.dialog.eventList;
	const originalAdd = dialogModule.dialog.add;
	dialogModule.dialog.eventList = event => { opened = event; };
	dialogModule.dialog.add = day => { added = day; };
	const table = { columns: [1], renderTable() {}, setStyle() {} };
	const calendar = { reset() {}, setOpenDetail(callback) { calendarOpen = callback; }, addEvent() {}, render() {} };
	const statistics = { addEventListener(type, callback) { if (type === 'details') statisticsOpen = callback; } };
	const elements = {
		'element.login input': {}, 'element.login input-password': { reset() {} },
		'element.login input-checkbox[name="login"]': { setAttribute() {} },
		'body navigation': { classList: { add() {} } },
		'body navigation [name="clientName"]': { style: {} },
		'event view-table': table, 'view-calendar': calendar, 'view-statistics': statistics,
		'view-map': { setLocations() {}, setOpenDetail() {} },
		'view-table': { _root: { querySelectorAll: () => [] } },
		'element.event div.title count': {}, 'element.event': { style: {} },
		'element.login': { style: {} }, 'view-image': { style: {} },
		'user view-table': { setStyle() {}, table: () => ({ querySelector: () => ({ childElementCount: 1 }) }) },
		'view-chat': { parentElement: { addEventListener() {} } },
		'view-search': { addEventListener() {}, parentElement: { addEventListener() {} } }
	};
	document.querySelector = selector => elements[selector];
	document.querySelectorAll = () => [];
	document.addEventListener = () => {};
	api.user = { id: 1 };
	api.event = { getList: callback => callback([
		{ id: 10, date: '2026-01-02', location: { name: 'Berlin' }, eventImages: [] }
	]) };
	api.activateProgressbar = () => {};
	try {
		moduleExports.listener.init();
		const detail = { detail: { text: 'Berlin', ids: [0] } };
		statisticsOpen(detail);
		assert.equal(opened, detail);
		moduleExports.listener.updateEvents();
		calendarOpen({ day: 2, month: 1, year: 2026, events: [{ index: 0 }] });
		assert.equal(opened.detail.dateLabel, '2.1.2026');
		assert.deepEqual(Array.from(opened.detail.ids), [0]);
		const emptyDay = { day: 3, events: [] };
		calendarOpen(emptyDay);
		assert.equal(added, emptyDay);
	} finally {
		dialogModule.dialog.eventList = originalEventList;
		dialogModule.dialog.add = originalAdd;
	}
});

test('each popup entry opens its own event and background opens the first', () => {
	const createElement = tagName => ({
		tagName, children: [], handlers: {}, classList: { add() {} },
		appendChild(child) { this.children.push(child); return child; },
		setAttribute() {}, addEventListener(type, handler) { this.handlers[type] = handler; }
	});
	document.createElement = createElement;
	document.querySelector = () => ({ list: [
		{ id: 10, date: '2026-01-01', location: { name: '' }, eventImages: [] },
		{ id: 11, date: '2026-01-02', location: { name: '' }, eventImages: [] }
	] });
	let popup, selected, stopped = false;
	document.dispatchEvent = event => { popup = event; };
	const originalUpdate = moduleExports.listener.updateViewImage;
	moduleExports.listener.updateViewImage = id => { selected = id; };
	try {
		dialogModule.dialog.eventList({ detail: { ids: [0, 1], dateLabel: 'Datum' } });
		const body = popup.detail.body;
		const values = body.children.find(child => child.tagName === 'list').children.filter(child => child.tagName === 'value');
		values[0].handlers.click({ stopPropagation() { stopped = true; } });
		assert.equal(selected, 10);
		assert.equal(stopped, true);
		assert.equal(popup.type, 'popup');
		assert.equal(popup.detail, undefined);
		values[1].handlers.click({ stopPropagation() {} });
		assert.equal(selected, 11);
		body.handlers.click();
		assert.equal(selected, 10);
	} finally {
		moduleExports.listener.updateViewImage = originalUpdate;
	}
});
