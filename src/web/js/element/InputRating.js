export { InputRating };

class InputRating extends HTMLElement {
	onchange = null;

	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
detailRating {
	position: relative;
	color: darkgoldenrod;
	font-size: 1.6em;
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
			element.innerHTML = `<ratingSelection style="font-size:2em;margin:0.5em 0;">
	<empty><span onclick="this.getRootNode().host.rate(event,1)">☆</span><span onclick="this.getRootNode().host.rate(event,2)">☆</span><span
			onclick="this.getRootNode().host.rate(event,3)">☆</span><span onclick="this.getRootNode().host.rate(event,4)">☆</span><span
			onclick="this.getRootNode().host.rate(event,5)">☆</span></empty>
	<full><span onclick="this.getRootNode().host.rate(event,1)">★</span><span onclick="this.getRootNode().host.rate(event,2)">★</span><span
			onclick="this.getRootNode().host.rate(event,3)">★</span><span onclick="this.getRootNode().host.rate(event,4)">★</span><span
			onclick="this.getRootNode().host.rate(event,5)">★</span></full>
	</ratingSelection>`;
			this._root.appendChild(element.children[0]);
			var full = this._root.querySelectorAll('full span');
			for (var i = 0; i < full.length; i++) {
				if ((i + 1) * 20 > this.getAttribute('value'))
					full[i].style.display = 'none';
			}
		} else {
			var element = document.createElement('detailRating');
			element.innerHTML = '<ratingSelection>' + '<empty>☆☆☆☆☆</empty><full style="width:{0}%;">★★★★★</full>'.replace('{0}', this.getAttribute('value')) + '</ratingSelection>';
			this._root.appendChild(element);
		}
	}

	setOnchange(exec) {
		this.onchange = exec;
	}

	rate(event, x) {
		var e = event.target.getRootNode().querySelectorAll('ratingSelection > full span');
		for (var i = 0; i < 5; i++)
			e[i].style.display = i < x ? '' : 'none';
		event.target.getRootNode().host.setAttribute('value', x * 20);
		if (this.onchange)
			this.onchange(x * 20);
	}
}