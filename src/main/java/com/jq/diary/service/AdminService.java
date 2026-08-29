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
					return org.springframework.web.reactive.function.client.WebClient
							.create("https://nominatim.openstreetmap.org/search?format=jsonv2&q=" + org.springframework.web.util.UriUtils.encode(location.getAddress().replace("\n", ", "), StandardCharsets.UTF_8))
							.get()
							.header("Accept", "text/plain,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
							.header("Accept-Language", "en-US,en;q=0.9")
							.header("user-agent",
									"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36")
							.retrieve().toEntity(String.class)
							.block().getBody() + "\n\n\n" +
							org.springframework.web.reactive.function.client.WebClient
									.create("https://nominatim.openstreetmap.org/reverse?format=json&lat=48.77&lon=11.88")
									.get()
									.accept(org.springframework.http.MediaType.TEXT_PLAIN)
									.header("user-agent",
											"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36")
									.retrieve().toEntity(String.class)
									.block().getBody();
				} catch(Exception ex) {
					return "Error\n" + Utilities.stackTraceToString(ex);
				}
				if (location.getLongitude() == null)
					return "https://nominatim.openstreetmap.org/search?format=jsonv2&q=" + org.springframework.web.util.UriUtils.encode(location.getAddress().replace("\n", ", "), StandardCharsets.UTF_8);
				repository.save(location);
				return "updated: " + location.getId();
			}
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
