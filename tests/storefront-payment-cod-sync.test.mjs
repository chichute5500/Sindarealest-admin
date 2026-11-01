import assert from 'node:assert/strict';
import { calculateCheckoutQuote, summarizeOrderPayment } from '../functions/_payments.js';

const quote=calculateCheckoutQuote([{unitPrice:4_500_000,quantity:1}]);
assert.equal(quote.total,4_500_000);
assert.deepEqual(quote.options.map(({value,amount,discountAmount,codExpected})=>({value,amount,discountAmount,codExpected})),[
 {value:'deposit',amount:1_400_000,discountAmount:0,codExpected:3_100_000},
 {value:'full',amount:4_275_000,discountAmount:225_000,codExpected:0},
]);

const state=(paymentOption,bankReceived,codReceivedAmount=0,termsConfirmed=true,transactions=null)=>summarizeOrderPayment({
 total:4_500_000,paymentOption,termsConfirmed,codReceivedAmount,
 transactions:transactions|| (bankReceived?[{direction:'received',amount:bankReceived,actor:'admin'}]:[]),
});
const insufficientDeposit=state('deposit',1_000_000);
assert.equal(insufficientDeposit.requiredAmount,1_400_000);
assert.equal(insufficientDeposit.netReceivedAmount,1_000_000);
assert.equal(insufficientDeposit.shortfall,400_000);
assert.equal(insufficientDeposit.codRemaining,3_100_000);
assert.equal(insufficientDeposit.eligibleToShip,false);
assert.equal(insufficientDeposit.status,'additional_payment_required');

const exactDeposit=state('deposit',1_400_000);
assert.equal(exactDeposit.shortfall,0);
assert.equal(exactDeposit.codRemaining,3_100_000);
assert.equal(exactDeposit.eligibleToShip,true);
assert.equal(exactDeposit.paidInFull,false,'COD is not paid just because shipment is allowed');

const excessDeposit=state('deposit',1_600_000);
assert.equal(excessDeposit.overpaidAmount,200_000);
assert.equal(excessDeposit.codRemaining,2_900_000);
assert.equal(excessDeposit.eligibleToShip,true);

const partialFull=state('full',3_000_000);
assert.equal(partialFull.requiredAmount,4_275_000);
assert.equal(partialFull.shortfall,1_275_000);
assert.equal(partialFull.codRemaining,0);
assert.equal(partialFull.status,'additional_payment_required');
assert.equal(partialFull.eligibleToShip,false,'full payment must not silently become a deposit');

const paidFull=state('full',4_275_000);
assert.equal(paidFull.shortfall,0);
assert.equal(paidFull.codRemaining,0);
assert.equal(paidFull.eligibleToShip,true);
assert.equal(paidFull.paidInFull,true);

const depositAndCod=state('deposit',1_400_000,3_100_000);
assert.equal(depositAndCod.codReceivedAmount,3_100_000);
assert.equal(depositAndCod.paidInFull,true);
assert.equal(depositAndCod.eligibleToShip,true);

const legacyCodDoesNotCountAsBankReceipt=state('deposit',0,0,true,[{direction:'received',amount:1_400_000,actor:'admin_cod_completion'}]);
assert.equal(legacyCodDoesNotCountAsBankReceipt.netReceivedAmount,0);
assert.equal(legacyCodDoesNotCountAsBankReceipt.eligibleToShip,false);

assert.equal(state('deposit',1_400_000,0,false).eligibleToShip,false,'Shop must confirm terms before shipment');
assert.equal(summarizeOrderPayment({total:4_500_000,paymentOption:'deposit',transactions:[],termsConfirmed:true,hasPendingRequest:true}).status,'waiting_shop_verification');
assert.equal(summarizeOrderPayment({total:4_500_000,paymentOption:'deposit',transactions:[{direction:'received',amount:100_000}],termsConfirmed:true}).status,'additional_payment_required');
console.log('PASS: deposit/full quote, rounding, short/exact/excess receipt, COD adjustment and settlement, and shipment eligibility.');
