package com.jq.diary.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class VoiceCallServiceTest {
	@Test
	void doesNotStartCallWhenTwilioIsNotConfigured() {
		final VoiceCallService service = new VoiceCallService(null, "", "", "", "", "");

		final ResponseStatusException exception = assertThrows(ResponseStatusException.class,
				() -> service.startCall("1"));

		assertEquals(HttpStatus.SERVICE_UNAVAILABLE, exception.getStatusCode());
	}
}