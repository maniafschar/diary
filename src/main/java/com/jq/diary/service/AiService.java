package com.jq.diary.service;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
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
import com.jq.diary.entity.Summary;
import com.jq.diary.entity.Summary.Prompt;
import com.jq.diary.entity.Ticket;
import com.jq.diary.util.Utilities;

@Service
public class AiService {
	private static AiType type = AiType.Gemini;

	@Autowired
	private AdminService adminService;

	@Value("${app.chatGPT.key}")
	private String chatGpt;

	@Value("${app.google.gemini.apiKey}")
	private String geminiKey;

	private enum AiType {
		GPT, Gemini, None
	}

	public Summary summary(final Prompt prompt, final String text) {
		if (text.length() < 900)
			return null;
		return type == AiType.Gemini ? this.summaryGemini(prompt, text)
				: type == AiType.GPT ? this.summaryGPT(prompt, text) : null;
	}

	@SuppressWarnings("null")
	protected Summary summaryGemini(final Prompt prompt, final String text) {
		int chars = text.length() / 10;
		if (chars < 300)
			chars = 300;
		else if (chars > 3000)
			chars = 3000;
		final List<Content> contents = ImmutableList.<Content>of(Content.builder().role("user")
				.parts(ImmutableList
						.<Part>of(Part.fromText(prompt.getText().replace("{0}", "" + chars) + ":\n" + text)))
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
			final Summary aiSummary = this.convert(s.toString());
			aiSummary.setImage(Base64.getEncoder().encodeToString(this.imageGemini(prompt, aiSummary.getNote())));
			aiSummary.setTextSummary(chars);
			aiSummary.setTextLength(text.length());
			return aiSummary;
		}
	}

	private byte[] imageGemini(final Prompt prompt, final String text) {
		final GenerateContentConfig config = GenerateContentConfig.builder()
				.responseModalities(Arrays.asList("IMAGE")).build();
		final GenerateContentResponse generateContentResponse = Client.builder().apiKey(this.geminiKey)
				.build().models.generateContent("gemini-2.5-flash-image", prompt.getImage() + ":\n" + text, config);
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
		return null;
	}

	protected Summary convert(final String summary) {
		final String error = "";
		try {
			final JsonNode node = new ObjectMapper().readTree(summary);
			final Summary response = new Summary();
			response.setNote(node.get("summary").asText().trim());
			final ArrayNode attributes = (ArrayNode) node.get("attributes");
			for (final JsonNode attribute : attributes) {
				response.getAdjectives().addAll(this.convertList((ArrayNode) attribute.get("adjectives")));
				response.getEmojis().addAll(this.convertList((ArrayNode) attribute.get("emojis")));
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

	private Summary summaryGPT(final Prompt prompt, final String text) {
		try (final InputStream in = this.getClass().getResourceAsStream("/gpt.json")) {
			final String s = WebClient
					.create("https://api.openai.com/v1/completions")
					.post().accept(MediaType.APPLICATION_JSON)
					.header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
					.header("Authorization", "Bearer " + this.chatGpt)
					.bodyValue(IOUtils.toString(in, StandardCharsets.UTF_8)
							.replace("{chat}", text.replace("\"", "\\\"").replace("\n", "\\n")))
					.retrieve().toEntity(String.class).block().getBody();
			final Summary response = new Summary();
			response.setNote(new ObjectMapper().readTree(s).get("choices").get(0).get("text").asText().trim());
			return response;
		} catch (final Exception ex) {
			this.adminService.createTicket(new Ticket(Ticket.ERROR + Utilities.stackTraceToString(ex)));
			return null;
		}
	}
}