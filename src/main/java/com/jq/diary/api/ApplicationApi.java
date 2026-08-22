package com.jq.diary.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jq.diary.entity.Ticket;
import com.jq.diary.repository.Repository;
import com.jq.diary.service.AdminService;

@RestController
@RequestMapping("api")
public class ApplicationApi {
	@Autowired
	private AdminService adminService;

	@Autowired
	protected Repository repository;

	@PostMapping("ticket")
	public void postTicket(@RequestBody final Ticket ticket) {
		this.adminService.createTicket(ticket);
	}
}