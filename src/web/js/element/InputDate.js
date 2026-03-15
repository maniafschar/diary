export { InputDate };

class InputDate extends HTMLElement {
	ignoreCallback = false;
	occupied = {};
	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}
	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
:host(*) {
	white-space: nowrap;
	overflow-x: auto;
	display: inline-block;
	width: 100%;
}
hint {
	display: grid;
	grid-template-rows: 0fr;
	transition: grid-template-rows 0.4s ease-out;
}
hint.open {
	grid-template-rows: 1fr;
}
hint>div {
	position: relative;
	overflow: hidden;
	text-align: center;
	background: rgba(0, 0, 255, 0.05);
    border-radius: 0.5em;
}
hint>div>div {
	padding: 1em 0;
}
cell {
	margin-bottom: 0;
	width: 2em;
	text-align: center;
	padding: 0.34em 0;
	display: inline-block;
	cursor: pointer;
	z-index: 2;
	position: relative;
	border-radius: 0.5em;
}
cell[name] {
	width: initial;
	padding: 0.4em 0.15em;
}
cell.title {
	font-weight: bold;
}
cell.filled {
	opacity: 1;
}
cell.edit {
	font-weight: bold;
}
cell.weekday {
	background: transparent;
	padding: 0;
	cursor: default;
}
cell.weekend {
	color: rgb(0,0,100);
}
cell.outdated {
	opacity: 0.4;
	cursor: default;
}
cell.occupied {
	text-decoration: underline;
}
cell.holiday {
	color: rgb(200, 100, 80);
}
cell.selected {
	background-color: rgba(255, 255, 255, 0.6);
}
prev,
next {
	position: absolute;
	width: 1.5em;
	font-size: 2em;
	z-index: 2;
	top: 0;
	padding: 0 0.1em;
	color: rgba(255, 255, 255, 0.4);
	cursor: pointer;
	line-height: 1;
}
prev {
	left: 0;
	text-align: left;
}
prev::after {
	content: '<';
	}
