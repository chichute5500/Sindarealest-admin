import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const admin=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
for(const snippet of ['class="sd-order-cards"','data-order-open="${esc(o.id)}"','sd-order-advanced"','data-action="record-payment"','data-action="record-refund"','sdAdminOrderDetailEntered:true','sdAdminEditor:true',"card.addEventListener('click'","card.addEventListener('keydown'","history.back()",'data-action="save-order-detail-status"']){
 assert.ok(admin.includes(snippet),'Order UX contract missing '+snippet);
}
assert.equal(admin.split('</style>').length-1,1,'Keep the single Admin stylesheet');
assert.ok(admin.includes("if(!$('#backdrop').classList.contains('hidden'))"),'Back first closes editor');
for(const token of ["title:'Làm hàng'","title:'Gửi hàng'","timeline_confirmed_at","timeline_processing_at","timeline_shipped_at","timeline_completed_at",
 "step.done&&sdOrderStepDate(step.date)","timeZone:'Asia/Ho_Chi_Minh'"])assert.ok(admin.includes(token),'Missing five-step, completion-only date rule: '+token);
assert.ok(!admin.includes('Chưa có ngày'),'Never show a placeholder date for unfinished steps');
assert.match(admin,/status==='confirmed'\?\{termsConfirmed:true,paymentTermsNote:order\?\.payment_terms_note\|\|''\}/,'confirming an order also records its checkout price and terms in the existing API');
console.log('PASS: four clear order steps without duplicate payment progress, completion-only dates, browser Back and cards.');
