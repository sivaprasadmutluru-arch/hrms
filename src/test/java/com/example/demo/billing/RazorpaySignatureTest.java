package com.example.demo.billing;
import org.junit.jupiter.api.Test;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.HexFormat;
import static org.assertj.core.api.Assertions.*;
class RazorpaySignatureTest {
    static String sign(byte[] raw,String secret)throws Exception {var mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(secret.getBytes(),"HmacSHA256"));return HexFormat.of().formatHex(mac.doFinal(raw));}
    @Test void validatesExactRawBodyAndRejectsTampering()throws Exception{
        byte[] raw="{\"event\":\"subscription.charged\"}".getBytes();var sig=sign(raw,"webhook-secret");
        var verifier=new RazorpaySignature();assertThatCode(()->verifier.verify(raw,sig,"webhook-secret")).doesNotThrowAnyException();
        assertThatThrownBy(()->verifier.verify("{}".getBytes(),sig,"webhook-secret")).isInstanceOf(BillingFailure.class);
        assertThatThrownBy(()->verifier.verify(raw,"x","webhook-secret")).isInstanceOf(BillingFailure.class);
    }
}
