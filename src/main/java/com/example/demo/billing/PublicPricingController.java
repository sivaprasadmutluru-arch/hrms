package com.example.demo.billing;

import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public marketing prices only; contains no organization billing or provider configuration. */
@RestController
public class PublicPricingController {
    @GetMapping("/api/public/pricing")
    public ResponseEntity<Map<String,Object>> pricing() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(Map.of("currency","INR","plans",BillingCatalog.entries()));
    }
}
