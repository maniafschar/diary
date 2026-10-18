package com.jq.diary.service;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

import org.apache.commons.io.IOUtils;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.google.genai.Client;
import com.google.genai.gaos.models.interactions.CreateModelInteraction;
import com.google.genai.gaos.models.interactions.CreateModelInteractionResponseFormat;
import com.google.genai.gaos.models.interactions.ImageContent;
import com.google.genai.gaos.models.interactions.ImageResponseFormat;
import com.google.genai.gaos.models.interactions.ImageResponseFormatMimeType;
import com.google.genai.gaos.models.interactions.Interaction;
import com.google.genai.gaos.models.interactions.InteractionsInput;
import com.google.genai.gaos.models.interactions.ModelOutputStep;
import com.google.genai.gaos.models.interactions.ResponseFormat;
import com.google.genai.gaos.models.interactions.Step;
import com.google.genai.gaos.models.operations.CreateInteractionRequestBody;
import com.google.genai.types.Content;
import com.google.genai.types.Part;
import com.jq.diary.entity.Summary;
import com.jq.diary.entity.Summary.Prompt;
import com.jq.diary.entity.Ticket;
import com.jq.diary.util.Utilities;

@Service
public class AiService {
	private final AiProvider provider = AiProvider.Ollama;
	private volatile ChatModel springAiChatModel;

	@Autowired
	private AdminService adminService;

	@Value("${app.chatGPT.key}")
	private String chatGpt;

	@Value("${app.google.gemini.apiKey}")
	private String geminiKey;

	@Value("${app.huggingface.apiKey}")
	private String huggingFace;

	enum AiProvider {
		GPT, Gemini, HuggingFace, Ollama, None
	}

	public Summary summary(final Prompt prompt, final String text) {
		if (text.length() < 900)
			return null;
		return this.summarySpringAi(prompt, text);
	}

