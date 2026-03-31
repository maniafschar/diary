export { ImageCarousel };

class ImageCarousel extends HTMLElement {
	list = null;
	index = 0;
	indexImage = 0;
	time = 0;
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
div video,
autoplay video {
	width: 100%;
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
	background: rgba(100, 150, 200, 0.2);
	padding: 0.5em 1em;
	border-radius: 1em;
	outline: none;
	cursor: pointer;
	margin: 1em 0.5em 0.5em 0.5em;
	font-size: 1em;
	font-family: Comfortaa, Verdana, "Helvetica Neue", Helvetica, Arial, sans-serif;
	z-index: 2;
	color: white;
	border: none;
	z-index: 6;
}
button.icon {
	background: transparent;
	font-size: 2em;
	width: 2em;
	height: 2em;
	position: absolute;
	bottom: 0.5em;
	margin: 0;
	padding: 0;
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
	left: 50%;
	top: 0;
	text-align: center;
	z-index: 1;
	white-space: nowrap;
	overflow-x: auto;
}
data>nav dot {
	position: relative;
	display: inline-block;
	background: rgba(100, 150, 200, 0.4);
	border-radius: 1em;
	width: 2em;
	height: 2em;
	line-height: 2.1;
	color: rgba(255, 255, 255, 0.5);
	font-size: 0.8em;
	margin: 0.75em 0.5em 0 0.5em;
	cursor: pointer;
}
data>nav dot.selected {
	color: gold;
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
}
autoplay {
	display: none;
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	overflow: auto;
}
autoplay img {
	width: 100%;
}`;
		this._root.appendChild(document.createElement('style')).classList.add('custom');
		var div = this._root.appendChild(document.createElement('div'));
		var data = div.appendChild(document.createElement('data'));
		data.appendChild(document.createElement('nav'));
		var imageContainer = data.appendChild(document.createElement('imageContainer'));
		imageContainer.appendChild(document.createElement('img'));
		var video = imageContainer.appendChild(document.createElement('video'));
		video.controls = true;
		video.autoplay = true;
		video.setAttribute('playsinline', true);
		video.appendChild(document.createElement('source')).type = 'video/mp4';
		data.appendChild(document.createElement('description'));
		var next = div.appendChild(document.createElement('button'));
		next.innerText = '>';
		next.classList.add('next');
		next.classList.add('icon');
		next.onclick = () => this.navigate(true);
		var prev = div.appendChild(document.createElement('button'));
		prev.innerText = '<';
		prev.classList.add('prev');
		prev.classList.add('icon');
		prev.onclick = () => this.navigate(false);
		var close = this._root.appendChild(document.createElement('button'));
		close.onclick = () => this.close();
		close.classList.add('close');
		close.classList.add('icon');
		close.innerText = 'x';
		var autoplay = this._root.appendChild(document.createElement('autoplay'));
		autoplay.appendChild(document.createElement('img'));
		autoplay.appendChild(document.createElement('text'));
		var video = autoplay.appendChild(document.createElement('video'));
		video.controls = true;
		video.autoplay = true;
		video.setAttribute('playsinline', true);
		video.appendChild(document.createElement('source')).type = 'video/mp4';
		this._root.appendChild(document.createElement('hint'));
	}

	autoplay() {
		this._root.querySelector('autoplay').style.display = 'block';
		this._root.querySelector('div').style.display = 'none';
		var next = () => {
			this.time = new Date().getTime();
			this.indexImage--;
			if (this.indexImage < 0) {
				this.index--;
				if (this.index < 0)
					this.index = this.list.length - 1;
				this.indexImage = this.list[this.index].src.length - 1;
			}
		};
		var utter = () => {
			if (new Date().getTime() - this.time < 5000 && this.indexImage == 0) {
				setTimeout(utter, new Date().getTime() - this.time);
				return;
			}
			this._root.querySelector('autoplay').scrollTo({ top: 0, behavior: 'smooth' });
			var src = this.list[this.index].src[this.indexImage];
			var img = this._root.querySelector('autoplay img');
			var video = this._root.querySelector('autoplay video');
			if (src.indexOf('.mp4') > 0 || src.indexOf('.mov') > 0) {
				img.src = '';
				img.style.display = 'none';
				video.style.display = '';
				video.querySelector('source').src = '/med/' + src;
				video.load();
				video.play();
			} else {
				img.src = '/med/' + src;
				img.style.display = '';
				video.querySelector('source').src = '';
				video.style.display = 'none';
			}
			if (this.list[this.index].text && this.indexImage == this.list[this.index].src.length - 1) {
				setTimeout(() => {
					var utterance = new SpeechSynthesisUtterance(this.list[this.index].text);
					utterance.lang = 'de-DE';
					utterance.addEventListener('end', utter);
					next();
					if (src.indexOf('.mp4') > 0 || src.indexOf('.mov') > 0)
						video.addEventListener('ended', () => window.speechSynthesis.speak(utterance));
					else
						window.speechSynthesis.speak(utterance);
				}, 1000);
			} else {
				next();
				utter();
			}
		}
		utter();
	}

	close() {
		this._root.host.addEventListener('transitionend', () => this._root.querySelector('div').scrollTop = 0, { capture: false, passive: true, once: true });
		this._root.host.style.transform = '';
		window.speechSynthesis.cancel();
		this._root.querySelector('div video').pause();
		this._root.querySelector('autoplay video').pause();
	}

	data() {
		return this._root.querySelector('data');
	}

	open(list, index, autoplay, style) {
		if (index) {
			var id = parseInt(index.split('.')[0]);
			for (var i = 0; i < list.length; i++) {
				if (id == list[i].index) {
					this.index = i;
					break;
				}
			}
			this.indexImage = parseInt(index.split('.')[1]);
		}
		if (style)
			this._root.querySelector('style.custom').textContent = style;
		this.list = list;
		this.time = 0;
		if (autoplay)
			this.autoplay();
		else
			this.update();
		this._root.host.style.transform = 'scale(1)';
	}

	navigate(next) {
		this.indexImage = this.indexImage + (next ? 1 : -1);
		if (this.indexImage >= this.list[this.index].src.length) {
			this.indexImage = 0;
			this.index++;
			if (this.index >= this.list.length)
				this.index = 0;
		} else if (this.indexImage < 0) {
			this.index--;
			if (this.index < 0)
				this.index = this.list.length - 1;
			this.indexImage = this.list[this.index].src.length - 1;
		}
		this.update();
		this._root.querySelector('div').scrollTo({ top: 0, behavior: 'smooth' });
	}

	update() {
		this._root.querySelector('autoplay').style.display = '';
		this._root.querySelector('div').style.display = '';
		this.updateImage(this.indexImage);
		this._root.querySelector('description').innerHTML = this.list[this.index].description;
	}

	updateImage(index) {
		this.indexImage = index;
		var position = 0, total = 0;
		for (var i = 0; i < this.list.length; i++) {
			if (this.index > i)
				position += this.list[i].src.length;
			total += this.list[i].src.length;
		}
		position += this.indexImage + 1;
		this._root.querySelector('hint').innerText = position + '/' + total;
		var img = this._root.querySelector('div img');
		var video = this._root.querySelector('div video');
		var src = this.list[this.index].src[this.indexImage];
		video.pause();
		if (src.indexOf('.mp4') > 0 || src.indexOf('.mov') > 0) {
			img.src = '';
			img.style.display = 'none';
			video.style.display = '';
			video.querySelector('source').src = '/med/' + src;
			video.load();
			video.play();
		} else {
			img.src = '/med/' + src;
			img.style.display = '';
			video.querySelector('source').src = '';
			video.style.display = 'none';
		}
		this._root.querySelector('nav').textContent = '';
		if (this.list[this.index].src.length > 1) {
			var nav = this._root.querySelector('nav');
			for (var i = 0; i < this.list[this.index].src.length; i++) {
				var dot = nav.appendChild(document.createElement('dot'));
				dot.innerText = i + 1;
				dot.setAttribute('onclick', 'this.getRootNode().host.updateImage(' + i + ')');
				if (i == this.indexImage)
					dot.classList.add('selected');
			}
			nav.style.width = (3 * this.list[this.index].src.length) + 'em';
			nav.style.marginLeft = (-1.5 * this.list[this.index].src.length) + 'em';
		}
		setTimeout(() => this._root.querySelector('imageContainer').scrollTo({ left: (this._root.querySelector('imageContainer img').clientWidth - this._root.querySelector('imageContainer').clientWidth) / 2, behavior: 'smooth' }), 50);
	}
}