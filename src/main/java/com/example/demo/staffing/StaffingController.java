package com.example.demo.staffing;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.*;
import java.util.*;
import java.io.IOException;

@RestController @RequestMapping("/api/staffing") @RequiredArgsConstructor
@PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','ACCOUNTANT','COMPANY_ADMIN','ACCOUNTS_MANAGER','CEO','SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_MANAGER') and hasAuthority('payroll:view') and !hasAuthority('POSITION_PAYROLL_EXCLUDED')")
public class StaffingController {
    private final StaffingService service;
    private final StaffingExportService exports;
    @GetMapping public Map<String,Object> overview(@RequestHeader("X-Company-Id") long company,@RequestParam String month){return service.overview(company,month);}
    @GetMapping("/invoices/{id}") public Map<String,Object> detail(@RequestHeader("X-Company-Id") long company,@PathVariable long id){return service.invoiceDetail(company,id);}
    @GetMapping("/payroll-basis.xlsx") public ResponseEntity<byte[]> payroll(@RequestHeader("X-Company-Id") long company,@RequestParam String month,@RequestParam(required=false) List<Long> timeIds)throws IOException{return file(exports.payroll(company,month,timeIds),"staffing-payroll-basis.xlsx");}
    @GetMapping("/invoices/{id}/invoice.xlsx") public ResponseEntity<byte[]> invoiceFile(@RequestHeader("X-Company-Id") long company,@PathVariable long id)throws IOException{return file(exports.invoice(company,id),"staffing-invoice-"+id+".xlsx");}
    @PutMapping("/workers") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','ACCOUNTANT','COMPANY_ADMIN','ACCOUNTS_MANAGER','CEO','SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_MANAGER') and hasAuthority('payroll:view') and !hasAuthority('POSITION_PAYROLL_EXCLUDED') and hasAuthority('payroll:approve')")
    public void worker(@RequestHeader("X-Company-Id") long company,@RequestBody StaffingService.Worker request){service.worker(company,request);}
    @PostMapping("/authorizations") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','ACCOUNTANT','COMPANY_ADMIN','ACCOUNTS_MANAGER','CEO','SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_MANAGER') and hasAuthority('payroll:view') and !hasAuthority('POSITION_PAYROLL_EXCLUDED') and hasAuthority('payroll:approve')")
    public Map<String,Long> authorization(@RequestHeader("X-Company-Id") long company,@RequestBody StaffingService.Authorization request){return Map.of("id",service.authorization(company,null,request));}
    @PutMapping("/authorizations/{id}") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','ACCOUNTANT','COMPANY_ADMIN','ACCOUNTS_MANAGER','CEO','SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_MANAGER') and hasAuthority('payroll:view') and !hasAuthority('POSITION_PAYROLL_EXCLUDED') and hasAuthority('payroll:approve')")
    public Map<String,Long> authorizationUpdate(@RequestHeader("X-Company-Id") long company,@PathVariable long id,@RequestBody StaffingService.Authorization request){return Map.of("id",service.authorization(company,id,request));}
    @PostMapping("/clients") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','ACCOUNTANT','COMPANY_ADMIN','ACCOUNTS_MANAGER','CEO','SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_MANAGER') and hasAuthority('payroll:view') and !hasAuthority('POSITION_PAYROLL_EXCLUDED') and hasAuthority('payroll:approve')")
    public Map<String,Long> client(@RequestHeader("X-Company-Id") long company,@RequestBody StaffingService.Client request){return Map.of("id",service.client(company,null,request));}
    @PutMapping("/clients/{id}") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','ACCOUNTANT','COMPANY_ADMIN','ACCOUNTS_MANAGER','CEO','SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_MANAGER') and hasAuthority('payroll:view') and !hasAuthority('POSITION_PAYROLL_EXCLUDED') and hasAuthority('payroll:approve')")
    public Map<String,Long> clientUpdate(@RequestHeader("X-Company-Id") long company,@PathVariable long id,@RequestBody StaffingService.Client request){return Map.of("id",service.client(company,id,request));}
    @PostMapping("/assignments") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','ACCOUNTANT','COMPANY_ADMIN','ACCOUNTS_MANAGER','CEO','SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_MANAGER') and hasAuthority('payroll:view') and !hasAuthority('POSITION_PAYROLL_EXCLUDED') and hasAuthority('payroll:approve')")
    public Map<String,Long> assignment(@RequestHeader("X-Company-Id") long company,@RequestBody StaffingService.Assignment request){return Map.of("id",service.assignment(company,null,request));}
    @PutMapping("/assignments/{id}") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','ACCOUNTANT','COMPANY_ADMIN','ACCOUNTS_MANAGER','CEO','SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_MANAGER') and hasAuthority('payroll:view') and !hasAuthority('POSITION_PAYROLL_EXCLUDED') and hasAuthority('payroll:approve')")
    public Map<String,Long> assignmentUpdate(@RequestHeader("X-Company-Id") long company,@PathVariable long id,@RequestBody StaffingService.Assignment request){return Map.of("id",service.assignment(company,id,request));}
    @PostMapping("/time") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','ACCOUNTANT','COMPANY_ADMIN','ACCOUNTS_MANAGER','CEO','SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_MANAGER') and hasAuthority('payroll:view') and !hasAuthority('POSITION_PAYROLL_EXCLUDED') and hasAuthority('payroll:approve')")
    public Map<String,Long> time(@RequestHeader("X-Company-Id") long company,@RequestBody StaffingService.TimeEntry request){return Map.of("id",service.time(company,null,request));}
    @PutMapping("/time/{id}") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','ACCOUNTANT','COMPANY_ADMIN','ACCOUNTS_MANAGER','CEO','SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_MANAGER') and hasAuthority('payroll:view') and !hasAuthority('POSITION_PAYROLL_EXCLUDED') and hasAuthority('payroll:approve')")
    public Map<String,Long> timeUpdate(@RequestHeader("X-Company-Id") long company,@PathVariable long id,@RequestBody StaffingService.TimeEntry request){return Map.of("id",service.time(company,id,request));}
    @PostMapping("/time/{id}/transition") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','ACCOUNTANT','COMPANY_ADMIN','ACCOUNTS_MANAGER','CEO','SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_MANAGER') and hasAuthority('payroll:view') and !hasAuthority('POSITION_PAYROLL_EXCLUDED') and hasAuthority('payroll:approve')")
    public void transition(@RequestHeader("X-Company-Id") long company,@PathVariable long id,@RequestBody StaffingService.Transition request){service.transition(company,id,request);}
    @PostMapping("/invoices") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','ACCOUNTANT','COMPANY_ADMIN','ACCOUNTS_MANAGER','CEO','SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_MANAGER') and hasAuthority('payroll:view') and !hasAuthority('POSITION_PAYROLL_EXCLUDED') and hasAuthority('payroll:approve')")
    public Map<String,Long> invoice(@RequestHeader("X-Company-Id") long company,@RequestBody StaffingService.Invoice request){return Map.of("id",service.invoice(company,request));}
    @PostMapping("/invoices/{id}/issue") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','ACCOUNTANT','COMPANY_ADMIN','ACCOUNTS_MANAGER','CEO','SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_MANAGER') and hasAuthority('payroll:view') and !hasAuthority('POSITION_PAYROLL_EXCLUDED') and hasAuthority('payroll:approve')")
    public void issue(@RequestHeader("X-Company-Id") long company,@PathVariable long id){service.issue(company,id);}
    @PostMapping("/invoices/{id}/receipts") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','ACCOUNTANT','COMPANY_ADMIN','ACCOUNTS_MANAGER','CEO','SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_MANAGER') and hasAuthority('payroll:view') and !hasAuthority('POSITION_PAYROLL_EXCLUDED') and hasAuthority('payroll:approve')")
    public Map<String,Long> receipt(@RequestHeader("X-Company-Id") long company,@PathVariable long id,@RequestBody StaffingService.Receipt request){return Map.of("id",service.receipt(company,id,request));}
    @PostMapping("/invoices/{id}/void") @PreAuthorize("hasAnyRole('PLATFORM_SUPER_ADMIN','ENTERPRISE_ADMIN','BRANCH_ADMIN','ACCOUNTANT','COMPANY_ADMIN','ACCOUNTS_MANAGER','CEO','SUPER_ADMIN','ACCOUNT_MANAGER','COMPANY_MANAGER') and hasAuthority('payroll:view') and !hasAuthority('POSITION_PAYROLL_EXCLUDED') and hasAuthority('payroll:approve')")
    public void voidInvoice(@RequestHeader("X-Company-Id") long company,@PathVariable long id,@RequestBody StaffingService.VoidInvoice request){service.voidInvoice(company,id,request);}
    private ResponseEntity<byte[]> file(byte[] data,String name){return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\""+name+"\"").contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).body(data);}
}
