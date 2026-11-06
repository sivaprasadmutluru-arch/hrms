package com.example.demo.billing;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
@Entity @Table(name="billing_invoices", schema="public", indexes=@Index(name="billing_invoice_org_idx",columnList="organization_id,created_at")) @Getter @Setter
public class BillingInvoice {
    @Id @Column(name="id") private String id;
    @Column(name="organization_id") private Long organizationId;
    @Column(name="subscription_id") private String subscriptionId;
    @Column(name="number") private String number;
    @Column(name="status") private String status;
    @Column(name="amount_due") private long amountDue;
    @Column(name="amount_paid") private long amountPaid;
    @Column(name="live_mode") private Boolean liveMode;
    @Column(name="currency") private String currency;
    @Column(name="created_at") private Instant createdAt;
    @Column(name="paid_at") private Instant paidAt;
    @Column(name="period_start") private Instant periodStart;
    @Column(name="period_end") private Instant periodEnd;
    @Column(name="hosted_invoice_url",length=2048) private String hostedInvoiceUrl;
    @Column(name="invoice_pdf",length=2048) private String invoicePdf;
}
