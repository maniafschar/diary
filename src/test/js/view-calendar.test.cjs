const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const babel = require('@babel/core');

class Element {
	constructor(tagName) {
		this.tagName = tagName;
		this.children = [];
		this.style = {};
		this.attributes = {};
		this.handlers = {};
		this.classList = { add: name => { this.className += ' ' + name; } };
	}
	appendChild(child) { child.parent = this; this.children.push(child); return child; }
	setAttribute(name, value) { this.attributes[name] = value; }
	addEventListener(type, handler) { this.handlers[type] = handler; }
	click() {
		this.handlers.click?.();
		this.parent?.click();
	}
}

const source = fs.readFileSync(path.join(__dirname, '../../web/js/element/ViewCalendar.js'), 'utf8');
const code = babel.transformSync(source, {
	presets: [['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }]]
}).code;
const moduleExports = {};
vm.runInNewContext(code, {
	exports: moduleExports,
	require: () => ({}),
	document: { createElement: tagName => new Element(tagName) },
	HTMLElement: class { attachShadow() { return {}; } }
});

function day(events) {
	const calendar = new moduleExports.ViewCalendar();
	events.forEach(event => calendar.addEvent('2026-01-02', event));
	const cell = calendar.createDayCell(2026, 0, 2, false, {});
	return { calendar, cell };
}

test('shows a weighted daily rating in the header and time and place in entries', () => {
	const { cell } = day([
		{ name: '09:30 Berlin', rating: 100, ratingCount: 1 },
		{ name: '12:00 Hamburg', rating: 60, ratingCount: 3 },
		{ name: '15:00 Köln', rating: 0, ratingCount: 0 }
	]);
	const header = cell.children[0];
	const badge = header.children[1];
	assert.equal(badge.className, 'day-rating');
	assert.equal(badge.title, 'Ø 2 Sterne');
	assert.ok(Math.abs(parseFloat(badge.style.background.slice(4)) - 60.8) < 0.001);
	assert.match(badge.innerHTML, /M7 15 H17/);
	assert.deepEqual(cell.children[1].children.map(entry => entry.textContent),
		['09:30 Berlin', '12:00 Hamburg', '15:00 Köln']);
	assert.ok(cell.children[1].children.every(entry => entry.className === 'event-pill'));
});

test('shows distinct monochrome expressions for low and high ratings and none without ratings', () => {
	const low = day([{ name: '08:00 A', rating: 0, ratingCount: 1 }]).cell.children[0].children[1];
	const high = day([{ name: '08:00 A', rating: 100, ratingCount: 1 }]).cell.children[0].children[1];
	assert.match(low.innerHTML, /M7 16 Q12 11 17 16/);
	assert.match(high.innerHTML, /M7 14 Q12 19 17 14/);
	assert.equal(day([{ name: '08:00 A', rating: 0, ratingCount: 0 }]).cell.children[0].children.length, 1);
});

test('a day click supplies every entry, including unrated ones, and empty days remain selectable', () => {
	const { calendar, cell } = day([
		{ index: 4, name: '09:30 Berlin', rating: 80, ratingCount: 1 },
		{ index: 2, name: '12:00 Hamburg', rating: 0, ratingCount: 0 }
	]);
	let selected;
	calendar.setOpenDetail(value => { selected = value; });
	cell.children[1].children[0].click();
	assert.deepEqual(Array.from(selected.events, event => event.index), [4, 2]);
	assert.equal(selected.day, 2);
	assert.equal(selected.month, 1);
	assert.equal(selected.year, 2026);
	calendar.createDayCell(2026, 0, 3, false, {}).click();
	assert.equal(selected.events.length, 0);
});
