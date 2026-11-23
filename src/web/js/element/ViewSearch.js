import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { api } from '../api';
import { FuzzyMatcher } from '../FuzzyMatcher';
import { ui } from '../ui';
import { splitHashtags, renderHashtagButtons } from '../hashtags';

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
	padding: 0;
	max-height: initial;
	border: none;
	max-width: 100%;
}
tr.chat td.column2 {
	display: none;
}
td.column1 bubble {
	display: block;
	max-width: 85%;
	text-align: left;
	white-space: normal;
}
td.column1 bubble.user {
	margin-left: auto;
}
td.column1 bubble label {
	background: var(--background-clickable);
	color: white;
	padding: 0.5em 1em 0 1.2em;
	border-radius: 0.5em 0.5em 0 0;
	border: none;
	position: relative;
	display: inline-block;
	transition: all .4s ease-out;
}
td.column1 bubble content {
	display: block;
	padding: 0.5em 0.75em;
	border-radius: 0 0.5em 0.5em 0.5em;
	background: var(--background-clickable);
	color: white;
	font-size: 1.25em;
	padding-left: 1em;
	transition: all .4s ease-out;
}
td.column1 bubble.model content,
td.column1 bubble.model label {
	background: var(--background-content);
	color: inherit;
}
tbody tr:hover td.column1 bubble content,
tbody tr:hover td.column1 bubble label {
	background-color: var(--background-hover);
	color: black;
}
tbody tr.selected td {
    background-color: var(--background-content) !important;
}
tbody tr.chat.selected td {
    background-color: transparent !important;
}`;

class ViewSearch extends HTMLElement {

	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
		this.requestId = 0;
		this.selectedHashtags = [];
	}

	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
:host(*) {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	padding: 1em;
	box-sizing: border-box;
	overflow: hidden;
}
@media (max-width: 700px) {
	:host(*) {
		padding: 0;
	}
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
hashtag-buttons {
	display: flex;
	overflow-y: auto;
	width: 100%;
	padding-top: 0.5em;
	margin: 0 0.5em;
}
hashtag-buttons button {
	border-radius: 2em;
	border: none;
	background: var(--background-clickable);
	padding: 0.5em 0.75em;
	outline: none;
	cursor: pointer;
	font-family: var(--font-family);
	margin: 0 0.5em;
	color: white;
	font-size: 0.8em;
	transition: var(--transition-clickable);
}
hashtag-buttons button[aria-pressed="true"] {
	background: var(--background-clickable-highlight);
}
hashtag-buttons button .count {
	font-size: 0.8em;
	opacity: 0.6;
	margin-left: 0.35em;
}
results {
	display: block;
	overflow-y: auto;
	flex: 1;
	min-height: 0;
	padding-bottom: 2em;
	box-sizing: border-box;
}`;
		var row = this._root.appendChild(document.createElement('search-row'));
		var input = row.appendChild(document.createElement('input'));
		input.type = 'search';
		input.style.margin = '0.5em 0 0 0.5em';
		input.placeholder = 'Tagebuch und KI-Chat durchsuchen';
		input.setAttribute('aria-label', 'Suche');
		this.input = input;
		var r = document.createElement('input-rating');
		r.setAttribute('type', 'edit');
		r.style.fontSize = '0.7em';
		this.rating = row.appendChild(r);
		this.rating.setOnchange(value => this.setStars(Math.round(value / 20)));
		this.hashtagButtons = this._root.appendChild(document.createElement('hashtag-buttons'));
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
		if (this.hashtagUser != api.user?.id) {
			this.hashtagUser = api.user?.id;
			this.hashtags = [];
			this.selectedHashtags = [];
			this.renderHashtags();
		}
		if (api.user?.id) {
			const userId = api.user.id;
			api.event.getHashtags(tags => {
				if (api.user?.id != userId)
					return;
				this.hashtags = tags;
				this.selectedHashtags = this.selectedHashtags.filter(tag => tags.includes(tag));
				this.renderHashtags();
				this.search();
			});
		}
		if (!window.matchMedia('(pointer: coarse)').matches)
			this.input?.focus();
	}

	renderHashtags() {
		var counts = new Map();
		document.querySelector('event view-table').list.forEach(event => {
			new Set(splitHashtags(event.hashtags).map(tag => tag.toLocaleLowerCase())).forEach(tag => {
				counts.set(tag, (counts.get(tag) || 0) + 1);
			});
		});
		renderHashtagButtons(this.hashtagButtons, this.hashtags || [], this.selectedHashtags, tag => {
			this.selectedHashtags = this.selectedHashtags.includes(tag)
				? this.selectedHashtags.filter(item => item != tag) : [...this.selectedHashtags, tag];
			this.renderHashtags();
			this.search();
		}, counts);
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
		if (text.length < 2 && !this.stars && !this.selectedHashtags.length) {
			this.status.textContent = '';
			return;
		}
		this.loadChat(text, () => {
			if (id == this.requestId)
				this.render(this.hits(text), FuzzyMatcher.terms(text.slice(0, 200)));
		});
	}

	loadChat(text, success) {
		if (!api.user?.admin || this.chatMessages || text.length < 2 || this.stars || this.selectedHashtags.length)
			return success();
		this.status.textContent = 'Suche läuft …';
		api.chat.getMessages(messages => {
			this.chatMessages = messages;
			success();
		});
	}

	hits(text) {
		var terms = FuzzyMatcher.terms(text.slice(0, 200));
		if (!terms.length && !this.stars && !this.selectedHashtags.length)
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
			var tags = splitHashtags(event.hashtags).map(tag => tag.toLocaleLowerCase());
			if (!this.selectedHashtags.every(tag => tags.includes(tag.toLocaleLowerCase())))
				return;
			var rating = event.ratingCount ? event.rating / event.ratingCount : 0;
			if (this.stars && Math.round(rating / 20) != this.stars)
				return;
			add('event', event, event.date, this.eventText(event), rating);
		});
		if (!this.stars && !this.selectedHashtags.length)
			(this.chatMessages || []).forEach(message => add('chat', message, message.createdAt, message.note, 0));
		hits.sort((a, b) => b.score - a.score || (b.date.getTime() || 0) - (a.date.getTime() || 0));
		return hits;
	}

	eventText(event) {
		var parts = [event.note, event.hashtags];
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
		this.terms = terms;
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
			text += '<note>' + this.escapeHtml(this.snippet(event.note, this.terms)) + '</note>';
		if (event.hashtags)
			text += '<note>' + this.escapeHtml(splitHashtags(event.hashtags).join(' ')) + '</note>';
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
		var row = [{ text: '<bubble class="' + hit.item.role + '"><label>' + this.escapeHtml(ui.formatTime(hit.date)) + '</label><content>' + this.escapeHtml(this.snippet(this.removeMarkdown(hit.item.note), this.terms)) + '</content></bubble>' }];
		row.row = { class: 'chat' };
		return row;
	}

	snippet(text, terms = []) {
		const parts = (text || '').match(/\s+|\S+/g) || [];
		const words = parts.map((part, i) => i).filter(i => /\S/.test(parts[i]));
		const keep = new Set();
		const addRange = (from, to) => {
			for (let n = Math.max(0, from); n <= Math.min(words.length - 1, to); n++)
				keep.add(n);
		};
		addRange(0, 9);
		words.forEach((_, n) => {
			if (this.isMatch(parts[words[n]], terms))
				addRange(n - 8, n + 8);
		});
		if (keep.size == words.length)
			return text || '';
		let result = '';
		let previous = null;
		[...keep].sort((a, b) => a - b).forEach(n => {
			if (previous !== null)
				result += n == previous + 1 ? parts.slice(words[previous] + 1, words[n]).join('') : ' … ';
			result += parts[words[n]];
			previous = n;
		});
		return result + (previous < words.length - 1 ? ' …' : '');
	}

	isMatch(word, terms) {
		return word.split(/([\p{L}\p{N}]+)/u).some((part, i) => i % 2 && terms.some(term => FuzzyMatcher.wordScore(term, FuzzyMatcher.normalize(part)) > 0));
	}

	removeMarkdown(text) {
		var div = document.createElement('div');
		div.innerHTML = DOMPurify.sanitize(marked.parse(text));
		return div.textContent;
	}

	parseDate(value) {
		return new Date(typeof value == 'number' ? value : String(value).replace('+00:00', ''));
	}
}
