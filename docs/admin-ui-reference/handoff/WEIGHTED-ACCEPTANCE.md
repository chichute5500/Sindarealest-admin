# SINDAREALEST ADMIN — Bảng nghiệm thu có trọng số

> Baseline kiểm chứng: 2026-10-25. Đây là điểm bằng chứng được xác minh, **không** phải tỷ lệ hoàn thành sản phẩm, không thay thế chỉ số `50% PROVISIONAL` trong hồ sơ cũ.

**Kết quả:** **32/100 trọng số có bằng chứng PASS; 68/100 chưa nghiệm thu.** 0/12 màn hình có xác nhận tương đồng chính xác với ảnh mẫu đã duyệt. Tệp nguồn: [`weighted-acceptance.json`](weighted-acceptance.json).

| Nhóm | Trọng số | Có bằng chứng PASS | Chưa nghiệm thu |
|---|---:|---:|---:|
| 12 màn hình so với mẫu được duyệt | 48 | 0 | 48 |
| UI responsive và thao tác | 16 | 12 | 4 |
| Tích hợp nghiệp vụ ở môi trường cách ly | 20 | 14 | 6 |
| Cách ly, dọn dữ liệu và bảo mật | 11 | 6 | 5 |
| Nghiệm thu chủ dự án | 5 | 0 | 5 |
| **Tổng** | **100** | **32** | **68** |

## Nguyên tắc nghiệm thu

- Không đổi trạng thái màn hình từ `NOT_ACCEPTED` sang PASS khi mới chụp ảnh. Mỗi màn hình phải so cùng dữ liệu, cùng viewport, cùng giao diện sáng/tối với mẫu được duyệt, có file đối chứng và chữ ký nghiệm thu.
- Một tiêu chí chỉ được tính khi có bằng chứng có thể mở, đúng commit/source và đúng phạm vi; kết quả PASS của unit/Playwright không xác nhận giao dịch tài chính thật, R2 thật hoặc khôi phục dữ liệu thật.
- Cấm ghi/làm sạch hồ sơ khách hàng thật, merge PR, sửa `main`, Production, secrets hay DNS. Restore POST chỉ được chạy trên D1 hoàn toàn dùng một lần.
- Với bản ảnh chụp 12 màn hình: xác minh đúng trang, duy nhất ảnh, không tràn ngang, có ảnh/mock được gắn nhãn; bài kiểm thử ảnh không tự xác thực SHA Cloudflare.
- `50% PROVISIONAL` là chỉ số quản lý lịch sử, không phải mẫu số của bảng này. Điểm 32/100 chỉ phản ánh trọng số bằng chứng được liệt kê, chưa phải công bố tiến độ chung.

## Chi tiết 12 màn hình

| Màn hình | Kết quả ảnh chụp | Nghiệm thu mẫu chuẩn | Trọng số |
|---|---|---|---:|
| 1. login | CAPTURED | **NOT ACCEPTED** | 4 |
| 2. dashboard | CAPTURED | **NOT ACCEPTED** | 4 |
| 3. product list | CAPTURED | **NOT ACCEPTED** | 4 |
| 4. product editor | CAPTURED | **NOT ACCEPTED** | 4 |
| 5. product gallery | CAPTURED | **NOT ACCEPTED** | 4 |
| 6. orders | CAPTURED | **NOT ACCEPTED** | 4 |
| 7. order detail | CAPTURED | **NOT ACCEPTED** | 4 |
| 8. customers | CAPTURED | **NOT ACCEPTED** | 4 |
| 9. warranty support | CAPTURED | **NOT ACCEPTED** | 4 |
| 10. website settings | CAPTURED | **NOT ACCEPTED** | 4 |
| 11. backup restore | CAPTURED | **NOT ACCEPTED** | 4 |
| 12. activity log | CAPTURED | **NOT ACCEPTED** | 4 |

Ảnh 12 màn hình: [QA artifact 12572171035](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40122810186/artifacts/12572171035). Gallery 6 ảnh nguồn: [diagnostic artifact 12571935719](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40122361977/artifacts/12571935719).

