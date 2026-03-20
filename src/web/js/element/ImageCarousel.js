export { ImageCarousel };

class ImageCarousel extends HTMLElement {
	list = null;
	index = 0;
	indexImage = 0;
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
	font-size: 1em;
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
hint {
	font-size: 1.3em;
	position: absolute;
	left: 50%;
	bottom: 1.6em;
	color: rgba(255, 255, 255, 0.4);
	width: 8em;
	margin-left: -4em;
}
button {
	border-radius: 1em;
	cursor: pointer;
	font-family: Comfortaa, Verdana, "Helvetica Neue", Helvetica, Arial, sans-serif;
	border: none;
	background: transparent;
	font-size: 2em;
	width: 2em;
	height: 2em;
	position: absolute;
	bottom: 0.5em;
	margin: 0;
	padding: 0;
	outline: none;
	z-index: 6;
	color: rgba(255, 255, 255, 0.9);
}
button.edit {
	width: 1em;
	height: 1em;
	bottom: inherit;
	right: 0;
}
button img {
	width: 50%;
	height: 50%;
}
data {
	position: relative;
	display: block;
}
data description {
	border: solid 2em transparent;
	position: relative;
	display: block;
	overflow-x: hidden;
}
imageContainer {
	overflow: auto;
	position: relative;
	display: block;
	width: 100%;
}
data>nav {
	position: absolute;
	left: 0;
	top: 0;
	right: 0;
	text-align: center;
	z-index: 1;
	padding: 0.5em;
	white-space: nowrap;
	overflow-x: auto;
}
data>nav dot {
	position: relative;
	display: inline-block;
	background: rgba(100, 150, 200, 0.4);
	border-radius: 1.5em;
	width: 3em;
	height: 3em;
	line-height: 3;
	color: rgba(255, 255, 255, 0.5);
	font-size: 0.8em;
	margin: 0.5em;
}
button.next {
	right: 0.5em;
}
button.prev {
	left: 0.5em;
	}
button.close {
	right: 0.5em;
	top: 0.5em;
}
a {
	text-decoration: none;
	color: darkblue;
	cursor: pointer;
	position: relative;
	display: inline-block;
}

label {
	position: relative;
	color: darkmagenta;
	font-size: 0.8em;
	background: rgba(255, 255, 255, 0.4);
	padding: 0.5em;
	border-radius: 0.5em 0.5em 0 0;
	clear: left;
	float: left;
}

value {
	position: relative;
	min-width: 7em;
	max-height: 20em;
	max-width: 100%;
	margin-bottom: 1em;
	line-height: 1.5;
	overflow: auto;
	padding: 0.5em;
	border-radius: 0 0.5em 0.5em 0.5em;
	background: rgba(255, 255, 255, 0.4);
	float: left;
	clear: left;
	user-select: text;
	box-sizing: border-box;
}

field {
	position: relative;
	display: block;
	min-height: 1.5em;
	padding: 0.5em;
	border-radius: 0 0.5em 0.5em 0.5em;
	background: rgba(255, 255, 255, 0.4);
	margin-bottom: 1em;
	clear: left;
}

textarea,
input {
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
}

input[type="file"] {
	opacity: 0;
	cursor: pointer;
	position: absolute;
	top: 0;
	left: 0;
	bottom: 0;
	right: 0;
	display: block;
	height: 100%;
}

textarea {
	height: 5em;
	padding-top: 0.5em;
	overflow-y: auto;
	resize: none;
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
		data.appendChild(document.createElement('nav'));
		data.appendChild(document.createElement('imageContainer')).appendChild(document.createElement('img'));
		data.appendChild(document.createElement('description'));
		var next = div.appendChild(document.createElement('button'));
		next.innerText = '>';
		next.classList.add('next');
		next.onclick = () => this.navigate(true);
		var prev = div.appendChild(document.createElement('button'));
		prev.innerText = '<';
		prev.classList.add('prev');
		prev.onclick = () => this.navigate(false);
		var close = this._root.appendChild(document.createElement('button'));
		close.onclick = () => this.close();
		close.classList.add('close');
		close.innerText = 'x';
		this._root.appendChild(document.createElement('hint'));
	}

	close() {
		this._root.host.style.transform = '';
	}

	data() {
		return this._root.querySelector('data');
	}

	open(list, index, style) {
		if (index) {
			this.index = parseInt(index.split('.')[0]);
			this.indexImage = parseInt(index.split('.')[1]);
		}
		if (style)
			this._root.appendChild(document.createElement('style')).textContent = style;
		this.list = list;
		for (var i = 0; i < list.length; i++) {
			if (this.index == list[i].index) {
				this.index = i - 1;
				break;
			}
		}
		this.navigate(true);
		this._root.host.style.transform = 'scale(1)';
	}

	navigate(next) {
		this.index = this.index + (next ? 1 : -1);
		if (this.index >= this.list.length)
			this.index = next ? 0 : this.list.length - 1;
		else if (this.index < 0)
			this.index = next ? 0 : this.list.length - 1;
		this.indexImage = 0;
		this.navigateImage(this.indexImage);
		this._root.querySelector('description').innerHTML = this.list[this.index].description;
		this._root.querySelector('div').scrollTo({ top: 0, behavior: 'smooth' });
		this._root.querySelector('hint').innerText = (this.index + 1) + '/' + this.list.length;
		this._root.querySelector('nav').textContent = '';
		if (this.list[this.index].src.length > 1) {
			var nav = this._root.querySelector('nav');
			for (var i = 0; i < this.list[this.index].src.length; i++) {
				var dot = nav.appendChild(document.createElement('dot'));
				dot.innerText = i + 1;
				dot.setAttribute('onclick', 'this.getRootNode().host.navigateImage(' + i + ')');
			}
		}
		setTimeout(() => this._root.querySelector('imageContainer').scrollTo({ left: (this._root.querySelector('imageContainer img').clientWidth - this._root.querySelector('imageContainer').clientWidth) / 2, behavior: 'smooth' }), 50);
	}

	navigateImage(index) {
		this.indexImage = index;
		this._root.querySelector('img').src = '/med/' + this.list[this.index].src[this.indexImage];
	}
}