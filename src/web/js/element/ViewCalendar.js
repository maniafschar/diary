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
	display: flex;
	flex-direction: column;
}

.cal-months {
	display: grid;
	grid-template-columns: repeat(7, minmax(0, 1fr));
	grid-auto-rows: minmax(0, auto);
	align-items: stretch;
}

.cal-month {
	display: contents;
}

.cal-sticky-header {
	flex: none;
	background: transparent;
}

.cal-month-title {
	text-align: center;
	padding: 0.45em 0;
	color: rgba(0, 0, 80, 0.75);
	font-size: 1.05em;
	font-weight: bold;
	line-height: 1;
}

.cal-grid-outer {
	overflow-x: hidden;
	overflow-y: auto;
	flex: 1;
	min-height: 0;
	-webkit-overflow-scrolling: touch;
	scrollbar-width: none;
}

.cal-weekdays {
	display: grid;
	grid-template-columns: repeat(7, minmax(0, 1fr));
	height: 1.5em;
}

	
.cal-weekday span {
	padding: 0.3em 0 0 0.25em;
}

.cal-weekday.weekend { color: var(--color-weekend); }

.cal-days {
	display: contents;
}

.cal-day {
	cursor: pointer;
	transition: background .12s;
	position: relative;
	display: flex;
	flex-direction: column;
	min-width: 0;
	font-size: 0.8em;
	min-height: 6rem;
	margin: 0.2em;
	border-radius: 1em;
	background: rgba(255, 255, 255, 0.3);
}

.cal-month.active .cal-day .day-num {
	background: rgba(180, 255, 255, 0.5);
}

.cal-day.empty {
	background: transparent !important;
}

.cal-day:nth-child(7n),
.cal-weekday:nth-child(7n) {
	border-right: none;
}

.cal-day:hover {
	background: var(--background-hover) !important;
}

.day-num {
	display: block;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	position: relative;
	border-radius: 1em;
	padding: 0.2em;
	transition: all .4s ease-out;
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
}

.cal-day.weekend .day-num {
	color: var(--color-weekend);
}

.day-number {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 1.6em;
	min-height: 1.6em;
}

.cal-day.today .day-number {
	border-radius: 50% 0 0.5em 0;
	background: rgba(255, 190, 40, 0.75);
	color: #4a3200;
}

.event-list {
	overflow: visible;
	height: auto;
	position: relative;
	display: block;
}

.event-pill {
	padding: 0.25em 0 0.25em 0.5em;
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
		const stickyHeader = wrapper.appendChild(document.createElement('div'));
		stickyHeader.className = 'cal-sticky-header';
		stickyHeader.appendChild(document.createElement('div')).className = 'cal-month-title';
		stickyHeader.appendChild(this.createWeekdays());
		var body = wrapper.appendChild(document.createElement('div'));
		body.classList.add('cal-grid-outer');
		body.addEventListener('scroll', () => this.handleScroll(body), { passive: true });
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
		const endMonth = this._lastMonth;
		for (let monthNumber = startMonth; monthNumber <= endMonth; monthNumber++) {
			const date = this.monthDate(monthNumber);
			months.appendChild(this.createMonth(date.getFullYear(), date.getMonth(), monthNumber === startMonth));
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

	createMonth(year, month, includeLeadingEmptyDays) {
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

		if (includeLeadingEmptyDays) {
			for (let i = startOffset - 1; i >= 0; i--)
				days.appendChild(this.createEmptyDayCell());
		}
		for (let day = 1; day <= lastDay.getDate(); day++)
			days.appendChild(this.createDayCell(year, month, day, false, bankholidays));
		const lastRowSize = ((includeLeadingEmptyDays ? startOffset : 0) + lastDay.getDate()) % 7;
		if (lastRowSize) {
			Array.from(days.children).slice(-lastRowSize).forEach(day => day.classList.add('last-row'));
		}
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
		const header = this._root.querySelector('.cal-month-title');
		const top = viewport.top + 20;
		let activeMonth = null;
		container.querySelectorAll('.cal-month').forEach(month => {
			if (!activeMonth && month.querySelector('.cal-days').lastElementChild.getBoundingClientRect().top > top)
				activeMonth = month;
			month.classList.remove('active');
		});
		if (!activeMonth)
			return;
		activeMonth.classList.add('active');
		header.textContent =
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
		const firstDays = first.querySelector('.cal-days');
		while (firstDays.firstElementChild?.classList.contains('empty'))
			firstDays.firstElementChild.remove();
		const fragment = document.createDocumentFragment();
		for (let i = monthsToAdd; i > 0; i--) {
			const date = this.monthDate(firstMonth - i);
			fragment.appendChild(this.createMonth(date.getFullYear(), date.getMonth(), i === monthsToAdd));
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
			months.appendChild(this.createMonth(date.getFullYear(), date.getMonth(), false));
		}
	}

	scrollToMonth(year, month, smooth = true) {
		const monthEl = this._root.querySelector(`.cal-month[data-year="${year}"][data-month="${month}"]`);
		const firstDay = monthEl?.querySelector('.cal-days').firstElementChild;
		if (firstDay)
			firstDay.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
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
