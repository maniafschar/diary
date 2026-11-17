export { ViewStatistics };

class ViewStatistics extends HTMLElement {
	MAX_WORDS = 100;
	text;
	rating;
	places;

	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		this.parentElement.addEventListener('visible', () => this.init());
		this._root.appendChild(document.createElement('style')).textContent = `
:host(*) {
	width: 100%;
	height: 100%;
	position: relative;
	display: flex;
	flex-direction: column;
}
*::-webkit-scrollbar {
	display: none;
}
trend {
	position: relative;
	display: block;
	flex: none;
	width: 100%;
	height: 7em;
	box-sizing: border-box;
	padding: 0 0.5em;
}
trend svg {
	display: block;
	width: 100%;
	height: 3.5em;
	margin-top: 0.5em;
	overflow: visible;
	touch-action: pan-y;
	cursor: pointer;
}
trend tip {
	position: absolute;
	top: 4.2em;
	left: 0;
	display: none;
	pointer-events: none;
	white-space: nowrap;
	font-size: 0.75em;
	padding: 0.3em 0.6em;
	border-radius: 0.4em;
	background: var(--background-content);
	box-shadow: 0 0.1em 0.4em rgba(0, 0, 0, 0.25);
	color: rgba(0, 0, 0, 0.75);
	z-index: 1;
}
trend tip::before {
	content: '';
	position: absolute;
	top: -0.4em;
	left: var(--arrow, 50%);
	transform: translateX(-50%);
	border: 0.4em solid transparent;
	border-top: none;
	border-bottom-color: var(--background-content);
}
trend tip.visible {
	display: block;
}
trend polyline {
	fill: none;
	vector-effect: non-scaling-stroke;
	stroke-width: 2;
}
trend polyline.raw {
	stroke: rgba(0, 0, 0, 0.25);
	stroke-width: 1;
}
trend polyline.avg {
	stroke: hsl(210 80% 45%);
}
trend info {
	display: block;
	font-size: 0.8em;
	text-align: center;
	color: rgba(0, 0, 0, 0.7);
}
wordcloud {
	position: relative;
	display: block;
	width: 100%;
	flex: 1;
	min-height: 0;
	overflow: hidden;
	text-align: center;
}
word {
	position: absolute;
	cursor: pointer;
	user-select: none;
	white-space: nowrap;
}
word.vertical {
	transform: translate(-100%, 0) rotate(-90deg);
	transform-origin: 100% 0;
}
places {
	position: absolute;
	z-index: 1;
	display: inline-block;
	flex: none;
	text-align: left;
	width: fit-content;
	background: rgba(255, 255, 255, 0.7);
	padding: 0.5em;
	margin: 0.5em;
	border-radius: 1em;
	box-shadow: 0 0 0.5em rgba(0, 0, 0, 0.1);
}
places[hidden] {
	display: none;
}
places details {
	position: absolute;
	top: 0.25em;
	left: 0.5em;
	width: min(22em, calc(100% - 1em));
	box-sizing: border-box;
	border-radius: 0.5em;
	background: #fff;
	box-shadow: 0 0.1em 0.5em rgba(0, 0, 0, 0.2);
}
places label::before {
	content: '>';
	color: rgba(0, 0, 0, 0.3);
	position: absolute;
	margin-left: -1em;
	transition: all 0.4s ease-out;
}
places.open label {
	font-weight: bold;
}
places.open label::before {
	transform: rotate(90deg);
	color: black;
}
places label {
	text-align: left;
	margin: 0.5em;
	display: grid;
	grid-template-rows: 0fr;
	transition: grid-template-rows 0.4s ease-out;
	line-height: 1.5;
	cursor: pointer;
	user-select: none;
	padding-left: 1em;
}
places.open list {
	grid-template-rows: 1fr;
}
places list {
	transition: all .4s ease-out;
	display: grid;
	grid-template-rows: 0fr;
}
places list>div {
	min-height: 0;
	display: inline-block;
	max-height: min(40vh, 20em);
	overflow-y: auto;
}
places place {
	display: block;
	cursor: pointer;
	overflow-wrap: anywhere;
	line-height: 1.3;
}
places place no {
	font-size: 0.7em;
	margin-left: 0.4em;
	opacity: 0.6;
}
chart {
	position: relative;
	height: 6em;
	display: block;
	flex: none;
	width: 100%;
	overflow-x: auto;
	overflow-y: hidden;
	border-left: solid 0.5em transparent;
	border-right: solid 0.5em transparent;
	box-sizing: border-box;
}
chart plot,
chart axis {
	display: grid;
	grid-auto-flow: column;
	grid-auto-columns: minmax(1.5em, 1fr);
	gap: 0.25em;
}
chart plot {
	align-items: end;
	height: 55%;
}
chart axis {
	height: 20%;
	align-items: start;
}
chart bar {
	position: relative;
	display: block;
	height: var(--height);
	min-height: 0.2em;
	border-radius: 0.2em;
}
chart bar span {
	position: absolute;
	left: 0;
	right: 0;
	text-align: center;
	font-size: 0.8em;
	bottom: 0;
	opacity: 0.8;
	color: white;
}
chart tick {
    opacity: 0.5;
	font-size: 0.8em;
	white-space: nowrap;
	text-align: center;
	overflow: visible;
	transform: rotate(-45deg) translate(-15px, 0);
	transform-origin: top center;
	color: rgba(0, 0, 0, 0.7);
}
chart bar[title] {
	cursor: pointer;
}
chart tick,
chart bar {
	box-sizing: border-box;
	min-width: 0.35em;
	max-width: 2em;
	justify-self: center;
	width: 100%;
}`;
		this._root.appendChild(document.createElement('places'));
		this._root.appendChild(document.createElement('wordcloud'));
		const trend = this._root.appendChild(document.createElement('trend'));
		trend.appendChild(document.createElement('info'));
		trend.appendChild(document.createElement('tip'));
		this._root.appendChild(document.createElement('chart'));
	}

	init() {
		this._root.querySelector('wordcloud').textContent = '';
		this._root.querySelector('chart').textContent = '';
		var tokens = this.extract();
		if (tokens.length > this.MAX_WORDS)
			tokens = tokens.slice(0, this.MAX_WORDS);
		this.renderPlaces();
		this.renderWordcloud(tokens);
		this.renderRating();
		this.renderTrend();
	}

	renderTrend() {
		const trend = this._root.querySelector('trend');
		trend.querySelector('svg')?.remove();
		const info = trend.querySelector('info');
		const tip = trend.querySelector('tip');
		tip.classList.remove('visible');
		const DAY = 864e5;
		const WINDOW = 30 * DAY;
		const points = (this.rating || [])
			.map(entry => {
				const date = new Date(entry.date);
				date.setHours(0, 0, 0, 0);
				return { time: date.getTime(), value: Math.max(0, Math.min(100, entry.rating)), entry: entry };
			})
			.sort((a, b) => a.time - b.time);
		if (points.length < 2) {
			info.textContent = 'Zu wenig Einträge für eine Trendanalyse';
			return;
		}

		// Gleitender Durchschnitt über die letzten 30 Tage, bezogen auf die Tage mit Eintrag.
		let start = 0;
		let sum = 0;
		points.forEach((point, i) => {
			sum += point.value;
			while (points[start].time <= point.time - WINDOW) {
				sum -= points[start].value;
				start++;
			}
			point.average = sum / (i - start + 1);
		});

		// Lineare Regression über die Tagesbewertungen.
		const t0 = points[0].time;
		const xs = points.map(point => (point.time - t0) / DAY);
		const n = points.length;
		const meanX = xs.reduce((a, b) => a + b, 0) / n;
		const meanY = points.reduce((a, point) => a + point.value, 0) / n;
		let cov = 0;
		let varX = 0;
		points.forEach((point, i) => {
			cov += (xs[i] - meanX) * (point.value - meanY);
			varX += (xs[i] - meanX) ** 2;
		});
		const slopePerDay = varX > 0 ? cov / varX : 0;
		const starsPerMonth = slopePerDay * 30 / 20;
		const format = (value, digits) => value.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
		const direction = Math.abs(starsPerMonth) < 0.05 ? '→ stabil'
			: starsPerMonth > 0 ? '↑ steigend' : '↓ fallend';
		info.textContent = `${direction} (${starsPerMonth > 0 ? '+' : ''}${format(starsPerMonth, 2)} Sterne/Monat) · Ø ${format(meanY / 20, 1)} Sterne · ${n} Tage mit Eintrag`;

		const ns = 'http://www.w3.org/2000/svg';
		const width = 1000;
		const height = 100;
		const span = points[n - 1].time - t0;
		const svg = document.createElementNS(ns, 'svg');
		svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
		svg.setAttribute('preserveAspectRatio', 'none');
		const toPoints = key => points
			.map(point => `${((point.time - t0) / span * width).toFixed(1)},${(height - point[key] / 100 * height).toFixed(1)}`)
			.join(' ');
		[['raw', 'value'], ['avg', 'average']].forEach(([cls, key]) => {
			const line = document.createElementNS(ns, 'polyline');
			line.setAttribute('class', cls);
			line.setAttribute('points', toPoints(key));
			svg.appendChild(line);
		});
		const nearestAt = clientX => {
			const rect = svg.getBoundingClientRect();
			const px = Math.max(0, Math.min(width, (clientX - rect.left) / rect.width * width));
			const dayX = point => (point.time - t0) / span * width;
			return points.reduce((best, point) => Math.abs(dayX(point) - px) < Math.abs(dayX(best) - px) ? point : best);
		};
		const showAt = clientX => {
			const svgRect = svg.getBoundingClientRect();
			const trendRect = trend.getBoundingClientRect();
			const entry = nearestAt(clientX).entry;
			const x = svgRect.left - trendRect.left + (nearestAt(clientX).time - t0) / span * svgRect.width;
			tip.textContent = `${new Date(entry.date).toLocaleDateString('de-DE')} · ${entry.ids.length} ${entry.ids.length == 1 ? 'Eintrag' : 'Einträge'} · Ø ${format(entry.rating / 20, 1)} Sterne`;
			tip.classList.add('visible');
			const left = Math.max(0, Math.min(trend.clientWidth - tip.offsetWidth, x - tip.offsetWidth / 2));
			tip.style.left = left + 'px';
			tip.style.setProperty('--arrow', (x - left) + 'px');
		};
		const hide = () => tip.classList.remove('visible');
		svg.addEventListener('pointerdown', event => {
			svg.setPointerCapture(event.pointerId);
			showAt(event.clientX);
		});
		svg.addEventListener('pointermove', event => showAt(event.clientX));
		svg.addEventListener('pointerup', event => event.pointerType != 'mouse' && hide());
		svg.addEventListener('pointercancel', hide);
		svg.addEventListener('pointerleave', event => event.pointerType == 'mouse' && hide());
		svg.addEventListener('click', event => this.dispatchEvent(new CustomEvent('openday', {
			detail: nearestAt(event.clientX).entry,
			bubbles: true,
			composed: true
		})));
		trend.insertBefore(svg, info);
	}

	renderPlaces() {
		const container = this._root.querySelector('places');
		container.textContent = '';
		const places = this.places || [];
		container.hidden = !places.length;
		if (!places.length)
			return;
		const label = document.createElement('label');
		label.textContent = 'Orte';
		label.addEventListener('click', () => {
			if (container.classList.contains('open'))
				container.classList.remove('open');
			else
				container.classList.add('open');
		});
		container.appendChild(label);
		const list = container.appendChild(document.createElement('list')).appendChild(document.createElement('div'));
		const fontSize = parseInt(document.body.style.fontSize) || 16;
		const min = places[places.length - 1].count;
		const max = places[0].count;
		places.forEach(token => {
			const ratio = max == min ? 1 : (token.count - min) / (max - min);
			const place = list.appendChild(document.createElement('place'));
			place.innerText = token.text;
			place.appendChild(document.createElement('no')).innerText = token.count;
			place.style.opacity = 0.45 + ratio * 0.55;
			place.addEventListener('click', () => this.dispatchEvent(new CustomEvent('details', {
				detail: token,
				bubbles: true,
				composed: true
			})));
		});
	}

	renderWordcloud(tokens) {
		var fontSize = parseInt(document.body.style.fontSize);
		var positions = [];
		if (tokens.length == 0)
			return positions;
		var wordcloud = this._root.querySelector('wordcloud');
		var min = tokens[tokens.length - 1].count;
		var max = tokens[0].count;
		var width = wordcloud.offsetWidth;
		var height = wordcloud.offsetHeight;
		var nextLoop = true;
		for (var i = 0; i < tokens.length; i++) {
			const next = { word: document.createElement('word'), token: tokens[i] };
			next.word.innerText = next.token.text;
			next.word.style.fontSize = (((next.token.count - min) / (max - min) + 0.8) * fontSize) + 'px';
			next.word.addEventListener('click', event => {
				this.dispatchEvent(new CustomEvent('details', {
					detail: next.token,
					bubbles: true,
					composed: true
				}));
			});
			wordcloud.appendChild(next.word);
			if (i == 0) {
				next.x = (width - next.word.offsetWidth) / 2;
				next.y = (height - next.word.offsetHeight) / 2;
			} else if (nextLoop)
				nextLoop = this.positionNext(next, positions, width, height);
			else if (i > tokens.length / 3)
				nextLoop = false;
			if (!nextLoop && !this.positionFringe(next, positions, width, height))
				wordcloud.removeChild(next.word);
			else {
				positions.push(next);
				next.word.style.left = next.x + 'px';
				next.word.style.top = (next.y + (next.vertical ? (next.word.offsetWidth - next.word.offsetHeight) / 2 : 0)) + 'px';
				next.word.style.color = this.createColor((next.token.count - min) / (max - min));
			}
		}
	}

	renderRating() {
		var chart = document.createElement('chart');
		if (!this.rating.length)
			return;
		var maxRating = 100;
		var ratings = new Map(this.rating.map(entry => [this.dateKey(entry.date), entry]));
		var firstDate = new Date(this.rating[0].date);
		var lastDate = new Date();
		firstDate.setHours(0, 0, 0, 0);
		lastDate.setHours(0, 0, 0, 0);
		var plot = document.createElement('plot');
		var axis = document.createElement('axis');
		for (var date = firstDate; date <= lastDate; date.setDate(date.getDate() + 1)) {
			const entry = ratings.get(this.dateKey(date));
			var bar = document.createElement('bar');
			if (entry) {
				var dateLabel = date.toLocaleDateString();
				var rating = Math.max(0, Math.min(maxRating, entry.rating));
				var height = Math.max(4, rating / maxRating * 100);
				bar.style.setProperty('--height', height + '%');
				bar.style.background = this.ratingColor(rating, maxRating);
				bar.title = `${dateLabel}: ${entry.rating}%`;
				bar.addEventListener('click', event => {
					this.dispatchEvent(new CustomEvent('details', {
						detail: entry,
						bubbles: true,
						composed: true
					}));
				});
				bar.appendChild(document.createElement('span')).innerText = entry.ids.length;
			} else
				bar.style.visibility = 'hidden';
			plot.appendChild(bar);

			var tick = document.createElement('tick');
			tick.innerText = date.getDate() + '.' + (date.getMonth() + 1);
			if (!entry)
				tick.classList.add('empty');
			axis.appendChild(tick);
		}
		this._root.querySelector('chart').append(plot, axis);
		setTimeout(() => this._root.querySelector('chart').scrollLeft = this._root.querySelector('chart').scrollWidth, 50);
	}

	ratingColor(rating, maxRating) {
		var ratio = Math.max(0, Math.min(1, rating / maxRating));
		var hue = 8 + ratio * 132;
		return `linear-gradient(180deg, hsl(${hue} 82% 62%), hsl(${hue} 78% 44%))`;
	}

	dateKey(date) {
		return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
	}

	createColor(ratio) {
		if (ratio > 0.45)
			return `rgb(0, 0, ${255 - Math.round(ratio * 150)})`;
		if (ratio > 0.15)
			return `rgb(0, ${255 - Math.round(ratio * 150)}, 0)`;
		return `rgb(${255 - Math.round(ratio * 150)}, 0, 0)`;
	}

	extract() {
		var list = [];
		for (var i = 0; i < this.text.length; i++) {
			var s = this.text[i].text.replaceAll(/[ \+\t\r\n,\.\-\_\!\?\[\]\{\}';:\/\(\)…0-9]/g, ' ')
				.replaceAll(/(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?(?:\u200d(?:[^\ud800-\udfff]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?)*/g, '')
				.replaceAll(/[\u2700-\u27BF][\uFE0E-\uFE0F]?/g, '')
				.trim().toLowerCase().split(' ');
			for (var i2 = 0; i2 < s.length; i2++) {
				if (s[i2].trim().length > 1) {
					var token = list.find(e => e.text == s[i2]);
					if (token) {
						token.count++;
						if (!token.ids.includes(this.text[i].id))
							token.ids.push(this.text[i].id);
					} else if (!this.STOP_WORDS.includes(s[i2]))
						list.push({ count: 1, text: s[i2], ids: [this.text[i].id] });
				}
			}
		}
		list.sort((e, e2) => e2.count - e.count);
		return list;
	}

	positionNext(position, positions, width, height) {
		var offset = parseInt(Math.random() * positions.length);
		for (var i = 0; i < positions.length; i++) {
			var candidate = positions[(i + offset) % positions.length];
			var x1, x2, x3, x4, y1, y2, y3, y4;
			if (candidate.vertical) {
				position.vertical = false;
				x1 = candidate.x - position.word.offsetWidth;
				x2 = candidate.x - position.word.offsetWidth + candidate.word.offsetHeight;
				x3 = candidate.x;
				x4 = candidate.x + candidate.word.offsetHeight;
				y1 = candidate.y - position.word.offsetWidth;
				y2 = candidate.y;
				y3 = candidate.y + candidate.word.offsetWidth - position.word.offsetWidth;
				y4 = candidate.y + candidate.word.offsetWidth;
			} else {
				position.vertical = true;
				x1 = candidate.x - position.word.offsetHeight;
				x2 = candidate.x;
				x3 = candidate.x + candidate.word.offsetWidth - position.word.offsetHeight;
				x4 = candidate.x + candidate.word.offsetWidth;
				y1 = candidate.y - position.word.offsetHeight;
				y2 = candidate.y;
				y3 = candidate.y + candidate.word.offsetHeight - position.word.offsetHeight;
				y4 = candidate.y + candidate.word.offsetHeight;
			}
			var p = [[x1, y2], [x2, y1], [x3, y1], [x4, y2], [x1, y3], [x2, y4], [x3, y4], [x4, y3]];
			for (let i2 = p.length - 1; i2 > 0; i2--) {
				const j = Math.floor(Math.random() * (i2 + 1));
				var temp = p[i];
				if (temp) {
					p[i] = p[j];
					p[j] = temp;
				}
			}
			for (let i2 = 0; i2 < p.length; i2++) {
				position.x = p[i2][0];
				position.y = p[i2][1];
				if (this.inside(position, width, height) && !this.intersects(position, positions)) {
					if (position.vertical)
						position.word.classList.add('vertical');
					return true;
				}
			}
		}
	}

	positionFringe(position, positions, width, height) {
		var offset = parseInt(Math.random() * positions.length);
		for (var i = 0; i < positions.length; i++) {
			if (!positions[i].fringe) {
				var candidate = positions[(i + offset) % positions.length];
				if (candidate.vertical) {
					position.x = candidate.x - position.word.offsetWidth;
					position.y = candidate.y;
					position.vertical = false;
					for (var i2 = 0; i2 < 2; i2++) {
						if (i2 == 1) {
							position.x = candidate.x + candidate.word.offsetHeight;
							position.y = candidate.y;
						}
						while (position.y < candidate.y + candidate.word.offsetWidth) {
							var intersection = this.intersects(position, positions);
							if (intersection)
								position.y = intersection.y
									+ (intersection.vertical ? intersection.width : intersection.height);
							else {
								if (this.inside(position, width, height)) {
									position.fringe = true;
									return true;
								}
								position.y += position.word.offsetWidth;
							}
						}
					}
				} else {
					position.x = candidate.x;
					position.y = candidate.y - position.word.offsetWidth;
					position.vertical = true;
					for (var i2 = 0; i2 < 2; i2++) {
						if (i2 == 1) {
							position.x = candidate.x;
							position.y = candidate.y + candidate.word.offsetHeight;
						}
						while (position.x < candidate.x + candidate.word.offsetWidth) {
							var intersection = this.intersects(position, positions);
							if (intersection)
								position.x = intersection.x
									+ (intersection.vertical ? intersection.height : intersection.width);
							else {
								if (this.inside(position, width, height)) {
									position.fringe = true;
									return true;
								}
								position.x += position.word.offsetHeight;
							}
						}
					}
				}
			}
		}
	}

	intersects(position, positions) {
		var w1, h1, w2, h2, y1, y2;
		if (position.vertical) {
			w2 = position.word.offsetHeight;
			h2 = position.word.offsetWidth;
			y2 = position.y + (position.word.offsetWidth - position.word.offsetHeight) / 2;
		} else {
			w2 = position.word.offsetWidth;
			h2 = position.word.offsetHeight;
			y2 = position.y;
		}
		for (var i = 0; i < positions.length; i++) {
			if (positions[i].vertical) {
				w1 = positions[i].word.offsetHeight;
				h1 = positions[i].word.offsetWidth;
				y1 = positions[i].y + (positions[i].word.offsetWidth - positions[i].word.offsetHeight) / 2;
			} else {
				w1 = positions[i].word.offsetWidth;
				h1 = positions[i].word.offsetHeight;
				y1 = positions[i].y;
			}
			if (positions[i].x + w1 > position.x && positions[i].x < position.x + w2 && y1 + h1 > y2 && y1 < y2 + h2)
				return positions[i];
		}
	}

	inside(position, width, height) {
		if (position.x < 0 || position.y + (position.vertical ? (position.word.offsetWidth - position.word.offsetHeight) / 2 : 0) < 0)
			return false;
		if (position.vertical)
			return position.x + position.word.offsetHeight < width && position.y + position.word.offsetWidth + (position.word.offsetWidth - position.word.offsetHeight) / 2 < height;
		return position.x + position.word.offsetWidth < width && position.y + position.word.offsetHeight < height;
	}

	STOP_WORDS = [
		// English
		'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', "aren't", 'as', 'at',
		'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', "can't", 'cannot', 'could',
		"couldn't", 'did', "didn't", 'do', 'does', "doesn't", 'doing', "don't", 'down', 'during', 'each', 'few', 'for',
		'from', 'further', 'had', "hadn't", 'has', "hasn't", 'have', "haven't", 'having', 'he', "he'd", "he'll", "he's",
		'her', 'here', "here's", 'hers', 'herself', 'him', 'himself', 'his', 'how', "how's", 'i', "i'd", "i'll", "i'm",
		"i've", 'if', 'in', 'into', 'is', "isn't", 'it', "it's", 'its', 'itself', "let's", 'me', 'more', 'most', "mustn't",
		'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
		'ourselves', 'out', 'over', 'own', 'same', "shan't", 'she', "she'd", "she'll", "she's", 'should', "shouldn't",
		'so', 'some', 'such', 'than', 'that', "that's", 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
		"there's", 'these', 'they', "they'd", "they'll", "they're", "they've", 'this', 'those', 'through', 'to', 'too',
		'under', 'until', 'up', 'very', 'was', "wasn't", 'we', "we'd", "we'll", "we're", "we've", 'were', "weren't",
		'what', "what's", 'when', "when's", 'where', "where's", 'which', 'while', 'who', "who's", 'whom', 'why', "why's",
		'with', "won't", 'would', "wouldn't", 'you', "you'd", "you'll", "you're", "you've", 'your', 'yours', 'yourself',
		'yourselves',
		// German
		'aber', 'alle', 'allem', 'allen', 'aller', 'alles', 'als', 'also', 'am', 'an', 'ander', 'andere', 'anderem', 'anderen',
		'anderer', 'anderes', 'auch', 'auf', 'aus', 'bei', 'bin', 'bis', 'bist', 'da', 'damit', 'dann', 'das', 'dass', 'dazu',
		'dein', 'deine', 'dem', 'den', 'denn', 'der', 'die', 'dies', 'diese', 'diesem', 'diesen', 'dieser', 'dieses', 'dir',
		'doch', 'dort', 'du', 'durch', 'ein', 'eine', 'einem', 'einen', 'einer', 'eines', 'er', 'es', 'etwas', 'euch', 'für',
		'gegen', 'gewesen', 'haben', 'hat', 'hatte', 'hier', 'ich', 'ihm', 'ihn', 'ihnen', 'ihr', 'ihre', 'im', 'in', 'ist',
		'jede', 'jeder', 'jedes', 'jetzt', 'kann', 'kein', 'keine', 'können', 'machen', 'man', 'mehr', 'mein', 'meine', 'mich',
		'mir', 'mit', 'muss', 'nach', 'nicht', 'nichts', 'noch', 'nur', 'ob', 'oder', 'ohne', 'sehr', 'sein', 'seine', 'selbst',
		'sich', 'sie', 'sind', 'so', 'solche', 'soll', 'sondern', 'sonst', 'um', 'und', 'uns', 'unser', 'unter', 'vom', 'von',
		'vor', 'war', 'waren', 'was', 'weil', 'weiter', 'welche', 'wenn', 'wie', 'wieder', 'will', 'wir', 'wird', 'wo', 'zu',
		'zum', 'zur', 'über',
		// French, Italian, and Spanish
		'ai', 'aie', 'alors', 'au', 'aucun', 'aussi', 'autre', 'aux', 'avec', 'ce', 'ceci', 'cela', 'ces', 'cette', 'comme',
		'comment', 'dans', 'de', 'dedans', 'dehors', 'depuis', 'des', 'du', 'elle', 'elles', 'en', 'encore', 'est', 'et', 'eux',
		'faire', 'ici', 'il', 'ils', 'je', 'la', 'le', 'les', 'leur', 'leurs', 'lui', 'mais', 'me', 'mes', 'moi', 'mon', 'ne',
		'ni', 'nos', 'notre', 'nous', 'on', 'ou', 'par', 'pas', 'pour', 'que', 'quel', 'quelle', 'qui', 'sans', 'se', 'sera',
		'ses', 'si', 'soit', 'son', 'sont', 'sur', 'ta', 'te', 'tes', 'toi', 'ton', 'tous', 'tout', 'tu', 'un', 'une', 'vous',
		'anche', 'avere', 'che', 'chi', 'ci', 'come', 'con', 'da', 'dei', 'del', 'della', 'di', 'dove', 'e', 'gli', 'ha', 'hai',
		'hanno', 'ho', 'i', 'io', 'la', 'le', 'lo', 'loro', 'ma', 'mi', 'mia', 'mio', 'nei', 'nel', 'no', 'non', 'noi', 'o',
		'per', 'più', 'quale', 'quello', 'questa', 'questo', 'se', 'sei', 'si', 'sono', 'su', 'sua', 'suo', 'ti', 'tra', 'tua',
		'tuo', 'tutti', 'uno', 'vi', 'voi', 'a', 'al', 'algo', 'algunas', 'algunos', 'ante', 'antes', 'como', 'con', 'contra',
		'cual', 'cuando', 'del', 'desde', 'donde', 'durante', 'el', 'ella', 'ellas', 'ellos', 'en', 'entre', 'era', 'eres', 'es',
		'esa', 'esas', 'ese', 'eso', 'esos', 'esta', 'estas', 'este', 'esto', 'estos', 'fue', 'ha', 'hasta', 'hay', 'la', 'las',
		'le', 'les', 'lo', 'los', 'me', 'mi', 'mis', 'mucho', 'muy', 'más', 'nada', 'ni', 'no', 'nos', 'nosotros', 'o', 'otra',
		'otro', 'para', 'pero', 'por', 'porque', 'que', 'quien', 'se', 'sin', 'sobre', 'su', 'sus', 'también', 'te', 'ti', 'todo',
		'tu', 'tus', 'un', 'una', 'uno', 'ya', 'yo'
	];
}
