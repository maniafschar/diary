export { InputSelection };

class InputSelection extends HTMLElement {
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

items {
	max-height: 12em;
	position: relative;
	display: block;
	overflow: auto;
	margin-top: 0.5em;
}

item {
	position: relative;
	display: block;
	padding: 0.5em 0.5em 0.5em 1.5em;
	cursor: pointer;
}

item.selected {
	font-weight: bold;
}

item.selected::before {
	content: '✓';
	position: absolute;
	left: 0.1em;
	top: 0.5em;
}
input {
	display: none;
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
}`;
		this._root.appendChild(document.createElement('input')).onkeyup = this.filter;
		this._root.appendChild(document.createElement('items'));
	}
	add(id, label) {
		var item = this._root.querySelector('items').appendChild(document.createElement('item'));
		item.innerText = label;
		item.setAttribute('i', id);
		item.setAttribute('onclick', 'this.getRootNode().host.onclick(event)');
		if (this.getAttribute('value') == id || !this.getAttribute('value') && this._root.querySelectorAll('item').length == 1) {
			item.classList.add('selected');
			this.setAttribute('value', id);
		}
		this._root.querySelector('input').style.display = this._root.querySelectorAll('item').length > 10 ? 'block' : '';
	}
	onclick(event) {
		var e = event.target;
		if (event.target.classList.contains('selected'))
			return;
		while (e.previousElementSibling)
			e = e.previousElementSibling;
		while (e.nextElementSibling) {
			e.classList.remove('selected');
			e = e.nextElementSibling;
		}
		e.classList.remove('selected');
		event.target.classList.add('selected');
		this.setAttribute('value', event.target.getAttribute('i'));
		this.dispatchEvent(new CustomEvent('changed'));
	}
	clear() {
		this._root.querySelector('items').textContent = '';
	}
	filter() {
		var text = this.getRootNode().host.querySelector('input').value;
		var items = this.getRootNode().host.querySelectorAll('item');
		for (var i = 0; i < list.length; i++)
			items[i].style.display = items[i].innerText.indexOf(text) > -1 ? '' : 'none';
	}
}