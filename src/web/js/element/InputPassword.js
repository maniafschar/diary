export { InputPassword };

class InputPassword extends HTMLElement {
	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}
	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
:host(*) {
	display: block;
	position: relative;
}

*::-webkit-scrollbar {
	display: none;
}	

input {
	margin-bottom: 0.5em;
	appearance: none;
	position: relative;
	font-size: 1em;
	font-weight: normal;
	outline: none !important;
	font-family: Comfortaa, Verdana, "Helvetica Neue", Helvetica, Arial, sans-serif !important;
	height: 2em;
	padding: 0em 0.75em;
	border-radius: 0.5em;
	background: rgba(255, 255, 255, 0.85);
	vertical-align: top;
	border: none;
	width: 100%;
	color: black;
	user-select: text;
	opacity: 0.5;
	transition: all .4s ease-out;
	box-sizing: border-box;
}
input.display {
	position: absolute;
	display: block;
}
button {
	border: none;
	background: var(--background-clickable);
	outline: none;
	cursor: pointer;
	font-family: Comfortaa, Verdana, "Helvetica Neue", Helvetica, Arial, sans-serif;
	color: white;
	font-size: 1em;
	transition: var(--transition-clickable)
	position: absolute;
	right: -0.11em;
	border-radius: 0 0.4em 0.4em 0;
	width: 2em;
	height: 1.53em;
	font-size: 1.3em;
	text-align: center;
	box-sizing: border-box;
}`;
		var password = this._root.appendChild(document.createElement('input'));
		password.type = 'password';
		var display = this._root.appendChild(document.createElement('input'));
		display.classList.add('display');
		var button = this._root.appendChild(document.createElement('button'));
		button.onclick = () => {
			var password = this._root.querySelector('input[type="password"]');
			if (password.style.opacity == 0) {
				display.style.zIndex = '';
				password.style.opacity = 1;
			} else {
				password.style.opacity = 0;
				this._root.querySelector('input.display').value = password.value;
				password.addEventListener('transitionend', () => {
					display.style.zIndex = 2;
				}, { capture: false, passive: true, once: true });
			}
		};
	}
}