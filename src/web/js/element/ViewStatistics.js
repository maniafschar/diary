import { api } from '../api';

export { ViewStatistics };

class ViewStatistics extends HTMLElement {
	list = [];
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
img {
	max-height: 100%;
	max-width: 100%;
}`;
	}

	init() {
		api.statistics.getWordcloud(e => {
			this._root.appendChild(document.createElement('img')).src = 'data:image/png;base64,' + e;
		});
	}
}

// WordCloudService.js
// Node usage:
// npm install canvas
// const { createCanvas } = require("canvas");
// const service = new WordCloudService({ stopWords: [...], font: "Roboto Slab" });
// const tokens = service.extract("...");
//
// Browser usage:
// const service = new WordCloudService({ font: "Roboto Slab" });
// const pngDataUrl = service.createImage(tokens);

class Token {
  constructor(text) {
    this.text = text;
    this.count = 1;
  }

  getText() {
    return this.text;
  }

  getCount() {
    return this.count;
  }
}

class Position {
  constructor(token, width, height, percent, font) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    this.token = token;
    this.percent = percent;
    this.vertical = false;
    this.fringe = false;
    this.font = font;
  }

  intersects(position) {
    let w1, h1, w2, h2;

    if (this.vertical) {
      w1 = this.height;
      h1 = this.width;
    } else {
      w1 = this.width;
      h1 = this.height;
    }

    if (position.vertical) {
      w2 = position.height;
      h2 = position.width;
    } else {
      w2 = position.width;
      h2 = position.height;
    }

    return (
      this.x + w1 > position.x &&
      this.x < position.x + w2 &&
      this.y + h1 > position.y &&
      this.y < position.y + h2
    );
  }
}

class WordCloudService {
  constructor({
    stopWords = [],
    font = "Arial",
    width = 800,
    height = 800,
    canvas = null
  } = {}) {
    this.stopWords = stopWords;
    this.font = font;
    this.width = width;
    this.height = height;
    this.canvas = canvas;
  }

  extract(text) {
    const cleaned = text
      .replace(/[ \t\r\n\,\.\-\!\?\[\]\{\}';:\/\(\)…0-9]/g, " ")
      .replace(/[\p{Extended_Pictographic}\u{200D}]/gu, " ");

    const list = [];
    const words = cleaned.toLowerCase().split(/\s+/);

    for (const candidate of words) {
      const trimmed = candidate.trim();

      if (trimmed.length <= 1) continue;

      const existing = list.find((e) => e.text === trimmed);
      if (existing) {
        existing.count++;
      } else if (!this.stopWords.includes(trimmed)) {
        list.push(new Token(trimmed));
      }
    }

    list.sort((a, b) => b.count - a.count);
    return list;
  }

  createImage(tokens, canvasOverride = null) {
    const canvas =
      canvasOverride ||
      this.canvas ||
      (typeof document !== "undefined"
        ? document.createElement("canvas")
        : null);

    if (!canvas) {
      throw new Error(
        "Canvas is required. In Node.js, create a canvas with `const { createCanvas } = require('canvas')`."
      );
    }

    canvas.width = this.width;
    canvas.height = this.height;

    const ctx = canvas.getContext("2d");
    const positions = this.createPositions(tokens, canvas, 28.0);

    for (const position of positions) {
      ctx.font = `${position.font.style || ""} ${position.font.weight || ""} ${position.font.size || ""}px ${position.font.family || this.font}`;
      ctx.fillStyle = this.createColor(position.percent);

      if (position.vertical) {
        ctx.save();
        ctx.translate(position.x, position.y);
        ctx.rotate(Math.PI * 1.5);
        ctx.translate(-position.width, 0);
        ctx.fillText(position.token.getText(), 0, (0.784 * position.height));
        ctx.restore();
      } else {
        ctx.fillText(
          position.token.getText(),
          position.x,
          position.y + Math.round(0.784 * position.height)
        );
      }
    }

    if (typeof Buffer !== "undefined") {
      return canvas.toBuffer("image/png");
    }

    return canvas.toDataURL("image/png");
  }

  createColor(percent) {
    if (percent > 0.45) {
      return `rgb(${0}, ${0}, ${255 - Math.round(percent * 150)})`;
    }
    if (percent > 0.15) {
      return `rgb(${0}, ${255 - Math.round(percent * 150)}, ${0})`;
    }
    return `rgb(${255 - Math.round(percent * 150)}, ${0}, ${0})`;
  }

  createPositions(tokens, canvas, fontSize) {
    if (!tokens || tokens.length === 0) return [];

    const min = tokens[tokens.length - 1].getCount();
    const max = tokens[0].getCount();
    const positions = [];
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    let nextLoop = true;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const percent = (token.getCount() - min) / (max - min);

      const font = new FontFace(
        this.font,
        "normal",
        "normal",
        (percent + 1) * fontSize
      );

      // If you want a real font family, assign a font from DOM or use default canvas fonts.
      // This simple implementation uses Canvas default font settings.
      ctx.font = `${(percent + 1) * fontSize}px ${this.font}`;

      let next = new Position(
        token,
        ctx.measureText(token.getText()).width,
        ctx.measureText("M").actualBoundingBoxAscent +
          ctx.measureText("M").actualBoundingBoxDescent,
        percent,
        {
          family: this.font,
          size: `${(percent + 1) * fontSize}px`
        }
      );

      if (i === 0) {
        next.x = (width - next.width) / 2;
        next.y = (height - next.height) / 2;
      } else if (nextLoop) {
        nextLoop = this.positionNext(next, positions, width, height);
      } else if (i > tokens.length / 3) {
        nextLoop = false;
      }

      if (!nextLoop && !this.positionFringe(next, positions, width, height)) {
        next = null;
      }

      if (next !== null) {
        positions.push(next);
      } else {
        console.log("Failed on " + token.text);
      }
    }

    return positions;
  }

  positionNext(position, positions, width, height) {
    const offset = Math.floor(Math.random() * positions.length);

    for (let i = 0; i < positions.length; i++) {
      const candidate = positions[(i + offset) % positions.length];
      let x1, x2, x3, x4, y1, y2, y3, y4;

      if (candidate.vertical) {
        position.vertical = false;
        x1 = candidate.x - position.width;
        x2 = candidate.x - position.width + candidate.height;
        x3 = candidate.x;
        x4 = candidate.x + candidate.height;
        y1 = candidate.y - position.height;
        y2 = candidate.y;
        y3 = candidate.y + candidate.width - position.height;
        y4 = candidate.y + candidate.width;
      } else {
        position.vertical = true;
        x1 = candidate.x - position.height;
        x2 = candidate.x;
        x3 = candidate.x + candidate.width - position.height;
        x4 = candidate.x + candidate.width;
        y1 = candidate.y - position.width;
        y2 = candidate.y;
        y3 = candidate.y + candidate.height - position.width;
        y4 = candidate.y + candidate.height;
      }

      const points = [
        [x1, y2],
        [x2, y1],
        [x3, y1],
        [x4, y2],
        [x1, y3],
        [x2, y4],
        [x3, y4],
        [x4, y3]
      ];

      for (const [x, y] of points) {
        position.x = x;
        position.y = y;

        if (this.inside(position, width, height) && this.intersects(position, positions) === null) {
          return true;
        }
      }
    }

    return false;
  }

  positionFringe(position, positions, width, height) {
    const p = positions.filter((e) => !e.fringe);
    const offset = Math.floor(Math.random() * p.length);

    for (let i = 0; i < p.length; i++) {
      const candidate = p[(i + offset) % p.length];

      if (candidate.vertical) {
        position.x = candidate.x - position.width;
        position.y = candidate.y;
        position.vertical = false;

        for (let i2 = 0; i2 < 2; i2++) {
          if (i2 === 1) {
            position.x = candidate.x + candidate.height;
            position.y = candidate.y;
          }

          while (position.y < candidate.y + candidate.width) {
            const intersection = this.intersects(position, positions);

            if (intersection === null) {
              if (this.inside(position, width, height)) {
                position.fringe = true;
                return true;
              }
              position.y += position.width;
            } else {
              position.y =
                intersection.y +
                (intersection.vertical ? intersection.width : intersection.height);
            }
          }
        }
      } else {
        position.x = candidate.x;
        position.y = candidate.y - position.width;
        position.vertical = true;

        for (let i2 = 0; i2 < 2; i2++) {
          if (i2 === 1) {
            position.x = candidate.x;
            position.y = candidate.y + candidate.height;
          }

          while (position.x < candidate.x + candidate.width) {
            const intersection = this.intersects(position, positions);

            if (intersection === null) {
              if (this.inside(position, width, height)) {
                position.fringe = true;
                return true;
              }
              position.x += position.height;
            } else {
              position.x =
                intersection.x +
                (intersection.vertical ? intersection.height : intersection.width);
            }
          }
        }
      }
    }

    return false;
  }

  intersects(position, positions) {
    for (const p of positions) {
      if (p.intersects(position)) return p;
    }
    return null;
  }

  inside(position, width, height) {
    if (position.x < 0 || position.y < 0) return false;

    if (position.vertical) {
      return position.x + position.height < width && position.y + position.width < height;
    }

    return position.x + position.width < width && position.y + position.height < height;
  }
}

// Example usage
// const { createCanvas } = require("canvas");
// const service = new WordCloudService({
//   stopWords: ["the", "and", "is", "a", "to", "of", "in", "for", "on", "with"],
//   font: "Arial",
//   width: 800,
//   height: 800,
//   canvas: createCanvas(800, 800)
// });
//
// const tokens = service.extract("JavaScript word cloud example with words like cloud, code, canvas, art, creativity, and design");
// const pngBuffer = service.createImage(tokens);
// require("fs").writeFileSync("wordcloud.png", pngBuffer);

module.exports = WordCloudService;
