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
`;
		var input = this._root.appendChild(document.createElement('input'));
		input.type = 'search';
		input.placeholder = 'Tagebuch und KI-Chat durchsuchen';
		input.setAttribute('aria-label', 'Suche');
		this.input = input;
		this.status = this._root.appendChild(document.createElement('status'));
		this.results = this._root.appendChild(document.createElement('results'));
		var timeout;
		input.addEventListener('input', () => {
			clearTimeout(timeout);
			timeout = setTimeout(() => this.search(input.value.trim()), 300);
		});
	}

	show() {
		this.chatMessages = null;
		this.input?.focus();
	}

	search(text) {
		var id = ++this.requestId;
		this.results.textContent = '';
		if (text.length < 2) {
			this.status.textContent = '';
			return;
		}
		this.loadChat(() => {
			if (id == this.requestId)
				this.render(this.hits(text));
		});
	}

	loadChat(success) {
		if (!api.user?.admin || this.chatMessages)
			return success();
		this.status.textContent = 'Suche läuft …';
		api.chat.getMessages(messages => {
			this.chatMessages = messages;
			success();
		});
	}

	hits(text) {
		var terms = FuzzyMatcher.terms(text.slice(0, 200));
		if (!terms.length)
			return [];
		var hits = [];
		var add = (type, id, date, note) => {
			var match = FuzzyMatcher.match(terms, note);
			if (match)
				hits.push({ type: type, id: id, score: match.score, date: this.parseDate(date), snippet: this.snippet(note, match.start) });
		};
		document.querySelector('event view-table').list.forEach(event => add('event', event.id, event.date, event.note));
		(this.chatMessages || []).forEach(message => add('chat', message.id, message.createdAt, message.note));
		hits.sort((a, b) => b.score - a.score || (b.date.getTime() || 0) - (a.date.getTime() || 0));
		return hits.slice(0, 100);
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
