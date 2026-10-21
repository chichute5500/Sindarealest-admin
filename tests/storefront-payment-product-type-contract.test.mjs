import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fromRow } from '../functions/_lib.js';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
assert.equal(fromRow({id:'p1',slug:'p1',sku:'SD-P1',title:'P1',category:'sneakers',stock:8,published:1}).fulfillmentType,'unclassified');
assert.equal(fromRow({id:'p2',slug:'p2',sku:'SD-P2',title:'P2',category:'sneakers',stock:0,published:1}).fulfillmentType,'unclassified');
assert.equal(fromRow({id:'p3',slug:'p3',sku:'SD-P3',title:'P3',category:'sneakers',stock:0,fulfillment_type:'in_stock',published:1}).fulfillmentType,'in_stock');
assert.equal(fromRow({id:'p4',slug:'p4',sku:'SD-P4',title:'P4',category:'sneakers',stock:5,fulfillment_type:'made_to_order',published:1}).fulfillmentType,'made_to_order');
assert.equal(fromRow({id:'p5',slug:'p5',sku:'SD-P5',title:'P5',category:'sneakers',fulfillment_type:'guess',published:1}).fulfillmentType,'unclassified');
for(const id of ['fulfillmentFilters','detailFulfillment','paymentInstructions'])assert.match(html,new RegExp('id="'+id+'"'));
assert.ok(html.includes("data-fulfillment-type=\"'+type+'\""), 'Filter uses the explicit fulfillment enum.');
assert.match(html,/selectedFulfillment==='all'\|\|productFulfillmentType\(p\)===selectedFulfillment/);
assert.match(html,/result\?\.status==='confirmed'/);
assert.match(html,/payment\?\.qrIncludesAmount===false/);
assert.match(html,/result\?\.priceConfirmationRequired===false/);
assert.match(html,/Quét QR hoặc gửi biên lai không đồng nghĩa với đã thanh toán/);
assert.match(html,/img\.onerror=/, 'A broken QR image must switch to a safe no-transfer fallback.');
assert.match(html,/Không tải được mã QR/, 'A broken QR must not leave an empty payment panel.');
assert.match(html,/Chờ cửa hàng xác nhận/);
assert.match(pkg.scripts.test,/storefront-payment-product-type-contract\.test\.mjs/);


// Runtime checks exercise the real QR URL and readiness gates from the inline storefront code.
const safeUrlSource=html.match(/function safePaymentQrUrl\(value\)\{[^}]+\}/)?.[0];
assert.ok(safeUrlSource,'Safe QR URL validator must exist.');
const safeUrl=vm.runInNewContext('('+safeUrlSource+')',{URL,window:{location:{origin:'https://store.example'}}});
assert.equal(safeUrl('/public/bank-qr.webp'),'https://store.example/public/bank-qr.webp');
assert.equal(safeUrl('https://cdn.example/qr.webp'),'https://cdn.example/qr.webp');
assert.equal(safeUrl('http://untrusted.example/qr.webp'),'');
assert.equal(safeUrl('javascript:alert(1)'),'');
assert.equal(safeUrl('data:image/svg+xml,evil'),'');
assert.equal(safeUrl(''),'');
const readiness=html.match(/const ready=(.*?);const add=/s)?.[1];
assert.ok(readiness,'Payment instructions must have a single fail-closed readiness gate.');
const readyFor=(result)=>{
  const payment=result?.paymentInstructions;
  const amount=payment?.amount;
  const qrUrl=safeUrl(payment?.qrImageUrl);
  return vm.runInNewContext(readiness,{result,payment,amount,qrUrl});
};
const validPayment={
  status:'confirmed',
  priceConfirmationRequired:false,
  paymentInstructions:{
    status:'ready',qrImageUrl:'/public/bank-qr.webp',qrIncludesAmount:false,
    bankName:'Example Bank',accountName:'Store Owner',accountNumber:'0123456789',
    transferContent:'ORDER-123',amount:250000
  }
};
assert.equal(readyFor(validPayment),true,'A complete server-confirmed payment instruction may render.');
assert.equal(readyFor({...validPayment,status:'pending_confirmation'}),false,'A pending order must never render QR.');
assert.equal(readyFor({...validPayment,priceConfirmationRequired:true}),false,'Unconfirmed pricing must fail closed.');
assert.equal(readyFor({...validPayment,paymentInstructions:{...validPayment.paymentInstructions,qrIncludesAmount:true}}),false,'QR containing an amount must be rejected.');
assert.equal(readyFor({...validPayment,paymentInstructions:{...validPayment.paymentInstructions,qrImageUrl:'http://untrusted.example/qr.webp'}}),false,'An untrusted external HTTP QR must be rejected.');
assert.equal(readyFor({...validPayment,paymentInstructions:{...validPayment.paymentInstructions,amount:0}}),false,'Zero amount must be rejected.');
assert.equal(readyFor({...validPayment,paymentInstructions:{...validPayment.paymentInstructions,amount:1.5}}),false,'Fractional VND amount must be rejected.');
assert.equal(readyFor({...validPayment,paymentInstructions:{...validPayment.paymentInstructions,amount:Number.MAX_SAFE_INTEGER+1}}),false,'Unsafe integer amount must be rejected.');
for(const field of ['bankName','accountName','accountNumber','transferContent']){
  const payment={...validPayment.paymentInstructions,[field]:' '};
  assert.equal(readyFor({...validPayment,paymentInstructions:payment}),false,'Missing '+field+' must fail closed.');
}
assert.doesNotMatch(html,/payment_status\s*=/i,'The browser must not write payment status.');
assert.match(html,/Vui lòng chưa chuyển tiền/,'Pending orders must explicitly tell customers not to transfer.');
assert.match(html,/Thanh toán chỉ được ghi nhận sau khi cửa hàng kiểm tra giao dịch thực nhận/,'Payment is not considered received until the store verifies the actual transfer.');

console.log('Storefront payment/product-type contract checks passed.');
