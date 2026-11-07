import assert from "node:assert/strict";
import { createSepayCheckout, parseVndAmount, sepayPaymentReady } from "../functions/sepay.js";
import { onRequestPost as receiveIpn } from "../functions/api/sepay/ipn.js";

const env={
  SEPAY_ENV:"sandbox",SEPAY_MERCHANT_ID:"MERCHANT_TEST_1",
  SEPAY_MERCHANT_SECRET_KEY:"sandbox-merchant-secret",
  SEPAY_IPN_SECRET_KEY:"sandbox-ipn-secret"
};
assert.equal(sepayPaymentReady(env),true);
assert.equal(sepayPaymentReady({...env,SEPAY_IPN_SECRET_KEY:""}),false);
assert.equal(await createSepayCheckout({env:{...env,SEPAY_IPN_SECRET_KEY:""},origin:"https://shop.example",invoiceNumber:"SD-ABC-123456",amount:100000}),null,"Never create a hosted payment if IPN verification is not configured");
assert.equal(parseVndAmount("100000.00"),100000);
assert.equal(parseVndAmount("100000.50"),null);
assert.equal(parseVndAmount("0"),null);
assert.equal(parseVndAmount("1e5"),null);

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
console.log("PASS: SePay signing, VND validation, IPN authentication, receipt, and duplicate delivery.");
