package com.jq.diary.api;

import java.io.IOException;
import java.math.BigInteger;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.jq.diary.entity.Log;
import com.jq.diary.service.AdminService;
import com.jq.diary.service.AdminService.AdminData;
import com.jq.diary.util.Utilities;

@RestController
@RequestMapping("sc")
public class AdminApi {
	@Autowired
	private AdminService adminService;

	@GetMapping("init")
	public AdminData getInit() {
		return this.adminService.init();
	}

	@GetMapping("log")
	public List<Log> getLog(@RequestParam final String search) {
		return this.adminService.log(search);
	}

	@GetMapping("sql")
	public List<?> getSql(@RequestParam final String search) {
		return Utilities.filter(this.adminService.sql(search));
	}

	@PostMapping("build/{type}")
	public String postBuild(@PathVariable final String type) throws IOException {
		return this.adminService.build(type);
	}

	@DeleteMapping("ticket/{id}")
	public void deleteTicket(@PathVariable final BigInteger id) {
		this.adminService.deleteTicket(id);
	}
}
