package com.example.demo.billing;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface BillingSubscriptionRepository extends JpaRepository<BillingSubscription,Long> {
    List<BillingSubscription> findTop100ByRazorpaySubscriptionIdIsNotNullOrderBySyncedAtAsc();
}
