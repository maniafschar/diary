package com.jq.diary.service;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.jq.diary.entity.Contact;
import com.jq.diary.repository.Repository;
import com.jq.diary.service.AuthenticationService.AuthenticationException;

class AuthenticationServiceTest {
	@Test
	void recordsLastInteractionAfterSuccessfulVerification() throws Exception {
		final Repository repository = mock(Repository.class);
		final AuthenticationService service = spy(new AuthenticationService());
		ReflectionTestUtils.setField(service, "repository", repository);
		final Contact contact = new Contact();
		contact.setId(BigInteger.TEN);
		when(repository.one(Contact.class, contact.getId())).thenReturn(contact);
		doReturn("secret").when(service).getPassword(contact);
		final String salt = UUID.randomUUID().toString();
		final String password = hash("secret" + salt + contact.getId());

		service.verify(contact.getId(), password, salt);

		assertNotNull(contact.getLastInteraction());
		verify(repository).save(contact);
	}

	@Test
	void doesNotRecordLastInteractionAfterFailedVerification() throws Exception {
		final Repository repository = mock(Repository.class);
		final AuthenticationService service = spy(new AuthenticationService());
		ReflectionTestUtils.setField(service, "repository", repository);
		final Contact contact = new Contact();
		contact.setId(BigInteger.TEN);
		when(repository.one(Contact.class, contact.getId())).thenReturn(contact);
		doReturn("secret").when(service).getPassword(contact);

		assertThrows(AuthenticationException.class,
				() -> service.verify(contact.getId(), "wrong", UUID.randomUUID().toString()));

		verify(repository, never()).save(contact);
	}

	private String hash(final String value) throws Exception {
		final byte[] bytes = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
		final StringBuilder result = new StringBuilder();
		for (final byte b : bytes)
			result.append(String.format("%02x", b));
		return result.toString();
	}
}
