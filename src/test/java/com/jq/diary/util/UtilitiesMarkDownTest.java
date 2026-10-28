package com.jq.diary.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;

class UtilitiesMarkDownTest {
	private static final URI BASE = URI.create("https://example.com/dir/index.html");

	@Test
	void returnsEmptyStringForEmptyInput() {
		assertEquals("", Utilities.markDown("", BASE));
	}

	@Test
	void convertsHeadingsWithAndWithoutId() {
		assertEquals("# Titel\n## Abschnitt {#abschnitt}",
				Utilities.markDown("<h1>Titel</h1><h2 id=\"abschnitt\">Abschnitt</h2>", BASE));
	}

	@Test
	void convertsLowerHeadingLevels() {
		assertEquals("### Drei\n###### Sechs", Utilities.markDown("<h3>Drei</h3><h6>Sechs</h6>", BASE));
	}

	@Test
	void convertsParagraphsIntoSeparatedBlocks() {
		assertEquals("Erster\nZweiter", Utilities.markDown("<p>Erster</p><p>Zweiter</p>", BASE));
	}

	@Test
	void collapsesExcessiveBlankLines() {
		assertEquals("a\nb", Utilities.markDown("<p>a</p><p></p><p></p><p>b</p>", BASE));
	}

	@Test
	void convertsBoldAndItalicText() {
		assertEquals("Das ist **fett** und _kursiv_.",
				Utilities.markDown("<p>Das ist <strong>fett</strong> und <em>kursiv</em>.</p>", BASE));
	}

	@Test
	void convertsBoldAndItalicShortTags() {
		assertEquals("**B** _I_", Utilities.markDown("<p><b>B</b> <i>I</i></p>", BASE));
	}

	@Test
	void convertsUnorderedListItemsOnSeparateLines() {
		final String html = "<ul>\n<li>Eins</li>\n<li>Zwei</li>\n</ul>";

		assertEquals("* Eins\n* Zwei", Utilities.markDown(html, BASE));
	}

	@Test
	void numbersOrderedListItems() {
		final String html = "<ol>\n<li>Erster</li>\n<li>Zweiter</li>\n</ol>";

		assertEquals("1. Erster\n2. Zweiter", Utilities.markDown(html, BASE));
	}

	@Test
	void restartsNumberingForEachOrderedList() {
		assertEquals("1. a\n1. b", Utilities.markDown("<ol><li>a</li></ol><ol><li>b</li></ol>", BASE));
	}

	@Test
	void convertsBlockquoteParagraphsIntoQuoteLines() {
		final String result = Utilities.markDown("<blockquote><p>Erster</p><p>Zweiter</p></blockquote>", BASE);

		assertTrue(result.startsWith("> Erster\n"), result);
		assertTrue(result.contains("> Zweiter"), result);
		assertFalse(result.contains("<"), result);
	}

	@Test
	void convertsLineBreaksToMarkdownHardBreaks() {
		assertEquals("A \nB", Utilities.markDown("A<br>B", BASE));
		assertEquals("A \nB", Utilities.markDown("A<br/>B", BASE));
		assertEquals("A \nB", Utilities.markDown("A<br />B", BASE));
	}

	@Test
	void convertsHorizontalRule() {
		assertEquals("a\n- - -\nb", Utilities.markDown("<p>a</p><hr><p>b</p>", BASE));
	}

	@Test
	void matchesTagsCaseInsensitively() {
		assertEquals("Text\n## Titel", Utilities.markDown("<P>Text</P><H2>Titel</H2>", BASE));
	}

	@Test
	void resolvesRelativeAndAbsoluteLinks() {
		assertEquals("[Hier](https://example.com/seite)", Utilities.markDown("<a href=\"/seite\">Hier</a>", BASE));
		assertEquals("[Sub](https://example.com/dir/sub/x)", Utilities.markDown("<a href=\"sub/x\">Sub</a>", BASE));
		assertEquals("[Extern](https://other.org/y)",
				Utilities.markDown("<a href=\"https://other.org/y\">Extern</a>", BASE));
	}

