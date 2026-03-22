export { InputRating };

class InputRating extends HTMLElement {
	onchange = null;
	ignoreCallback = false;
	stars = 5;

	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
:host(*) {
	overflow: auto;
	max-width: 100%;
	position: relative;
	display: block;
	overflow: hidden;
}

:host(.inline),
:host(.minimal) {
	display: inline;
}

detailRating {
	position: relative;
	color: darkgoldenrod;
	font-size: 1.6em;
	text-align: center;
}

:host(.inline) detailRating {
	font-size: 1em;
}
	
:host(.minimal) detailRating {
	font-size: 0.5em;
}
		
:host(.minimal) ratingSelection full {
	color: darkblue;
}

rating,
ratingSelection {
	position: relative;
	line-height: 1;
	display: inline-block;
	white-space: nowrap;
}

rating empty,
ratingSelection empty {
	opacity: 0.5;
	position: relative;
}

rating full,
ratingSelection full {
	position: absolute;
	left: 0;
	overflow: hidden;
	top: 0;
	color: rgb(210, 225, 20);
}

ratingSelection span {
	width: 1.6em;
	display: inline-block;
	position: relative;
	cursor: pointer;
}`;
		if (!this.getAttribute('value'))
			this.setAttribute('value', 0);
		if (this.getAttribute('type') == 'edit') {
			var element = document.createElement('div');
			element.innerHTML = `<ratingSelection style="font-size:1.9em;margin:0.5em 0;">
	<empty><span onclick="this.getRootNode().host.rate(1)">☆</span><span onclick="this.getRootNode().host.rate(2)">☆</span><span
			onclick="this.getRootNode().host.rate(3)">☆</span><span onclick="this.getRootNode().host.rate(4)">☆</span><span
			onclick="this.getRootNode().host.rate(5)">☆</span></empty>
	<full><span onclick="this.getRootNode().host.rate(1)">★</span><span onclick="this.getRootNode().host.rate(2)">★</span><span
			onclick="this.getRootNode().host.rate(3)">★</span><span onclick="this.getRootNode().host.rate(4)">★</span><span
			onclick="this.getRootNode().host.rate(5)">★</span></full>
	</ratingSelection>`;
			this._root.appendChild(element.children[0]);
			var full = this._root.querySelectorAll('full span');
			for (var i = 0; i < full.length; i++) {
				if ((i + 1) * (100 / this.stars) > this.getAttribute('value'))
					full[i].style.display = 'none';
			}
		} else {
			this._root.appendChild(document.createElement('detailRating'));
			this.rate(parseFloat(this.getAttribute('value')));
		}
	}
	static get observedAttributes() { return ['value']; }

	attributeChangedCallback(name, oldValue, newValue) {
		if (!this.ignoreCallback)
			this.rate(newValue / (100 / this.stars));
	}

	setOnchange(exec) {
		this.onchange = exec;
	}

	rate(x) {
		this.ignoreCallback = true;
		if (this._root.host.getAttribute('type') == 'edit' && x == this._root.host.getAttribute('value') / (100 / this.stars))
			x = 0;
		if (this.getAttribute('type') == 'edit') {
			var e = this._root.querySelectorAll('ratingSelection > full span');
			for (var i = 0; i < e.length; i++)
				e[i].style.display = i < x ? '' : 'none';
			this._root.host.setAttribute('value', x * (100 / this.stars));
			e = this._root.querySelector('ratingSelection > full');
			if (e)
				e.style.width = (x * (100 / this.stars)) + '%';
			if (this.onchange)
				this.onchange(x * (100 / this.stars));
		} else {
			var element = this._root.querySelector('detailRating');
			if (element) {
				if (this.classList.contains('minimal'))
					element.innerHTML = '<ratingSelection><empty>☆☆☆</empty><full style="width:' + (x < 60 ? x * 10 / 6 : 100) + '%;">★★★</full><br />' +
						'<empty>☆☆</empty><full style="width:' + (x > 60 ? (x - 60) / 20 : 0) + 'em;top:1em;margin-left:0.5em;">★★</full></ratingSelection>';
				else
					element.innerHTML = '<ratingSelection><empty>☆☆☆☆☆</empty><full style="width:' + x + '%;">★★★★★</full></ratingSelection>';
			}
		}
		this.ignoreCallback = false;
	}
}