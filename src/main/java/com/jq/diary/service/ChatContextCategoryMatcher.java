package com.jq.diary.service;

import java.text.Normalizer;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import com.jq.diary.entity.ChatSummary.Category;

final class ChatContextCategoryMatcher {
	private static final Map<Category, List<String>> KEYWORDS = keywords();

	private ChatContextCategoryMatcher() {
	}

	static Category match(final String question) {
		if (question == null || question.isBlank())
			return null;
		final String normalized = " " + normalize(question) + " ";
		Category selected = null;
		int highestScore = 0;
		int firstMatch = Integer.MAX_VALUE;
		for (final Category category : Category.values()) {
			int score = 0;
			int categoryFirstMatch = Integer.MAX_VALUE;
			for (final String keyword : KEYWORDS.get(category)) {
				final int match = normalized.indexOf(" " + normalize(keyword) + " ");
				if (match >= 0) {
					score++;
					categoryFirstMatch = Math.min(categoryFirstMatch, match);
				}
			}
			if (score > highestScore || score > 0 && score == highestScore && categoryFirstMatch < firstMatch) {
				selected = category;
				highestScore = score;
				firstMatch = categoryFirstMatch;
			}
		}
		return selected;
	}

	private static Map<Category, List<String>> keywords() {
		final Map<Category, List<String>> keywords = new EnumMap<>(Category.class);
		keywords.put(Category.CHAT, List.of(
				"chatverlauf", "tagebuch", "tagebucheintrag", "früher", "damals", "schon erzählt",
				"bereits erzählt", "weißt du noch", "erinnerst du dich", "was habe ich dir erzählt",
				"was weißt du über mich", "was weisst du ueber mich",
				"persönlich", "persoenlich"));
		keywords.put(Category.GUIDE, List.of(
				"guide", "umgebung", "nähe", "in der nähe", "restaurant", "restaurants", "cafe",
				"cafes", "bar", "bars", "museum", "museen", "kino", "kinos", "theater",
				"konzert", "konzerte", "veranstaltung", "veranstaltungen", "event", "events", "ausgehen",
				"aktivität", "aktivitäten", "was kann man machen", "empfehlung", "empfehlungen",
				"vorschlag", "vorschläge", "heute abend", "essen gehen"));
		keywords.put(Category.PSYCHOLOGY, List.of(
				"psychologie", "psychologisch", "psychologe", "therapie", "therapeut", "gefühl", "gefühle",
				"emotion", "emotionen", "stress", "stressig", "gestresst", "angespannt", "nervös", "angst",
				"ängstlich", "sorge", "sorgen", "traurig", "traurigkeit", "einsam", "einsamkeit", "belastet",
				"belastung", "überfordert", "verzweifelt", "mentale gesundheit", "depression", "depressiv",
				"selbstwert", "beziehung", "konflikt", "motivation"));
		keywords.put(Category.TRAVEL, List.of(
				"reise", "reisen", "reiseplanung", "reiseziel", "reiseziele", "urlaub", "ferien",
				"verreisen", "verreist", "reisetipp", "reisetipps", "reiseroute", "auslandsreise", "rundreise",
				"kreuzfahrt", "hotel", "hotels", "flug", "flüge", "flugreise", "roadtrip", "backpacking",
				"wanderurlaub", "unterkunft", "sightseeing", "wohin fahren", "wohin reisen", "wohin fliegen",
				"urlaub machen", "reise planen"));
		return Map.copyOf(keywords);
	}

	private static String normalize(final String value) {
		return Normalizer.normalize(value.toLowerCase(Locale.ROOT).replace("ß", "ss"), Normalizer.Form.NFD)
				.replaceAll("\\p{M}+", "")
				.replaceAll("[^\\p{L}\\p{N}]+", " ")
				.trim();
	}
}
