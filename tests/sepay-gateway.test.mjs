import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSepayCheckout, createSepayVietQr, loadSepayBankConfig, parseVndAmount, sepayBankWebhookAccountMatches, sepayCheckoutSchemaReady, sepayPaymentReady } from "../functions/sepay.js";
import { onRequestPost as receiveIpn } from "../functions/api/sepay/ipn.js";

const env={
  SEPAY_ENV:"sandbox",SEPAY_MERCHANT_ID:"MERCHANT_TEST_1",
  SEPAY_MERCHANT_SECRET_KEY:"sandbox-merchant-secret",
  SEPAY_IPN_SECRET_KEY:"sandbox-ipn-secret"
};
assert.equal(sepayPaymentReady(env),true);
assert.equal(sepayPaymentReady({...env,SEPAY_IPN_SECRET_KEY:""}),false);
assert.equal(await sepayCheckoutSchemaReady({prepare(){return {all:async()=>({results:[]})}}}),true);
assert.equal(await sepayCheckoutSchemaReady({prepare(){return {all:async()=>{throw Error("migration missing")}}}}),false,"Missing Production migrations fail closed to manual QR fallback");
assert.equal(await createSepayCheckout({env:{...env,SEPAY_IPN_SECRET_KEY:""},origin:"https://shop.example",invoiceNumber:"SD-ABC-123456",amount:100000}),null,"Never create a hosted payment if IPN verification is not configured");
assert.equal(parseVndAmount("100000.00"),100000);
assert.equal(parseVndAmount("100000.50"),null);
assert.equal(parseVndAmount("0"),null);
assert.equal(parseVndAmount("1e5"),null);

const qr=createSepayVietQr({
  env:{SEPAY_WEBHOOK_SECRET:"QA_WEBHOOK_SECRET_NONPRODUCTION_123456"},
  bank:{bankCode:"VCB",bankName:"Vietcombank",accountNumber:"1234567890",accountName:"QA TEST OWNER"},
  amount:100000,reference:"SP-1234567890ABCDEF"
});
assert.equal(createSepayVietQr({
  env:{SEPAY_WEBHOOK_SECRET:"QA_WEBHOOK_SECRET_NONPRODUCTION_123456"},
  bank:{bankCode:"VCB",bankName:"Vietcombank",accountNumber:"1234567890",accountName:"QA TEST OWNER"},
  amount:1999,reference:"SP-1234567890ABCDEF"
}),null,"QR generation must reject bank transfers below the 2k minimum");
assert.equal(createSepayVietQr({
  env:{SEPAY_WEBHOOK_SECRET:"QA_WEBHOOK_SECRET_NONPRODUCTION_123456"},
  bank:{bankCode:"VCB",bankName:"Vietcombank",accountNumber:"1234567890",accountName:"QA TEST OWNER"},
  amount:2000,reference:"SP-1234567890ABCDEF"
}).amount,2000,"QR generation accepts the 2k test minimum");
const qrUrl=new URL(qr.qrImageUrl);
assert.equal(qr.qrIncludesAmount,true);
assert.equal(qrUrl.searchParams.get("showinfo"),"false","QR image hides the repeated account details below the code");
assert.equal(qrUrl.searchParams.get("amount"),"100000","The payment amount remains embedded in the QR payload");
assert.equal(qrUrl.searchParams.get("des"),"SP-1234567890ABCDEF","The matching transfer reference remains embedded in the QR payload");
assert.equal(qrUrl.searchParams.has("holder"),false);
assert.equal(qrUrl.searchParams.has("store"),false);

const vaEnv={SEPAY_WEBHOOK_SECRET:"QA_WEBHOOK_SECRET_NONPRODUCTION_123456",SEPAY_QR_BANK_CODE:"MB",SEPAY_QR_BANK_NAME:"MBBank",SEPAY_QR_BANK_ACCOUNT:"1234567890",SEPAY_QR_BANK_VA:"VQRQANKID2744",SEPAY_QR_ACCOUNT_NAME:"QA TEST OWNER"};
const vaBank=loadSepayBankConfig(vaEnv);
assert.equal(vaBank.virtualAccountNumber,"VQRQANKID2744");
const vaQr=createSepayVietQr({env:vaEnv,bank:vaBank,amount:2000,reference:"SP-1234567890ABCDEF"});
assert.equal(new URL(vaQr.qrImageUrl).searchParams.get("acc"),"VQRQANKID2744","dynamic checkout QR must target the official VA");
assert.equal(vaQr.accountNumber,"VQRQANKID2744","checkout details must show the VA instead of the main account");
assert.equal(sepayBankWebhookAccountMatches({accountNumber:"1234567890",subAccount:"VQRQANKID2744"},vaBank),true);
assert.equal(sepayBankWebhookAccountMatches({accountNumber:"1234567890",subAccount:"OTHER"},vaBank),false,"a transfer to another VA must not create or credit a checkout");
assert.equal(sepayBankWebhookAccountMatches({accountNumber:"9999999999",subAccount:"VQRQANKID2744"},vaBank),false,"a transfer from another bank account must not create or credit a checkout");

