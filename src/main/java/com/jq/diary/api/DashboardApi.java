package com.jq.diary.api;

import java.math.BigInteger;
import java.net.URI;
import java.security.GeneralSecurityException;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jq.diary.dashboard.DashboardRepository;
import com.jq.diary.dashboard.HybridEncryption;
import com.jq.diary.dashboard.Link;
import com.jq.diary.dashboard.Todo;

/**
 * Lives below "sc/", so LogFilter requires the support center secret.
 */
@RestController
@RequestMapping("sc/dashboard")
public class DashboardApi {
	private static final int MAX_TITLE = 200;
	private static final int MAX_URL = 2048;
	private static final int MAX_REMARK = 500;
	private static final int MAX_TODO = 200;
	private static final int MAX_INFO = 1_000_000;

	@Autowired
	private DashboardRepository repository;

	@Autowired
	private ObjectMapper mapper;

	public record LinkDto(String title, String url, String remark) {
	}

	public record TodoDto(String text, Boolean completed) {
	}

	public record InfoDto(String content) {
	}

	@GetMapping
	public HybridEncryption.Encrypted get(@RequestHeader("publicKey") final String publicKey) {
		try {
			final byte[] json = this.mapper.writeValueAsBytes(Map.of("links", this.repository.links(),
					"todos", this.repository.todos(), "info", this.repository.info()));
			return HybridEncryption.encrypt(publicKey, json);
		} catch (final GeneralSecurityException | IllegalArgumentException e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid public key");
		} catch (final JsonProcessingException e) {
			throw new IllegalStateException(e);
		}
	}

	@PostMapping("link")
	public Link postLink(@RequestBody final LinkDto link) {
		final String title = this.text(link.title(), MAX_TITLE);
		final String url = this.text(link.url(), MAX_URL);
		if (!this.isHttpUrl(url))
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid url");
		return this.repository.addLink(title, url, this.optionalText(link.remark(), MAX_REMARK));
	}

	@DeleteMapping("link/{id}")
	public void deleteLink(@PathVariable final BigInteger id) {
		this.found(this.repository.deleteLink(id));
	}

	@PostMapping("todo")
	public Todo postTodo(@RequestBody final TodoDto todo) {
		return this.repository.addTodo(this.text(todo.text(), MAX_TODO));
	}

	@PutMapping("todo/{id}")
	public void putTodo(@PathVariable final BigInteger id, @RequestBody final TodoDto todo) {
		if (todo.completed() == null)
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "completed missing");
		this.found(this.repository.setTodoCompleted(id, todo.completed()));
	}

	@DeleteMapping("todo/{id}")
	public void deleteTodo(@PathVariable final BigInteger id) {
		this.found(this.repository.deleteTodo(id));
	}

	@PutMapping("info")
	public void putInfo(@RequestBody final InfoDto info) {
		final String content = info.content() == null ? "" : info.content();
		if (content.length() > MAX_INFO)
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "info too long");
		this.repository.saveInfo(content);
	}

	private String text(final String value, final int max) {
		final String text = value == null ? "" : value.trim();
		if (text.isEmpty() || text.length() > max)
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid text");
		return text;
	}

	private String optionalText(final String value, final int max) {
		final String text = value == null ? "" : value.trim();
		if (text.length() > max)
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "text too long");
		return text.isEmpty() ? null : text;
	}

	private boolean isHttpUrl(final String url) {
		try {
			final URI uri = new URI(url);
			return ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
					&& uri.getHost() != null;
		} catch (final Exception e) {
			return false;
		}
	}

	private void found(final boolean found) {
		if (!found)
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
	}
}
