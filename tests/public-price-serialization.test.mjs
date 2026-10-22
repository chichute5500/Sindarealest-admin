import assert from 'node:assert/strict';
import { fromRow } from '../functions/_lib.js';

// In-memory API serializer regression contract. This never touches D1,
// fixture JSON, production bindings, or order endpoints.
const priceRow = {
  id: 'in-memory-price-contract',
  slug: 'in-memory-price-contract',
  sku: 'INTERNAL-TEST',
  sku_verified: 0,
  title: 'In-memory price contract fixture',
  category: 'sneakers',
  category_label: 'Sneaker',
  description: '',
  price: 1234567,
  source_price_confirmed: 0,
  stock: 1,
  published: 1,
  images_json: '[]',
  sort_order: 0,
  updated_at: null,
};
assert.equal(fromRow(priceRow, { publicView: true, showPrices: false }).price, null,
  'the public API must null the amount when public price visibility is disabled');
assert.equal(fromRow(priceRow, { publicView: true, showPrices: true }).price, null,
  'the public API must not leak an unconfirmed amount even when visibility is enabled');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1 }, { publicView: true, showPrices: true }).price, 1234567,
  'a confirmed whole-VND amount may be public when the toggle is enabled');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1 }, { publicView: true, showPrices: false }).price, null,
  'the public toggle must hide even an otherwise confirmed amount');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1, price: -1 }, { publicView: true, showPrices: true }).price, null,
  'negative DB amounts must not be serialized publicly');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1, price: 1.5 }, { publicView: true, showPrices: true }).price, null,
  'fractional DB amounts must not be serialized publicly');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1, price: '' }, { publicView: true, showPrices: true }).price, null,
  'empty DB amounts must not be coerced to zero');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1, price: 0 }, { publicView: true, showPrices: true }).price, 0,
  'explicitly confirmed zero is preserved as a valid value');
assert.equal(fromRow(priceRow, { publicView: false, showPrices: false }).price, 1234567,
  'admin/internal serialization retains stored price data irrespective of public toggle');

console.log('PASS: public price serialization hides unconfirmed or invalid amounts and preserves admin/internal values.');
