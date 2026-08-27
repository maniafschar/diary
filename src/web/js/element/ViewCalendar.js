import { InputDate } from "./InputDate";

export { ViewCalendar };

class ViewCalendar extends HTMLElement {
	static MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
	static WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
	events = {};
	today = new Date();
	current = { year: this.today.getFullYear(), month: this.today.getMonth() };
	_activeDate = null;
	open = null;

	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}
	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
*, *::before, *:::after { box-sizing: border-box; margin: 0; padding: 0; }

:host(*) {
	font-family: Comfortaa;
	text-align: left;
	display: block;
	height: 100%;
}

*::-webkit-scrollbar {
	display: none;
}

.calendar-wrapper {
	width: 100%;
	height: 100%;
}

.cal-header {
	display: block;
	position: relative;
	text-align: center;
	height: 3em;
}

.cal-title {
	position: relative;
	display: inline-block;
	padding-top: 1.5em;
	cursor: pointer;
}

button {
	background: rgba(100, 150, 200, 0.2);
	border: none;
	padding: 0.5em 1em;
	border-radius: 1em;
	outline: none;
	cursor: pointer;
	font: inherit;
	margin: 0 0.5em;
	font-size: 1em;
	height: 2em;
	color: white;
	line-height: 1;
	z-index: 2;
}
	
button.icon {
	position: absolute;
	font-size: 1.3em;
	width: 2em;
	padding: 0;
	top: 0;
}

.cal-grid-outer {
	overflow: hidden;
	height: calc(100% - 3em);
}

.cal-weekdays {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	height: 1.5em;
}

.cal-weekday {
	font-size: 0.8em;
	width: 14.25vw;
	border-right: 1px solid rgba(0, 0, 0, 0.02);
}
	
.cal-weekday span {
	padding: 0.3em 0 0 0.25em;
}

