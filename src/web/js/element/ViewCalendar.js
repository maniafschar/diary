import { InputDate } from "./InputDate";

export { ViewCalendar };

class ViewCalendar extends HTMLElement {
	static MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
	static WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
	events = {};
	today = new Date();
	current = { year: this.today.getFullYear(), month: this.today.getMonth() };
	_activeDate = null;
	openDetail = null;
	_monthsBefore = 3;
	_monthsAfter = 3;
	_scrollFrame = null;
	_firstMonth = 0;
	_lastMonth = 0;

	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}
	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

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
	position: relative;
}

.cal-months {
	display: block;
}

.cal-month {
	display: block;
}

.cal-month:not(.active) .cal-day:not(.empty) {
	filter: brightness(0.82);
}

.cal-sticky-header {
	position: sticky;
	top: 0;
	z-index: 3;
	background: var(--background-content, rgba(255, 255, 255, 0.96));
}

.cal-month-title {
	text-align: center;
	padding: 0.45em 0;
	background: linear-gradient(90deg, rgba(221, 243, 255, 0.96), rgba(255, 250, 247, 0.96));
	color: rgba(0, 0, 80, 0.75);
	font-size: 1.05em;
	font-weight: bold;
	line-height: 1;
}

.cal-grid-outer {
	overflow-x: hidden;
	overflow-y: auto;
	height: 100%;
	min-height: 0;
	-webkit-overflow-scrolling: touch;
	scroll-behavior: smooth;
	overscroll-behavior-y: contain;
	scrollbar-width: none;
}

.cal-weekdays {
	display: grid;
	grid-template-columns: repeat(7, minmax(0, 1fr));
	height: 1.5em;
}

.cal-weekday {
	font-size: 0.8em;
	min-width: 0;
	border-right: 1px solid rgba(0, 0, 0, 0.02);
}
	
.cal-weekday span {
	padding: 0.3em 0 0 0.25em;
}

