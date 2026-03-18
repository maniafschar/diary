export { CalendarView };

class CalendarView extends HTMLElement {
	static MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
	static WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
	events = {};
	today = new Date();
	current = { year: this.today.getFullYear(), month: this.today.getMonth() };
	_activeDate = null;

	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}
	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
	--bg:        #f5f2ec;
	--surface:   #ffffff;
	--primary:   #1a1a2e;
	--accent:    #c84b31;
	--muted:     #a09080;
	--border:    #e0d8cc;
	--today-bg:  #c84b31;
	--today-fg:  #ffffff;
	--hover-bg:  #f0ebe2;
	--weekend:   #8b4513;
	--radius:    12px;
}

:host(*) {
	font-family: Comfortaa;
	text-align: left;
}

.calendar-wrapper {
	width: 100%;
}

.cal-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 0.5em;
}

.cal-title {
	font-size: 2em;
}

.cal-title span {
	color: var(--accent);
}

.nav-group {
	display: flex;
	align-items: center;
	gap: 8px;
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
}
	
button.icon {
	font-size: 1.3em;
	width: 2em;
	padding: 0;
}

.cal-grid-outer {
	overflow: hidden;
	box-shadow: 0 0.25em 1.5em rgba(0, 0, 0, 0.06);
}

.cal-weekdays {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	border-bottom: 1px solid var(--border);
}