## Tiêu chí khác

| Hạng mục | Trạng thái | Trọng số | Bằng chứng / Điều kiện còn thiếu |
|---|---|---:|---|
| all_distinct_screens | PASS_EVIDENCED | 4 | [GitHub QA](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40122810186/artifacts/12572171035) |
| mobile_no_overflow | PASS_EVIDENCED | 4 | [GitHub QA](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40122810186/artifacts/12572171035) |
| gallery_six_real_photos | PASS_EVIDENCED | 4 | [GitHub QA](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40122361977/artifacts/12571935719) |
| keyboard_screenreader_accessibility | NOT_ACCEPTED | 4 | Keyboard and assistive-technology acceptance not fully verified |
| product_put_d1_readback | PASS_EVIDENCED | 4 | [GitHub QA](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40122810186) |
| order_price_terms_d1_audit | PASS_EVIDENCED | 4 | [GitHub QA](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40122810186) |
| warranty_claim_and_issuance | PASS_EVIDENCED | 4 | [GitHub QA](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40122810186) |
| backup_v2_read | PASS_EVIDENCED | 2 | [GitHub QA](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40122810186) |
| qr_r2_actual_integration | NOT_ACCEPTED | 2 | Actual isolated end-to-end R2/QR upload not yet accepted |
| payment_refund_settlement | NOT_ACCEPTED | 2 | No real payment/refund end-to-end; avoid real ledger mutations |
| restore_post_disposable_d1 | NOT_ACCEPTED | 2 | Destructive Restore POST requires completely disposable database |
| preview_d1_separated | PASS_EVIDENCED | 3 | [GitHub QA](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40122810186) |
| run_owned_cleanup_verified_twice | PASS_EVIDENCED | 3 | [GitHub QA](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40122810186) |
| complete_auth_security_audit | NOT_ACCEPTED | 3 | Complete authentication/authorization review not yet signed off |
| performance_security_audit | NOT_ACCEPTED | 2 | Full performance/security audit not accepted |
| owner_12_screen_final_signoff | NOT_ACCEPTED | 5 | Owner has not approved exact same-data reference parity |

**Bước kế tiếp:** tăng kiểm thử và đối chiếu Dashboard/Customers/editor/Gallery ở cả desktop/mobile; thực hiện Restore POST và QR/R2 chỉ trên môi trường dùng một lần có bảo đảm cô lập; chạy lại đánh giá trọng số sau khi có bằng chứng mới.

## Trực tiếp quan sát ảnh mẫu và ảnh QA — 2026-10-25

Đã trích xuất ảnh thiết kế chuẩn từ [artifact Gallery](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40122361977/artifacts/12571935719), cùng 48 ảnh QA trên commit `41637e02cfe676b7512a5a0b67e28ea83df78bd8`. Đây là đối chiếu **định tính**, chưa phải so cùng trạng thái dữ liệu:

- Login: mẫu có 'Ghi nhớ đăng nhập' và 'Quên mật khẩu'; bản chạy không có. Không thêm chức năng đăng nhập nhạy cảm chỉ để trông giống mẫu.
- Dashboard: mẫu có biểu đồ doanh thu; màn hình thực tế hiển thị trạng thái không có số liệu. Không bịa dữ liệu doanh thu.
- Gallery: mẫu minh họa quá trình tải ảnh; fixture Gallery chụp trạng thái có sẵn sáu ảnh. Không đánh đồng hai trạng thái.
- Khách hàng: mẫu có sáu ví dụ; QA live chỉ có một hồ sơ thử nghiệm, do đó chưa cùng dữ liệu để so pixel.
- **Lỗi bằng chứng đã xác định:** ảnh `fullPage` của editor/Gallery có cả danh sách sản phẩm phía dưới modal, nhiều PNG dài hơn viewport. Bài kiểm thử được sửa để chụp đúng viewport 390×844 hoặc 1280×800 và đọc trực tiếp PNG dimensions; yêu cầu CI mới PASS để xác nhận.

Không có màn hình nào được tự nâng lên trạng thái chấp nhận tương đồng thiết kế.
