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
	display: block;
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
	top: 0;
}
button {
	border: none;
	background: var(--background-clickable);
	outline: none;
	cursor: pointer;
	font-family: Comfortaa, Verdana, "Helvetica Neue", Helvetica, Arial, sans-serif;
	color: white;
	font-size: 1em;
	transition: var(--transition-clickable);
	position: absolute;
	right: 0;
	top: 0;
	border-radius: 0 0.4em 0.4em 0;
	width: 2em;
	height: 1.53em;
	font-size: 1.3em;
	text-align: center;
	box-sizing: border-box;
	z-index: 4;
}`;
		var display = this._root.appendChild(document.createElement('input'));
		display.classList.add('display');
		display.style.opacity = 0;
		var password = this._root.appendChild(document.createElement('input'));
		password.type = 'password';
		var button = this._root.appendChild(document.createElement('button'));
		button.onclick = () => {
			if (parseInt(password.style.opacity) == 0) {
				password.value = display.value;
				password.style.zIndex = 3;
				password.addEventListener('transitionend', () => {
					display.style.zIndex = '';
				}, { capture: false, passive: true, once: true });
				password.style.opacity = 1;
				display.style.opacity = 0;
			} else {
				display.value = password.value;
				password.addEventListener('transitionend', () => {
					password.style.zIndex = 1;
				}, { capture: false, passive: true, once: true });
				password.style.opacity = 0;
				display.style.opacity = 1;
			}
		};
	}
}