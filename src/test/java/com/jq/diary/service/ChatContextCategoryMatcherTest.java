package com.jq.diary.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import com.jq.diary.entity.ChatSummary.Category;

class ChatContextCategoryMatcherTest {
	@Test
	void matchesEachContextArea() {
		assertEquals(Category.CHAT, ChatContextCategoryMatcher.match("Was habe ich dir früher erzählt?"));
		assertEquals(Category.GUIDE, ChatContextCategoryMatcher.match("Kennst du ein gutes Restaurant in der Nähe?"));
		assertEquals(Category.PSYCHOLOGY, ChatContextCategoryMatcher.match("Ich fühle mich oft überfordert."));
		assertEquals(Category.TRAVEL, ChatContextCategoryMatcher.match("Welche Reiseziele empfiehlst du?"));
	}

	@Test
	void picksTheCategoryWithMoreMatchingKeywords() {
		assertEquals(Category.TRAVEL,
				ChatContextCategoryMatcher.match("Welche Reiseziele und Hotels passen zu meinem Urlaub?"));
	}

	@Test
	void breaksTiesByTheFirstMatchingKeyword() {
		assertEquals(Category.TRAVEL, ChatContextCategoryMatcher.match("Der Urlaub macht mir Angst."));
	}

	@Test
	void doesNotMatchUnrelatedOrEmptyQuestions() {
		assertNull(ChatContextCategoryMatcher.match("Wie spät ist es?"));
		assertNull(ChatContextCategoryMatcher.match(" "));
		assertNull(ChatContextCategoryMatcher.match(null));
	}
}
