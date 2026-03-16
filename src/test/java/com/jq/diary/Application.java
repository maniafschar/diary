package com.jq.diary;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import com.jq.diary.entity.Client;
import com.jq.diary.entity.Contact;
import com.jq.diary.entity.ContactEvent;
import com.jq.diary.entity.Event;
import com.jq.diary.entity.Location;
import com.jq.diary.repository.Repository;
import com.jq.diary.util.Encryption;

@ExtendWith(SpringExtension.class)
@SpringBootTest(classes = { DiaryApplication.class,
		TestConfig.class }, webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT, properties = {
				"server.port=9001", "server.servlet.context-path=/rest" })
@ActiveProfiles("test")
public class Application {
	private static String url = "http://localhost:9000/";
	private WebDriver driver;

	@Autowired
	private Repository repository;

	@Test
	public void run() throws Exception {
		Thread.sleep(600000);
	}

	@BeforeEach
	public void beforeEach() throws Exception {
		if (Paths.get("attachments/PUBLIC/10000").toFile().exists())
			Files.list(Paths.get("attachments/PUBLIC/10000")).forEach(e -> {
				try {
					Files.delete(e);
				} catch (final IOException e1) {
				}
			});
		new ProcessBuilder("./web.sh", "start").start();
		this.driver = createWebDriver(400, 900);
		this.driver.get(url);
		final Client client = new Client();
		client.setName("Manis Tegebuch");
		this.repository.save(client);
		final Contact contact = new Contact();
		contact.setAdmin(true);
		contact.setName("Mani");
		contact.setEmail("sepp@diary.cafe");
		contact.setPassword(Encryption.encryptDB("Test1234"));
		contact.setClient(client);
		contact.setVerified(true);
		this.repository.save(contact);
		final Location location = new Location();
		location.setAddress("Herterichstr. 46\n81479 München");
		location.setName("Brauhausstubn Solln");
		location.setUrl("https://www.brauhaus-stubn-solln.de/");
		location.setPhone("089 / 72 44 75 93");
		location.setEmail("info@brauhaus-stubn-solln.de");
		location.setContact(contact);
		this.repository.save(location);
		Event event = new Event();
		event.setContact(contact);
		event.setLocation(location);
		event.setDate(new Date(System.currentTimeMillis() + 6000000));
		event.setNote("Zocken");
		this.repository.save(event);
		event = new Event();
		event.setContact(contact);
		event.setLocation(location);
		event.setDate(new Date(System.currentTimeMillis() - 12000000));
		this.repository.save(event);
		final ContactEvent contactEvent = new ContactEvent();
		contactEvent.setEvent(event);
		contactEvent.setContact(contact);
		this.repository.save(contactEvent);
	}

	@AfterEach
	public void afterEach() throws Exception {
		this.driver.close();
		new ProcessBuilder("./web.sh", "stop").start();
	}

	static WebDriver createWebDriver(final int width, final int height) {
		final ChromeOptions options = new ChromeOptions();
		final Map<String, Object> deviceMetrics = new HashMap<>();
		deviceMetrics.put("pixelRatio", 1.0);
		deviceMetrics.put("width", width);
		deviceMetrics.put("height", height);
		options.addArguments("user-data-dir=./chrome");
		return new ChromeDriver(options);
	}
}