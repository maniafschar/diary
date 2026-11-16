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
vm.runInNewContext(code, { exports: moduleExports, require: () => ({}) });
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
