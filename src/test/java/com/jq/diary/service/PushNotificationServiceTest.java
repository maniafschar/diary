package com.jq.diary.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class PushNotificationServiceTest {
	@Test
	void remainsDisabledWithoutApnsCredentials() {
		final PushNotificationService service = new PushNotificationService(null, "", "", "", "", true);

		assertFalse(service.isConfigured());
	}

	@Test
	void rejectsMalformedDeviceTokens() {
		final PushNotificationService service = new PushNotificationService(null, "", "", "", "", true);

		assertThrows(IllegalArgumentException.class, () -> service.register(null, "not-an-apns-token"));
	}
}