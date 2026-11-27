package com.jq.diary.api;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigInteger;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.jq.diary.entity.Contact;
import com.jq.diary.service.AuthorizationService;
import com.jq.diary.service.ContactService;

class ContactDeleteApiTest {
	@Test
	void deletesOnlyTheAuthenticatedContactAndReturnsAnEmptySuccess() throws Exception {
		final ContactApi api = new ContactApi();
		final AuthorizationService authorization = mock(AuthorizationService.class);
		final ContactService service = mock(ContactService.class);
		ReflectionTestUtils.setField(api, "authorizationService", authorization);
		ReflectionTestUtils.setField(api, "contactService", service);
		final Contact contact = new Contact();
		contact.setId(BigInteger.TEN);
		when(authorization.requireContact(BigInteger.TEN, BigInteger.TWO)).thenReturn(contact);

		MockMvcBuilders.standaloneSetup(api).build().perform(delete("/api/contact")
				.header("contactId", "10").header("clientId", "2"))
				.andExpect(status().isOk()).andExpect(content().string(""));
		verify(service).delete(contact);
	}
}
