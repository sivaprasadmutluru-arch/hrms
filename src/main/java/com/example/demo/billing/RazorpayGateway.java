package com.example.demo.billing;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
@Component
public class RazorpayGateway {
    private final BillingProperties config; private final ObjectMapper mapper;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build();
    public RazorpayGateway(BillingProperties config,ObjectMapper mapper){this.config=config;this.mapper=mapper;}
    public JsonNode get(String path){return call("GET",path,null);}
    public JsonNode post(String path,Map<String,?> body){return call("POST",path,body);}
    private JsonNode call(String method,String path,Map<String,?> body){
        if(!config.configured())throw new BillingFailure(503,"Razorpay billing is not configured");
        if(!path.matches("/[A-Za-z0-9_/?=&%-]+"))throw new IllegalArgumentException("Invalid Razorpay resource path");
        var auth=Base64.getEncoder().encodeToString((config.getKeyId()+":"+config.getKeySecret()).getBytes(StandardCharsets.UTF_8));
        var request=HttpRequest.newBuilder(URI.create("https://api.razorpay.com/v1"+path)).timeout(Duration.ofSeconds(20))
            .header("Authorization","Basic "+auth).header("Accept","application/json");
        try{
            if("POST".equals(method)) request.header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
            else request.GET();
            var response=client.send(request.build(),HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()<200||response.statusCode()>299)throw new BillingFailure(502,"Razorpay could not complete the request. Please retry or contact support.");
            return mapper.readTree(response.body());
        }catch(InterruptedException e){Thread.currentThread().interrupt();throw new BillingFailure(503,"Payment request interrupted. Please retry.");}
        catch(java.io.IOException e){throw new BillingFailure(503,"Razorpay is temporarily unavailable. Please retry.");}
    }
    public static String id(JsonNode value){return value.isTextual()?value.asText():value.path("id").asText("");}
    public static String resource(String id){if(id==null||!id.matches("[A-Za-z0-9_]+"))throw new BillingFailure(400,"Invalid billing identifier");return id;}
}
