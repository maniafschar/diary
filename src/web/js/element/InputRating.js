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
	<empty>${star(1)}${star(2)}${star(3)}${star(4)}${star(5)}</empty>
	<full>${star(1,true)}${star(2,true)}${star(3,true)}${star(4,true)}${star(5,true)}</full>
	</ratingSelection>`;
			this._root.appendChild(element.children[0]);
		} else
			this._root.appendChild(document.createElement('detailRating'));
		this.rate(parseFloat(this.getAttribute('value')));
	}
	static get observedAttributes() { return ['value']; }
	static star(no, full) {
		return '<svg width="24" height="24" viewBox="0 0 16 16" stroke="' + (full ? 'transparent' : 'black') + '" fill="' + (full ? 'rgb(210, 225, 20)' : 'transparent') + '"' + (no ? ' onclick="this.getRootNode().host.rate(' + no + ', true)"' : '') + '><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"></path></svg>';
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (!this.ignoreCallback)
			this.rate(newValue / (100 / this.stars));
	}

	setOnchange(exec) {
		this.onchange = exec;
	}

	rate(x, click) {
		this.ignoreCallback = true;
		if (this._root.host.getAttribute('type') == 'edit' && x == this._root.host.getAttribute('value') / (100 / this.stars))
			x = 0;
		if (this.getAttribute('type') == 'edit') {
			var e = this._root.querySelectorAll('ratingSelection > full span');
			for (var i = 0; i < e.length; i++)
				e[i].style.display = i < x ? '' : 'none';
			e = this._root.querySelector('ratingSelection > full');
			if (e)
				e.style.width = (x * (100 / this.stars)) + '%';
			this._root.host.setAttribute('value', x * (100 / this.stars));
			if (this.onchange && click)
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
