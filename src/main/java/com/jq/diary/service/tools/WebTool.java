package com.jq.diary.service.tools;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.zip.GZIPInputStream;
import java.util.zip.InflaterInputStream;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.jq.diary.entity.Ticket;
import com.jq.diary.service.AdminService;
import com.jq.diary.util.Utilities;

@Component
public class WebTool {
	private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5))
			.followRedirects(HttpClient.Redirect.NEVER).build();
	@Autowired
	private AdminService adminService;

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
						HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(30))
								.headers("Accept-Language", "de-DE,de;en-US,en;q=0.9",
										"Accept-Encoding", "gzip, deflate",
										"Sec-Fetch-Dest", "document",
										"Sec-Fetch-Mode", "navigate",
										"Sec-Fetch-Site", "none",
										"Sec-Fetch-User", "?1",
										"Sec-Ch-Ua-Mobile", "?0",
										"Sec-Ch-Ua-Platform", "Windows",
										"Upgrade-Insecure-Requests", "1",
										"User-Agent",
										"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
										"Accept",
										"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
										"Sec-Ch-Ua",
										"\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"")
								.build(),
						HttpResponse.BodyHandlers.ofByteArray());
				if (response.statusCode() / 100 == 3 && response.headers().firstValue("location").isPresent()) {
					uri = uri.resolve(response.headers().firstValue("location").get());
					continue;
				}
				if (response.statusCode() / 100 != 2)
					return "Fehler: HTTP " + response.statusCode();
				final String text = Utilities.markDown(new String(this.decodeBody(response), StandardCharsets.UTF_8),
						uri);
				this.adminService.createTicket(new Ticket("webtool\n" + url + "\n" + text));
				return text;
			}
			return "Fehler: zu viele Weiterleitungen.";
		} catch (final Exception ex) {
			this.adminService.createTicket(
					new Ticket(Ticket.ERROR + "webtool\n" + url + "\n" + Utilities.stackTraceToString(ex)));
			return "Fehler: " + ex.getMessage();
		}
	}

	private byte[] decodeBody(final HttpResponse<byte[]> response) throws Exception {
		final String encoding = response.headers().firstValue("Content-Encoding").orElse("").toLowerCase(Locale.ROOT);
		InputStream stream = new ByteArrayInputStream(response.body());
		if (encoding.contains("gzip"))
			stream = new GZIPInputStream(stream);
		else if (encoding.contains("deflate"))
			stream = new InflaterInputStream(stream);
		final InputStream decodedStream = stream;
		try (decodedStream) {
			return decodedStream.readAllBytes();
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

}