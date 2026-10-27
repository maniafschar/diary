package com.jq.diary.service;

import java.net.InetAddress;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

/** Internet access for the chat model via Spring AI tool calling. */
@Component
public class WebTool {
	private static final int MAX_CHARS = 6000;
	private static final int MAX_BYTES = 1_000_000;
	private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5))
			.followRedirects(HttpClient.Redirect.NEVER).build();

	@Tool(description = "Sucht im Internet nach aktuellen Informationen (z.B. Veranstaltungen, Orte, Nachrichten) und liefert Trefferlisten mit Titel, URL und Auszug.")
	public String webSearch(@ToolParam(description = "Suchanfrage") final String query) {
		if (query == null || query.isBlank())
			return "Leere Suchanfrage.";
		return this
				.get("https://html.duckduckgo.com/html/?q=" + URLEncoder.encode(query.trim(), StandardCharsets.UTF_8));
	}

	@Tool(description = "Lädt eine öffentliche Webseite (http/https) und liefert ihren Text.")
	public String fetchPage(@ToolParam(description = "Vollständige URL") final String url) {
		return this.get(url);
	}

	private String get(final String url) {
		try {
			URI uri = URI.create(url.trim());
			// redirects are followed manually so that every hop is validated
			for (int hop = 0; hop < 3; hop++) {
				assertPublic(uri);
				final HttpResponse<byte[]> response = this.client.send(
						HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(10))
								.header("User-Agent", "Mozilla/5.0 (diary-chat)")
								.header("User-Agent",
										"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36")
								.header("Accept",
										"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
								.header("Accept-Language", "en-US,en;q=0.9")
								.header("Accept-Encoding", "gzip, deflate")
								.header("Connection", "keep-alive")
								.header("Sec-Fetch-Dest", "document")
								.header("Sec-Fetch-Mode", "navigate")
								.header("Sec-Fetch-Site", "none")
								.header("Sec-Fetch-User", "?1")
								.header("Sec-Ch-Ua",
										"\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"")
								.header("Sec-Ch-Ua-Mobile", "?0")
								.header("Sec-Ch-Ua-Platform", "Windows")
								.header("Upgrade-Insecure-Requests", "1")
								.build(),
						HttpResponse.BodyHandlers.ofByteArray());
				if (response.statusCode() / 100 == 3 && response.headers().firstValue("location").isPresent()) {
					uri = uri.resolve(response.headers().firstValue("location").get());
					continue;
				}
				if (response.statusCode() / 100 != 2)
					return "Fehler: HTTP " + response.statusCode();
				final byte[] body = response.body();
				final String html = new String(body, 0, Math.min(body.length, MAX_BYTES), StandardCharsets.UTF_8);
				return toText(html);
			}
			return "Fehler: zu viele Weiterleitungen.";
		} catch (final Exception ex) {
			return "Fehler: " + ex.getMessage();
		}
	}

	private static void assertPublic(final URI uri) throws Exception {
		if (!"http".equals(uri.getScheme()) && !"https".equals(uri.getScheme()) || uri.getHost() == null)
			throw new IllegalArgumentException("Nur http/https-URLs sind erlaubt.");
		for (final InetAddress address : InetAddress.getAllByName(uri.getHost()))
			if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isSiteLocalAddress()
					|| address.isLinkLocalAddress() || address.isMulticastAddress())
				throw new IllegalArgumentException("Interne Adressen sind nicht erlaubt.");
	}

	static String toText(final String html) {
		final String text = html.replaceAll("(?is)<(script|style|noscript)[^>]*>.*?</\\1>", " ")
				.replaceAll("(?s)<[^>]+>", " ").replace("&nbsp;", " ").replace("&amp;", "&")
				.replace("&quot;", "\"").replace("&#x27;", "'").replaceAll("\\s+", " ").trim();
		return text.length() > MAX_CHARS ? text.substring(0, MAX_CHARS) : text;
	}
}