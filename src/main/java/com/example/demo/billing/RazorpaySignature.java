package com.example.demo.billing;
import org.springframework.stereotype.Component;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
@Component
public class RazorpaySignature {
    public void verify(byte[] body,String header,String secret){
        if(secret==null||secret.isBlank())throw new BillingFailure(503,"Razorpay webhook is not configured");
        if(body==null||body.length>1048576||header==null||!header.matches("[a-fA-F0-9]{64}"))throw new BillingFailure(400,"Invalid Razorpay webhook signature");
        try{var mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
            if(MessageDigest.isEqual(mac.doFinal(body),HexFormat.of().parseHex(header)))return;
        }catch(Exception ignored){} throw new BillingFailure(400,"Invalid Razorpay webhook signature");
    }
}
