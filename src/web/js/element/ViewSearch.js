import { api } from '../api';
import { FuzzyMatcher } from '../FuzzyMatcher';
import { ui } from '../ui';

export { ViewSearch };

class ViewSearch extends HTMLElement {

	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
		this.requestId = 0;
	}

	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
:host(*) {
	display: block;
	width: 100%;
	height: 100%;
	padding: 1em;
	box-sizing: border-box;
	overflow: hidden;
}
input {
	width: 100%;
	box-sizing: border-box;
	padding: 0.6em 0.8em;
	font-size: 1em;
	border: 1px solid var(--background-content, #ccc);
	border-radius: 0.5em;
	background: var(--background-content);
	color: inherit;
}
status {
	display: block;
	margin: 0.75em 0.25em;
	opacity: 0.7;
	font-size: 0.9em;
}
results {
	display: block;
	overflow-y: auto;
	height: calc(100% - 4em);
}
hit {
	display: block;
	padding: 0.6em 0.8em;
	margin-bottom: 0.5em;
	border-radius: 0.5em;
	background: var(--background-content);
	cursor: pointer;
}
hit:hover, hit:focus {
	outline: 2px solid var(--color-primary, #b55);
}
hit header {
	display: flex;
	gap: 0.5em;
	align-items: center;
	font-size: 0.8em;
	opacity: 0.8;
}
hit badge {
	padding: 0.1em 0.5em;
	border-radius: 1em;
	background: var(--color-primary, #b55);
	color: #fff;
	white-space: nowrap;
}
hit snippet {
	display: block;
	margin-top: 0.3em;
	white-space: normal;
	word-break: break-word;
}
hit stars {
	cursor: pointer;
	margin-left: auto;
}
hit stars input-rating {
	pointer-events: none;
}
filter {
	display: none;
	align-items: center;
	gap: 0.5em;
	margin: 0.75em 0.25em 0;
	font-size: 0.9em;
	cursor: pointer;
}
filter.active {
	display: flex;
}
filter input-rating {
	pointer-events: none;
}
`;
		var input = this._root.appendChild(document.createElement('input'));
		input.type = 'search';
		input.placeholder = 'Tagebuch und KI-Chat durchsuchen';
		input.setAttribute('aria-label', 'Suche');
		this.input = input;
		this.filter = this._root.appendChild(document.createElement('filter'));
		this.filter.setAttribute('title', 'Sterne-Filter aufheben');
		this.filter.addEventListener('click', () => this.setStars(null));
		this.status = this._root.appendChild(document.createElement('status'));
		this.results = this._root.appendChild(document.createElement('results'));
		var timeout;
		input.addEventListener('input', () => {
			clearTimeout(timeout);
			timeout = setTimeout(() => this.search(), 300);
		});
	}

	show() {
		this.chatMessages = null;
		this.input?.focus();
	}

	setStars(stars) {
		this.stars = this.stars == stars ? null : stars;
		this.filter.textContent = '';
		if (this.stars) {
			this.filter.classList.add('active');
			this.filter.appendChild(document.createTextNode('Sterne:'));
			var rating = this.filter.appendChild(document.createElement('input-rating'));
			rating.setAttribute('value', this.stars * 20);
			this.filter.appendChild(document.createTextNode('✕'));
		} else
			this.filter.classList.remove('active');
		this.search();
	}

	search() {
		var id = ++this.requestId;
		var text = this.input.value.trim();
		this.results.textContent = '';
		if (text.length < 2 && !this.stars) {
			this.status.textContent = '';
			return;
		}
		this.loadChat(text, () => {
			if (id == this.requestId)
				this.render(this.hits(text));
		});
	}

	loadChat(text, success) {
		if (!api.user?.admin || this.chatMessages || text.length < 2 || this.stars)
			return success();
		this.status.textContent = 'Suche läuft …';
		api.chat.getMessages(messages => {
			this.chatMessages = messages;
			success();
		});
	}

	hits(text) {
		var terms = FuzzyMatcher.terms(text.slice(0, 200));
		if (!terms.length && !this.stars)
			return [];
		var hits = [];
		var add = (type, id, date, note, rating) => {
			var score = 1;
			var start = 0;
			if (terms.length) {
				var match = FuzzyMatcher.match(terms, note);
				if (!match)
					return;
				score = match.score;
				start = match.start;
			}
			hits.push({ type: type, id: id, score: score, date: this.parseDate(date), snippet: this.snippet(note, start), rating: rating });
		};
		document.querySelector('event view-table').list.forEach(event => {
			var rating = event.ratingCount ? event.rating / event.ratingCount : 0;
			if (this.stars && Math.round(rating / 20) != this.stars)
				return;
			add('event', event.id, event.date, this.eventText(event), rating);
		});
		if (!this.stars)
			(this.chatMessages || []).forEach(message => add('chat', message.id, message.createdAt, message.note, 0));
		hits.sort((a, b) => b.score - a.score || (b.date.getTime() || 0) - (a.date.getTime() || 0));
		return hits.slice(0, 100);
	}

	eventText(event) {
		var parts = [event.note];
		(event.eventFeedbacks || []).forEach(feedback => parts.push(feedback.note));
		var location = event.location;
		if (location)
			parts.push(location.name, location.address, location.note, location.phone, location.email);
		return parts.filter(part => part).join('\n');
	}

	snippet(text, matchStart) {
		var from = Math.max(0, matchStart - 60);
		var to = Math.min(text.length, matchStart + 90);
		if (from > 0 && /[\uDC00-\uDFFF]/.test(text.charAt(from)))
			from++;
		if (to < text.length && /[\uD800-\uDBFF]/.test(text.charAt(to - 1)))
			to--;
		var part = text.substring(from, to).replace(/\s+/g, ' ').trim();
		return (from > 0 ? '…' : '') + part + (to < text.length ? '…' : '');
	}

	render(hits) {
		this.status.textContent = hits.length ? '' : 'Keine Treffer.';
		hits.forEach(hit => {
			var item = this.results.appendChild(document.createElement('hit'));
			item.setAttribute('tabindex', '0');
			item.setAttribute('role', 'button');
			var header = item.appendChild(document.createElement('header'));
			var badge = header.appendChild(document.createElement('badge'));
			badge.textContent = hit.type == 'chat' ? 'KI-Chat' : 'Tagebuch';
			var date = header.appendChild(document.createElement('span'));
			date.textContent = ui.formatTime(hit.date);
			if (hit.rating) {
				var stars = header.appendChild(document.createElement('stars'));
				stars.setAttribute('title', 'Nur diese Bewertung anzeigen');
				stars.appendChild(document.createElement('input-rating')).setAttribute('value', hit.rating);
				stars.addEventListener('click', e => {
					e.stopPropagation();
					this.setStars(Math.round(hit.rating / 20));
				});
			}
			item.appendChild(document.createElement('snippet')).textContent = hit.snippet;
			var open = () => this.dispatchEvent(new CustomEvent('open', { detail: { type: hit.type, id: hit.id }, bubbles: true, composed: true }));
			item.addEventListener('click', open);
			item.addEventListener('keydown', e => {
				if (e.key == 'Enter' || e.key == ' ') {
					e.preventDefault();
					open();
				}
			});
		});
	}

	parseDate(value) {
		return new Date(typeof value == 'number' ? value : String(value).replace('+00:00', ''));
	}
}
