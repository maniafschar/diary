
export { ViewStatistics };

class ViewStatistics extends HTMLElement {
	text = '';

	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		this.parentElement.addEventListener('visible', () => this.init(), { once: true });
		this._root.appendChild(document.createElement('style')).textContent = `
:host(*) {
	width: 100%;
	height: 100%;
	position: relative;
	display: block;
}
wordcloud {
	position: relative;
	display: block;
	width: 100%;
	height: 100%;
	overflow: hidden;
	text-align: center;
}
word {
	position: absolute;
	transform: translate(-50%, -50%);
	cursor: pointer;
	user-select: none;
	white-space: nowrap;
}
word:hover {
	text-decoration: underline;
}`;
	}

	init() {
		var tokens = this.extract();
		if (tokens.length > 50)
			tokens = tokens.slice(0, 50);
		this.render(tokens);
	}

	render(tokens) {
		this._root.appendChild(document.createElement('wordcloud'));
		this.createPositions(tokens, 28);
	}

	createColor(ratio) {
		if (ratio > 0.45)
			return `rgb(0, 0, ${255 - Math.round(ratio * 150)})`;
		if (ratio > 0.15)
			return `rgb(0, ${255 - Math.round(ratio * 150)}, 0)`;
		return `rgb(${255 - Math.round(ratio * 150)}, 0, 0)`;
	}

	extract() {
		var s = this.text.replaceAll(/[ \+\t\r\n,\.\-\_\!\?\[\]\{\}';:\/\(\)…0-9]/g, ' ')
			.replaceAll(/(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?(?:\u200d(?:[^\ud800-\udfff]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?)*/g, '')
			.replaceAll(/[\u2700-\u27BF][\uFE0E-\uFE0F]?/g, '')
			.trim().toLowerCase().split(' ');
		var list = [];
		for (var i = 0; i < s.length; i++) {
			if (s[i].trim().length > 1) {
				var token = list.find(e => e.text == s[i]);
				if (token)
					token.count++;
				else if (!this.STOP_WORDS.includes(s[i]))
					list.push({ count: 1, text: s[i] });
			}
		}
		list.sort((e, e2) => e2.count - e.count);
		return list;
	}

	createPositions(tokens, fontSize) {
		var positions = [];
		if (tokens.length == 0)
			return positions;
		var min = tokens[tokens.length - 1].count;
		var max = tokens[0].count;
		var width = this.offsetWidth;
		var height = this.offsetHeight;
		var nextLoop = true;
		var wordcloud = this._root.querySelector('wordcloud');
		for (var i = 0; i < tokens.length; i++) {
			var next = { span: document.createElement('span'), token: tokens[i] };
			next.span.innerText = next.token.text;
			next.span.style.fontSize = ((next.token.count - min) / (max - min) + 1) * fontSize;
			next.span.addEventListener('click', event => {
				this.dispatchEvent(new CustomEvent('wordclick', {
					detail: next.token,
					bubbles: true,
					composed: true
				}));
			});
			wordcloud.appendChild(next.span);
			if (i == 0) {
				next.x = (width - next.span.offsetWidth) / 2;
				next.y = (height - next.span.offsetHeight) / 2;
			} else if (nextLoop)
				nextLoop = this.positionNext(next, positions, width, height);
			else if (i > tokens.length / 3)
				nextLoop = false;
			if (!nextLoop && !this.positionFringe(next, positions, width, height))
				wordcloud.removeChild(next.span);
			else
				positions.push(next);
		}
	}

	positionNext(position, positions, width, height) {
		var offset = parseInt(Math.random() * positions.length);
		for (var i = 0; i < positions.length; i++) {
			var candidate = positions[(i + offset) % positions.length];
			var x1, x2, x3, x4, y1, y2, y3, y4;
			if (candidate.vertical) {
				position.vertical = false;
				x1 = candidate.x - position.span.offsetWidth;
				x2 = candidate.x - position.span.offsetWidth + candidate.span.offsetHeight;
				x3 = candidate.x;
				x4 = candidate.x + candidate.span.offsetHeight;
				y1 = candidate.y - position.span.offsetHeight;
				y2 = candidate.y;
				y3 = candidate.y + candidate.span.offsetWidth - position.span.offsetHeight;
				y4 = candidate.y + candidate.span.offsetWidth;
			} else {
				position.vertical = true;
				position.span.style.transform = ((position.span.style.transform || '') + ' rotate(-90deg)').trim();
				x1 = candidate.x - position.span.offsetHeight;
				x2 = candidate.x;
				x3 = candidate.x + candidate.span.offsetWidth - position.span.offsetHeight;
				x4 = candidate.x + candidate.span.offsetWidth;
				y1 = candidate.y - position.span.offsetWidth;
				y2 = candidate.y;
				y3 = candidate.y + candidate.span.offsetHeight - position.span.offsetWidth;
				y4 = candidate.y + candidate.span.offsetHeight;
			}
			var p = [[x1, y2], [x2, y1], [x3, y1], [x4, y2], [x1, y3], [x2, y4], [x3, y4], [x4, y3]];
			for (var i = 0; i < p.length; i++) {
				position.x = p[i][0];
				position.y = p[i][1];
				if (this.inside(position, width, height) && !this.intersects(position, positions))
					return true;
			}
		}
	}

	positionFringe(position, positions, width, height) {
		var offset = parseInt(Math.random() * positions.length);
		for (var i = 0; i < positions.length; i++) {
			if (!positions[i].fringe) {
				var candidate = positions[(i + offset) % positions.length];
				if (candidate.vertical) {
					position.x = candidate.x - position.span.offsetWidth;
					position.y = candidate.y;
					position.vertical = false;
					for (var i2 = 0; i2 < 2; i2++) {
						if (i2 == 1) {
							position.x = candidate.x + candidate.span.offsetHeight;
							position.y = candidate.y;
						}
						while (position.y < candidate.y + candidate.span.offsetWidth) {
							var intersection = this.intersects(position, positions);
							if (intersection == null) {
								if (this.inside(position, width, height)) {
									position.fringe = true;
									return true;
								}
								position.y += position.span.offsetWidth;
							} else
								position.y = intersection.y
									+ (intersection.vertical ? intersection.width : intersection.height);
						}
					}
				} else {
					position.x = candidate.x;
					position.y = candidate.y - position.span.offsetWidth;
					position.vertical = true;
					for (var i2 = 0; i2 < 2; i2++) {
						if (i2 == 1) {
							position.x = candidate.x;
							position.y = candidate.y + candidate.span.offsetHeight;
						}
						while (position.x < candidate.x + candidate.span.offsetWidth) {
							var intersection = this.intersects(position, positions);
							if (intersection == null) {
								if (this.inside(position, width, height)) {
									position.fringe = true;
									return true;
								}
								position.x += position.span.offsetHeight;
							} else
								position.x = intersection.x
									+ (intersection.vertical ? intersection.height : intersection.width);
						}
					}
				}
			}
		}
	}

	intersects(position, positions) {
		for (var i = 0; i < positions.length; i++) {
			var w1, h1, w2, h2;
			if (positions[i].vertical) {
				w1 = positions[i].span.offsetHeight;
				h1 = positions[i].span.offsetWidth;
			} else {
				w1 = positions[i].span.offsetWidth;
				h1 = positions[i].span.offsetHeight;
			}
			if (position.vertical) {
				w2 = position.span.offsetHeight;
				h2 = position.span.offsetWidth;
			} else {
				w2 = position.span.offsetWidth;
				h2 = position.span.offsetHeight;
			}
			if (positions[i].x + w1 > position.x && positions[i].x < position.x + w2
				&& positions[i].y + h1 > position.y && positions[i].y < position.y + h2)
				return positions[i];
		}
	}

	inside(position, width, height) {
		if (position.x < 0 || position.y < 0)
			return false;
		if (position.vertical)
			return position.x + position.span.offsetHeight < width && position.y + position.span.offsetWidth < height;
		return position.x + position.span.offsetWidth < width && position.y + position.span.offsetHeight < height;
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
