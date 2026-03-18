package com.jq.diary.util;

import java.io.IOException;
import java.math.BigInteger;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import com.jq.diary.api.ApplicationApi;
import com.jq.diary.entity.Contact;
import com.jq.diary.entity.Log;
import com.jq.diary.repository.Repository;
import com.jq.diary.service.AuthenticationService;
import com.jq.diary.service.AuthenticationService.AuthenticationException;
import com.jq.diary.service.AuthenticationService.AuthenticationException.AuthenticationExceptionType;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
@Order(1)
public class LogFilter implements Filter {
	@Autowired
	private Repository repository;

	@Autowired
	private AuthenticationService authenticationService;

	@Value("${app.supportCenter.secret}")
	private String supportCenterSecret;

	@Override
	public void doFilter(final ServletRequest request, final ServletResponse response, final FilterChain chain)
			throws IOException, ServletException {
		final ContentCachingRequestWrapper req = new ContentCachingRequestWrapper((HttpServletRequest) request);
		final ContentCachingResponseWrapper res = new ContentCachingResponseWrapper((HttpServletResponse) response);
		final Log log = new Log();
		if (req.getHeader("clientId") != null)
			log.setClientId(new BigInteger(req.getHeader("clientId")));
		if (req.getHeader("contactId") != null && !req.getServletPath().contains("/sc/")) {
			try {
				log.setContactId(new BigInteger(req.getHeader("contactId")));
			} catch (final Exception ex) {
				// ignore
			}
		}
		log.setUri(req.getRequestURI());
		log.setMethod(req.getMethod());
		if (req.getHeader("referer") != null)
			log.setReferer(req.getHeader("referer"));
		log.setIp(this.sanatizeIp(req.getHeader("X-Forwarded-For")));
		if ("".equals(log.getIp()))
			log.setIp(request.getRemoteAddr());
		log.setPort(req.getLocalPort());
		final String query = req.getQueryString();
		if (query != null) {
			if (query.contains("&_="))
				log.setQuery(URLDecoder.decode(query.substring(0, query.indexOf("&_=")),
						StandardCharsets.UTF_8.name()));
			else if (!query.startsWith("_="))
				log.setQuery(URLDecoder.decode(query, StandardCharsets.UTF_8.name()));
		}
		final long time = System.currentTimeMillis();
		try {
			this.authenticate(req);
			chain.doFilter(req, res);
		} catch (final AuthenticationException ex) {
			log.setBody("unauthorized acccess, contact: " + req.getHeader("contactId"));
			log.setStatus(HttpStatus.UNAUTHORIZED.value());
		} finally {
			if (res.getStatus() != ApplicationApi.STATUS_PROCESSING_PDF) {
				log.setTime((int) (System.currentTimeMillis() - time));
				if (log.getStatus() == 0)
					log.setStatus(res.getStatus());
				log.setCreatedAt(new Timestamp(Instant.now().toEpochMilli() - log.getTime()));
				byte[] b = req.getContentAsByteArray();
				if (b != null && b.length > 0)
					log.setBody((log.getBody() + '\n' + new String(b, StandardCharsets.UTF_8).trim()));
				b = res.getContentAsByteArray();
				if (b != null && b.length > 0)
					log.setBody((log.getBody() + '\n' + new String(b, StandardCharsets.UTF_8).trim()));
				res.copyBodyToResponse();
				try {
					this.repository.save(log);
				} catch (final Exception e) {
					e.printStackTrace();
				}
			}
		}
	}

	private void authenticate(final ContentCachingRequestWrapper req) {
		if ("OPTIONS".equals(req.getMethod())
				|| req.getServletPath().contains("/authentication")
						&& ("GET".equals(req.getMethod()) || "POST".equals(req.getMethod())))
			return;
		if (req.getServletPath().contains("/sc/")) {
			if (this.supportCenterSecret.equals(req.getHeader("contactId")))
				return;
			throw new AuthenticationException(AuthenticationExceptionType.AdminSecret);
		}
		final BigInteger contactId = req.getHeader("contactId") == null ? BigInteger.ZERO
				: new BigInteger(req.getHeader("contactId"));
		final Contact contact = this.authenticationService.verify(contactId,
				req.getHeader("password"), req.getHeader("salt"));
		if (!BigInteger.ZERO.equals(contactId)
				&& !contact.getClient().getId().equals(new BigInteger(req.getHeader("clientId")))
				&& this.repository.list(
						"from Contact where email='" + contact.getEmail() + "' and client.id="
								+ req.getHeader("clientId"),
						Contact.class).size() == 0)
			throw new AuthenticationException(AuthenticationExceptionType.WrongClient);
	}

	private String sanatizeIp(final String ip) {
		if (ip == null)
			return "";
		if (ip.contains(","))
			return ip.substring(ip.lastIndexOf(',') + 1).trim();
		return ip;
	}
}