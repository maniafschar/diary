package com.jq.diary.service;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.lang.reflect.Field;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.google.genai.types.Content;

class AiServiceProviderTest {
	@Test
	void noneProviderDoesNotMakeARequest() throws Exception {
		final AiService service = this.serviceWithProvider("NONE");

		assertNull(service.chatReply(List.of()));
	}

	@Test
	void huggingFaceProviderRequiresServerToken() throws Exception {
		final AiService service = this.serviceWithProvider("HUGGINGFACE");
		this.setField(service, "huggingFace", "");

		assertThrows(IllegalStateException.class,
				() -> service.chatReply(List.of(Content.builder().role("user").build())));
	}

	private AiService serviceWithProvider(final String provider) throws Exception {
		final AiService service = new AiService();
		this.setField(service, "chatProvider", provider);
		return service;
	}

	private void setField(final AiService service, final String fieldName, final String value) throws Exception {
		final Field field = AiService.class.getDeclaredField(fieldName);
		field.setAccessible(true);
		field.set(service, value);
	}
}