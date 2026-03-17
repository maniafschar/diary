export { ImageCarousel };

class ImageCarousel extends HTMLElement {
	list = null;
	index = 0;
	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}
	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
:host(*){
	transform: scale(0);
	transition: all ease-out .4s;
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 4;
	background: linear-gradient(135deg, #fff, #fffaf7 10%, #fff3ea 20%, #f5f3f0 33%, #ddf3ff 66%, #d0f1c9) 50% fixed;
	display: flex;
	align-items: center;
}
*::-webkit-scrollbar {
	display: none;
}
div {
	overflow: auto;
	width: 100%;
	height: 100%;
}
div img {
	min-width: 100%;
	min-height: 100%;
}
button {
	font-size: 2em;
	width: 2em;
	height: 2em;
	position: absolute;
	background: transparent;
	bottom: 0;
	outline: none;
	cursor: pointer;
	font-family: Comfortaa, Verdana, "Helvetica Neue", Helvetica, Arial, sans-serif;
	color: rgba(255, 255, 255, 0.6);
	border: none;
}
data {
	position: relative;
	display: block;
}
data description {
	border: solid 2em transparent;
	position: relative;
	display: block;
}
imageContainer {
	overflow: auto;
	position: relative;
	display: block;
	width: 100%;
}
button.next {
	right: 0;
}
button.prev {
	left: 0;
}
close {
	position: absolute;
	top: 0;
	right: 0;
	width: 2em;
	cursor: pointer;
	display: block;
	color: rgba(255, 255, 255, 0.6);
	font-size: 2em;
	padding: 0.25em 0;
}
a {
	text-decoration: none;
	color: darkblue;
	cursor: pointer;
	position: relative;
	display: inline-block;
}`;
		var div = this._root.appendChild(document.createElement('div'));
		var data = div.appendChild(document.createElement('data'));
		data.appendChild(document.createElement('imageContainer')).appendChild(document.createElement('img'));
		data.appendChild(document.createElement('description'));
		var next = div.appendChild(document.createElement('button'));
		next.innerText = '>';
		next.classList.add('icon');
		next.classList.add('next');
		next.onclick = () => this.navigate(true);
		var prev = div.appendChild(document.createElement('button'));
		prev.innerText = '<';
		prev.classList.add('icon');
		prev.classList.add('prev');
		prev.onclick = () => this.navigate(false);
		var close = this._root.appendChild(document.createElement('close'));
		close.onclick = () => this.close();
		close.innerText = 'x';
	}

	close() {
		this._root.host.style.transform = '';
	}

	open(list, i, style) {
		if (style)
			this._root.appendChild(document.createElement('style')).textContent = style;
		this.list = list;
		this.index = i;
		this._root.querySelector('img').src = list[i].src;
		this._root.querySelector('description').innerHTML = list[i].description;
		this._root.host.style.transform = 'scale(1)';
	}

	navigate(next) {
		this.index = this.index + (next ? 1 : -1);
		if (this.index >= this.list.length)
			this.index = next ? 0 : this.list.length - 1;
		else if (this.index < 0)
			this.index = next ? 0 : this.list.length - 1;
		this._root.querySelector('img').src = this.list[this.index].src;
		this._root.querySelector('description').innerHTML = this.list[this.index].description;
	}
}