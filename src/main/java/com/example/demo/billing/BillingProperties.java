package com.example.demo.billing;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;
@Component @ConfigurationProperties(prefix="app.billing") @Getter @Setter
public class BillingProperties {
    private String keyId = "";
    private String keySecret = "";
    private String webhookSecret = "";
    private String frontendUrl = "http://localhost:5173";
    private String instanceId = "hrms";
    private boolean manualEnabled;
    private Map<String,String> prices = new HashMap<>();
    public boolean configured() {
        return !keyId.isBlank() && !keySecret.isBlank() && !webhookSecret.isBlank()
                && BillingCatalog.entries().stream().filter(p -> p.id()!=com.example.demo.base.enums.SubscriptionPlan.FREE).allMatch(p -> !priceId(p.id(), BillingCycle.MONTHLY).isBlank()
                && !priceId(p.id(), BillingCycle.YEARLY).isBlank());
    }
    public String priceId(com.example.demo.base.enums.SubscriptionPlan plan, BillingCycle cycle) {
        return prices.getOrDefault(plan.name().toLowerCase()+"-"+cycle.name().toLowerCase(), "");
    }
    public String returnUrl() { return frontendUrl.replaceAll("/+$", "") + "/subscription"; }
    @PostConstruct void validate() {
        if (!instanceId.matches("[A-Za-z0-9_-]{1,40}")) throw new IllegalStateException("BILLING_INSTANCE_ID must contain 1-40 letters, digits, underscores or hyphens");
        if (manualEnabled && keyId.startsWith("rzp_live_")) throw new IllegalStateException("Temporary manual billing cannot be enabled together with live Razorpay keys");
        URI uri = URI.create(frontendUrl);
        if (uri.getHost()==null || uri.getQuery()!=null || uri.getFragment()!=null || uri.getUserInfo()!=null
                || !("https".equals(uri.getScheme()) || ("http".equals(uri.getScheme()) && ("localhost".equals(uri.getHost()) || "127.0.0.1".equals(uri.getHost())))))
            throw new IllegalStateException("BILLING_FRONTEND_URL must use HTTPS (HTTP is allowed only on localhost)");
        if (keyId.startsWith("rzp_live_") && (!"https".equals(uri.getScheme()) || !configured()))
            throw new IllegalStateException("Live Razorpay billing requires HTTPS, a webhook secret, and all six plan IDs");
        if (!keyId.isBlank() && !keyId.matches("rzp_(test|live)_[A-Za-z0-9]+")) throw new IllegalStateException("Invalid Razorpay key ID");
        var ids = prices.values().stream().filter(p -> !p.isBlank()).toList();
        if (ids.stream().anyMatch(id -> !id.matches("plan_[A-Za-z0-9_]+"))) throw new IllegalStateException("Razorpay plan IDs must start with plan_");
        if (ids.stream().distinct().count()!=ids.size()) throw new IllegalStateException("Each Razorpay plan and billing period must have a distinct plan ID");
    }
}
