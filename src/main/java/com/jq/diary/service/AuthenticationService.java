package com.jq.diary.service;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.apache.commons.io.IOUtils;
import org.apache.commons.mail.EmailException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.ResponseStatus;

import com.jq.diary.api.model.Registration;
import com.jq.diary.entity.Client;
import com.jq.diary.entity.Contact;
import com.jq.diary.entity.ContactEvent;
import com.jq.diary.entity.ContactToken;
import com.jq.diary.entity.Ticket;
import com.jq.diary.repository.Repository;
import com.jq.diary.service.AuthenticationService.AuthenticationException.AuthenticationExceptionType;
import com.jq.diary.util.Encryption;
import com.jq.diary.util.Json;
import com.jq.diary.util.Utilities;

@Service
public class AuthenticationService {
	private static final List<String> USED_SALTS = new ArrayList<>();
	private static final List<String> BLOCKED_EMAIL_DOMAINS = new ArrayList<>();
	private static final Map<BigInteger, Password> PW = new HashMap<>();
	private static final Map<BigInteger, FailedAttempts> FAILED_AUTHS = new HashMap<>();
	private static long TIMEOUT = 3600000L;

	@Autowired
	private AdminService adminService;

	@Autowired
	private EmailService emailService;

	@Autowired
	private Repository repository;

	private static class Password {
		private final String password;
		private final long reset;

		private Password(final String password, final long reset) {
			this.password = password;
			this.reset = reset;
		}
	}

	private static class FailedAttempts {
		private final long timestamp = System.currentTimeMillis();
		private int attempts = 1;
	}

	@ResponseStatus(HttpStatus.UNAUTHORIZED)
	public static class AuthenticationException extends RuntimeException {
		public enum AuthenticationExceptionType {
			NoInputFromClient, WrongPassword, NoPasswordInDB, UsedSalt, ProtectedArea, AdminSecret, WrongClient, Unknown
		}

		private final AuthenticationExceptionType type;

		public AuthenticationException(final AuthenticationExceptionType type) {
			this.type = type == null ? AuthenticationExceptionType.Unknown : type;
		}

		public AuthenticationExceptionType getType() {
			return this.type;
		}

		@Override
		public String getMessage() {
			return this.type.name();
		}
	}

	public static class Unique {
		public final String email;
		public final boolean unique;
		public final boolean blocked;

		private Unique(final String email, final boolean unique, final boolean blocked) {
			this.email = email;
			this.unique = unique;
			this.blocked = blocked;
		}
	}

	static {
		try {
			BLOCKED_EMAIL_DOMAINS.addAll(Arrays.asList(Json.toObject(
					IOUtils.toString(AuthenticationService.class.getResourceAsStream("/blockedEmailDomains.json"),
							StandardCharsets.UTF_8),
					String[].class)));
		} catch (final Exception ex) {
			throw new RuntimeException(ex);
		}
	}

	public Contact verify(final BigInteger user, final String password, final String salt) {
		if (user == null || user.compareTo(BigInteger.ONE) < 0)
			throw new AuthenticationException(AuthenticationExceptionType.NoInputFromClient);
		final Contact contact = this.repository.one(Contact.class, user);
		this.verify(contact, password, salt, false);
		return contact;
	}

	private void verify(final Contact contact, final String password, final String salt, final boolean login) {
		if (contact == null || password == null || password.length() == 0 || salt == null || salt.length() == 0)
			throw new AuthenticationException(AuthenticationExceptionType.NoInputFromClient);
		synchronized (USED_SALTS) {
			if (USED_SALTS.contains(salt))
				throw new AuthenticationException(AuthenticationExceptionType.UsedSalt);
			USED_SALTS.add(salt);
			if (USED_SALTS.size() > 1000) {
				final long timeout = System.currentTimeMillis() - TIMEOUT;
				final char sep = '.';
				String s;
				int i = 0;
				while (USED_SALTS.size() > i) {
					s = USED_SALTS.get(i);
					if (Long.valueOf(s.substring(0, s.indexOf(sep))) < timeout)
						USED_SALTS.remove(i);
					else
						i++;
				}
			}
		}
		if (!this.getHash(this.getPassword(contact) + salt + (login ? 0 : contact.getId())).equals(password)) {
			final FailedAttempts x;
			synchronized (FAILED_AUTHS) {
				final long SIX_HOURS_BEFORE = System.currentTimeMillis() - 3600000L * 6L;
				final Object[] keys = FAILED_AUTHS.keySet().toArray();
				for (final Object k : keys) {
					if (FAILED_AUTHS.get(k).timestamp < SIX_HOURS_BEFORE)
						FAILED_AUTHS.remove(k);
				}
				x = FAILED_AUTHS.get(contact.getId());
				if (x == null)
					FAILED_AUTHS.put(contact.getId(), new FailedAttempts());
				else
					FAILED_AUTHS.get(contact.getId()).attempts++;
			}
			if (x != null && x.attempts > 5) {
				try {
					Thread.sleep((long) Math.pow(x.attempts - 5, 3) * 1000L);
				} catch (final InterruptedException e) {
				}
			}
			throw new AuthenticationException(AuthenticationExceptionType.WrongPassword);
		}
	}