	public String chatReply(final List<Content> conversation) {
		if (this.provider == AiProvider.None)
			return null;
		final List<Message> messages = new ArrayList<>();
		for (final Content content : conversation) {
			if (content.parts().isEmpty())
				continue;
			final String role = content.role().orElse("user");
			final StringBuilder text = new StringBuilder();
			for (final Part part : content.parts().get())
				text.append(part.text().orElse(""));
			if (role.equals("system"))
				messages.add(new SystemMessage(text.toString()));
			else if (role.equals("model") || role.equals("assistant"))
				messages.add(new AssistantMessage(text.toString()));
			else
				messages.add(new UserMessage(text.toString()));
		}
		final ChatModel model = this.chatModel();
		try {
			final ChatResponse response = model.call(
					new org.springframework.ai.chat.prompt.Prompt(messages));
			final String answer = response.getResult().getOutput().getText();
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
			switch (this.provider) {
				case Gemini -> {
					baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";
					completionsPath = "/chat/completions";
					apiKey = this.geminiKey;
					defaultModel = "gemini-2.5-flash-lite";
				}
				case GPT -> {
					baseUrl = "https://api.openai.com";
					completionsPath = "/v1/chat/completions";
					apiKey = this.chatGpt;
					defaultModel = "gpt-4o-mini";
				}
				case HuggingFace -> {
					baseUrl = "https://router.huggingface.co/v1";
					completionsPath = "/chat/completions";
					apiKey = this.huggingFace;
					defaultModel = "google/gemma-3-27b-it";
				}
				case Ollama -> {
					baseUrl = "http://127.0.0.1:11434";
					completionsPath = "/v1/chat/completions";
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
					.build();
			model = OpenAiChatModel.builder()
					.openAiApi(api)
					.defaultOptions(OpenAiChatOptions.builder().model(defaultModel).build())
					.build();
			this.springAiChatModel = model;
			return model;
		}
	}

	private Summary summarySpringAi(final Prompt prompt, final String text) {
		try {
			final List<Message> messages = List.of(
					new SystemMessage(prompt.getText() + "\n\nGib ausschließlich ein gültiges JSON-Objekt "
							+ "mit summary (String), adjectives (String-Array) und emojis (String-Array) zurück."),
					new UserMessage(text));
			final OpenAiChatOptions options = OpenAiChatOptions.builder()
					.responseFormat(new org.springframework.ai.openai.api.ResponseFormat(
							org.springframework.ai.openai.api.ResponseFormat.Type.JSON_OBJECT, null))
					.build();
			final ChatResponse response = this.chatModel()
					.call(new org.springframework.ai.chat.prompt.Prompt(messages, options));
			final Summary summary = this.convert(response.getResult().getOutput().getText());
			if (this.provider != AiProvider.Ollama)
				summary.setImage(this.imageGemini(this.imageGeminiPrompt(summary.getNote())));
			summary.setTextLength(text.length());
			return summary;
		} catch (final Exception ex) {
			this.adminService.createTicket(new Ticket(Ticket.ERROR + Utilities.stackTraceToString(ex)));
			throw new IllegalStateException("Spring AI summary request failed.", ex);
		}
	}

	private String imageGeminiPrompt(final String summary) {
		final String instructions = "Erstelle aus dieser psychologischen Analyse einen präzisen Bild-Prompt. "
				+ "Nutze eine starke visuelle Metapher, beschreibe Vordergrund, Licht und Farben und wähle "
				+ "einen passenden kunstvollen Stil. Gib ausschließlich den finalen Prompt auf Deutsch aus.";
		final ChatResponse response = this.chatModel()
				.call(new org.springframework.ai.chat.prompt.Prompt(
						List.of(new SystemMessage(instructions), new UserMessage(summary))));
		return response.getResult().getOutput().getText().trim();
	}

	private String imageGemini(final String prompt) {
		try (final Client client = Client.builder().apiKey(this.geminiKey).build()) {
			final CreateModelInteraction request = CreateModelInteraction.builder()
					.model("gemini-3.1-flash-image")
					.input(InteractionsInput.of(prompt))
					.responseFormat(CreateModelInteractionResponseFormat.of(ResponseFormat.of(
							ImageResponseFormat.builder().mimeType(ImageResponseFormatMimeType.IMAGE_JPEG)
									.build())))
					.build();
			final Interaction interaction = client.interactions.create()
					.body(CreateInteractionRequestBody.of(request))
					.call()
					.interaction()
					.orElse(null);
			if (interaction == null)
				return null;
			for (final Step step : interaction.steps().orElse(List.of())) {
				if (step instanceof final ModelOutputStep modelOutputStep) {
					for (final com.google.genai.gaos.models.interactions.Content content : modelOutputStep.content()
							.orElse(List.of())) {
						if (content instanceof final ImageContent imageContent) {
							if (imageContent.data().isPresent())
								return imageContent.data().get();
							if (imageContent.uri().isPresent()) {
								final ByteArrayOutputStream out = new ByteArrayOutputStream();
								IOUtils.copy(new URI(imageContent.uri().get()).toURL(), out);
								return Base64.getEncoder().encodeToString(out.toByteArray());
							}
						}
					}
				}
			}
			if (interaction.outputImage().isPresent()) {
				final ImageContent image = interaction.outputImage().get();
				if (image.data().isPresent())
					return image.data().get();
				if (image.uri().isPresent()) {
					final ByteArrayOutputStream out = new ByteArrayOutputStream();
					IOUtils.copy(new URI(image.uri().get()).toURL(), out);
					return Base64.getEncoder().encodeToString(out.toByteArray());
				}
			}
		} catch (final Exception ex) {
			this.adminService.createTicket(new Ticket(Utilities.stackTraceToString(ex)));
		}
		return null;
	}

	protected Summary convert(final String summary) {
		try {
			final JsonNode node = new ObjectMapper().readTree(summary);
			final Summary response = new Summary();
			response.setNote(node.get("summary").asText().trim());
			response.getAdjectives().addAll(this.convertList((ArrayNode) node.get("adjectives")));
			response.getEmojis().addAll(this.convertList((ArrayNode) node.get("emojis")));
			return response;
		} catch (final JsonProcessingException ex) {
			throw new RuntimeException(ex);
		}
	}

	private List<String> convertList(final ArrayNode node) {
		final List<String> list = new ArrayList<>();
		for (int i = 0; i < node.size(); i++)
			list.add(node.get(i).asText().toLowerCase().replace("**", ""));
		return list;
	}
}