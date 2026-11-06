package com.example.demo.billing;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import java.time.Instant;
@Component @RequiredArgsConstructor @Slf4j
public class BillingReconciliation {
    private final BillingProperties config;
    private final BillingSubscriptionRepository subscriptions;
    private final BillingService billing;
    private final PlatformTransactionManager transactions;
    private final java.util.concurrent.ExecutorService worker=java.util.concurrent.Executors.newSingleThreadExecutor(r -> {
        Thread thread=new Thread(r,"razorpay-billing-reconciliation"); thread.setDaemon(true); return thread;
    });
    private final java.util.concurrent.atomic.AtomicBoolean running=new java.util.concurrent.atomic.AtomicBoolean();
    @jakarta.annotation.PreDestroy void stop() { worker.shutdownNow(); }
    @Scheduled(fixedDelayString="${app.billing.reconcile-ms:300000}",initialDelayString="${app.billing.reconcile-ms:300000}")
    public void reconcile() {
        if (!config.configured() || !running.compareAndSet(false,true)) return;
        worker.execute(() -> { try { reconcileBatch(); } finally { running.set(false); } });
    }
    private void reconcileBatch() {
        for (var item:subscriptions.findTop100ByRazorpaySubscriptionIdIsNotNullOrderBySyncedAtAsc()) {
            if (Thread.currentThread().isInterrupted()) break;
            try { billing.refresh(item.getOrganizationId()); }
            catch (Exception e) {
                // Persist only a generic diagnostic; never provider bodies or credentials.
                new TransactionTemplate(transactions).executeWithoutResult(tx -> subscriptions.findById(item.getOrganizationId()).ifPresent(s -> {
                    s.setSyncError("Razorpay reconciliation failed"); s.setSyncedAt(Instant.now()); subscriptions.save(s);
                }));
                log.warn("Billing reconciliation failed for organization {}",item.getOrganizationId());
            }
        }
    }
}
