package com.example.demo.backup.engine;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.*;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.*;
import java.util.*;

/** Only encrypted archives are uploaded. Credentials and destination are deployment-owned. */
@Component @RequiredArgsConstructor
public class BackupDrive {
 private final BackupProperties properties;private final ObjectMapper json;
 private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).followRedirects(HttpClient.Redirect.NEVER).build();
 public boolean configured(){return !properties.getDriveFolderId().isBlank() && !properties.getDriveServiceAccountFile().isBlank() && Files.isRegularFile(Path.of(properties.getDriveServiceAccountFile()));}
 private String b64(byte[] bytes){return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);}
 private String token() throws Exception {
  var credentials=json.readTree(Files.readString(Path.of(properties.getDriveServiceAccountFile())));long now=Instant.now().getEpochSecond();
  String header=b64(json.writeValueAsBytes(Map.of("alg","RS256","typ","JWT")));String claims=b64(json.writeValueAsBytes(Map.of("iss",credentials.path("client_email").asText(),"scope","https://www.googleapis.com/auth/drive.file","aud","https://oauth2.googleapis.com/token","iat",now,"exp",now+3600)));
  String pem=credentials.path("private_key").asText().replace("-----BEGIN PRIVATE KEY-----","").replace("-----END PRIVATE KEY-----","").replaceAll("\\s","");var key=KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(pem)));var signer=Signature.getInstance("SHA256withRSA");signer.initSign(key);signer.update((header+"."+claims).getBytes(StandardCharsets.US_ASCII));String assertion=header+"."+claims+"."+b64(signer.sign());
  var request=HttpRequest.newBuilder(URI.create("https://oauth2.googleapis.com/token")).timeout(Duration.ofSeconds(45)).header("Content-Type","application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString("grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion="+assertion)).build();var response=http.send(request,HttpResponse.BodyHandlers.ofString());if(response.statusCode()!=200)throw new IllegalStateException("Google Drive authentication failed");String token=json.readTree(response.body()).path("access_token").asText();if(token.isBlank())throw new IllegalStateException("Google Drive authentication failed");return token;
 }
 public String upload(Path archive) throws Exception {
  if(!configured())throw new IllegalStateException("Google Drive is not configured");String token=token();
  var metadata=json.writeValueAsString(Map.of("name",archive.getFileName().toString(),"parents",List.of(properties.getDriveFolderId())));
  var request=HttpRequest.newBuilder(URI.create("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id")).timeout(Duration.ofSeconds(45)).header("Authorization","Bearer "+token).header("Content-Type","application/json").header("X-Upload-Content-Type","application/octet-stream").header("X-Upload-Content-Length",String.valueOf(Files.size(archive))).POST(HttpRequest.BodyPublishers.ofString(metadata)).build();
  var response=http.send(request,HttpResponse.BodyHandlers.ofString());if(response.statusCode()/100!=2)throw new IllegalStateException("Google Drive upload could not start; verify Shared Drive folder permissions");URI location=URI.create(response.headers().firstValue("Location").orElseThrow());if(!"https".equals(location.getScheme()) || !"www.googleapis.com".equals(location.getHost()) || location.getUserInfo()!=null)throw new IllegalStateException("Invalid Google Drive upload destination");
  var upload=HttpRequest.newBuilder(location).timeout(Duration.ofSeconds(properties.getTimeoutSeconds())).header("Authorization","Bearer "+token).header("Content-Type","application/octet-stream").PUT(HttpRequest.BodyPublishers.ofFile(archive)).build();var result=http.send(upload,HttpResponse.BodyHandlers.ofString());if(result.statusCode()/100!=2)throw new IllegalStateException("Google Drive upload failed; local encrypted backup remains available");String id=json.readTree(result.body()).path("id").asText();if(id.isBlank())throw new IllegalStateException("Google Drive upload confirmation missing");return id;
 }
}
