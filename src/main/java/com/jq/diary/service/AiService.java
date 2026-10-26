package com.jq.diary.service;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.ai.support.ToolCallbacks;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.google.genai.types.Content;
import com.google.genai.types.Part;
import com.jq.diary.entity.Ticket;
import com.jq.diary.util.Utilities;

@Service
public class AiService {
	static final String ACTOR_USER = "user";
	static final String ACTOR_SYSTEM = "system";
	static final String ACTOR_MODEL = "model";
	private final AiProvider provider = AiProvider.Ben;
	private volatile ChatModel springAiChatModel;

	@Autowired
	private AdminService adminService;

	@Autowired
	private WebTool webTool;

	@Value("${app.chatGPT.key}")
	private String chatGpt;

	@Value("${app.google.gemini.apiKey}")
	private String geminiKey;

	@Value("${app.ai.connectTimeoutSeconds}")
	private long connectTimeoutSeconds;

	@Value("${app.ai.readTimeoutSeconds}")
	private long readTimeoutSeconds;

	@Value("${app.ben.apiKey}")
	private String benKey;

	@Value("${app.huggingface.apiKey}")
	private String huggingFace;

	enum AiProvider {
		GPT, Gemini, HuggingFace, Ollama, Ben, None
	}

	public String chatReply(final List<Content> conversation, final boolean web) {
		if (this.provider == AiProvider.None)
			return null;
		final long start = System.nanoTime();
		final List<Message> messages = new ArrayList<>();
		for (final Content content : conversation) {
			if (content.parts().isEmpty())
				continue;
			final String role = content.role().orElse(ACTOR_USER);
			final StringBuilder text = new StringBuilder();
			for (final Part part : content.parts().get())
				text.append(part.text().orElse(""));
			if (role.equals(AiService.ACTOR_SYSTEM))
				messages.add(new SystemMessage(text.toString()));
			else if (role.equals(AiService.ACTOR_MODEL) || role.equals("assistant"))
				messages.add(new AssistantMessage(text.toString()));
			else
				messages.add(new UserMessage(text.toString()));
		}
		System.out.println(messages);
		final ChatModel model = this.chatModel();
		try {
			final ChatResponse response = web
					? model.call(new Prompt(messages,
							OpenAiChatOptions.builder().toolCallbacks(ToolCallbacks.from(this.webTool)).build()))
					: model.call(new Prompt(messages));
			final String answer = response.getResult().getOutput().getText();
			this.adminService
					.createTicket(new Ticket("entries: " + conversation.size()
							+ "\nduration: " + (System.nanoTime() - start) / 1_000_000 + " ms\n" + answer));
			return answer == null || answer.isBlank()
					? "Entschuldigung, ich konnte gerade keine Antwort formulieren."
					: answer.trim();
		} catch (final Exception ex) {
			this.adminService.createTicket(new Ticket(Ticket.ERROR + Utilities.stackTraceToString(ex)));
			throw new IllegalStateException("Spring AI chat request failed.", ex);
		}
	}

	private ChatModel chatModel() {
		ChatModel model = this.springAiChatModel;
		if (model != null)
			return model;
		synchronized (this) {
			model = this.springAiChatModel;
			if (model != null)
				return model;
			final String baseUrl;
			final String completionsPath;
			final String apiKey;
			final String defaultModel;
			boolean thinking = true;
			switch (this.provider) {
				case Gemini -> {
					baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";
					completionsPath = "/chat/completions";
					apiKey = this.geminiKey;
					defaultModel = "gemini-2.5-flash-lite";
				}
				case GPT -> {
					baseUrl = "https://api.openai.com/v1";
					completionsPath = "/chat/completions";
					apiKey = this.chatGpt;
					defaultModel = "gpt-4o-mini";
				}
				case HuggingFace -> {
					baseUrl = "https://router.huggingface.co/v1";
					completionsPath = "/chat/completions";
					apiKey = this.huggingFace;
					defaultModel = "google/gemma-3-27b-it";
				}
				case Ben -> {
					baseUrl = "https://100.65.185.69/v1";
					completionsPath = "/chat/completions";
					apiKey = this.benKey;
					defaultModel = "qwen3.8-27b-w4a16";
					thinking = true;
				}
				case Ollama -> {
					baseUrl = "http://127.0.0.1:11434/v1";
					completionsPath = "/chat/completions";
					apiKey = "ollama";
					defaultModel = "qwen3:8b";
				}
				default -> throw new IllegalArgumentException("Unsupported AI chat provider: " + this.provider);
			}
			if (this.provider != AiProvider.Ollama && (apiKey == null || apiKey.isBlank()))
				throw new IllegalStateException("AI chat provider " + this.provider + " has no API key configured.");
			final OpenAiApi api = OpenAiApi.builder()
					.baseUrl(baseUrl)
					.completionsPath(completionsPath)
					.apiKey(apiKey)
					.restClientBuilder(this.restClientBuilder(thinking))
					.build();
			model = OpenAiChatModel.builder()
					.openAiApi(api)
					.defaultOptions(OpenAiChatOptions.builder().model(defaultModel).build())
					.build();
			this.springAiChatModel = model;
			return model;
		}
	}

	private RestClient.Builder restClientBuilder(final boolean thinking) {
		final JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
				HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(this.connectTimeoutSeconds)).build());
		factory.setReadTimeout(Duration.ofSeconds(this.readTimeoutSeconds));
		final RestClient.Builder builder = RestClient.builder().requestFactory(factory);
		if (!thinking)
			builder.requestInterceptor((request, body, execution) -> {
				final String json = new String(body, java.nio.charset.StandardCharsets.UTF_8).stripTrailing();
				final byte[] changed = json.endsWith("}")
						? (json.substring(0, json.length() - 1)
								+ ",\"chat_template_kwargs\":{\"enable_thinking\":false}}")
								.getBytes(java.nio.charset.StandardCharsets.UTF_8)
						: body;
				return execution.execute(request, changed);
			});
		return builder;
	}
}