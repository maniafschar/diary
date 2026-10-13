package com.jq.diary.service;

import java.io.File;
import java.math.BigInteger;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.eatthepath.pushy.apns.ApnsClient;
import com.eatthepath.pushy.apns.ApnsClientBuilder;
import com.eatthepath.pushy.apns.PushNotificationResponse;
import com.eatthepath.pushy.apns.auth.ApnsSigningKey;
import com.eatthepath.pushy.apns.util.ApnsPayloadBuilder;
import com.eatthepath.pushy.apns.util.SimpleApnsPayloadBuilder;
import com.eatthepath.pushy.apns.util.SimpleApnsPushNotification;
import com.jq.diary.entity.Contact;
import com.jq.diary.entity.ContactEvent;
import com.jq.diary.entity.Event;
import com.jq.diary.entity.PushDelivery;
import com.jq.diary.entity.PushDevice;
import com.jq.diary.repository.Repository;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

@Service
public class PushNotificationService {
	private static final Logger LOGGER = LoggerFactory.getLogger(PushNotificationService.class);
	private final Repository repository;
	private final String keyPath;
	private final String teamId;
	private final String keyId;
	private final String topic;
	private final boolean sandbox;
	private volatile ApnsClient apnsClient;

	public PushNotificationService(final Repository repository,
			@Value("${app.push.apns.keyPath:}") final String keyPath,
			@Value("${app.push.apns.teamId:}") final String teamId,
			@Value("${app.push.apns.keyId:}") final String keyId,
			@Value("${app.push.apns.topic:com.jq.diary}") final String topic,
			@Value("${app.push.apns.sandbox:true}") final boolean sandbox) {
		this.repository = repository;
		this.keyPath = keyPath;
		this.teamId = teamId;
		this.keyId = keyId;
		this.topic = topic;
		this.sandbox = sandbox;
	}

	@PostConstruct
	void initialize() {
		if (this.keyPath.isBlank() || this.teamId.isBlank() || this.keyId.isBlank() || this.topic.isBlank())
			return;
		try {
			this.apnsClient = new ApnsClientBuilder()
					.setApnsServer(this.sandbox ? ApnsClientBuilder.DEVELOPMENT_APNS_HOST
							: ApnsClientBuilder.PRODUCTION_APNS_HOST)
					.setSigningKey(ApnsSigningKey.loadFromPkcs8File(new File(this.keyPath), this.teamId, this.keyId))
					.build();
		} catch (final Exception ex) {
			LOGGER.error("APNs could not be initialized; push notifications remain disabled.", ex);
		}
	}

	@PreDestroy
	void shutdown() {
		final ApnsClient client = this.apnsClient;
		if (client != null)
			client.close();
	}

	public boolean isConfigured() {
		return this.apnsClient != null;
	}

	public void register(final Contact contact, final String token) {
		if (token == null || !token.matches("(?i)[0-9a-f]{64,128}"))
			throw new IllegalArgumentException("Invalid APNs device token.");
		final String normalizedToken = token.toLowerCase();
		final List<PushDevice> devices = this.repository.list("from PushDevice where token=?1", PushDevice.class,
				normalizedToken);
		final PushDevice device = devices.isEmpty() ? new PushDevice() : devices.get(0);
		device.setContact(contact);
		device.setToken(normalizedToken);
		this.repository.save(device);
	}

	public void unregister(final BigInteger contactId, final String token) {
		if (token == null)
			return;
		this.repository.list("from PushDevice where token=?1 and contact.id=?2", PushDevice.class,
				token.toLowerCase(), contactId).forEach(this.repository::delete);
	}

	public void notifyClient(final BigInteger clientId, final BigInteger excludedContactId,
			final BigInteger eventId, final String title, final String body) {
		if (!this.isConfigured())
			return;
		final List<PushDevice> devices = this.repository.list(
				"select d from PushDevice d join d.contact.clients c where c.id=?1 and d.contact.id<>?2 and d.contact.notification=true",
				PushDevice.class, clientId, excludedContactId);
		devices.forEach(device -> this.send(device, eventId, null, title, body));
	}

	public void notifyContact(final BigInteger contactId, final BigInteger excludedContactId,
			final BigInteger eventId,
			final String title, final String body) {
		if (!this.isConfigured())
			return;
		final List<PushDevice> devices = this.repository.list(
				"from PushDevice d where d.contact.id=?1 and d.contact.id<>?2 and d.contact.notification=true",
				PushDevice.class, contactId, excludedContactId);
		devices.forEach(device -> this.send(device, eventId, null, title, body));
	}

	@Scheduled(fixedDelay = 60000, initialDelay = 30000)
	public void sendUpcomingReminders() {
		if (!this.isConfigured())
			return;
		final Instant now = Instant.now();
		final Date from = Date.from(now.plus(Duration.ofMinutes(25)));
		final Date to = Date.from(now.plus(Duration.ofMinutes(30)));
		final List<Event> events = this.repository.list("from Event e where e.date between ?1 and ?2",
				Event.class, from, to);
		for (final Event event : events) {
			final List<ContactEvent> participants = this.repository.list(
					"from ContactEvent ce where ce.event.id=?1", ContactEvent.class, event.getId());
			for (final ContactEvent participant : participants) {
				if (Boolean.TRUE.equals(participant.getContact().getNotification()))
					this.sendReminder(event, participant.getContact());
			}
		}
	}

	private void sendReminder(final Event event, final Contact contact) {
		final List<PushDevice> devices = this.repository.list("from PushDevice d where d.contact.id=?1",
				PushDevice.class, contact.getId());
		for (final PushDevice device : devices) {
			final List<PushDelivery> deliveries = this.repository.list(
					"from PushDelivery where eventId=?1 and device.id=?2 and kind=?3",
					PushDelivery.class, event.getId(), device.getId(), "REMINDER");
			if (!deliveries.isEmpty())
				continue;
			final PushDelivery delivery = new PushDelivery();
			delivery.setEventId(event.getId());
			delivery.setDevice(device);
			delivery.setKind("REMINDER");
			try {
				this.repository.save(delivery);
			} catch (final RuntimeException ex) {
				continue;
			}
			this.send(device, event.getId(), delivery, "Event-Erinnerung",
					"Dein Event beginnt in etwa 30 Minuten.");
		}
	}

	private void send(final PushDevice device, final BigInteger eventId, final PushDelivery reminder,
			final String title, final String body) {
		final ApnsPayloadBuilder payload = new SimpleApnsPayloadBuilder();
		payload.setAlertTitle(title);
		payload.setAlertBody(body);
		payload.setSound(ApnsPayloadBuilder.DEFAULT_SOUND_FILENAME);
		payload.addCustomProperty("eventId", eventId.toString());
		final SimpleApnsPushNotification notification = new SimpleApnsPushNotification(
				device.getToken(), this.topic, payload.build());
		final CompletableFuture<PushNotificationResponse<SimpleApnsPushNotification>> future = this.apnsClient
				.sendNotification(notification);
		future.whenComplete((response, error) -> {
			if (error != null || response == null || !response.isAccepted()) {
				LOGGER.warn("APNs push failed for device {}: {}", device.getId(),
						error != null ? error.getMessage()
								: response == null ? "no response" : response.getRejectionReason().orElse("rejected"));
				if (response != null && response.getStatusCode() == 410)
					this.repository.delete(device);
				if (reminder != null)
					this.repository.delete(reminder);
			}
		});
	}
}