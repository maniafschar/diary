package com.jq.diary.service;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.ai.openai.OpenAiChatModel;

import com.google.genai.types.Content;
import com.jq.diary.service.AiService.AiProvider;

class AiServiceProviderTest {
	@Test
	void noneProviderDoesNotMakeARequest() throws Exception {
		final AiService service = this.serviceWithProvider(AiProvider.None);
		assertNull(service.chatReply(List.of()));
	}

	@Test
	void huggingFaceProviderRequiresServerToken() throws Exception {
		final AiService service = this.serviceWithProvider(AiProvider.HuggingFace);
		this.setField(service, "huggingFace", "");
		assertThrows(IllegalStateException.class,
				() -> service.chatReply(List.of(Content.builder().role("user").build())));
	}

	@Test
	void ollamaProviderBuildsLocalChatModelWithoutApiKey() throws Exception {
		final AiService service = this.serviceWithProvider(AiProvider.Ollama);
		final Method chatModel = AiService.class.getDeclaredMethod("chatModel");
		chatModel.setAccessible(true);

		assertInstanceOf(OpenAiChatModel.class, chatModel.invoke(service));
	}

	private AiService serviceWithProvider(final AiProvider provider) throws Exception {
		final AiService service = new AiService();
		this.setField(service, "provider", provider);
		return service;
	}

	private void setField(final AiService service, final String fieldName, final Object value) throws Exception {
		final Field field = AiService.class.getDeclaredField(fieldName);
		field.setAccessible(true);
		field.set(service, value);
	}
}