next {
	right: 0;
	text-align: right;
}
next::after {
	content: '>';
}`;
		var element = document.createElement('cell');
		element.setAttribute('onclick', 'this.getRootNode().host.openDay()');
		element.setAttribute('name', 'day');
		this._root.appendChild(element);
		element = document.createElement('cell')
		element.setAttribute('onclick', 'this.getRootNode().host.openMonth()');
		element.setAttribute('name', 'month');
		this._root.appendChild(element);
		element = document.createElement('cell')
		element.setAttribute('onclick', 'this.getRootNode().host.openYear()');
		element.setAttribute('name', 'year');
		this._root.appendChild(element);
		if (this.getAttribute('type') != 'date') {
			element = document.createElement('cell')
			element.setAttribute('onclick', 'this.getRootNode().host.openHour()');
			element.setAttribute('name', 'hour');
			element.style.marginLeft = '0.5em';
			this._root.appendChild(element);
			element = document.createElement('cell')
			element.setAttribute('onclick', 'this.getRootNode().host.openMinute()');
			element.setAttribute('name', 'minute');
			this._root.appendChild(element);
		}
		element = document.createElement('cell')
		element.setAttribute('name', 'hint');
		element.style.fontSize = '0.8em';
		element.style.position = 'absolute';
		element.style.left = '12em';
		element.style.right = '0.5em';
		element.style.overflow = 'hidden';
		element.style.textOverflow = 'ellipsis';
		element.style.top = '1em';
		element.style.textAlign = 'left';
		element.style.cursor = 'default';
		this._root.appendChild(element);
		this._root.appendChild(document.createElement('hint')).appendChild(document.createElement('div')).appendChild(document.createElement('div'));
		this.select(this.getAttribute('value') ? InputDate.server2local(this.getAttribute('value')) : new Date());
	}
	static get observedAttributes() { return ['min', 'max', 'value']; }
	attributeChangedCallback(name, oldValue, newValue) {
		if (!this.ignoreCallback && oldValue != newValue)
			this.select(this.getAttribute('value') ? InputDate.server2local(this.getAttribute('value'))
				: this.getAttribute('min') ? new Date(this.getAttribute('min')) : new Date());
	}
	get(name) {
		return this._root.querySelector('cell[name="' + name + '"]');
	}
	createCalendar() {
		var month = this.get('month').getAttribute('value');
		var year = this.get('year').getAttribute('value');
		var day = this.get('day').getAttribute('value');
		var maxDays = 31;
		var min = this.min();
		var max = this.max();
		if (!year) {
			if (max < new Date())
				this.selectYear(max.getFullYear() - 1);
			else
				this.selectYear(min.getFullYear());
			year = this.get('year').getAttribute('value');
		}
		if (!month) {
			this.selectMonth((max < new Date() ? max : min).getMonth() + 1);
			month = this.get('month').getAttribute('value');
		}
		if (month == '02')
			maxDays = year && new Date(parseInt(year), 1, 29).getDate() == 29 ? 29 : 28;
		else if (month == '04' || month == '06' || month == '09' || month == '11')
			maxDays = 30;
		var s = '', weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
		for (var i = 0; i < 7; i++)
			s += `<cell class="title weekday${i < 5 ? '' : ' weekend'}">${weekdays[i]}</cell>`;
		s += `<br/>`;
		var offset = (new Date(parseInt(year), parseInt(month) - 1, 1).getDay() + 6) % 7;
		for (var i = 0; i < offset; i++)
			s += `<cell class="weekday">&nbsp;</cell>`;
		var outdated, selectable = this.getAttribute('selectable');
		var maxMonth = parseInt(year) == max.getFullYear() && parseInt(month) == max.getMonth() + 1;
		var minMonth = parseInt(year) == min.getFullYear() && parseInt(month) == min.getMonth() + 1;
		var holidays = InputDate.bankholidays(parseInt(year));
		for (var i = 1; i <= maxDays; i++) {
			outdated = maxMonth ? i > max.getDate() : minMonth ? i < min.getDate() : false;
			if (!outdated && selectable)
				outdated = selectable.indexOf(year + '-' + month + '-' + ('0' + i).slice(-2)) < 0;
			var c = outdated ? 'outdated' : '';
			if ((i + offset) % 7 == 0 || (i + offset) % 7 == 6)
				c += ' weekend';
			if (i == day)
				c += ' selected';
			if (holidays[i + '.' + parseInt(month)])
				c += ' holiday';
			if (this.occupied[i + '.' + parseInt(month) + '.' + year])
				c += ' occupied';
			s += `<cell ${outdated ? '' : `onclick="this.getRootNode().host.selectDay(${i},true)"`}${c ? ' class="' + c.trim() + '"' : ''}>${i}</cell>`;
			if ((i + offset) % 7 == 0)
				s += '<br/>';
		}
		for (var i = (new Date(parseInt(year), parseInt(month) - 1, maxDays).getDay() + 6) % 7; i < 6; i++)
			s += `<cell class="weekday">&nbsp;</cell>`;
		s += `<prev onclick="this.getRootNode().host.prevMonth(event)"></prev>`;
		s += `<next onclick="this.getRootNode().host.nextMonth(event)"></next>`;
		return s;
	}
	nextMonth(event) {
		event.stopPropagation();
		var m = parseInt(this.get('month').getAttribute('value')) + 1;
		var y = parseInt(this.get('year').getAttribute('value'));
		if (m > 12) {
			++y;
			m = 1;
		}
		var max = this.max();
		if (y <= max.getFullYear() && (y != max.getFullYear() || m <= max.getMonth() + 1)) {
			this.selectYear(y);
			this.selectMonth(m);
			this._root.querySelector('hint>div>div').innerHTML = this.createCalendar();
			this.get('day').classList.add('edit');
		}
	}
	prevMonth(event) {
		event.stopPropagation();
		var m = parseInt(this.get('month').getAttribute('value')) - 1;
		var y = parseInt(this.get('year').getAttribute('value'));
		if (m < 1) {
			--y;
			m = 12;
		}
		var min = this.min();
		if (y >= min.getFullYear() && (y != min.getFullYear() || m >= min.getMonth() + 1)) {
			this.selectYear(y);
			this.selectMonth(m);
			this._root.querySelector('hint>div>div').innerHTML = this.createCalendar();
			this.get('day').classList.add('edit');
		}
	}
	resetDay() {
		if (this.get('year')) {
			var min = this.min(), max = this.max();
			var d = new Date(this.get('year').getAttribute('value') + '-' + this.get('month').getAttribute('value') + '-' + this.get('day').getAttribute('value'));
			this.selectDay(min > d ? min.getDate() : d > max ? max.getDate() : d.getDate() != parseInt(this.get('day').getAttribute('value')) ?
				new Date(parseInt(this.get('year').getAttribute('value')), parseInt(this.get('month').getAttribute('value')), 0).getDate() : d.getDate());
		}
	}
	resetMonth() {
		if (this.get('year')) {
			var min = this.min(), max = this.max();
			var d = new Date(this.get('year').getAttribute('value') + '-' + (this.get('month').getAttribute('value') ? this.get('month').getAttribute('value') : '01') + '-' + this.get('day').getAttribute('value'));
			this.selectMonth((min > d ? min.getMonth() : d > max ? max.getMonth() : d.getMonth()) + 1);
		}
	}
	resetYear() {
		if (this.get('year')) {
			var min = this.min(), max = this.max();
			var d = new Date(this.get('year').getAttribute('value') + '-' + this.get('month').getAttribute('value') + '-' + this.get('day').getAttribute('value'));
			this.selectYear(min > d ? min.getFullYear() : d > max ? max.getFullYear() : d.getFullYear());
		}
	}
	select(date) {
		var d = InputDate.dateFields(date);
		this.selectYear(d.year);
		this.selectMonth(d.month);
		this.selectDay(d.day);
		this.selectHour(d.hour);
		this.selectMinute(d.minute);
	}
	selectDay(i, next) {
		var hint = this.get('hint')?.innerText;
		this.setValue('Day', i ? ('0' + i).slice(-2) : null, parseInt(i));
		if (next && (!this.get('hint').innerText || hint == this.get('hint').innerText))
			this.openHour();
		else {
			this._root.querySelector('hint cell.selected')?.classList.remove('selected');
			this._root.querySelector('hint cell[onclick*="(' + i + ',"]')?.classList.add('selected');
		}
	}
	selectHour(i, next) {
		this.setValue('Hour', i >= 0 ? ('0' + i).slice(-2) : null, parseInt(i));
		if (next)
			this.openMinute();
	}
	selectMinute(i, close) {
		i = parseInt(i);
		if (i > 0) {
			var step = this.getAttribute('minuteStep');
			step = step ? parseInt(step) : 5;
			i += step - 1;
			i = parseInt(i / step) * step;
			if (i == 60) {
				var hour = parseInt(this.get('hour')?.getAttribute('value') || new Date().getHours()) + 1;
				if (hour > 24) {
					var date = new Date();
					date.setHours(date.getHours() + 1);
					this.select(date.toISOString());
				} else {
					this.selectHour(hour);
					i = 0;
				}
			}
		}
		this.setValue('Minute', i >= 0 ? ('0' + i).slice(-2) : null);
		if (close)
			this.closeHint();
	}
	selectMonth(i, next) {
		if (i)
			this.setValue('Month', ('0' + i).slice(-2), '' + parseInt(i));
		else
			this.setValue('Month', null);
		this.resetDay();
		if (next)
			this.openYear();
	}
	selectYear(i, next) {
		this.setValue('Year', i);
		this.resetMonth();
		this.resetDay();
		if (next && this.get('hour'))
			this.openHour();
	}
	setValue(field, value, cell) {
		this._root.querySelectorAll('.edit').forEach(e => e.classList.remove('edit'));
		var e = this.get(field.toLowerCase());
		if (!e)
			return;
		if (value) {
			e.innerText = cell || cell == 0 ? cell : value;
			e.setAttribute('value', value);
			e.classList.add('filled');
		} else {
			e.innerText = field;
			e.setAttribute('value', '');
			e.classList.remove('filled');
		}
		var s = this.get('year').getAttribute('value');
		s += '-' + this.get('month').getAttribute('value');
		s += '-' + this.get('day').getAttribute('value');
		if (this.get('hour')) {
			s += 'T' + this.get('hour').getAttribute('value');
			s += ':' + this.get('minute').getAttribute('value');
			s += ':00';
		}
		if (s.indexOf('null') < 0) {
			var date = new Date(s);
			this.ignoreCallback = true;
			this.setAttribute('value', date.getUTCFullYear() + '-' + ('0' + (date.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + date.getUTCDate()).slice(-2) + 'T'
				+ ('0' + date.getUTCHours()).slice(-2) + ':' + ('0' + date.getUTCMinutes()).slice(-2) + ':00');
			this.ignoreCallback = false;
			this.get('hint').innerText = InputDate.bankholidays(date.getFullYear())[date.getDate() + '.' + (date.getMonth() + 1)] || '';
		}
	}
	openHint(html, field) {
		this._root.querySelectorAll('.edit').forEach(e => e.classList.remove('edit'));
		var e = this._root.querySelector('hint');
		if (e.classList.contains('open') && e.getAttribute('i') == field)
			this.closeHint();
		else {
			e.querySelector('div>div').innerHTML = html;
			e.classList.add('open');
			e.setAttribute('i', field);
			this.get(field).classList.add('edit');
		}
	}
	closeHint() {
		this._root.querySelector('hint').classList.remove('open');
	}
	openDay() {
		this.openHint(this.createCalendar(), 'day');
	}
	openHour() {
		var s = '', hour = this.get('hour').getAttribute('value');
		for (var i = 0; i < 24; i++) {
			s += `<cell onclick="this.getRootNode().host.selectHour(${i},true)" class="time${hour == i ? ' selected' : ''}">${i}</cell>`;
			if ((i + 1) % 4 == 0)
				s += '<br/>';
		}
		this.openHint(s, 'hour');
	}
	openMinute() {
		var s = '', step = this.getAttribute('minuteStep'), minute = this.get('minute').getAttribute('value');
		step = step ? parseInt(step) : 5;
		for (var i = 0; i < 60; i += step) {
			s += `<cell onclick="this.getRootNode().host.selectMinute(${i},true)" class="time${minute == i ? ' selected' : ''}">${i}</cell>`;
			if ((i / 5 + 1) % 4 == 0)
				s += '<br/>';
		}
		this.openHint(s, 'minute');
	}
	openMonth() {
		var min = this.min(), max = this.max(), month = this.get('month').getAttribute('value');
		var year = this.get('year').getAttribute('value');
		if (!year) {
			this.selectYear((max < new Date() ? max : min).getFullYear());
			year = this.get('year').getAttribute('value');
		}
		min = parseInt(year) == min.getFullYear() ? min.getMonth() + 1 : 1;
		max = parseInt(year) == max.getFullYear() ? max.getMonth() + 1 : 13;
		var s = '<style>cell:not([name]){padding:0.34em 0.75em;}</style>';
		for (var i = 1; i < 13; i++) {
			s += `<cell onclick="this.getRootNode().host.selectMonth(${i},true)"${month == i ? ' class="selected"' : i < min || i > max ? ' class="outdated"' : ''}>${i}</cell>`;
			if (i % 3 == 0)
				s += '<br/>';
		}
		this.openHint(s, 'month');
	}
	openYear() {
		var s = '<style>cell:not([name]){padding:0.34em 0;width:3.5em;text-align:center;}cell.filler{opacity:0;cursor:default;}</style>';
		var min = this.min().getFullYear(), max = this.max().getFullYear();
		var desc = min < new Date().getFullYear(), year = this.get('year').getAttribute('value');
		var maxPerRow = 5;
		if (max - min > maxPerRow) {
			for (var i = maxPerRow - (desc ? max : min) % maxPerRow; i > 0; i--)
				s += `<cell class="filler"></cell>`;
		}
		for (var i = 0; i <= max - min; i++) {
			var i2 = desc ? max - i : min + i;
			if (i2 % maxPerRow == 0)
				s += '<br/>';
			s += `<cell onclick="this.getRootNode().host.selectYear(${i2},true)"${year == i2 ? 'class="selected"' : ''}>${i2}</cell>`;
		}
		if (max - min > maxPerRow) {
			for (var i = 0; i < (desc ? min - 1 : max + 1) % maxPerRow; i++)
				s += `<cell class="filler"></cell>`;
		}
		this.openHint(s, 'year');
	}
	max() {
		var max = this.getAttribute('max');
		if (max)
			return new Date(max);
		var date = new Date();
		date.setFullYear(date.getFullYear() + 1);
		return date;
	}
	min() {
		var min = this.getAttribute('min');
		return min ? new Date(min) : new Date();
	}
	addOccupied(date) {
		this.occupied[date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear()] = true;
	}
	static bankholidays(year) {
		var a = year % 19;
		var d = (19 * a + 24) % 30;
		var day = d + (2 * (year % 4) + 4 * (year % 7) + 6 * d + 5) % 7;
		if (day == 35 || (day == 34 && d == 28 && a > 10))
			day -= 7;

		var easter = new Date(year, 2, 22);
		// Die Zahl 86400000 nicht ausklammern, sonst gibt's Probleme bei der Typumwandlung !!
		easter.setTime(easter.getTime() + 86400000 * day);
		var convert = function (datla) {
			var date = new Date(easter.getTime());
			date.setDate(easter.getDate() + datla);
			return date.getDate() + '.' + (date.getMonth() + 1);
		};

		var holidays = {};
		holidays['1.1'] = 'Neujahr';
		holidays['6.1'] = 'Hl. 3 Koenige';
		holidays['1.5'] = 'Maifeiertag - Tag der Arbeit';
		holidays['15.8'] = 'Maria Himmelfahrt';
		holidays['3.10'] = 'Tag der Deutschen Einheit';
		holidays['31.10'] = 'Reformationstag';
		holidays['1.11'] = 'Allerheiligen';
		holidays['24.12'] = 'Weihnachten';
		holidays['25.12'] = '1. Weihnachtstag';
		holidays['26.12'] = '2. Weihnachtstag';
		holidays['31.12'] = 'Silvester';
		holidays[convert(-52)] = 'Weiberfastnacht';
		holidays[convert(-48)] = 'Rosenmontag';
		holidays[convert(-47)] = 'Fastnachtsdienstag';
		holidays[convert(-46)] = 'Aschermittwoch';
		holidays[convert(-3)] = 'Gründonnerstag';
		holidays[convert(-2)] = 'Karfreitag';
		holidays[convert(0)] = 'Ostersonntag';
		holidays[convert(1)] = 'Ostermontag';
		holidays[convert(39)] = 'Christi Himmelfahrt';
		holidays[convert(49)] = 'Pfingstsonntag';
		holidays[convert(50)] = 'Pfingstmontag';
		holidays[convert(60)] = 'Fronleichnam';
		return holidays;
	}
	static dateFields(date) {
		if (typeof date == 'number')
			date = new Date(date);
		if (date instanceof Date)
			return {
				year: date.getFullYear(),
				month: ('0' + (date.getMonth() + 1)).slice(-2),
				day: ('0' + date.getDate()).slice(-2),
				hour: ('0' + date.getHours()).slice(-2),
				minute: ('0' + date.getMinutes()).slice(-2),
				second: ('0' + date.getSeconds()).slice(-2),
				time: true
			};
		if (date.year && date.day)
			return date;
		if (date.indexOf('-') < 0 && date.length == 8)
			date = date.substring(0, 4) + '-' + date.substring(4, 6) + '-' + date.substring(6);
		var p1 = date.indexOf('-'), p2 = date.indexOf('-', p1 + 1), p3 = date.replace('T', ' ').indexOf(' '), p4 = date.indexOf(':'), p5 = date.indexOf(':', p4 + 1), p6 = date.indexOf('.');
		return {
			year: date.substring(0, p1),
			month: date.substring(p1 + 1, p2),
			day: date.substring(p2 + 1, p3 < 0 ? date.length : p3),
			hour: p4 < 0 ? 0 : date.substring(p3 + 1, p4),
			minute: p4 < 0 ? 0 : date.substring(p4 + 1, p5 > 0 ? p5 : date.length),
			second: p5 < 0 ? 0 : date.substring(p5 + 1, p6 < 0 ? date.length : p6),
			time: p4 > 0
		};
	}
	static server2local(date) {
		if (!date)
			return date;
		if (date instanceof Date)
			return date;
		date = this.dateFields(date);
		if (date.hour == 0 && date.minute == 0 && date.second == 0)
			return new Date(Date.UTC(date.year, parseInt(date.month) - 1, date.day));
		return new Date(Date.UTC(date.year, parseInt(date.month) - 1, date.day, date.hour, date.minute, date.second));
	}
	static local2server(date) {
		if (!date)
			return date;
		if (!(date instanceof Date)) {
			date = this.dateFields(date);
			date = new Date(date.year, parseInt(date.month) - 1, date.day, date.hour, date.minute, date.second);
			if (date.hour == 0 && date.minute == 0 && date.second == 0)
				return date.year + '-' + date.month + '-' + date.day;
		}
		date = date.toISOString();
		return date.substring(0, date.indexOf('.'));
	}
}