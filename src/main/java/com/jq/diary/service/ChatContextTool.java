package com.jq.diary.service;

import java.math.BigInteger;
import java.util.List;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.jq.diary.entity.ChatSummary;
import com.jq.diary.entity.Ticket;
import com.jq.diary.repository.Repository;

@Component
public class ChatContextTool {
	@Autowired
	private AdminService adminService;

	@Autowired
	private Repository repository;

	@Tool(description = "Liefert historischen Kontext zum aktuellen Chat in den Kategorien:\n* CHAT\n* GUIDE\n* PSYCHOLOGY\n* TRAVEL\nBenutze ihn nur, wenn Du meinst es hilft um Antworten zum aktuellen Chat besser zu erstellen. Entscheide Dich nur für eine der Kategorien.")
	public String chatContext(@ToolParam(description = "contactId") final BigInteger contactId,
			@ToolParam(description = "Category") final ChatSummary.Category category) {
		final List<ChatSummary> chatSummaries = this.repository.list(
				"from ChatSummary where contact.id=?1 and category=?2",
				ChatSummary.class, contactId, category);
		this.adminService.createTicket(
				new Ticket(Ticket.ERROR + "chatContextTool\n" + contactId + " - " + category + ": "
						+ chatSummaries.size()));
		return chatSummaries.size() == 0 ? null : chatSummaries.get(0).getNote();
	}
}