	@Test
	void keepsRelativeLinkWhenBaseIsNull() {
		assertEquals("[Text](/a)", Utilities.markDown("<a href=\"/a\">Text</a>", null));
	}

	@Test
	void convertsEveryLinkInALine() {
		assertEquals("[A](https://example.com/a) und [B](https://example.com/b)",
				Utilities.markDown("<p><a href=\"/a\">A</a> und <a href=\"/b\">B</a></p>", BASE));
	}

	@Test
	void convertsSingleQuotedAndUnquotedHrefAttributes() {
		assertEquals("[Q](https://example.com/q)", Utilities.markDown("<a href='/q'>Q</a>", BASE));
		assertEquals("[U](https://example.com/u)", Utilities.markDown("<a href=/u>U</a>", BASE));
	}

	@Test
	void keepsQuotedAttributeContainingGreaterThanSign() {
		assertEquals("[Z](https://example.com/z)",
				Utilities.markDown("<a title=\"x>y\" href=\"/z\">Z</a>", BASE));
	}

	@Test
	void keepsLabelForAnchorsWithoutUsableHref() {
		assertEquals("Ziel", Utilities.markDown("<a name=\"ziel\">Ziel</a>", BASE));
		assertEquals("Oben", Utilities.markDown("<a href=\"#top\">Oben</a>", BASE));
		assertEquals("Klick", Utilities.markDown("<a href=\"javascript:void(0)\">Klick</a>", BASE));
	}

	@Test
	void keepsInlineFormattingInsideLinkLabels() {
		assertEquals("[**Fett**](https://example.com/x)",
				Utilities.markDown("<a href=\"/x\"><strong>Fett</strong></a>", BASE));
	}

	@Test
	void decodesEntitiesInHrefAttributes() {
		assertEquals("[S](https://example.com/s?a=1&b=2)",
				Utilities.markDown("<a href=\"/s?a=1&amp;b=2\">S</a>", BASE));
	}

	@Test
	void decodesEntitiesInTextExactlyOnce() {
		assertEquals("&lt;", Utilities.markDown("<p>&amp;lt;</p>", BASE));
	}

	@Test
	void decodesCommonEntitiesInText() {
		assertEquals("Tom & Jerry: \"Hallo\" 'x' 'y' <3 a b",
				Utilities.markDown("<p>Tom &amp; Jerry: &quot;Hallo&quot; &#39;x&#39; &#x27;y&#x27; &lt;3 a&nbsp;b</p>",
						BASE));
	}

	@Test
	void removesRemainingHtmlTagsAndConvertsHeadingsWithAttributes() {
		final String html = "<!DOCTYPE html><div class=\"box\"><img src=\"a.png\"><span>Text</span><input type=\"text\"></div>"
				+ "<h2 class=\"title\">Titel</h2>";

		assertEquals("Text\n## Titel", Utilities.markDown(html, BASE));
	}

	@Test
	void removesScriptStyleAndCommentBlocks() {
		final String html = "<script>alert('<p>x</p>');</script><style>p{color:red}</style>"
				+ "<!-- kommentar --><p>Text</p>";

		assertEquals("Text", Utilities.markDown(html, BASE));
	}

	@Test
	void convertsDuckDuckGoResultPageResource() throws IOException {
		final String html;
		try (InputStream in = this.getClass().getResourceAsStream("/markDownTest.html")) {
			assertNotNull(in, "markDownTest.html is missing from test resources");
			html = new String(in.readAllBytes(), StandardCharsets.UTF_8);
		}

		final String result = Utilities.markDown(html, BASE);

		assertTrue(result.contains("Wo wird FC Bayern gegen Magdeburg übertragen? (DFB-Pokal) -"));
		assertTrue(result.contains("[Feedback](https://duckduckgo.com/feedback.html)"));
		assertEquals(10, result.split("\n## ", -1).length - 1);
		assertFalse(result.contains("</h2>"));
		assertFalse(result.matches("(?s).*</?[a-zA-Z!][^>]*>.*"), result);
		assertFalse(result.contains("\n\n\n"));
		assertFalse(result.startsWith("\n"));
		assertFalse(result.endsWith("\n"));
	}
}