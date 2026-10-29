import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { ui } from '../ui';

export { ViewChat };

class ViewChat extends HTMLElement {

	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
:host(*) {
	width: 100%;
	height: 100%;
	position: relative;
	display: block;
	border-left: solid 1em transparent;
	border-bottom: solid 1em transparent;
	border-right: solid 1em transparent;
}
*::-webkit-scrollbar {
	display: none;
}
bubble {
	position: relative;
	display: block;
	white-space: normal;
	margin: 0.5em 0;
	max-width: 85%;
	text-align: left;
}
bubble > label {
	display: inline-block;
	font-size: 0.8em;
	padding: 0.5em 1em;
	border-radius: 0.5em 0.5em 0 0;
	background: var(--background-content);
}
bubble>content {
	border-radius: 0 0.5em 0.5em 0.5em;
	padding: 0.5em 0.75em;
	background: var(--background-content);
	position: relative;
	display: block;
}
bubble preview {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	display: grid;
	grid-template-rows: 0fr;
	transition: all .4s ease-out;
}
bubble message {
	display: grid;
	overflow: hidden;
	transition: all .4s ease-out;
	grid-template-rows: 1fr;
}
bubble message>div {
	min-height: 0;
}
bubble.collapsed preview {
	grid-template-rows: 1fr;
}
bubble.collapsed message {
	grid-template-rows: 0fr;
}
bubble:focus-visible {
	outline: 0.15em solid currentColor;
	outline-offset: 0.15em;
}
bubble.model {
	margin-left: 0;
	color: inherit;
	cursor: pointer;
}
bubble.user {
	margin-left: auto;
	color: white;
}
bubble.user>label,
bubble.user>content {
	background: var(--background-clickable);
}
p {
	margin-block-start: 0;
	margin-block-end: 0;
}
controls {
	position: relative;
	display: block;
	text-align: center;
	margin-top: 0.5em;
}
history {
	position: relative;
	display: block;
	height: calc(100% - 10.5em);
	overflow-y: auto;
	margin-bottom: 1em;
}
status {
	position: relative;
	display: block;
	min-height: 1.5em;
	text-align: center;
}
button {
	border-radius: 2em;
	border: none;
	background: var(--background-clickable);
	padding: 0.75em 1.5em;
	outline: none;
	cursor: pointer;
	font-family: Comfortaa, Verdana, "Helvetica Neue", Helvetica, Arial, sans-serif;
	margin: 0 0.5em;
	color: white;
	font-size: 1em;
	transition: var(--transition-clickable)
}
button:hover {
	background: var(--background-clickable-highlight);
}`;
		this._root.appendChild(document.createElement('history'));
		var status = this._root.appendChild(document.createElement('status'));
		var input = this._root.appendChild(document.createElement('input-textarea'));
		input.setAttribute('compact', '');
		input.setAttribute('aria-label', 'Nachricht an den KI-Chat');
		var controls = this._root.appendChild(document.createElement('controls'));
		var send = controls.appendChild(document.createElement('button'));
		send.innerText = 'Senden';
		var sending = false;
		send.onclick = () => {
			var text = input.value?.trim();
			if (!text || sending)
				return;
			sending = true;
			send.disabled = true;
			input.value = '';
			this.renderMessage({ role: 'user', text: text });
			status.innerText = 'Antwort wird erstellt ...';
			api.chat.postMessage(text, response => {
				this.renderMessage({ role: 'model', text: response.answer });
				status.innerText = '';
				sending = false;
				send.disabled = false;
			}, error => {
				status.innerText = error.responseText || 'Die Antwort konnte nicht erstellt werden.';
				sending = false;
				send.disabled = false;
			});
		};
	}
	createBubble(message, collapsed) {
		var bubble = document.createElement('bubble');
		bubble.classList.add(message.role);
		bubble.setAttribute('role', 'button');
		bubble.setAttribute('tabindex', '0');
		bubble.setAttribute('aria-expanded', 'true');
		var label = bubble.appendChild(document.createElement('label'));
		label.appendChild(document.createElement('date')).textContent = ui.formatTime(new Date(message.createdAt.replace('+00:00', '')));
		var content = bubble.appendChild(document.createElement('content'));
		var rawText = message.note;
		if (message.role == 'model')
			content.appendChild(document.createElement('preview'));
		var content = content.appendChild(document.createElement('message')).appendChild(document.createElement('div'));
		content.innerHTML = DOMPurify.sanitize(marked.parse(rawText));
		if (message.role == 'model') {
			bubble.querySelector('preview').textContent = content.innerText;
			var toggle = () => {
				var collapsed = bubble.classList.toggle('collapsed');
				bubble.setAttribute('aria-expanded', String(!collapsed));
			};
			bubble.addEventListener('click', event => {
				if (event.target.closest('a, button'))
					return;
				toggle();
			});
			bubble.addEventListener('keydown', event => {
				if (event.key !== 'Enter' && event.key !== ' ')
					return;
				event.preventDefault();
				toggle();
			});
			if (collapsed) {
				bubble.classList.add('collapsed');
				bubble.setAttribute('aria-expanded', false);
			}
		}
		return bubble;
	}
	renderMessage(message) {
		var history = this._root.querySelector('history');
		history.appendChild(this.createBubble(message));
		this.keepLastBubblesExpanded(history);
		history.scrollTop = history.scrollHeight;
	}
	init(messages) {
		var history = this._root.querySelector('history');
		history.textContent = '';
		messages.forEach(message => history.appendChild(this.createBubble(message, true)));
		history.scrollTop = history.scrollHeight;
	}
	initialized() {
		return this._root.querySelector('history').childElementCount > 0;
	}
}