	public Contact register(final Registration registration) {
		if (!registration.isAgb())
			throw new IllegalArgumentException("legal");
		final int minimum = 5000;
		if (registration.getTime() < minimum)
			throw new IllegalArgumentException("time");
		if (!Utilities.isEmail(registration.getEmail()))
			throw new IllegalArgumentException("email");
		final Unique unique = this.unique(registration.getClientId(), registration.getEmail());
		if (!unique.unique)
			throw new IllegalArgumentException("email");
		if (unique.blocked) {
			this.adminService.createTicket(new Ticket("email registration blocked: " + registration.toString()));
			throw new IllegalArgumentException("domain");
		}
		final List<Contact> list = this.repository.list("from Contact where email='"
				+ registration.getEmail().toLowerCase().trim() + "' and client.id="
				+ registration.getClientId(), Contact.class);
		final Contact contact = list.size() == 0 ? new Contact() : list.get(0);
		contact.setName(registration.getName());
		contact.setEmail(registration.getEmail().toLowerCase().trim());
		contact.setClient(this.repository.one(Client.class, registration.getClientId()));
		try {
			if (contact.getEmail().contains("@"))
				this.emailService.send(contact.getEmail(),
						this.createEmailLoginLink(contact, this.generateLoginParam(contact)));
			this.saveRegistration(contact, registration);
			return contact;
		} catch (final IllegalArgumentException ex) {
			throw new IllegalArgumentException("email");
		} catch (final EmailException ex) {
			throw new IllegalArgumentException("email");
		}
	}

	private String createEmailLoginLink(final Contact contact, final String link) {
		return "Hallo " + contact.getName() + ",\n\nklick auf den Link\n\nhttps://schafkopf.studio?" + link
				+ "\n\nDu kannst dann Dein Passwort setzen.\n\nViele Grüße\nhttps://schafkopf.studio";
	}

	public Unique unique(final BigInteger clientId, String email) {
		email = email.toLowerCase();
		final List<ContactEvent> list = this.repository
				.list("from Contact where LOWER(email)='" + email + "' and client.id=" + clientId, ContactEvent.class);
		return new Unique(email, list.size() == 0, AuthenticationService.BLOCKED_EMAIL_DOMAINS
				.contains(email.substring(email.indexOf('@') + 1)));
	}

	void saveRegistration(final Contact contact, final Registration registration) {
		contact.setClient(this.repository.one(Client.class, registration.getClientId()));
		contact.setEmail(contact.getEmail().toLowerCase().trim());
		this.savePassword(contact, Utilities.generatePin(20));
	}

	public Contact login(final String email, final String password, final String salt) {
		final List<Contact> list = this.repository.list("from Contact where email='" + email + "' order by id",
				Contact.class);
		if (list.size() > 0) {
			final Contact contact = list.get(0);
			this.verify(contact, password, salt, true);
			this.repository.list(
					"from Contact where email='" + contact.getEmail()
							+ "' and (loginLink is not null or verified=false)",
					Contact.class).stream().forEach(e -> {
						e.setLoginLink(null);
						e.setVerified(true);
						this.repository.save(e);
					});
			return contact;
		}
		return null;
	}

	private String generateLoginParam(final Contact contact) {
		final String s = Utilities.generatePin(42);
		long x = 0;
		for (int i = 0; i < s.length(); i++) {
			x += s.charAt(i);
			if (x > 99999999)
				break;
		}
		String s2 = "" + x;
		s2 += s.substring(1, 11 - s2.length());
		String old = contact.getLoginLink();
		if (old == null)
			old = "";
		else if (old.length() > 207)
			old = old.substring(52);
		contact.setLoginLink(old + s.substring(0, 10) + s2 + s.substring(10));
		return s;
	}

	public void tokenDelete(final String token) {
		final List<ContactToken> list = this.repository
				.list("from ContactToken where token='" + token + "'", ContactToken.class);
		if (list.size() > 0) {
			final ContactToken t = list.get(0);
			t.setToken("");
			this.repository.save(t);
		}
	}

