import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { ui } from '../ui';
import { InputDate } from './InputDate';

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
	min-height: 1.4em;
}
bubble.loading>content {
	padding-right: 3em;
}
bubble loader {
	position: absolute;
	top: 0.25em;
	right: 0.5em;
	width: 2em;
	height: 2em;
	border-radius: 50%;
	perspective: 800px;
}
bubble loader div {
	position: absolute;
	box-sizing: border-box;
	width: 100%;
	height: 100%;
	border-radius: 50%;
}
bubble loader .one {
	left: 0%;
	top: 0%;
	animation: rotate-one 1s linear infinite;
	border-bottom: 2px solid #b55;
}
bubble loader .two {
	right: 0%;
	top: 0%;
	animation: rotate-two 1s linear infinite;
	border-right: 2px solid #8d8;
}
bubble loader .three {
	right: 0%;
	bottom: 0%;
	animation: rotate-three 1s linear infinite;
	border-top: 2px solid #aaf;
}
@keyframes rotate-one {
	0% { transform: rotateX(35deg) rotateY(-45deg) rotateZ(0deg); }
	100% { transform: rotateX(35deg) rotateY(-45deg) rotateZ(360deg); }
}
@keyframes rotate-two {
	0% { transform: rotateX(50deg) rotateY(10deg) rotateZ(0deg); }
	100% { transform: rotateX(50deg) rotateY(10deg) rotateZ(360deg); }
}
@keyframes rotate-three {
	0% { transform: rotateX(35deg) rotateY(55deg) rotateZ(0deg); }
	100% { transform: rotateX(35deg) rotateY(55deg) rotateZ(360deg); }
}
bubble preview {
	display: block;
	position: absolute;
	opacity: 0;
	transition: all .4s ease-out;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	width: calc(100% - 1.5em);
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
	opacity: 1;
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
	height: 1.5em;
	text-align: center;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
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
			this.renderMessage({ role: 'user', note: text, createdAt: InputDate.local2server(new Date()) });
			var response = { role: 'model', note: '', createdAt: InputDate.local2server(new Date()) };
			var bubble = this.renderMessage(response);
			var streamedText = '';
			status.innerText = 'Antwort wird erstellt ...';
			this.setLoading(bubble, true);
			api.chat.postMessageStream(text, chunk => {
				streamedText += ' ' + chunk;
				this.updateBubble(bubble, streamedText);
			}, () => {
				this.setLoading(bubble, false);
				status.innerText = '';
				sending = false;
				send.disabled = false;
			}, error => {
				this.setLoading(bubble, false);
				status.innerText = error.streamError || error.responseText || 'Die Antwort konnte nicht erstellt werden.';
				if (!streamedText)
					bubble.remove();
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
	updateBubble(bubble, rawText) {
		var history = this._root.querySelector('history');
		var atBottom = history.scrollHeight - history.scrollTop - history.clientHeight < 100;
		var content = bubble.querySelector('message > div');
		content.innerHTML = DOMPurify.sanitize(marked.parse(rawText));
		bubble.querySelector('preview').textContent = content.innerText;
		if (atBottom)
			history.scrollTo({ top: history.scrollHeight, behavior: 'smooth' });
	}
	setLoading(bubble, loading) {
		bubble.classList.toggle('loading', loading);
		var content = bubble.querySelector('content');
		if (loading && !content.querySelector('loader')) {
			var loader = content.appendChild(document.createElement('loader'));
			loader.appendChild(document.createElement('div')).classList.add('one');
			loader.appendChild(document.createElement('div')).classList.add('two');
			loader.appendChild(document.createElement('div')).classList.add('three');
		} else if (!loading)
			content.querySelector('loader')?.remove();
	}
	renderMessage(message) {
		var history = this._root.querySelector('history');
		var bubble = this.createBubble(message);
		history.appendChild(bubble);
		history.scrollTop = history.scrollHeight;
		return bubble;
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