.cal-weekday {
	padding: 0.5em;
	font-weight: 600;
	letter-spacing: .1em;
	text-transform: uppercase;
	color: var(--muted);
	border-right: 1px solid rgba(0, 0, 0, 0.1);
	border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.cal-weekday.weekend { color: var(--weekend); }

.cal-days {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
}

.cal-day {
	min-height: 6em;
	padding: 0.5em;
	border-right: 1px solid rgba(0, 0, 0, 0.1);
	border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	cursor: pointer;
	transition: background .12s;
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cal-day:nth-child(7n) { border-right: none; }

.cal-day:nth-last-child(-n+7) { border-bottom: none; }

.cal-day:hover:not(.empty) { background: var(--hover-bg); }

.cal-day.empty {
	background: #faf8f4;
	cursor: default;
}

.cal-day.other-month .day-num {
	color: #aaa !important;
}

.cal-day.today .day-num {
	background: var(--today-bg);
	color: var(--today-fg);
	font-weight: 700;
}

.cal-day.weekend .day-num {
	color: var(--weekend);
}

.cal-day.today.weekend .day-num {
	color: var(--today-fg);
}

.event-list {
	display: flex;
	flex-direction: column;
	gap: 2px;
	overflow: hidden;
}

.event-pill {
	font-size: .7em;
	font-weight: 500;
	padding: 2px 7px;
	border-radius: 4px;
	background: #ddeeff;
	color: #1a4a8a;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	cursor: pointer;
}

.event-pill.cat-work    { background: #d4edda; color: #155724; }
.event-pill.cat-private { background: #fff3cd; color: #856404; }
.event-pill.cat-holiday { background: #f8d7da; color: #721c24; }
`;
		var wrapper = document.createElement('div');
		wrapper.classList.add('calendar-wrapper');

		//Header
		var header = wrapper.appendChild(document.createElement('div'));
		header.classList.add('cal-header');
		header.appendChild(document.createElement('div')).classList.add('cal-title');
		var navigation = header.appendChild(document.createElement('div'));
		navigation.classList.add('nav-group');
		var button = navigation.appendChild(document.createElement('button'));
		button.classList.add('icon');
		button.onclick = () => {
			this.current.month--;
			if (this.current.month < 0) {
				this.current.month = 11;
				this.current.year--;
			}
			this.render();
		};
		button.setAttribute('title', 'Vorheriger Monat');
		button.innerText = '<';
		button = navigation.appendChild(document.createElement('button'));
		button.onclick = () => {
			this.current = { year: this.today.getFullYear(), month: this.today.getMonth() };
			this.render();
		};
		button.innerText = 'Heute';
		button = navigation.appendChild(document.createElement('button'));
		button.classList.add('icon');
		button.onclick = () => {
			this.current.month++;
			if (this.current.month > 11) {
				this.current.month = 0;
				this.current.year++;
			}
			this.render();
		};
		button.setAttribute('title', 'Nächster Monat');
		button.innerText = '>';

		//body
		var body = wrapper.appendChild(document.createElement('div'));
		body.classList.add('cal-grid-outer');
		var div = body.appendChild(document.createElement('div'));
		div.classList.add('cal-weekdays');
		div = body.appendChild(document.createElement('div'));
		div.classList.add('cal-days');
		this._root.appendChild(wrapper);

		// Beispiel-Termine
		this.addEvent('2025-03-10', 'Teammeeting', 'cat-work');
		this.addEvent('2025-03-17', 'Geburtstag Mama', 'cat-private');
		this.addEvent('2025-03-20', 'Frühlingsanfang', 'cat-holiday');

		// ── Init ───────────────────────────────────────────────────────────────────
		this.render();
	}

	addEvent(dateKey, name, cat = '') {
		if (!this.events[dateKey]) this.events[dateKey] = [];
		this.events[dateKey].push({ name, cat });
	}

	render() {
		const { year, month } = this.current;

		// Titel
		this._root.querySelector('.cal-title').innerHTML =
			`${CalendarView.MONTHS_DE[month]} <span>${year}</span>`;

		// Wochentag-Kopfzeile (einmalig beim ersten Render)
		const wdEl = this._root.querySelector('.cal-weekdays');
		if (!wdEl.children.length) {
			CalendarView.WEEKDAYS.forEach((d, i) => {
				const el = document.createElement('div');
				el.className = 'cal-weekday' + (i >= 5 ? ' weekend' : '');
				el.textContent = d;
				wdEl.appendChild(el);
			});
		}

		// Tage berechnen
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const totalDays = lastDay.getDate();

		// Montag = 0 … Sonntag = 6 (JS: So=0, daher Umrechnung)
		let startOffset = (firstDay.getDay() + 6) % 7;

		// Vorgänger-Monat-Tage (grau)
		const prevLast = new Date(year, month, 0).getDate();

		const daysEl = this._root.querySelector('.cal-days');
		daysEl.innerHTML = '';

		// Vorgänger-Tage
		for (let i = startOffset - 1; i >= 0; i--) {
			daysEl.appendChild(this.createDayCell(year, month - 1, prevLast - i, true));
		}

		// Aktueller Monat
		for (let d = 1; d <= totalDays; d++) {
			daysEl.appendChild(this.createDayCell(year, month, d, false));
		}

		// Nachfolger-Tage auffüllen bis Zeile voll (7er-Raster)
		const filled = startOffset + totalDays;
		const remaining = filled % 7 === 0 ? 0 : 7 - (filled % 7);
		for (let d = 1; d <= remaining; d++) {
			daysEl.appendChild(this.createDayCell(year, month + 1, d, true));
		}
	}

	createDayCell(year, month, day, otherMonth) {
		// Normalisiertes Datum
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

		// Tages-Nummer
		const numEl = document.createElement('div');
		numEl.className = 'day-num';
		numEl.textContent = d;
		cell.appendChild(numEl);

		// Termine
		const dayEvents = this.events[dateKey] || [];
		if (dayEvents.length) {
			const list = document.createElement('div');
			list.className = 'event-list';
			dayEvents.slice(0, 3).forEach(ev => {
				const pill = document.createElement('div');
				pill.className = 'event-pill ' + (ev.cat || '');
				pill.textContent = ev.name;
				pill.addEventListener('click', e => {
					e.stopPropagation();
					// TODO: Termin-Detail / Bearbeitung hier einbauen
					alert(`Termin: ${ev.name}`);
				});
				list.appendChild(pill);
			});
			if (dayEvents.length > 3) {
				const more = document.createElement('div');
				more.className = 'event-pill';
				more.style.background = '#eee';
				more.style.color = '#666';
				more.textContent = `+${dayEvents.length - 3} weitere`;
				list.appendChild(more);
			}
			cell.appendChild(list);
		}

		// Klick: Modal öffnen (nur aktueller Monat)
		if (!otherMonth) {
			cell.addEventListener('click', () => this.openModal(dateKey, d, m, y));
		}

		return cell;
	}


	// ── Modal ──────────────────────────────────────────────────────────────────
	openModal(dateKey, day, month, year) {
		this._activeDate = dateKey;
		document.getElementById('modal-date-label').textContent =
			`Termin – ${day}. ${CalendarView.MONTHS_DE[month]} ${year}`;
		document.getElementById('event-name').value = '';
		document.getElementById('event-cat').value = '';
		document.getElementById('modal-overlay').classList.add('open');
		setTimeout(() => document.getElementById('event-name').focus(), 150);
	}

	closeModal() {
		document.getElementById('modal-overlay').classList.remove('open');
		this._activeDate = null;
	}
}