const checkout=await createSepayCheckout({
  env,origin:"https://shop.example",invoiceNumber:"SD-ABC-123456",amount:100000,
  description:"SinDarealest SD-ABC-123456",customerId:"customer-1",accessToken:"a".repeat(64)
});
assert.equal(checkout.url,"https://pay-sandbox.sepay.vn/v1/checkout/init");
assert.equal(checkout.fields.payment_method,"BANK_TRANSFER");
assert.equal(checkout.fields.order_amount,"100000");
assert.deepEqual(Object.keys(checkout.fields),[
  "order_amount","merchant","currency","operation","order_description","order_invoice_number",
  "customer_id","payment_method","success_url","error_url","cancel_url","lang","signature"
],"submitted form input order must match SePay's documented signed field order");
assert.match(checkout.fields.success_url,/payment-result\.html/);
assert.match(checkout.fields.success_url,/token=/);
const signedFields=["order_amount","merchant","currency","operation","order_description","order_invoice_number","customer_id","payment_method","success_url","error_url","cancel_url"];
const signed=signedFields.map(name=>name+"="+checkout.fields[name]).join(",");
const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.SEPAY_MERCHANT_SECRET_KEY),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
const signature=Buffer.from(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(signed))).toString("base64");
assert.equal(checkout.fields.signature,signature,"checkout signature must match SePay's ordered HMAC-SHA256 fields");
assert.equal(await createSepayCheckout({env,origin:"http://localhost",invoiceNumber:"SD-LOCAL-123",amount:100000}),null);

const state={
  checkout:{id:"sepay-row-1",order_id:"order-1",amount:100000,status:"pending"},
  order:{id:"order-1",status:"pending_confirmation",total:100000,price_confirmation_required:0,payment_terms_confirmed_at:"2026-11-07T00:00:00Z"},
  transaction:null
};
const DB={
  prepare(sql){
    let values=[];
    return {
      sql,values,
      bind(...next){values=next;this.values=next;return this;},
      async first(){
        if(sql.includes("FROM sepay_payment_orders WHERE order_invoice_number=?"))return state.checkout;
        if(sql.includes("FROM orders WHERE id=? LIMIT 1"))return state.order;
        if(sql.includes("FROM order_payment_transactions WHERE transaction_reference=?"))return state.transaction;
        throw new Error("Unexpected query: "+sql);
      }
    };
  },
  async batch(statements){
    const insert=statements[0];
    const values=insert.values;
    if(state.transaction)return [{success:true,meta:{changes:0}},{success:true,meta:{changes:0}},{success:true,meta:{changes:0}},{success:true,meta:{changes:0}}];
    state.transaction={order_id:values[1],transaction_reference:values[3]};
    state.checkout={...state.checkout,status:"paid",transaction_id:"tx-001",transaction_reference:values[3]};
    return statements.map(()=>({success:true,meta:{changes:1}}));
  }
};
const payload={
  timestamp:1794000000,notification_type:"ORDER_PAID",
  order:{id:"gateway-order-1",order_status:"CAPTURED",order_currency:"VND",order_amount:"100000.00",order_invoice_number:"SD-ABC-123456"},
  transaction:{id:"transaction-uuid-1",transaction_id:"tx-001",transaction_type:"PAYMENT",transaction_status:"APPROVED",transaction_amount:"100000",transaction_currency:"VND",transaction_date:"2026-11-07 00:00:00"}
};
const request=()=>new Request("https://shop.example/api/sepay/ipn",{method:"POST",headers:{"Content-Type":"application/json","X-Secret-Key":env.SEPAY_IPN_SECRET_KEY},body:JSON.stringify(payload)});
const first=await receiveIpn({request:request(),env:{...env,DB}});
assert.equal(first.status,200);
assert.equal((await first.json()).received,true);
const repeated=await receiveIpn({request:request(),env:{...env,DB}});
assert.equal(repeated.status,200);
assert.equal((await repeated.json()).duplicate,true);
const unauthorized=await receiveIpn({request:new Request("https://shop.example/api/sepay/ipn",{method:"POST",headers:{"Content-Type":"application/json","X-Secret-Key":"wrong"},body:JSON.stringify(payload)}),env:{...env,DB}});
assert.equal(unauthorized.status,401);
const bankWebhook=readFileSync(new URL("../functions/api/sepay/webhook.js",import.meta.url),"utf8");
assert.match(bankWebhook,/INSERT INTO orders[^\n]*c\.id,'confirmed'/,"a verified direct SePay receipt creates an already-confirmed order");
assert.match(bankWebhook,/paymentConfirmedAutomatically:true/,"direct SePay checkout records the automatic confirmation audit");
const hostedIpn=readFileSync(new URL("../functions/api/sepay/ipn.js",import.meta.url),"utf8");
assert.match(hostedIpn,/status=CASE WHEN status='pending_confirmation' THEN 'confirmed' ELSE status END/,"a verified hosted SePay IPN automatically confirms an existing order");
assert.match(hostedIpn,/paymentConfirmedAutomatically:true/,"hosted SePay IPN records its automatic confirmation audit");
console.log("PASS: SePay signing, VND validation, IPN authentication, receipt, and duplicate delivery.");