	public void createClient(final Client client) {
		if (client.getContacts() == null || client.getContacts().size() == 0)
			throw new RuntimeException("Missing data");
		if (client.getContacts().size() > 1)
			throw new RuntimeException("Too many contacts: " + client.getContacts().size());
		final Contact contact = client.getContacts().get(0);
		if (client.getId() != null || contact.getId() != null)
			throw new RuntimeException("Data contains id");
		if (contact.getEmail() == null
				|| !contact.getEmail().matches("^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$"))
			throw new RuntimeException("Invalid email");
		client.setContacts(null);
		this.repository.save(client);
		contact.setClient(client);
		try {
			this.emailService.send(contact.getEmail(),
					this.createEmailLoginLink(contact, this.generateLoginParam(contact)));
			contact.setEmail(contact.getEmail().toLowerCase().trim());
			this.savePassword(contact, Utilities.generatePin(20));
		} catch (final IllegalArgumentException ex) {
			throw new IllegalArgumentException("email");
		} catch (final EmailException ex) {
			throw new IllegalArgumentException("email");
		}
	}

	public String tokenRefresh(final Contact contact, final String publicKey) {
		final List<ContactToken> list = this.repository
				.list("from ContactToken where contact.id=" + contact.getId() + " and token=''", ContactToken.class);
		final ContactToken contactToken;
		if (list.size() < 1) {
			contactToken = new ContactToken();
			contactToken.setContact(contact);
		} else
			contactToken = list.get(0);
		contactToken.setToken(UUID.randomUUID().toString());
		this.repository.save(contactToken);
		return Encryption.encrypt(contactToken.getToken(), publicKey);
	}

	public String token2User(final String publicKey, final String token) {
		try {
			final List<ContactToken> list = this.repository
					.list("from ContactToken where token='" + token + "'", ContactToken.class);
			if (list.size() == 0)
				return null;
			final Contact c = list.get(0).getContact();
			final Map<String, String> result = new HashMap<>();
			result.put("id", "" + c.getId());
			result.put("password", this.getPassword(c));
			result.put("clientId", "" + c.getClient().getId());
			result.put("clientImage", "" + c.getClient().getImage());
			return Encryption.encrypt(Json.toString(result), publicKey);
		} catch (final Exception ex) {
			this.adminService.createTicket(new Ticket(Utilities.stackTraceToString(ex)));
			return null;
		}
	}

	public void logoff(final ContactEvent contact, final String token) {
		if (token != null) {
			final List<ContactToken> list = this.repository
					.list("from ContactToken where token='" + token + "'", ContactToken.class);
			if (list.size() > 0)
				this.repository.delete(list.get(0));
		}
	}

	public String recoverSendEmail(final String email) throws EmailException {
		final List<Contact> list = this.repository
				.list("from Contact where email='" + email + "'", Contact.class);
		if (list.size() > 0) {
			final Contact contact = list.get(0);
			final String s = this.generateLoginParam(contact);
			this.repository.save(contact);
			this.emailService.send(contact.getEmail(), this.createEmailLoginLink(contact, s));
			return "ok";
		}
		return "nok:Email";
	}

	public Contact recoverVerifyEmail(final String token, final String password) {
		final List<Contact> list = this.repository.list("from Contact where loginLink like '%" + token + "%'",
				Contact.class);
		if (list.size() != 1)
			return null;
		final Contact contact = list.get(0);
		contact.setVerified(Boolean.TRUE);
		this.savePassword(contact, password);
		return contact;
	}

	private void savePassword(final Contact contact, final String password) {
		contact.setPassword(Encryption.encryptDB(password));
		contact.setPasswordReset(Instant.now().toEpochMilli());
		this.repository.save(contact);
	}

	private String getHash(final String s) {
		try {
			final byte[] hash = MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
			final StringBuilder hexString = new StringBuilder();
			for (int i = 0; i < hash.length; i++) {
				final String hex = Integer.toHexString(0xff & hash[i]);
				if (hex.length() == 1)
					hexString.append('0');
				hexString.append(hex);
			}
			return hexString.toString();
		} catch (final NoSuchAlgorithmException e) {
			throw new RuntimeException(e);
		}
	}

	public String getPassword(final Contact u) {
		if (u.getPassword() == null || u.getPassword().length() == 0)
			throw new AuthenticationException(AuthenticationExceptionType.NoPasswordInDB);
		synchronized (PW) {
			Password pw = PW.get(u.getId());
			if (pw == null || pw.reset - u.getPasswordReset() < 0) {
				try {
					pw = new Password(Encryption.decryptDB(u.getPassword()), u.getPasswordReset());
					PW.put(u.getId(), pw);
				} catch (final Exception e) {
					throw new RuntimeException(e.getClass().getName() + "\n" + e.getMessage(), e);
				}
			}
			return pw.password;
		}
	}
}