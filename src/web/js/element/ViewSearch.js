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
search-row {
	display: flex;
	align-items: center;
	gap: 0.5em;
}
input {
	flex: 1;
	min-width: 0;
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
	padding: 0.75em;
	margin-bottom: 0.5em;
	border-radius: 0.5em;
	background: var(--background-content);
	cursor: pointer;
	white-space: normal;
}
hit:hover, hit:focus {
	outline: 2px solid var(--color-primary, #b55);
}
hit.chat {
	padding: 0;
	background: none;
}
hit.chat:hover, hit.chat:focus {
	outline: none;
}
hit date {
	display: block;
	font-size: 0.8em;
	opacity: 0.8;
}
hit address {
	display: block;
	font-style: normal;
	white-space: pre-line;
}
hit note {
	display: block;
	margin: 0.5em 0;
	white-space: pre-line;
	word-break: break-word;
}
hit feedback {
	display: block;
	padding-top: 0.75em;
	border-top: solid 1px rgba(0, 0, 0, 0.1);
	margin-top: 0.75em;
	white-space: pre-line;
	word-break: break-word;
}
hit feedback > span {
	display: block;
	font-size: 0.8em;
}
hit bubble {
	position: relative;
	display: block;
	white-space: normal;
	margin: 0.5em 0;
	max-width: 85%;
	text-align: left;
}
hit bubble > label {
	display: inline-block;
	font-size: 0.8em;
	padding: 0.5em 1em;
	border-radius: 0.5em 0.5em 0 0;
	background: var(--background-content);
}
hit bubble > content {
	display: block;
	border-radius: 0 0.5em 0.5em 0.5em;
	padding: 0.5em 0.75em;
	background: var(--background-content);
	min-height: 1.4em;
	word-break: break-word;
}
hit bubble.model {
	margin-left: 0;
	cursor: pointer;
}
hit bubble.user {
	margin-left: auto;
	color: white;
}
hit bubble.user > label,
hit bubble.user > content {
	background: var(--background-clickable);
}
hit p {
	margin-block-start: 0;
	margin-block-end: 0;
}
`;
		var row = this._root.appendChild(document.createElement('search-row'));
		var input = row.appendChild(document.createElement('input'));
		input.type = 'search';
		input.placeholder = 'Tagebuch und KI-Chat durchsuchen';
		input.setAttribute('aria-label', 'Suche');
		this.input = input;
		this.rating = row.appendChild(document.createElement('input-rating'));
		this.rating.setAttribute('type', 'edit');
		this.rating.setAttribute('title', 'Nach Sternen filtern');
		this.rating.classList.add('line');
		this.rating.setOnchange(value => this.setStars(Math.round(value / 20)));
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
		this.stars = stars || null;
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
		var add = (type, item, date, note, rating) => {
			var score = 1;
			if (terms.length) {
				var match = FuzzyMatcher.match(terms, note);
				if (!match)
					return;
				score = match.score;
			}
			hits.push({ type: type, item: item, score: score, date: this.parseDate(date), rating: rating });
		};
		document.querySelector('event view-table').list.forEach(event => {
			var rating = event.ratingCount ? event.rating / event.ratingCount : 0;
			if (this.stars && Math.round(rating / 20) != this.stars)
				return;
			add('event', event, event.date, this.eventText(event), rating);
		});
		if (!this.stars)
			(this.chatMessages || []).forEach(message => add('chat', message, message.createdAt, message.note, 0));
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

	render(hits) {
		this.status.textContent = hits.length ? '' : 'Keine Treffer.';
		hits.forEach(hit => {
			var item = this.results.appendChild(document.createElement('hit'));
			item.classList.add(hit.type);
			item.setAttribute('tabindex', '0');
			item.setAttribute('role', 'button');
			if (hit.type == 'chat')
				this.renderChat(item, hit.item);
			else
				this.renderEvent(item, hit);
			var open = () => this.dispatchEvent(new CustomEvent('open', { detail: { type: hit.type, id: hit.item.id }, bubbles: true, composed: true }));
			item.addEventListener('click', open);
			item.addEventListener('keydown', e => {
				if (e.key == 'Enter' || e.key == ' ') {
					e.preventDefault();
					open();
				}
			});
		});
	}

	renderEvent(element, hit) {
		var event = hit.item;
		element.appendChild(document.createElement('date')).textContent = ui.formatTime(hit.date);
		var location = event.location;
		if (location && (location.name || location.address)) {
			var address = element.appendChild(document.createElement('address'));
			address.textContent = [location.name, location.address].filter(part => part).join('\n');
		}
		if (event.rating) {
			var rating = element.appendChild(document.createElement('input-rating'));
			rating.classList.add('line');
			rating.setAttribute('value', hit.rating);
		}
		if (event.note)
			element.appendChild(document.createElement('note')).textContent = event.note;
		(event.eventFeedbacks || []).forEach(feedback => {
			var box = element.appendChild(document.createElement('feedback'));
			box.appendChild(document.createElement('span')).textContent = ui.extractPseudonyms()[feedback.contact.id] + ' · ' + ui.formatTime(this.parseDate(feedback.createdAt));
			box.appendChild(document.createTextNode(feedback.note));
		});
	}

	renderChat(element, message) {
		var bubble = element.appendChild(document.createElement('bubble'));
		bubble.classList.add(message.role);
		bubble.appendChild(document.createElement('label')).textContent = ui.formatTime(this.parseDate(message.createdAt));
		var content = bubble.appendChild(document.createElement('content'));
		content.innerHTML = DOMPurify.sanitize(marked.parse(message.note));
	}

	parseDate(value) {
		return new Date(typeof value == 'number' ? value : String(value).replace('+00:00', ''));
	}
}
