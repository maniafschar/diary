package com.jq.diary.service;

import java.io.IOException;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.apache.commons.io.IOUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.jq.diary.entity.Location;
import com.jq.diary.entity.Log;
import com.jq.diary.entity.Ticket;
import com.jq.diary.repository.Repository;
import com.jq.diary.service.LocationService;
import com.jq.diary.util.Json;
import com.jq.diary.util.Utilities;

import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.http.ResponseEntity;
import reactor.core.publisher.Mono;

@Service
public class AdminService {
	@Autowired
	private Repository repository;

	@Autowired
	private LocationService locationService;

	@Value("${app.admin.buildScript}")
	private String buildScript;

	@Value("${spring.datasource.username}")
	private String user;

	@Value("${spring.datasource.password}")
	private String password;

	public static class AdminData {
		private final List<Log> logs;
		private final List<Ticket> tickets;
		private final String search;

		private AdminData(final String search, final List<Log> logs, final List<Ticket> tickets) {
			super();
			this.search = search;
			this.logs = logs;
			this.tickets = tickets;
		}

		public List<Log> getLogs() {
			return this.logs;
		}

		public List<Ticket> getTickets() {
			return this.tickets;
		}

		public String getSearch() {
			return this.search;
		}
	}

	public AdminData init() {
		final String search = "createdAt>cast('" + Instant.now().minus(Duration.ofDays(1)).toString().substring(0, 10)
				+ "' as timestamp) and uri not like '/sc/%'";
		return new AdminData(search,
				this.repository.list("from Log where " + search + " order by id desc", Log.class),
				this.repository.list("from Ticket where deleted=false order by id desc", Ticket.class));
	}

	public List<Log> log(final String search) {
		this.validateSearch(search);
		return this.repository.list("from Log where " + search + " order by id desc", Log.class);
	}

	public List<?> sql(final String search) {
		this.validateSearch(search);
		return this.repository.list(search);
	}

	public String build(final String type) throws IOException {
		final ProcessBuilder pb = new ProcessBuilder(
				"status".equals(type) ? new String[] { "/usr/bin/bash", "-c", "ps -eF|grep java" }
						: this.buildScript.replace("{type}", type).split(" "));
		pb.redirectErrorStream(true);
		return IOUtils.toString(pb.start().getInputStream(), StandardCharsets.UTF_8);
	}

	public void deleteTicket(final BigInteger id) {
		final Ticket ticket = this.repository.one(Ticket.class, id);
		ticket.setDeleted(true);
		this.repository.save(ticket);
	}

	public void createTicket(final Ticket ticket) {
		if (this.repository
				.list("from Ticket where note like ?1", Ticket.class,
						ticket.getNote().replaceAll("\n", "_").replaceAll("'", "_"))
				.size() == 0)
			this.repository.save(ticket);
	}

	public String execute() {
		final List<Location> locations = this.repository.list("from Location where longitude is null order by id desc", Location.class);
		for (final Location location : locations) {
			if (Math.random() > 0.6) {
				try {
					//locationService.addGeoData(location);
					String address = location.getAddress().replace("\n", " ").replace(",", " ");
String uri = UriComponentsBuilder
    .fromHttpUrl("https://nominatim.openstreetmap.org/search")
    .queryParam("format", "jsonv2")
    .queryParam("q", java.net.URLEncoder.encode(address, java.text.StandardCharsets.UTF_8.toString()))
    // optional, help narrow results & show you're a valid client:
    .queryParam("limit", 5)
    .queryParam("email", "mani.afschar@jq-consulting.de")
    .build(true) // true => don't double-encode reserved chars
    .toUriString();
					ResponseEntity<String> resp = WebClient.builder()
    .defaultHeader("Accept", "application/json")
    .defaultHeader("Accept-Language", "en-US,en;q=0.9")
    // User-Agent MUST identify your application and include a contact per Nominatim policy:
    .defaultHeader("User-Agent", "diary.cafe/1.0 (mani.afschar@jq-consulting.de)")
    .build().get()
    .uri(uri)
    .exchangeToMono(response -> {
        System.out.println("status: " + response.statusCode());
        response.headers().asHttpHeaders().forEach((k, v) -> System.out.println(k + ": " + v));
        // get raw body as string for logging
        return response.toEntity(String.class);
    })
    .block();
					return resp.getStatusCode()
						+"\n\nfinal headers: " + resp.getHeaders()+
    "\n\nbody: " + resp.getBody();
				} catch(Exception ex) {
					return "Error\n" + Utilities.stackTraceToString(ex);
				}
				/*if (location.getLongitude() == null)
					return "https://nominatim.openstreetmap.org/search?format=jsonv2&q=" + org.springframework.web.util.UriUtils.encode(location.getAddress().replace("\n", ", "), StandardCharsets.UTF_8);
				repository.save(location);
				return "updated: " + location.getId();
		*/	}
		}
		return "no match";
	}

	private void validateSearch(final String search) {
		final StringBuilder s = new StringBuilder(search.toLowerCase());
		int p, p2;
		while ((p = s.indexOf("'")) > -1) {
			p2 = p;
			do {
				p2 = s.indexOf("'", p2 + 1);
			} while (p2 > 0 && "\\".equals(s.substring(p2 - 1, p2)));
			if (p2 < 0)
				throw new IllegalArgumentException(
						"Invalid quote in search: " + search);
			s.delete(p, p2 + 1);
		}
		if (s.indexOf(";") > -1 || s.indexOf("union") > -1 || s.indexOf("update") > -1
				|| s.indexOf("insert") > -1 || s.indexOf("delete") > -1)
			throw new IllegalArgumentException(
					"Invalid expression in search: " + search);
	}

	@Scheduled(cron = "0 0 * * * *")
	private void backup() throws InterruptedException, IOException {
		new ProcessBuilder("./backup.sh", this.user, this.password,
				"client contact contact_event contact_token event event_feedback event_image event_rating location log ticket")
				.start().waitFor();
	}
}
