package com.jq.diary.service;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.ChatClient.ChatClientRequestSpec;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.api.CallAdvisor;
import org.springframework.ai.chat.client.advisor.api.CallAdvisorChain;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
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

@Service
public class AiService {
	static final String ACTOR_USER = "user";
	static final String ACTOR_SYSTEM = "system";
	static final String ACTOR_MODEL = "model";
	private final AiProvider provider = AiProvider.Ben;
	private volatile ChatModel springAiChatModel;
	private volatile ChatClient springAiChatClient;

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

	public String chat(final List<Content> conversation, final boolean callbacks) {
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
			else if (role.equals(AiService.ACTOR_MODEL))
				messages.add(new AssistantMessage(text.toString()));
			else
				messages.add(new UserMessage(text.toString()));
		}
		final ChatClient chatClient = this.client();
		ChatClientRequestSpec client = chatClient.prompt().messages(messages);
		if (callbacks)
			client = client.toolCallbacks(ToolCallbacks.from(this.webTool));
		final String answer = client.call().content();
		this.adminService.createTicket(new Ticket(
				"chat\n" + (System.nanoTime() - start) / 1_000_000 + "ms\n" + answer + "\n-----------\n"
						+ conversation.stream().map(e -> e.text()).collect(Collectors.joining("\n\n"))));
		if (answer != null && !answer.isBlank())
			return answer.trim();
		throw new IllegalStateException("Spring AI chat request failed.");
	}

	private ChatClient client() {
		ChatClient client = this.springAiChatClient;
		if (client != null)
			return client;
		synchronized (this) {
			client = this.springAiChatClient;
			if (client != null)
				return client;
			client = ChatClient.builder(this.model()).defaultAdvisors(new TicketLoggingAdvisor()).build();
			this.springAiChatClient = client;
			return client;
		}
	}

	private final class TicketLoggingAdvisor implements CallAdvisor {
		@Override
		public ChatClientResponse adviseCall(final ChatClientRequest request, final CallAdvisorChain chain) {
			return chain.nextCall(request);
		}

		@Override
		public String getName() {
			return "TicketLoggingAdvisor";
		}

		@Override
		public int getOrder() {
			return 0;
		}
	}

	private ChatModel model() {
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
					defaultModel = "swift-1.5-qwen3.8-27b";
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