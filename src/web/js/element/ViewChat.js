import DOMPurify from 'dompurify';
import { marked } from 'marked';

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
bubble {
	position: relative;
	display: block;
	white-space: normal;
	padding: 0.75em;
	margin: 0.5em 0;
	max-width: 85%;
	border-radius: 0.5em;
	text-align: left;
}
bubble.model {
	margin-left: 0;
	background: var(--background-content);
	color: inherit;
}
bubble.user {
	margin-left: auto;
	background: var(--background-clickable);
	color: white;
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
	height: calc(100% - 8em);
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
	init(messages) {
		var history = this._root.querySelector('history');
		history.textContent = '';
		messages.forEach(message => {
			var bubble = history.appendChild(document.createElement('bubble'));
			bubble.classList.add(message.role);
			bubble.innerHTML = DOMPurify.sanitize(marked.parse(message.text || ''));
		});
		history.scrollTop = history.scrollHeight;
	}
}