.cal-weekday.weekend { color: #8b4513; }

.cal-days {
	display: grid;
	grid-template-columns: repeat(7, minmax(0, 1fr));
	grid-auto-rows: minmax(10rem, auto);
	align-items: stretch;
}

.cal-day {
	border-right: 1px solid rgba(0, 0, 0, 0.02);
	cursor: pointer;
	transition: background .12s;
	position: relative;
	display: flex;
	flex-direction: column;
	min-width: 0;
	font-size: 0.8em;
	min-height: 10rem;
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
	
.day-num span.holiday {
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

.cal-day.weekend:not(.empty) {
	background: rgba(139, 69, 19, 0.035);
}

.day-number {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 1.6em;
	min-height: 1.6em;
}

.cal-day.today .day-number {
	border-radius: 50%;
	background: rgba(255, 190, 40, 0.75);
	color: #4a3200;
}

.cal-day.has-events .day-num::after {
	content: '';
	position: absolute;
	left: 0.35em;
	bottom: 0.2em;
	width: 0.35em;
	height: 0.35em;
	border-radius: 50%;
	background: var(--background-clickable-highlight, rgba(0, 0, 120, 0.7));
}

.event-list {
	overflow: visible;
	height: auto;
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
		var body = wrapper.appendChild(document.createElement('div'));
		body.classList.add('cal-grid-outer');
		body.addEventListener('scroll', () => this.handleScroll(body), { passive: true });
		const stickyHeader = body.appendChild(document.createElement('div'));
		stickyHeader.className = 'cal-sticky-header';
		stickyHeader.appendChild(document.createElement('div')).className = 'cal-month-title';
		stickyHeader.appendChild(this.createWeekdays());
		body.appendChild(document.createElement('div')).classList.add('cal-months');
		this._root.appendChild(wrapper);
		this.render();
	}

	setOpenDetail(openDetail) {
		this.openDetail = openDetail;
	}

	addEvent(dateKey, event) {
		if (!event.name)
			throw 'No name in event!';
		if (!this.events[dateKey])
			this.events[dateKey] = [];
		this.events[dateKey].push(event);
	}

	render() {
		const months = this._root.querySelector('.cal-months');
		months.innerHTML = '';
		const todayMonth = this.monthNumber(this.today.getFullYear(), this.today.getMonth());
		const eventMonths = Object.keys(this.events)
			.map(dateKey => {
				const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(dateKey);
				return match ? this.monthNumber(Number(match[1]), Number(match[2]) - 1) : null;
			})
			.filter(month => month !== null);
		this._firstMonth = eventMonths.length ? Math.min(...eventMonths) : todayMonth;
		this._lastMonth = Math.max(todayMonth, eventMonths.length ? Math.max(...eventMonths) : todayMonth);

		const currentMonth = this.monthNumber(this.current.year, this.current.month);
		const startMonth = Math.max(this._firstMonth, currentMonth - this._monthsBefore);
		const endMonth = Math.min(this._lastMonth, currentMonth + this._monthsAfter);
		for (let monthNumber = startMonth; monthNumber <= endMonth; monthNumber++) {
			const date = this.monthDate(monthNumber);
			months.appendChild(this.createMonth(date.getFullYear(), date.getMonth()));
		}
		requestAnimationFrame(() => {
			this.scrollToMonth(this.current.year, this.current.month, false);
			this.updateActiveMonth(this._root.querySelector('.cal-grid-outer'));
		});
	}

	monthNumber(year, month) {
		return year * 12 + month;
	}

	monthDate(monthNumber) {
		return new Date(Math.floor(monthNumber / 12), monthNumber % 12, 1);
	}

	createWeekdays() {
		const weekdays = document.createElement('div');
		weekdays.className = 'cal-weekdays';
		ViewCalendar.WEEKDAYS.forEach((day, i) => {
			const weekday = weekdays.appendChild(document.createElement('div'));
			weekday.className = 'cal-weekday' + (i >= 5 ? ' weekend' : '');
			weekday.appendChild(document.createElement('span')).textContent = day;
		});
		return weekdays;
	}

	createMonth(year, month) {
		const monthEl = document.createElement('section');
		monthEl.className = 'cal-month';
		monthEl.dataset.year = year;
		monthEl.dataset.month = month;

		const days = monthEl.appendChild(document.createElement('div'));
		days.className = 'cal-days';
		const bankholidays = InputDate.bankholidays(year);
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startOffset = (firstDay.getDay() + 6) % 7;

		for (let i = startOffset - 1; i >= 0; i--)
			days.appendChild(this.createEmptyDayCell());
		for (let day = 1; day <= lastDay.getDate(); day++)
			days.appendChild(this.createDayCell(year, month, day, false, bankholidays));
		return monthEl;
	}

	handleScroll(container) {
		if (this._scrollFrame)
			return;
		this._scrollFrame = requestAnimationFrame(() => {
			this._scrollFrame = null;
			this.updateActiveMonth(container);
			if (container.scrollTop < 300)
				this.prependMonths(container, 3);
			else if (container.scrollHeight - container.scrollTop - container.clientHeight < 300)
				this.appendMonths(3);
			this.updateActiveMonth(container);
		});
	}

	updateActiveMonth(container) {
		const viewport = container.getBoundingClientRect();
		const header = container.querySelector('.cal-sticky-header');
		const top = Math.max(viewport.top, header.getBoundingClientRect().bottom);
		let activeMonth = null;
		container.querySelectorAll('.cal-month').forEach(month => {
			const rect = month.getBoundingClientRect();
			if (!activeMonth && rect.bottom > top)
				activeMonth = month;
			month.classList.remove('active');
		});
		if (!activeMonth)
			return;
		activeMonth.classList.add('active');
		header.querySelector('.cal-month-title').textContent =
			`${ViewCalendar.MONTHS_DE[Number(activeMonth.dataset.month)]} ${activeMonth.dataset.year}`;
	}

	prependMonths(container, count) {
		const months = this._root.querySelector('.cal-months');
		const first = months.firstElementChild;
		const firstMonth = this.monthNumber(Number(first.dataset.year), Number(first.dataset.month));
		const monthsToAdd = Math.min(count, firstMonth - this._firstMonth);
		if (!monthsToAdd)
			return;
		const oldHeight = container.scrollHeight;
		const fragment = document.createDocumentFragment();
		for (let i = monthsToAdd; i > 0; i--) {
			const date = this.monthDate(firstMonth - i);
			fragment.appendChild(this.createMonth(date.getFullYear(), date.getMonth()));
		}
		months.prepend(fragment);
		container.scrollTop += container.scrollHeight - oldHeight;
	}

	appendMonths(count) {
		const months = this._root.querySelector('.cal-months');
		const last = months.lastElementChild;
		const lastMonth = this.monthNumber(Number(last.dataset.year), Number(last.dataset.month));
		const monthsToAdd = Math.min(count, this._lastMonth - lastMonth);
		for (let i = 1; i <= monthsToAdd; i++) {
			const date = this.monthDate(lastMonth + i);
			months.appendChild(this.createMonth(date.getFullYear(), date.getMonth()));
		}
	}

	scrollToMonth(year, month, smooth = true) {
		const monthEl = this._root.querySelector(`.cal-month[data-year="${year}"][data-month="${month}"]`);
		if (monthEl)
			monthEl.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
	}

	createEmptyDayCell() {
		const cell = document.createElement('div');
		cell.className = 'cal-day empty';
		return cell;
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
		const numberEl = numEl.appendChild(document.createElement('span'));
		numberEl.className = 'day-number';
		numberEl.textContent = d;
		if (bankholidays[d + '.' + (m + 1)]) {
			const holidayEl = numEl.appendChild(document.createElement('span'));
			holidayEl.className = 'holiday';
			holidayEl.innerText = bankholidays[d + '.' + (m + 1)];
		}
		cell.appendChild(numEl);

		const dayEvents = this.events[dateKey] || [];
		if (dayEvents.length) {
			cell.classList.add('has-events');
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
					if (this.openDetail)
						this.openDetail(ev);
					else
						alert(JSON.stringify(ev));
				});
				list.appendChild(pill);
			});
			cell.appendChild(list);
		}
		cell.addEventListener('click', () => this.openDetail({ day: d, month: m + 1, year: y }));
		return cell;
	}

	reset() {
		this.events = {};
	}
}
