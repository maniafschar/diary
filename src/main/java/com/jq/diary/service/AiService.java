package com.jq.diary.service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
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
import com.google.genai.gaos.models.errors.CreateInteractionClientError;
import com.google.genai.gaos.models.interactions.CreateModelInteraction;
import com.google.genai.gaos.models.interactions.CreateModelInteractionResponseFormat;
import com.google.genai.gaos.models.interactions.ImageContent;
import com.google.genai.gaos.models.interactions.ImageResponseFormat;
import com.google.genai.gaos.models.interactions.ImageResponseFormatMimeType;
import com.google.genai.gaos.models.interactions.Interaction;
import com.google.genai.gaos.models.interactions.InteractionsInput;
import com.google.genai.gaos.models.interactions.ResponseFormat;
import com.google.genai.gaos.models.operations.CreateInteractionRequestBody;
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
import com.jq.diary.util.Json;
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
		final List<Content> contents = ImmutableList.<Content>of(Content.builder().role("user")
				.parts(ImmutableList
						.<Part>of(Part.fromText(prompt.getText() + ":\n" + text)))
				.build());
		final Map<String, Schema> schema = new HashMap<>();
		schema.put("summary", Schema.builder().type(Type.Known.STRING).build());
		schema.put("adjectives", Schema.builder().type(Type.Known.ARRAY)
				.items(Schema.builder().type(Type.Known.STRING).build()).build());
		schema.put("emojis", Schema.builder().type(Type.Known.ARRAY)
				.items(Schema.builder().type(Type.Known.STRING).build()).build());
		final GenerateContentConfig config = GenerateContentConfig.builder()
				.thinkingConfig(ThinkingConfig.builder().thinkingLevel("MINIMAL").build())
				.responseMimeType("application/json")
				.responseSchema(Schema.builder()
						.type(Type.Known.OBJECT)
						.properties(schema)
						.required(Arrays.asList("summary", "adjectives", "emojis"))
						.propertyOrdering(Arrays.asList("summary", "adjectives", "emojis"))
						.build())
				.build();
		try (final ResponseStream<GenerateContentResponse> responseStream = Client.builder().apiKey(this.geminiKey)
				.build().models.generateContentStream("gemini-3.5-flash-lite", contents, config)) {
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
			aiSummary.setImage(this.imageGemini(this.imageGeminiPrompt(aiSummary.getNote())));
			aiSummary.setTextLength(text.length());
			return aiSummary;
		}
	}

	private String imageGeminiPrompt(final String summary) {
		@SuppressWarnings("null")
		final List<Content> contents = ImmutableList.<Content>of(Content.builder().role("user")
				.parts(ImmutableList
						.<Part>of(Part.fromText(
								"Erstelle mir auf Basis deiner obigen psychologischen Analyse einen präzisen Bild-Prompt für einen KI-Bildgenerator. \n\n"
										+ "Regeln für den Bild-Prompt:\n"
										+ "1. Übersetze die emotionale Kernbotschaft der Analyse in eine starke, visuelle Metapher (z. B. ein Boot im Nebel, das auf ein Licht zusteuert; ein Garten, der durch Risse im Asphalt bricht).\n"
										+ "2. Beschreibe die Szene detailliert: Was ist im Vordergrund? Wie ist das Licht (z. B. warmes Sonnenlicht, mystischer Nebel)? Welche Farben dominieren (z. B. beruhigende Blautöne, energetisches Orange)?\n"
										+ "3. Definiere den Stil: Nutze einen kunstvollen, symbolischen Stil (z. B. „surrealistisches Ölgemälde“, „minimale Vektorgrafik“ oder „cinematische 3D-Illustration“). Vermeide fotorealistische Menschen, um die Privatsphäre zu wahren.\n"
										+ "4. Gib mir den finalen Prompt nur auf Englisch aus.\n\n"
										+ "Hier die Zusammenfassung:\n" + summary)))
				.build());
		final GenerateContentConfig config = GenerateContentConfig.builder()
				.thinkingConfig(ThinkingConfig.builder().thinkingLevel("MINIMAL").build())
				.responseSchema(Schema.builder()
						.type(Type.Known.STRING)
						.build())
				.build();
		try (final ResponseStream<GenerateContentResponse> responseStream = Client.builder().apiKey(this.geminiKey)
				.build().models.generateContentStream("gemini-3.5-flash-lite", contents, config)) {
			final StringBuffer s = new StringBuffer();
			for (final GenerateContentResponse res : responseStream) {
				if (res.candidates().isEmpty() || res.candidates().get().get(0).content().isEmpty()
						|| res.candidates().get().get(0).content().get().parts().isEmpty())
					continue;
				final List<Part> parts = res.candidates().get().get(0).content().get().parts().get();
				for (final Part part : parts)
					s.append(part.text().orElse(""));
			}
			this.adminService.createTicket(new Ticket(s.toString()));
			return s.toString();
		}
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
			this.adminService
					.createTicket(new Ticket("errors:" + Json.toPrettyString(interaction.errors().orElse(null))));
			this.adminService
					.createTicket(new Ticket("model:" + Json.toPrettyString(interaction.model().orElse(null))));
			this.adminService.createTicket(new Ticket("created:" + interaction.created().orElse(null)));
			this.adminService.createTicket(new Ticket("text:" + interaction.outputText().orElse(null)));
			if (interaction != null && interaction.outputImage().isPresent()) {
				final ImageContent image = interaction.outputImage().get();
				if (image.data().isPresent())
					return image.data().get();
				if (image.uri().isPresent()) {
					final String imageUrl = image.uri().get();
					final ByteArrayOutputStream out = new ByteArrayOutputStream();
					IOUtils.copy(new URI(imageUrl).toURL(), out);
					return Base64.getEncoder().encodeToString(out.toByteArray());
				}
			}
		} catch (final CreateInteractionClientError er) {
			this.adminService.createTicket(
					new Ticket(er.bodyAsString() + "\n\n" + new Ticket(Utilities.stackTraceToString(er))));
		} catch (final Exception ex) {
			this.adminService.createTicket(new Ticket(Utilities.stackTraceToString(ex)));
		}
		return null;
	}

	protected Summary convert(final String summary) {
		final String error = "";
		try {
			final JsonNode node = new ObjectMapper().readTree(summary);
			final Summary response = new Summary();
			response.setNote(node.get("summary").asText().trim());
			response.getAdjectives().addAll(this.convertList((ArrayNode) node.get("adjectives")));
			response.getEmojis().addAll(this.convertList((ArrayNode) node.get("emojis")));
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