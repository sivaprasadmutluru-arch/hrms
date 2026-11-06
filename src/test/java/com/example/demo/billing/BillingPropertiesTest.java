package com.example.demo.billing;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class BillingPropertiesTest {
    @Test void absentCredentialsDisableCheckoutWithoutAStubPaymentMode() {
        var config=new BillingProperties(); assertThat(config.configured()).isFalse(); assertThatCode(config::validate).doesNotThrowAnyException();
    }
    @Test void liveBillingFailsStartupWithIncompleteSetup() {
        var config=new BillingProperties(); config.setKeyId("rzp_live_test"); assertThatThrownBy(config::validate).isInstanceOf(IllegalStateException.class);
    }
    @Test void untrustedReturnUrlsAreRejected() {
        for(String url:new String[]{"http://public.example.com","https://user:password@example.com","https://example.com?return=evil","javascript:alert(1)"}) {
            var config=new BillingProperties(); config.setFrontendUrl(url); assertThatThrownBy(config::validate).isInstanceOf(IllegalStateException.class);
        }
    }
}
