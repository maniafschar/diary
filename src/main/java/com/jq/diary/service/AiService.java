package com.jq.diary.service;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.commons.io.IOUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.google.common.collect.ImmutableList;
import com.google.genai.Client;
import com.google.genai.ResponseStream;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import com.google.genai.types.Schema;
import com.google.genai.types.ThinkingConfig;
import com.google.genai.types.Type;
import com.jq.diary.entity.Ticket;
import com.jq.diary.util.Utilities;

@Service
public class AiService {
	private static AiType type = AiType.Gemini;

	public enum Prompt {
		Summary("Summarize this diary in about {0} characters "
				+ ", emphasis the dates with the most feelings, and at the end of the summary add "
				+ "in one line 3 comma separated adjectives and 3 emojis mainly discribing "
				+ "mood mood within the period in his life",
				"Create an image expressing the feelings of the people in this text"),
		AdvicePsychology("In about {0} characters give a psychological review and "
				+ "give practical advices on how to improve his life",
				"Create an image describing the psychological past and showing a "
						+ "bright future, based on the recomentations in the text"),
		AdviceRoute("Analyse the destinations the person was and give " +
				"meaningful suggestions, which other destinations could be of interest",
				"Create an image with some nice pictures of past destinations and "
						+ "new pictures of suggested destinations");

		private final String image;
		private final String text;

		private Prompt(final String text, final String image) {
			this.text = text;
			this.image = image;
		}
	};

	@Autowired
	private AdminService adminService;

	@Value("${app.chatGPT.key}")
	private String chatGpt;

	@Value("${app.google.gemini.apiKey}")
	private String geminiKey;

	private enum AiType {
		GPT, Gemini, None
	}

	public static class AiSummary {
		public int textLength;
		public int textSummary;
		public String text;
		public byte[] image;
		public final List<String> adjectives = new ArrayList<>();
		public final List<String> emojis = new ArrayList<>();
	}

	public AiSummary summary(final Prompt prompt, final String text) {
		if (text.length() < 900)
			return null;
		return type == AiType.Gemini ? this.summaryGemini(prompt, text)
				: type == AiType.GPT ? this.summaryGPT(prompt, text) : null;
	}

	@SuppressWarnings("null")
	protected AiSummary summaryGemini(final Prompt prompt, final String text) {
		int chars = text.length() / 10;
		if (chars < 300)
			chars = 300;
		else if (chars > 3000)
			chars = 3000;
		final List<Content> contents = ImmutableList.<Content>of(Content.builder().role("user")
				.parts(ImmutableList.<Part>of(Part.fromText(prompt.text.replace("{0}", "" + chars) + ":\n" + text)))
				.build());
		final Map<String, Schema> attributes = new HashMap<>();
		attributes.put("adjectives", Schema.builder().type(Type.Known.ARRAY).items(Schema.builder()
				.type(Type.Known.STRING).build()).build());
		attributes.put("emojis", Schema.builder().type(Type.Known.ARRAY).items(Schema.builder()
				.type(Type.Known.STRING).build()).build());
		final Map<String, Schema> schema = new HashMap<>();
		schema.put("summary", Schema.builder().type(Type.Known.STRING).build());
		schema.put("attributes", Schema.builder().type(Type.Known.ARRAY).items(Schema.builder()
				.type(Type.Known.OBJECT).properties(attributes).required(Arrays.asList("adjectives", "emojis"))
				.build()).build());
		final GenerateContentConfig config = GenerateContentConfig.builder()
				.thinkingConfig(ThinkingConfig.builder().thinkingBudget(0).build()).responseMimeType("application/json")
				.responseSchema(Schema.builder()
						.type(Type.Known.OBJECT)
						.properties(schema)
						.required(Arrays.asList("summary", "attributes"))
						.propertyOrdering(Arrays.asList("summary", "attributes"))
						.build())
				.build();
		try (final ResponseStream<GenerateContentResponse> responseStream = Client.builder().apiKey(this.geminiKey)
				.build().models.generateContentStream("gemini-2.5-flash-lite", contents, config)) {
			final StringBuffer s = new StringBuffer();
			for (final GenerateContentResponse res : responseStream) {
				if (res.candidates().isEmpty() || res.candidates().get().get(0).content().isEmpty()
						|| res.candidates().get().get(0).content().get().parts().isEmpty())
					continue;
				final List<Part> parts = res.candidates().get().get(0).content().get().parts().get();
				for (final Part part : parts)
					s.append(part.text().orElse(""));
			}
			final AiSummary aiSummary = this.convert(s.toString());
			aiSummary.image = this.imageGemini(prompt, aiSummary.text);
			aiSummary.textSummary = chars;
			aiSummary.textLength = text.length();
			return aiSummary;
		}
	}

	private byte[] imageGemini(final Prompt prompt, final String text) {
		final GenerateContentConfig config = GenerateContentConfig.builder()
				.responseModalities(Arrays.asList("IMAGE")).build();
		final GenerateContentResponse generateContentResponse = Client.builder().apiKey(this.geminiKey)
				.build().models.generateContent("gemini-2.5-flash-image", prompt.image + ":\n" + text, config);
		final ImmutableList<Part> parts = generateContentResponse.parts();
		if (parts != null) {
			for (final Part part : parts) {
				if (part.inlineData().isPresent()) {
					final var blob = part.inlineData().get();
					if (blob.data().isPresent())
						return blob.data().get();
				}
			}
		}
		this.adminService.createTicket(new Ticket(
				Ticket.ERROR + "AI image not created: " + generateContentResponse.finishReason().knownEnum()));
		return null;
	}

	protected AiSummary convert(final String summary) {
		final String error = "";
		try {
			final JsonNode node = new ObjectMapper().readTree(summary);
			final AiSummary response = new AiSummary();
			response.text = node.get("summary").asText().trim();
			final ArrayNode attributes = (ArrayNode) node.get("attributes");
			for (final JsonNode attribute : attributes) {
				response.adjectives.addAll(this.convertList((ArrayNode) attribute.get("adjectives")));
				response.emojis.addAll(this.convertList((ArrayNode) attribute.get("emojis")));
			}
			return response;
		} catch (final JsonProcessingException ex) {
			throw new RuntimeException(ex);
		} finally {
			this.adminService.createTicket(new Ticket((error.length() > 0 ? Ticket.ERROR : "") +
					"AI\n" + error + summary));
		}
	}

	private List<String> convertList(final ArrayNode node) {
		final List<String> list = new ArrayList<>();
		for (int i = 0; i < node.size(); i++)
			list.add(node.get(i).asText().toLowerCase().replace("**", ""));
		return list;
	}

	private AiSummary summaryGPT(final Prompt prompt, final String text) {
		try (final InputStream in = this.getClass().getResourceAsStream("/gpt.json")) {
			final String s = WebClient
					.create("https://api.openai.com/v1/completions")
					.post().accept(MediaType.APPLICATION_JSON)
					.header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
					.header("Authorization", "Bearer " + this.chatGpt)
					.bodyValue(IOUtils.toString(in, StandardCharsets.UTF_8)
							.replace("{chat}", text.replace("\"", "\\\"").replace("\n", "\\n")))
					.retrieve().toEntity(String.class).block().getBody();
			final AiSummary response = new AiSummary();
			response.text = new ObjectMapper().readTree(s).get("choices").get(0).get("text").asText().trim();
			return response;
		} catch (final Exception ex) {
			this.adminService.createTicket(new Ticket(Ticket.ERROR + Utilities.stackTraceToString(ex)));
			return null;
		}
	}
}