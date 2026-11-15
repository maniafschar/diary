export { FuzzyMatcher };

class FuzzyMatcher {

	static MIN_LENGTH_FOR_TYPOS = 4;
	static TOKEN = /[\p{L}\p{N}]+/gu;

	static normalize(s) {
		return s.replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
	}

	static terms(query) {
		return FuzzyMatcher.normalize(query || '').match(FuzzyMatcher.TOKEN) || [];
	}

	/**
	 * Every term must match at least one word of the text, either exactly, as prefix, as substring or with a
	 * small number of typos. Returns null if a term does not match.
	 */
	static match(terms, text) {
		if (!terms.length || !text || !text.trim())
			return null;
		const words = [...text.matchAll(FuzzyMatcher.TOKEN)].map(m => ({ word: FuzzyMatcher.normalize(m[0]), start: m.index }));
		let total = 0;
		let firstStart = Infinity;
		for (const term of terms) {
			let best = 0;
			let bestStart = -1;
			for (const w of words) {
				const score = FuzzyMatcher.wordScore(term, w.word);
				if (score > best) {
					best = score;
					bestStart = w.start;
				}
			}
			if (best == 0)
				return null;
			total += best;
			firstStart = Math.min(firstStart, bestStart);
		}
		return { score: total / terms.length, start: firstStart };
	}

	static wordScore(term, word) {
		if (word == term)
			return 1.0;
		if (word.startsWith(term))
			return 0.9;
		if (term.length >= 3 && word.includes(term))
			return 0.7;
		if (term.length < FuzzyMatcher.MIN_LENGTH_FOR_TYPOS)
			return 0;
		const maxDistance = term.length <= 6 ? 1 : 2;
		const distance = FuzzyMatcher.levenshtein(term, word, maxDistance);
		return distance <= maxDistance ? 0.6 - 0.15 * distance : 0;
	}

	static levenshtein(a, b, limit) {
		let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
		let current = new Array(b.length + 1).fill(0);
		for (let i = 1; i <= a.length; i++) {
			current[0] = i;
			let rowMin = current[0];
			for (let j = 1; j <= b.length; j++) {
				const cost = a[i - 1] == b[j - 1] ? 0 : 1;
				current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
				rowMin = Math.min(rowMin, current[j]);
			}
			if (rowMin > limit)
				return limit + 1;
			[previous, current] = [current, previous];
		}
		return previous[b.length];
	}
}