.cal-weekday.weekend { color: #8b4513; }

.cal-days {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	height: calc(100% - 1.5em);
}

.cal-day {
	min-height: 12vh;
	border-right: 1px solid rgba(0, 0, 0, 0.02);
	cursor: pointer;
	transition: background .12s;
	position: relative;
	display: flex;
	flex-direction: column;
	width: 14.25vw;
	font-size: 0.8em;
	min-height: 5em;
}

.cal-day:nth-child(7n),
.cal-weekday:nth-child(7n) {
	border-right: none;
}

.cal-day:hover:not(.empty) {
	background: #f0ebe2;
}

.cal-day.empty {
	background: #faf8f4;
	cursor: default;
}

.day-num {
	display: block;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	position: relative;
	padding: 0.2em;
	background: rgba(0, 0, 0, 0.02);
}
	
.day-num span {
	font-size: 0.7em;
	margin-left: 0.4em;
}

.cal-day.other-month>div {
	opacity: 0.3;
}

.cal-day.today .day-num {
	font-weight: bold;
	background: rgba(255, 200, 50, 0.1);
}

.cal-day.weekend .day-num {
	color: #8b4513;
}

.event-list {
	overflow-x: hidden;
	overflow-y: auto;
	height: calc(100% - 1em);
	position: relative;
	display: block;
}

.event-pill {
	padding: 0.3em;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	cursor: pointer;
	position: relative;
}

.event-pill::after {
	content: ' ';
	position: absolute;
	right: 0;
	top: 0.5em;
	width: 0.8em;
	height: 0.8em;
	border-radius: 50% 0 0 50%;
}

.event-pill.rank80::after {
	background: rgba(255, 223, 0, 0.8);
}

.event-pill.rank60::after {
	background: rgba(192, 192, 192, 0.6);
}

.event-pill.rank40::after {
	background: rgba(235, 147, 80, 0.4);
}

.event-pill.rank20::after {
	background: rgba(235, 147, 80, 0.25);
}

.event-pill.rank0::after {
	background: rgba(235, 147, 80, 0.1);
}`;
		var wrapper = document.createElement('div');
		wrapper.classList.add('calendar-wrapper');

		//Header
		var header = wrapper.appendChild(document.createElement('div'));
		header.classList.add('cal-header');
		var button = header.appendChild(document.createElement('button'));
		button.classList.add('icon');
		button.onclick = () => {
			this.current.month--;
			if (this.current.month < 0) {
				this.current.month = 11;
				this.current.year--;
			}
			this.render();
		};
		button.innerText = '<';
		button.style.left = 0;
		button = header.appendChild(document.createElement('button'));
		button.classList.add('icon');
		button.onclick = () => {
			this.current.month++;
			if (this.current.month > 11) {
				this.current.month = 0;
				this.current.year++;
			}
			this.render();
		};
		button.innerText = '>';
		button.style.right = 0;
		var title = header.appendChild(document.createElement('div'));
		title.classList.add('cal-title');
		title.onclick = () => {
			this.current = { year: this.today.getFullYear(), month: this.today.getMonth() };
			this.render();
		};

		//body
		var body = wrapper.appendChild(document.createElement('div'));
		body.classList.add('cal-grid-outer');
		var div = body.appendChild(document.createElement('div'));
		div.classList.add('cal-weekdays');
		div = body.appendChild(document.createElement('div'));
		div.classList.add('cal-days');
		this._root.appendChild(wrapper);
		this.render();
	}

	setOpen(open) {
		this.open = open;
	}

	addEvent(dateKey, event) {
		if (!event.name)
			throw 'No name in event!';
		if (!this.events[dateKey])
			this.events[dateKey] = [];
		this.events[dateKey].push(event);
	}

	render() {
		const { year, month } = this.current;
		this._root.querySelector('.cal-title').innerHTML =
			`${ViewCalendar.MONTHS_DE[month]} <span>${year}</span>`;
		var bankholidays = InputDate.bankholidays(year);
		const wdEl = this._root.querySelector('.cal-weekdays');
		if (!wdEl.children.length) {
			ViewCalendar.WEEKDAYS.forEach((d, i) => {
				const el = document.createElement('div');
				el.className = 'cal-weekday' + (i >= 5 ? ' weekend' : '');
				el.appendChild(document.createElement('span')).textContent = d;
				wdEl.appendChild(el);
			});
		}

		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const totalDays = lastDay.getDate();
		let startOffset = (firstDay.getDay() + 6) % 7;
		const prevLast = new Date(year, month, 0).getDate();

		const daysEl = this._root.querySelector('.cal-days');
		daysEl.innerHTML = '';

		for (let i = startOffset - 1; i >= 0; i--)
			daysEl.appendChild(this.createDayCell(year, month - 1, prevLast - i, true, bankholidays));

		for (let d = 1; d <= totalDays; d++)
			daysEl.appendChild(this.createDayCell(year, month, d, false, bankholidays));

		const filled = startOffset + totalDays;
		const remaining = filled % 7 === 0 ? 0 : 7 - (filled % 7);
		for (let d = 1; d <= remaining; d++)
			daysEl.appendChild(this.createDayCell(year, month + 1, d, true, bankholidays));
	}

	createDayCell(year, month, day, otherMonth, bankholidays) {
		const date = new Date(year, month, day);
		const y = date.getFullYear();
		const m = date.getMonth();
		const d = date.getDate();
		const dow = date.getDay(); // 0=So, 6=Sa
		const isWeekend = dow === 0 || dow === 6;
		const isToday = y === this.today.getFullYear() && m === this.today.getMonth() && d === this.today.getDate();
		const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

		const cell = document.createElement('div');
		cell.className = ['cal-day',
			otherMonth ? 'other-month' : '',
			isToday ? 'today' : '',
			isWeekend ? 'weekend' : ''
		].filter(Boolean).join(' ');

		const numEl = document.createElement('div');
		numEl.className = 'day-num';
		numEl.textContent = d;
		if (bankholidays[d + '.' + (m + 1)])
			numEl.appendChild(document.createElement('span')).innerText = bankholidays[d + '.' + (m + 1)];
		cell.appendChild(numEl);

		const dayEvents = this.events[dateKey] || [];
		if (dayEvents.length) {
			const list = document.createElement('div');
			list.className = 'event-list';
			dayEvents.forEach(ev => {
				const pill = document.createElement('div');
				pill.className = 'event-pill'
				if (ev.rating) {
					if (ev.rating > 80)
						pill.classList.add('rank80');
					else if (ev.rating > 60)
						pill.classList.add('rank60');
					else if (ev.rating > 40)
						pill.classList.add('rank40');
					else if (ev.rating > 20)
						pill.classList.add('rank20');
					else
						pill.classList.add('rank0');
				}
				pill.textContent = ev.name;
				pill.addEventListener('click', e => {
					e.stopPropagation();
					if (this.open)
						this.open(ev);
					else
						alert(JSON.stringify(ev));
				});
				list.appendChild(pill);
			});
			cell.appendChild(list);
		}
		cell.addEventListener('click', () => this.open({ day: d, month: m + 1, year: y }));
		return cell;
	}

	reset() {
		this.events = {};
	}
}
