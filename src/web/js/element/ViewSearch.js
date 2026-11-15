import DOMPurify from 'dompurify';
import { markdown, marked } from 'marked';
import { api } from '../api';
import { FuzzyMatcher } from '../FuzzyMatcher';
import { ui } from '../ui';

export { ViewSearch };

const tableStyle = `
thead {
	display: none;
}
tbody {
	height: 100%;
}
tr {
	padding: 0 0.5em 0.5em 0.5em;
	display: grid;
	box-sizing: border-box;
}
td.column1 {
	grid-column: 1;
	grid-row: 1;
	font-size: 0.8em;
	background: var(--background-content);
	padding: 0.5em 1em 0 0.8em;
	border-radius: 0.5em 0.5em 0 0;
	width: fit-content !important;
	max-width: 85vw;
	overflow: hidden;
	text-overflow: ellipsis;
}
td.column2 {
	grid-column: 1;
	grid-row: 2;
	background: var(--background-content);
	width: 100% !important;
	max-width: calc(100vw - 1em) !important;
	max-height: initial;
	border-radius: 0 0.5em 0.5em 0.5em;
	overflow: hidden;
}
td.column2 input-rating {
	position: absolute;
	right: 0;
	font-size: 0.8em;
	margin-right: 0;
}
td.column2 note {
	position: relative;
	display: block;
	padding: 0.5em 0.5em 0 0.5em;
	white-space: pre-line;
	word-break: break-word;
}
td.column2 images {
	max-height: initial;
	text-align: center;
	height: 8em;
	position: relative;
	display: block;
	margin: 1em 0 0.5em 0;
	white-space: nowrap;
    overflow-x: auto;
	overflow-y: hidden;
    box-sizing: border-box;
	width: 100%;
}
td.column2 images img {
	height: 100%;
	padding: 0 0.25em;
	border-radius: 0.5em;
}
tr.chat td.column1 {
	width: 100% !important;
	background: transparent;
}
tr.chat td.column2 {
	display: none;
}
td.column1 bubble {
	display: block;
	max-width: 85%;
	margin: 0.5em;
	text-align: left;
	white-space: normal;
}
td.column1 bubble.user {
	margin-left: auto;
}
td.column1 bubble label {
	background: var(--background-clickable);
	color: white;
}
td.column1 bubble content {
	display: block;
	padding: 0.5em 0.75em;
	border-radius: 0.5em;
	background: var(--background-clickable);
	color: white;
	word-break: break-word;
	max-height: 10em;
	overflow: auto;
}
td.column1 bubble.model content,
td.column1 bubble.model label {
	background: var(--background-content);
	color: inherit;
}`;

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
*::-webkit-scrollbar {
	display: none;
}
search-row {
	display: flex;
	align-items: center;
	gap: 0.5em;
}
input-rating {
	flex: none;
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
	padding-bottom: 2em;
	box-sizing: border-box;
}`;
		var row = this._root.appendChild(document.createElement('search-row'));
		var input = row.appendChild(document.createElement('input'));
		input.type = 'search';
		input.placeholder = 'Tagebuch und KI-Chat durchsuchen';
		input.setAttribute('aria-label', 'Suche');
		this.input = input;
		var r = document.createElement('input-rating');
		r.setAttribute('type', 'edit');
		this.rating = row.appendChild(r);
		this.rating.setOnchange(value => this.setStars(Math.round(value / 20)));
		this.status = this._root.appendChild(document.createElement('status'));
		this.results = this._root.appendChild(document.createElement('results'));
		this.table = this.results.appendChild(document.createElement('view-table'));
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

	escapeHtml(text) {
		return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
	}

	search() {
		var id = ++this.requestId;
		var text = this.input.value.trim();
		this.clearResults();
		if (text.length < 2 && !this.stars) {
			this.status.textContent = '';
			return;
		}
		this.loadChat(text, () => {
			if (id == this.requestId)
				this.render(this.hits(text), FuzzyMatcher.terms(text.slice(0, 200)));
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
		return hits;
	}

	eventText(event) {
		var parts = [event.note];
		(event.eventFeedbacks || []).forEach(feedback => parts.push(feedback.note));
		var location = event.location;
		if (location)
			parts.push(location.name, location.address, location.note, location.phone, location.email);
		return parts.filter(part => part).join('\n');
	}

	setupTable() {
		if (this.table.columns.length)
			return;
		this.table.columns.push({ label: 'Datum/Ort', width: 30, style: 'overflow-y:hidden;' }, { label: 'Bemerkung', width: 55 });
		this.table.setConvert(list => list.map(hit => hit.type == 'chat' ? this.chatRow(hit) : this.eventRow(hit)));
		this.table.setOpenDetail(event => this.openHit(event));
		this.table.setStyle(tableStyle);
	}

	clearResults() {
		this.setupTable();
		this.table.list = [];
		this.table.renderTable();
	}

	render(hits, terms) {
		this.setupTable();
		var events = hits.filter(hit => hit.type == 'event').length;
		var chats = hits.length - events;
		this.status.textContent = hits.length
			? 'Treffer: ' + hits.length + ' (Tagebuch: ' + events + ', KI-Chat: ' + chats + ')'
			: 'Keine Treffer.';
		this.table.list = hits;
		this.table.renderTable();
		this.table.table().querySelectorAll('tbody td').forEach(cell => this.highlight(cell, terms));
	}

	openHit(event) {
		var hit = this.table.list[ui.parents(event.target, 'tr').getAttribute('i')];
		this.dispatchEvent(new CustomEvent('open', { detail: { type: hit.type, id: hit.item.id }, bubbles: true, composed: true }));
	}

	highlight(element, terms) {
		if (!terms.length)
			return;
		var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
		var nodes = [];
		while (walker.nextNode())
			nodes.push(walker.currentNode);
		nodes.forEach(node => {
			if (node.parentElement.closest('span, label, date, type'))
				return;
			var parts = node.nodeValue.split(/([\p{L}\p{N}]+)/u);
			if (parts.length < 2)
				return;
			var fragment = document.createDocumentFragment();
			parts.forEach((part, i) => {
				if (!part)
					return;
				if (i % 2 && terms.some(term => FuzzyMatcher.wordScore(term, FuzzyMatcher.normalize(part)) > 0)) {
					var mark = document.createElement('mark');
					mark.textContent = part;
					fragment.appendChild(mark);
				} else
					fragment.appendChild(document.createTextNode(part));
			});
			node.replaceWith(fragment);
		});
	}

	eventRow(hit) {
		var event = hit.item;
		var text = '';
		if (event.note)
			text += '<note>' + this.escapeHtml(event.note) + '</note>';
		if (hit.rating)
			text += '<input-rating class="line" value="' + hit.rating.toFixed(1) + '"></input-rating>';
		var images = '';
		if (event.eventImages) {
			for (var i2 = 0; i2 < event.eventImages.length; i2++)
				images += '<img src="' + api.mediaUrl(event.eventImages[i2].imageThumbnail) + '" />';
			text += '<images>' + images + '</images>';
		}
		var row = [this.escapeHtml(ui.formatTime(hit.date)) + (event.location?.name ? ' ' + this.escapeHtml(event.location.name) : ''), { text: text }];
		row.row = { class: 'event' };
		return row;
	}

	chatRow(hit) {
		var row = [{ text: '<bubble class="' + hit.item.role + '"><label>' + this.escapeHtml(ui.formatTime(hit.date)) + '</label><content>' + this.escapeHtml(this.removeMarkdown(hit.item.note)) + '</content></bubble>' }];
		row.row = { class: 'chat' };
		return row;
	}

	removeMarkdown(text) {
		var div = document.createElement('div');
		div.innerHTML = DOMPurify.sanitize(marked.parse(markdown ?? ''));
		return div.textContent;
	}

	parseDate(value) {
		return new Date(typeof value == 'number' ? value : String(value).replace('+00:00', ''));
	}
}
