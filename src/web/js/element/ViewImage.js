
export { ViewImage };

class ViewImage extends HTMLElement {
	loading = false;
	list = null;
	index = 0;
	speak = false;
	speakJob = null;
	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}
	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
:host(*) {
	transform: scale(0);
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
	z-index: 450;
}
*::-webkit-scrollbar {
	display: none;
}
div {
	overflow: auto;
	width: 100%;
	height: 100%;
}
imageContainer {
	position: relative;
	display: block;
	width: 100%;
	transition: all .4s ease-out;
	overflow: hidden;
}
imageContainer img {
	width: 100%;
	transition: all .4s ease-out;
	position: relative;
}
imageContainer video {
	width: 100%;
	transition: all .4s ease-out;
	position: relative;
}
imageContainer img.next,
imageContainer video.next {
	position: absolute;
	left: 0;
	top: 0;
	opacity: 0;
}
hint {
	font-size: 1.3em;
	position: absolute;
	left: 50%;
	bottom: 1.6em;
	color: rgba(255, 255, 255, 0.4);
	width: 8em;
	margin-left: -4em;
	cursor: pointer;
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
	border: solid 2vw transparent;
	position: relative;
	display: block;
	overflow-x: hidden;
	transition: all 0.4s ease-out;
	width: 100%;
	box-sizing: border-box;
}
data description.next {
	position: absolute;
	left: 0;
	opacity: 0;
}
data>nav {
	position: fixed;
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
	box-sizing: border-box;
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
		this._root.appendChild(document.createElement('style')).classList.add('custom');
		var div = this._root.appendChild(document.createElement('div'));
		var data = div.appendChild(document.createElement('data'));
		data.appendChild(document.createElement('nav'));
		var imageContainer = data.appendChild(document.createElement('imageContainer'));
		imageContainer.appendChild(document.createElement('img'));
		var video = imageContainer.appendChild(document.createElement('video'));
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
		this._root.appendChild(document.createElement('hint'));
	}

	toggleSpeak() {
		this.speak = !this.speak;
		if (this.speak)
			this.speakText();
		else
			window.speechSynthesis.cancel();
	}

	speakText() {
		window.speechSynthesis.cancel();
		clearTimeout(this.speakJob);
		var utterance = new SpeechSynthesisUtterance(this.list[this.index].text);
		utterance.lang = 'de-DE';
		this.speakJob = setTimeout(() => window.speechSynthesis.speak(utterance), 400);
	}

	isVideo(src) {
		return src.indexOf('.mp4') > 0 || src.indexOf('.mov') > 0;
	}

	close() {
		this._root.host.addEventListener('transitionend',
			() => this._root.querySelector('div').scrollTop = 0, { capture: false, passive: true, once: true });
		this._root.host.style.transform = '';
		window.speechSynthesis.cancel();
		this._root.querySelector('div video').pause();
	}

	data() {
		return this._root.querySelector('data');
	}

	open(list, index, style) {
		var img = this._root.querySelector('imageContainer img');
		img.src = '';
		img.style.display = 'none';
		var video = this._root.querySelector('imageContainer video');
		video.querySelector('source').src = '';
		video.style.display = 'none';
		if (index) {
			for (var i = 0; i < list.length; i++) {
				if (index == list[i].index) {
					this.index = i;
					break;
				}
			}
		}
		if (style)
			this._root.querySelector('style.custom').textContent = style;
		this.list = list;
		this.update(true);
		this._root.host.style.transition = 'all ease-out .4s';
		this._root.host.style.transform = 'scale(1)';
	}

	navigate(forward) {
		if (this.loading)
			return;
		this.loading = true;
		if (this.list[this.index].src.length > 1) {
			if (forward) {
				var e = this._root.querySelector('nav dot.selected').nextElementSibling;
				if (e) {
					e.click();
					return;
				}
			} else {
				var e = this._root.querySelector('nav dot.selected').previousElementSibling;
				if (e) {
					e.click();
					return;
				}
			}
		}
		this.index = this.index + (forward ? 1 : -1);
		if (this.index >= this.list.length)
			this.index = 0;
		else if (this.index < 0)
			this.index = this.list.length - 1;
		this.update(forward);
	}

	update(forward) {
		this._root.querySelector('div').style.display = '';
		var description = this._root.querySelector('description');
		var nav = this._root.querySelector('nav');
		description.addEventListener('transitionend', () => {
			description.previousSibling.classList.remove('next');
			description.remove();
			nav.textContent = '';
			if (this.list[this.index].src.length > 1) {
				for (var i = 0; i < this.list[this.index].src.length; i++) {
					var dot = nav.appendChild(document.createElement('dot'));
					dot.innerText = i + 1;
					dot.setAttribute('onclick', 'this.getRootNode().host.updateImage(' + i + ')');
				}
				nav.querySelector('dot').classList.add('selected');
				nav.style.width = (3 * this.list[this.index].src.length) + 'em';
				nav.style.marginLeft = (-1.5 * this.list[this.index].src.length) + 'em';
			}
			var utterance = null;
			if (this.speak && (!this.list[this.index].src?.length || !this.isVideo(this.list[this.index].src[0])))
				this.speakText();
			this.updateImage(forward ? 0 : this.list[this.index].src.length - 1, utterance);
		}, { once: true });
		var next = description.parentElement.insertBefore(document.createElement('description'), description);
		next.classList.add('next');
		next.innerHTML = this.list[this.index].description;
		setTimeout(() => { description.style.opacity = 0; next.style.opacity = 1; }, 50);
		var position = 0;
		for (var i = 0; i < this.list.length; i++) {
			if (this.index > i)
				position++;
		}
		this._root.querySelector('hint').innerText = (position + 1) + '/' + this.list.length;
	}

	updateImage(index) {
		var data = this._root.querySelector('data');
		var nav = data.querySelector('nav');
		var imageContainer = data.querySelector('imageContainer');
		var img = imageContainer.querySelector('img');
		var video = imageContainer.querySelector('video');
		video.pause();
		var src = this.list[this.index].src[index];
		if (src) {
			var selectDot = () => {
				if (nav.querySelector('dot')) {
					nav.querySelector('dot.selected').classList.remove('selected');
					nav.querySelectorAll('dot')[index].classList.add('selected');
				}
			};
			var current = video.style.display == 'none' ? img : video;
			if (this.isVideo(src)) {
				current.addEventListener('transitionend', () => {
					img.src = '';
					img.style.display = 'none';
					next.classList.remove('next');
					next.previousSibling.remove();
					selectDot();
					this.loading = false;
					setTimeout(() => {
						imageContainer.style.height = (next.videoHeight * window.innerWidth / next.videoWidth) + 'px';
						if (this.list[this.index].src[index].text)
							next.addEventListener('ended', this.speakText);
						next.play();
					}, 50);
				}, { once: true });
				var next = video.parentElement.appendChild(document.createElement('video'));
				next.controls = true;
				next.autoplay = true;
				next.setAttribute('playsinline', true);
				next.classList.add('next');
				next.appendChild(document.createElement('source')).src = '/med/' + src;
				next.load();
				setTimeout(() => current.style.opacity = 0, 50);
			} else {
				setTimeout(() => document.dispatchEvent(new CustomEvent('progressbar', { detail: { type: 'open' } })), 400);
				var image = new Image();
				image.onload = () => {
					document.dispatchEvent(new CustomEvent('progressbar'));
					imageContainer.style.height = (image.naturalHeight * window.innerWidth / image.naturalWidth) + 'px';
					var next = img.parentElement.insertBefore(image, video);
					next.classList.add('next');
					selectDot();
					var cleanUp = first => {
						if (first == true) {
							next.style.opacity = 0;
							setTimeout(() => next.style.opacity = 1, 50);
						}
						next.classList.remove('next');
						next.previousSibling.remove();
						video.querySelector('source').src = '';
						video.style.display = 'none';
						this.loading = false;
					};
					if (current.src?.indexOf('/med/') > 0 || current.querySelector('source')?.src)
						current.addEventListener('transitionend', cleanUp, { once: true });
					else
						cleanUp(true);
					setTimeout(() => { current.style.opacity = 0; next.style.opacity = 1; }, 50);
				};
				image.onerror = () => this.loading = false;
				image.src = '/med/' + src;
			}
		} else {
			imageContainer.style.height = 0;
			this.loading = false;
		}
	}
}