PROMPT TỔNG LỆNH — TÁI THIẾT KẾ WEBSITE SINDAREALEST2 THEO ẢNH MẪU, KHÔNG BỊ RÀNG BUỘC BỞI GIAO DIỆN CŨ, KIỂM THỬ BẰNG PLAYWRIGHT

I. MỆNH LỆNH CAO NHẤT

Bạn là kỹ sư phần mềm cấp cao, chuyên về tái thiết kế giao diện website, HTML/CSS/JavaScript, responsive design, kiểm thử trực quan và tự động hóa Playwright qua GitHub Actions.

Nhiệm vụ của bạn là tiếp tục hoàn thiện giao diện website công khai SinDarealest2 trên nhánh fix theo ảnh mẫu mà người dùng đã cung cấp.

Website hiện đang được phát triển theo giao diện mới nhưng vẫn bị phụ thuộc quá nhiều vào cấu trúc, CSS, font chữ, cách bố trí và các quy tắc của website cũ. Điều đó khiến giao diện không thể thay đổi đúng như ảnh mẫu.

Từ thời điểm này, phải thay đổi cách tiếp cận:

ẢNH MẪU LÀ CHUẨN THIẾT KẾ. CODE GIAO DIỆN CŨ KHÔNG PHẢI LÀ GIỚI HẠN THIẾT KẾ.

Không được tiếp tục vá từng phần nhỏ của giao diện cũ chỉ để giữ nguyên cấu trúc cũ nếu cách làm đó khiến website không thể đạt được hình ảnh mong muốn.

Được phép tái thiết kế mạnh hoặc viết lại phần giao diện frontend công khai khi cần thiết, bao gồm:

- Cấu trúc HTML và cách tổ chức các section.
- Bố cục trang chủ, Hero, danh mục, bộ sưu tập và lưới sản phẩm.
- Vị trí, kích thước, tỉ lệ, cách crop và cách trình bày hình ảnh.
- Font chữ, cỡ chữ, độ đậm, khoảng cách và hệ thống typography.
- Màu sắc giao diện, nền, viền, bóng đổ và độ tương phản.
- Header, navigation, menu mobile và desktop.
- Hình dạng thẻ, nút, CTA, icon và các thành phần giao diện.
- CSS, responsive rules, hiệu ứng, animation, z-index và stacking context.
- Cách phân chia component hoặc tổ chức lại mã nguồn frontend.
- Thứ tự trình bày các section và cách chuyển tiếp giữa các khu vực.
- Cấu trúc giao diện trang chi tiết sản phẩm.
- Các thành phần khác cần thiết để đạt được thiết kế mục tiêu.

Không được viện lý do “code cũ đang sử dụng cấu trúc này”, “CSS cũ đang quy định như vậy” hoặc “phải bảo toàn giao diện hiện tại” để từ chối một thay đổi cần thiết nhằm đạt ảnh mẫu.

Tuy nhiên, việc tái thiết kế giao diện không đồng nghĩa với việc được phép phá dữ liệu, chức năng nghiệp vụ hoặc hệ thống vận hành hiện có. Phải phân biệt rõ phần được tự do thiết kế lại và phần bắt buộc bảo toàn theo các quy định bên dưới.

Không chỉ kiểm tra rồi lập kế hoạch. Hãy thực hiện công việc thực tế bằng các công cụ và quyền truy cập hiện có: kiểm tra GitHub, đọc mã nguồn, xem ảnh mẫu, chụp website Preview bằng Playwright, xác định vấn đề, sửa code, chạy kiểm thử, chụp ảnh mới và đối chiếu lại.

Tiếp tục xử lý những hạng mục có thể thực hiện an toàn. Chỉ dừng một hạng mục khi có trở ngại thực sự không thể vượt qua bằng các quyền truy cập hiện có.

Không tuyên bố hoàn thành 100% nếu chưa có bằng chứng đáp ứng đầy đủ tiêu chí nghiệm thu.


---

II. NHỮNG THỨ TUYỆT ĐỐI KHÔNG ĐƯỢC THAY ĐỔI

Chỉ có ba nhóm nội dung bất biến quan trọng nhất trong quá trình tái thiết kế:

1. Logo

- Giữ nguyên logo chính thức của SinDarealest.
- Không vẽ lại, thay bằng logo khác, sửa hình dạng, bóp méo hoặc thay thế bằng hình ảnh tự tạo.
- Không dùng văn bản hoặc icon khác để giả lập logo.
- Có thể thay đổi cách bố trí, kích thước hiển thị và khoảng cách xung quanh logo nếu cần để phù hợp ảnh mẫu, nhưng không làm thay đổi bản thân logo.

2. Thương hiệu

- Không đổi tên thương hiệu SinDarealest.
- Không thay thương hiệu thật bằng thương hiệu giả hoặc thương hiệu khác.
- Bảo toàn tên thương hiệu, nhận diện thương hiệu và các thông tin nhận diện chính thức đã có.
- Có thể điều chỉnh cách trình bày, typography, màu sắc thành phần giao diện và phong cách thị giác để phù hợp ảnh mẫu, miễn không biến đổi thương hiệu thành một thương hiệu khác.

3. Sản phẩm

Giữ nguyên danh tính và dữ liệu sản phẩm hiện có, bao gồm:

- Sản phẩm thực tế và mã SKU.
- ID và mã sản phẩm.
- Tên sản phẩm và thương hiệu sản phẩm.
- Giá, thông tin mô tả và các thuộc tính nghiệp vụ.
- Danh mục đã xác minh.
- Nguồn ảnh sản phẩm, đường dẫn ảnh và dữ liệu ảnh hiện có.
- Mối liên hệ giữa sản phẩm và các hình ảnh thuộc sản phẩm đó.

Không tự tạo sản phẩm giả để lấp chỗ trống. Không thay ảnh sản phẩm thật bằng ảnh AI hoặc ảnh minh họa không liên quan. Không sửa giá, SKU, dữ liệu hoặc nguồn ảnh chỉ để ảnh chụp trông giống ảnh mẫu.

Được phép thay đổi hoàn toàn cách trình bày sản phẩm: bố cục thẻ, lưới, kích thước ảnh, khoảng cách, tỉ lệ hình ảnh, kiểu chữ, cách hiển thị thông tin, thứ tự sắp xếp và cách trình bày gallery, miễn dữ liệu và chức năng thực tế được bảo toàn.

Nguyên tắc xác định phạm vi

Bảo toàn logo, thương hiệu và sản phẩm không có nghĩa là phải bảo toàn giao diện cũ.

Ngoài các nội dung bất biến nêu trên và những ranh giới an toàn đối với Production, dữ liệu thật, backend và chức năng nghiệp vụ, các quyết định thiết kế giao diện phải được đưa ra dựa trên ảnh mẫu và kết quả kiểm thử thực tế.


---

III. THỨ TỰ ƯU TIÊN KHI CÓ XUNG ĐỘT

Khi yêu cầu thiết kế mới xung đột với code giao diện cũ, áp dụng thứ tự ưu tiên sau:

1. Bảo vệ logo, thương hiệu, danh tính sản phẩm và dữ liệu sản phẩm thật.
2. Không tác động Production, dữ liệu thật hoặc cấu hình hạ tầng ngoài phạm vi được phép.
3. Đạt được phong cách, bố cục và trạng thái giao diện của ảnh mẫu trong phạm vi có thể xác minh.
4. Bảo toàn và kiểm thử các chức năng công khai đang hoạt động.
5. Giữ nguyên các tích hợp backend hiện có khi có thể tái sử dụng an toàn.
6. Tái sử dụng mã nguồn cũ khi mã đó hữu ích và không cản trở thiết kế.
7. Chỉ giữ lại những quy tắc CSS, cấu trúc HTML hoặc hiệu ứng cũ thực sự cần thiết.

Nếu CSS cũ cản trở bố cục mẫu, hãy sửa hoặc thay thế CSS đó.

Nếu cấu trúc HTML cũ không cho phép xây dựng bố cục phù hợp, hãy tổ chức lại HTML và cập nhật những selector, event listener hoặc bài test có liên quan.

Nếu font cũ làm giao diện khác ảnh mẫu, hãy thay font phù hợp. Không mặc định phải giữ font chữ đang có.

Nếu hiệu ứng Liquid cũ gây sai màu, che ảnh, đảo màu toàn trang hoặc làm sai giao diện mẫu, hãy sửa hoặc loại bỏ phần hiệu ứng gây lỗi.

Nếu giao diện cũ không thể đạt yêu cầu bằng các bản vá cục bộ, hãy tái cấu trúc phần frontend cần thiết thay vì tiếp tục chồng thêm CSS.

Không được bảo vệ một quy tắc cũ chỉ vì quy tắc đó đã tồn tại lâu trong repository.


---

IV. THÔNG TIN DỰ ÁN VÀ PHẠM VI LÀM VIỆC

Repository:

chichute5500/Sindarealest-admin

Nhánh công việc dự kiến:

fix/liquid-glass-audit-2026-10-19

Commit từng được ghi nhận trên nhánh:

a3834fed3eb1c012b188d7c95d14ec3d15e3969f

Website Preview từng được người dùng xác nhận mở bình thường:

https://3ed49bcc.sindarealest2.pages.dev/

Website Production:

https://sindarealest2.pages.dev

Các giá trị trên chỉ là thông tin ban đầu. Phải xác minh lại branch, commit, workflow và Preview thực tế trước khi sử dụng. Không mặc định URL Preview cũ vẫn đang trỏ đến commit mới nhất hoặc đúng nhánh đang làm việc.

Phạm vi được phép

- Tái thiết kế website công khai trong nhánh fix đã xác minh.
- Sửa HTML, CSS, JavaScript và cấu trúc frontend công khai theo yêu cầu thiết kế.
- Xây dựng lại bố cục hoặc các section khi cần thiết.
- Thay đổi font chữ.
- Tái thiết kế responsive cho mobile, tablet và desktop.
- Chỉnh sửa các thành phần giao diện, animation, typography, màu sắc và hiệu ứng.
- Cập nhật cách hiển thị và điều hướng sản phẩm.
- Bổ sung hoặc sửa kiểm thử Playwright và workflow liên quan đến website công khai.
- Tạo hệ thống ảnh đối chiếu trước/sau trong repository.
- Sửa lỗi thực tế được xác nhận bằng mã nguồn, trình duyệt hoặc kiểm thử.

Các việc không thuộc phạm vi

- Làm mới giao diện Admin.
- Sửa luồng đăng nhập hoặc các chức năng quản trị không liên quan.
- Sửa chức năng phân loại kho ảnh bằng AI.
- Sửa dự án Taobao Shop Collector.
- Thay đổi dữ liệu nghiệp vụ không liên quan.
- Thay đổi cấu hình Production, tài khoản Cloudflare, binding D1/R2 hoặc secrets.
- Chạy migration hoặc thao tác xóa, sửa dữ liệu thật.
- Merge nhánh fix vào main.
- Triển khai Production hoặc kích hoạt triển khai Production.
- Thay đổi cấu hình nhánh Production của Cloudflare Pages.

Không mở rộng phạm vi sang Admin chỉ vì việc đó thuận tiện hơn về kỹ thuật.

Không thực hiện thao tác Production nếu chưa được người dùng cho phép rõ ràng.


---

V. ĐƯỢC PHÉP TÁI CẤU TRÚC FRONTEND — KHÔNG BỊ TRÓI BUỘC BỞI CODE CŨ

Đây là điểm thay đổi trọng tâm của toàn bộ nhiệm vụ.

Trước đây, quy trình làm việc quá chú trọng việc giữ nguyên mã nguồn cũ. Điều đó khiến giao diện mới phải kế thừa những giới hạn không cần thiết.

Từ nay phải đánh giá mã nguồn theo hai nhóm:

Nhóm A — Các hợp đồng chức năng cần bảo toàn

Bao gồm những phần liên quan đến:

- Dữ liệu sản phẩm thực tế.
- Cơ chế tải dữ liệu sản phẩm.
- API endpoint và request/response contract đang được sử dụng.
- Cloudflare Pages Functions và các tích hợp backend cần thiết.
- Các liên kết và nguồn ảnh thực tế.
- Light/Dark/System nếu website đang cung cấp các chế độ này.
- Các thao tác công khai đang hoạt động như tìm kiếm, điều hướng sản phẩm, CTA, gallery hoặc giỏ hàng nếu tồn tại.
- Cơ chế mở trực tiếp và tải lại URL sản phẩm.
- Những ID, selector, data attribute hoặc event listener mà chức năng hiện tại thực sự phụ thuộc.

Không được tùy tiện phá vỡ các hợp đồng này. Nếu cần thay đổi, phải tìm và cập nhật nhất quán toàn bộ nơi sử dụng, đồng thời kiểm thử lại.

Nhóm B — Các phần giao diện được phép làm mới

Bao gồm:

- HTML layout và cấu trúc section.
- CSS cũ và các quy tắc ưu tiên kiểu dáng.
- Font chữ và typography.
- Grid, flex, kích thước, vị trí và khoảng cách.
- Giao diện điều hướng.
- Thiết kế thẻ sản phẩm.
- Hệ thống màu sắc và nền.
- Liquid Glass, blur, overlay và các hiệu ứng liên quan.
- Cách bố trí hình ảnh.
- Giao diện mobile và desktop.
- Các lớp trang trí hoặc thành phần giao diện không cần thiết.

Các thành phần trong nhóm B được phép sửa, xóa, thay thế hoặc viết lại nếu cần.

Không được giữ lại một lớp CSS, cấu trúc DOM hoặc hiệu ứng cũ chỉ vì sợ đụng đến code legacy mà chưa kiểm tra xem nó có thực sự được sử dụng hay không.

Nếu cần loại bỏ một quy tắc cũ, trước hết tìm kiếm những nơi phụ thuộc vào quy tắc đó, xác định tác động và cập nhật có kiểm soát.

Về kiến trúc

Ưu tiên giữ nền tảng hiện tại nếu HTML/CSS/JavaScript vẫn có thể thực hiện thiết kế mới tốt.

Tuy nhiên, không được coi kiến trúc giao diện hiện tại là lý do cấm tái cấu trúc frontend. Được phép tổ chức lại mã nguồn và thay đổi mạnh cấu trúc trình bày khi cần.

Không tự động chuyển sang React/Vite chỉ vì muốn làm mới giao diện; cũng không được lấy việc tránh chuyển framework làm lý do để bảo toàn một layout cũ không đáp ứng ảnh mẫu.

Mọi thay đổi kỹ thuật cần phục vụ thiết kế mục tiêu, có đánh giá tác động và kiểm thử.


---

VI. KIỂM TRA ẢNH MẪU VÀ XÁC ĐỊNH CHUẨN THIẾT KẾ

Các ảnh tham chiếu từng được ghi nhận trong repository:

- docs/static-web-reference/file_0000000017088207af45f5e6dd90cfa4.png
- docs/static-web-reference/file_00000000fcb48207a23aeda23caa5eeb.png

Theo thông tin đã bàn giao, đây lần lượt là ảnh tham chiếu giao diện mobile chế độ sáng và chế độ tối.

Phải xác minh hai tệp có tồn tại thật hay không, mở chúng và xem nội dung hình ảnh thực tế.

Nếu không tìm thấy ở vị trí này, hãy tìm ảnh tham chiếu thật trong repository hoặc các tài liệu được cung cấp. Không tự dựng ảnh thay thế rồi coi đó là ảnh mẫu của người dùng.

Không sửa nội dung gốc của ảnh tham chiếu.

Cách đọc ảnh mẫu

Không chỉ xem qua ảnh hoặc chỉ đọc tên file. Phải phân tích trực tiếp:

- Bố cục tổng thể.
- Màu sắc và độ tương phản.
- Font chữ và hệ thống typography.
- Kích thước, khoảng cách và căn lề.
- Tỉ lệ và cách crop hình ảnh.
- Cấu trúc header, Hero, section và thẻ nội dung.
- Cách hiển thị logo, tên thương hiệu và các sản phẩm.
- Các lớp nền, hiệu ứng kính, viền, bóng đổ và animation nếu nhìn thấy.
- Cách tổ chức giao diện ở chế độ sáng và tối.
- Những khác biệt giữa thiết kế mẫu và giao diện Preview hiện tại.

Ảnh mẫu là cơ sở để đưa ra quyết định thiết kế. Website cũ chỉ là căn cứ để xác định dữ liệu và chức năng cần duy trì.

Nếu ảnh mẫu chỉ thể hiện mobile, hãy dùng phong cách thiết kế đó để xây dựng bố cục desktop và tablet hợp lý. Không tuyên bố desktop đã giống mẫu khi chưa có ảnh mẫu desktop tương ứng; hãy mô tả đó là phần phát triển responsive dựa trên ngôn ngữ thiết kế tham chiếu.


---

VII. XÁC MINH CODE, GITHUB VÀ PREVIEW TRƯỚC KHI SỬA

Trước khi thay đổi file, phải:

1. Xác minh repository và nhánh thực tế.
2. Xác minh commit mới nhất và trạng thái working tree.
3. Kiểm tra diff chưa commit và các thay đổi có sẵn của người dùng.
4. Đọc lịch sử commit liên quan đến giao diện mới.
5. Kiểm tra workflow CI, Playwright và các workflow ảnh trực quan.
6. Đọc tài liệu bàn giao nếu tồn tại:
   - docs/handoff/HANDOFF.md
   - docs/handoff/TASKS.md
   - docs/handoff/TEST-RESULTS.md
   - docs/handoff/DECISIONS.md
7. Xác minh Preview nào đang chạy commit nào.
8. Xác định file HTML, CSS, JavaScript thực sự đang tạo giao diện công khai.
9. Xác định cơ chế render dữ liệu sản phẩm, tải hình ảnh, đổi theme và điều hướng.
10. Mở website Preview thật bằng trình duyệt hoặc Playwright nếu môi trường cho phép.

Không suy đoán giao diện chỉ từ mã nguồn.

Không mặc định một file CSS đang được dùng chỉ vì file đó tồn tại.

Không sửa file trước khi đã kiểm tra diff hiện tại.

Nếu nhánh hoặc Preview không khớp thông tin bàn giao, hãy điều tra trước. Không tự chuyển sang nhánh khác hoặc thay đổi Production để giải quyết sai lệch.


---

VIII. HỆ THỐNG ẢNH CHỤP TRƯỚC VÀ SAU

Chỉ sử dụng đúng hai thư mục chuẩn:

docs/website-screenshots/start-of-work/

docs/website-screenshots/end-of-work/

Manifest duy nhất:

docs/website-screenshots/manifest.json

Không tạo thêm thư mục chuẩn theo ngày, phiên AI, mã run hoặc commit.

Bắt đầu chu kỳ

Nếu đã có bộ end-of-work của chu kỳ trước được xác minh, sao chép bộ đó sang start-of-work, giữ nguyên tên file.

Nếu chưa có bộ ảnh kết thúc đã xác minh, dùng Playwright chụp giao diện Preview hiện tại để tạo bộ ảnh khởi đầu.

Ảnh bắt đầu phải phản ánh đúng Preview, commit, route, viewport, theme và trạng thái đang kiểm thử.

Sau khi đã có ảnh bắt đầu, không được ghi đè ảnh đó bằng ảnh sau khi sửa trong cùng chu kỳ.

Kết thúc chu kỳ

Sau khi sửa code và kiểm thử:

1. Chụp lại các route và trạng thái tương ứng bằng Playwright.
2. Lưu ảnh vào end-of-work.
3. Dùng chính xác tên file tương ứng trong start-of-work.
4. Xem ảnh thật để kiểm tra trực quan.
5. So sánh ảnh trước và sau.
6. Cập nhật manifest.
7. Xác định rõ thay đổi nào đạt yêu cầu, lỗi nào còn tồn tại và test nào bị chặn.

Khi bắt đầu chu kỳ sau, dùng bộ ảnh kết thúc đã được xác minh làm mốc mới.

Không tạo ảnh giả, không sử dụng ảnh AI, ảnh cũ hoặc ảnh Production làm bằng chứng cho Preview đang kiểm thử.

Quy tắc đặt tên

Ví dụ:

- home-mobile-390-light.png
- home-mobile-390-dark.png
- home-desktop-1440-light.png
- home-desktop-1440-dark.png
- product-detail-mobile-390-light.png
- product-detail-mobile-390-dark.png

Tên file phải mô tả route, viewport và theme. Cùng một tổ hợp kiểm thử luôn phải sử dụng cùng tên ở cả hai thư mục.

Chụp toàn trang đối với trang dài và chụp bổ sung phần đầu, giữa, cuối khi cần để quan sát các khu vực quan trọng.

Manifest

manifest.json phải ghi tối thiểu:

- Thời điểm chụp.
- Branch và commit.
- Preview URL.
- Route.
- Viewport.
- Theme.
- Trạng thái giao diện.
- Tên ảnh tương ứng.
- Kết quả Playwright.
- Lỗi được quan sát.
- Hạng mục đã sửa.
- Hạng mục chưa kiểm thử hoặc bị chặn.
- Trạng thái xác minh trực quan.

Không đưa mật khẩu, token, cookie hoặc secrets vào manifest.


---

IX. KIỂM TRA VÀ TÁI THIẾT KẾ TOÀN BỘ WEBSITE CÔNG KHAI

Không chỉ làm đẹp trang chủ rồi kết luận hoàn thành.

Hãy tìm các route và section có thật từ code, dữ liệu và giao diện Preview. Kiểm tra các khu vực sau nếu chúng tồn tại:

- Header và logo.
- Navigation desktop/mobile.
- Hero.
- Khu vực “Phong cách đẳng cấp từ da cá sấu”.
- Khu vực “6 ô”.
- Danh mục.
- Bộ sưu tập.
- Sản phẩm nổi bật và lưới sản phẩm.
- Tìm kiếm và kết quả tìm kiếm.
- Trạng thái không có kết quả.
- Trang chi tiết sản phẩm.
- Gallery và chuyển đổi ảnh sản phẩm.
- Các CTA và liên kết Zalo.
- Giỏ hàng hoặc danh sách yêu thích nếu tồn tại.
- Chính sách, thông tin thương hiệu và footer.
- Dropdown, modal, thông báo, loading, empty, error và success state nếu có.
- Các route sản phẩm cũ, route mới và trang 404 có liên quan.

Nếu website là một trang dài, phải kiểm tra tất cả section chính và những tương tác thực tế.

Nếu website có nhiều route, phải bao phủ các route công khai quan trọng. Không tuyên bố đã kiểm tra toàn website khi mới mở một URL.

Tái thiết kế dựa trên ảnh mẫu

Với từng section:

1. Xem cách section đang được hiển thị trên Preview.
2. Xem vùng tương ứng trong ảnh mẫu nếu có.
3. Chỉ ra khác biệt trực quan cụ thể.
4. Xác định nguyên nhân nằm ở HTML, CSS, dữ liệu, cách render hay trạng thái theme.
5. Đưa ra thay đổi cần thiết, không bị giới hạn bởi cách bố trí cũ.
6. Sửa và chụp lại.
7. Xác nhận kết quả bằng ảnh thực tế.

Được phép thay đổi font, bố cục, màu sắc, kích thước và hiệu ứng để đạt mục tiêu thiết kế. Không sửa danh tính sản phẩm để làm cho hình ảnh trông giống mẫu.

Không tự xóa những section hoặc chức năng đang có mà chưa đánh giá tác động. Có thể tổ chức lại và thay đổi cách trình bày của chúng để phù hợp thiết kế.


---

X. KHU VỰC “PHONG CÁCH ĐẲNG CẤP TỪ DA CÁ SẤU”

Đây là hạng mục bắt buộc, không được bỏ qua vì đang tập trung vào những phần khác.

Phải kiểm tra giao diện thực tế và xác định:

- Tiêu đề, mô tả và cách bố trí nội dung.
- Hình ảnh Hero thực sự được hiển thị.
- Nguồn dữ liệu và cơ chế cập nhật ảnh.
- Vị trí và tỉ lệ ảnh so với văn bản.
- Crop, kích thước, căn lề và khoảng cách.
- Font chữ, màu sắc, độ tương phản.
- Nền, CTA và cách chuyển tiếp sang section tiếp theo.
- Khác biệt giữa light/dark.
- Responsive trên mobile, tablet và desktop.

Kiểm tra logic thực tế của syncHeroProductImage() và những hàm render hoặc nguồn dữ liệu có liên quan.

Không tự kết luận ảnh Hero là ảnh tĩnh hoặc ảnh động khi chưa kiểm tra.

Nếu bố cục hiện tại không thể đạt ảnh mẫu bằng những chỉnh sửa nhỏ, được phép tái cấu trúc section này. Giữ đúng nguồn ảnh và dữ liệu thực tế; không hardcode một sản phẩm tùy ý chỉ để ảnh chụp trông đẹp.

Phải có ảnh chụp sau sửa và đối chiếu trực quan.


---

XI. KHU VỰC “6 Ô” VÀ LIQUID GLASS

Mục tiêu là thiết kế lại khu vực “6 ô” để phù hợp ngôn ngữ thiết kế của ảnh mẫu, không phải cố giữ lại hiệu ứng Liquid Glass cũ bằng mọi giá.

Nếu hiệu ứng hiện tại đã phù hợp, có thể giữ và điều chỉnh.

Nếu hiệu ứng cũ đang cản trở ảnh mẫu, được phép sửa mạnh hoặc thay thế hiệu ứng trong đúng khu vực này.

Kiểm tra ba lớp riêng biệt:

1. Lớp ảnh nền: hình ảnh thật phía sau, sử dụng đúng nguồn ảnh hiện có.
2. Lớp nền khu vực: nền và hiệu ứng chiều sâu cho toàn vùng “6 ô”.
3. Lớp nền văn bản/thẻ nội dung: nền hỗ trợ độ tương phản và khả năng đọc của từng thẻ.

Ba lớp phải có vai trò phân biệt khi thiết kế yêu cầu ba lớp. Không chỉ chồng nhiều lớp blur lên nhau mà không giải quyết đúng nguyên nhân.

Phải kiểm tra:

- Độ trong và khả năng nhìn thấy ảnh nền.
- Viền sáng, bóng đổ và chiều sâu.
- Độ đọc được của chữ trên nền sáng và tối.
- Tương phản, kích thước và khoảng cách.
- Cách bố trí trên màn hình nhỏ.
- Khả năng tương tác của các thẻ, CTA và liên kết.
- Hiệu suất và lỗi stacking context.

Điều tra CSS/HTML/JS thực tế, bao gồm opacity, backdrop-filter, filter, pseudo-element, gradient, blend mode, mask, z-index và theme rules.

Không dùng một overlay đục làm mất ảnh nền.

Không áp Liquid Glass hoặc lớp đảo màu toàn trang. Những khu vực khác chỉ thay đổi hiệu ứng khi ảnh mẫu và mục tiêu thiết kế đòi hỏi điều đó, đồng thời phải kiểm tra ảnh hưởng trước khi sửa.


---

XII. ĐIỀU CHỈNH URL TRANG CHI TIẾT SẢN PHẨM

Phải tách biệt URL của trang sản phẩm với URL tải tệp ảnh.

Dạng URL mục tiêu cần khảo sát và chuẩn hóa theo dữ liệu thật:

/sanpham/{category}/{product-code}

Ví dụ minh họa:

- /sanpham/giaytay/sd2929
- /sanpham/vi/sd1234
- /sanpham/thatlung/sd5678

Đây chỉ là ví dụ về định dạng, không được xem là dữ liệu sản phẩm thật.

Trước khi thay đổi, xác minh quy tắc URL, mã sản phẩm, SKU, danh mục và cơ chế định tuyến hiện có.

Lập bảng mapping bằng dữ liệu xác minh được, gồm:

- SKU hoặc mã sản phẩm.
- Tên sản phẩm.
- Danh mục.
- URL hiện tại.
- URL mục tiêu.

Sau đó kiểm tra và cập nhật có kiểm soát:

- Liên kết từ thẻ sản phẩm.
- Liên kết trong danh mục và sản phẩm nổi bật.
- Kết quả tìm kiếm.
- Breadcrumb và canonical nếu tồn tại.
- Sitemap nếu dự án thực sự sử dụng.
- Cơ chế fallback hoặc redirect nếu cần thiết.

Không thay đổi ID, SKU, giá, ảnh hoặc danh tính sản phẩm.

Kiểm thử URL

- Mở sản phẩm từ lưới sản phẩm.
- Mở trực tiếp URL sâu.
- Tải lại URL sản phẩm.
- Kiểm tra mã sản phẩm không tồn tại.
- Kiểm tra danh mục không hợp lệ.
- Kiểm tra URL cũ nếu đang được sử dụng.
- Kiểm tra không có redirect vòng lặp.
- Kiểm tra không trỏ nhầm sang sản phẩm khác.
- Kiểm tra ảnh sản phẩm vẫn tải được.

Không thay URL ảnh CDN hoặc URL object trong R2 thành URL trang sản phẩm, hoặc ngược lại.


---

XIII. RESPONSIVE, FONT VÀ THEME

Font chữ được phép thay đổi để đạt thiết kế mẫu.

Không tiếp tục giữ font cũ chỉ vì website trước đây sử dụng nó.

Cần chọn font có ngôn ngữ thị giác phù hợp ảnh mẫu, hỗ trợ tiếng Việt đầy đủ, có độ đọc tốt trên điện thoại và desktop. Ưu tiên nguồn font ổn định, hạn chế tăng phụ thuộc không cần thiết.

Phải kiểm tra tối thiểu những viewport sau:

- Mobile nhỏ: 360 × 800.
- Mobile phổ biến: 390 × 844.
- Tablet: 768 × 1024.
- Desktop: 1440 × 900.

Kiểm tra ít nhất mobile light/dark và desktop light/dark; mở rộng các trường hợp cần thiết để xác nhận responsive.

Nếu website hỗ trợ System theme, phải kiểm tra chế độ kế thừa theme hệ thống và việc chuyển đổi giữa Light/Dark/System.

Tại từng viewport, kiểm tra:

- Tràn ngang và nội dung bị cắt.
- Phần tử chồng lấn.
- Font, cỡ chữ và độ tương phản.
- Tỉ lệ và crop ảnh.
- Khoảng cách và căn chỉnh.
- Menu, nút, gallery và thao tác chạm.
- Phần tử nổi, hiệu ứng nền và z-index.
- Nội dung ở giữa và cuối trang.
- Sự nhất quán giữa theme sáng/tối.

Không chỉ đặt viewport rồi chụp một ảnh. Phải thao tác menu, nút, theme và những thành phần thực tế cần kiểm tra.


---

XIV. PLAYWRIGHT VÀ GITHUB ACTIONS

Sử dụng Playwright thông qua GitHub Actions để kiểm tra website Preview. Không dựa vào việc người dùng phải thao tác Cloudflare Dashboard trên điện thoại Android.

Trước khi thêm workflow, kiểm tra những workflow hiện có, bao gồm:

- playwright.config.js
- tests/e2e/admin-preview.spec.js — chỉ đọc khi cần hiểu cấu hình dùng chung, không đưa Admin vào phạm vi giao diện công khai.
- .github/workflows/admin-preview-playwright.yml — không tự ý sửa hoặc mở rộng sang Admin.
- .github/workflows/liquid-glass-visual-preview.yml

Có thể bổ sung hoặc sửa workflow kiểm thử website công khai trong phạm vi phù hợp.

Workflow phải:

1. Xác minh branch và commit.
2. Xác minh Preview URL và phản hồi website thực tế.
3. Chạy test giao diện và chức năng công khai.
4. Chụp ảnh bằng Playwright.
5. Chụp ảnh trước/sau đúng cấu trúc thư mục đã quy định.
6. So sánh và lưu manifest.
7. Kiểm tra console error, lỗi tài nguyên, ảnh lỗi và lỗi định tuyến.
8. Kiểm tra responsive, theme và tràn ngang.
9. Trả kết quả PASS/FAIL theo từng hạng mục.
10. Lưu bằng chứng cần thiết.
11. Tránh tạo vòng lặp vô hạn do workflow tự commit ảnh hoặc manifest.
12. Không ghi secrets, cookie, token hoặc mật khẩu vào log.

Nếu workflow hiện tại đang lưu ảnh vào thư mục lồng theo RUN_ID, hãy sửa cấu trúc đầu ra trong phạm vi được phép để chỉ còn hai thư mục chuẩn.

Nếu thiếu secret, quyền truy cập hoặc cấu hình môi trường, ghi rõ bài test nào bị chặn và nguyên nhân. Không giả lập thông tin xác thực và không tuyên bố PASS cho bài test chưa chạy.

Không chỉ kiểm tra rằng website trả HTTP thành công. Phải xác minh giao diện và hành vi thực tế.


---

XV. VÒNG LẶP SỬA GIAO DIỆN ĐẾN KHI ĐẠT YÊU CẦU

Thực hiện vòng lặp thực tế sau:

1. Xác nhận branch, commit và Preview đang chạy.
2. Xem ảnh tham chiếu gốc của người dùng.
3. Chụp ảnh giao diện hiện tại bằng Playwright.
4. Xem ảnh thực tế và so sánh từng khu vực.
5. Xác định khác biệt giữa website và ảnh mẫu.
6. Xác định nguyên nhân thực tế trong HTML/CSS/JS hoặc dữ liệu render.
7. Quyết định cách sửa dựa trên mục tiêu thiết kế, không bị ràng buộc bởi cách bố trí cũ.
8. Chỉnh sửa code.
9. Chạy lại các test có liên quan.
10. Chụp lại ảnh bằng Playwright.
11. Mở ảnh mới và đánh giá trực quan.
12. So sánh ảnh trước/sau.
13. Kiểm tra hồi quy ở các khu vực khác.
14. Cập nhật manifest và bằng chứng.
15. Nếu còn vấn đề có thể sửa an toàn, tiếp tục vòng tiếp theo.

Không được cố gắng giải quyết mọi vấn đề bằng cách nối thêm CSS vào cuối file nếu vấn đề xuất phát từ cấu trúc hoặc quy tắc cũ.

Nếu cần viết lại một section hoặc nhóm thành phần giao diện, hãy thực hiện thay đổi có chủ đích, kiểm tra những chức năng phụ thuộc và xác minh kết quả.

Không coi mọi khác biệt pixel là lỗi; phải phân biệt thay đổi mong muốn với hồi quy ngoài ý muốn.

Ngược lại, không được bỏ qua sai lệch lớn chỉ vì kiểm thử kỹ thuật không báo lỗi.

Tiêu chí thiết kế là ảnh mẫu và kết quả quan sát trực tiếp trên website, không phải số lượng dòng code được giữ lại từ phiên bản cũ.


---

XVI. KIỂM SOÁT AN TOÀN TRONG QUÁ TRÌNH THAY ĐỔI

Mọi thay đổi phải được thực hiện trong nhánh fix và môi trường Preview đã xác minh.

Tuyệt đối không:

- Merge vào main.
- Deploy Production.
- Chuyển nhánh Production của Cloudflare Pages.
- Sửa binding D1/R2 hoặc secrets.
- Chạy migration trên cơ sở dữ liệu thật.
- Xóa hoặc sửa dữ liệu sản phẩm thật.
- Ghi đè thay đổi chưa commit của người dùng.
- Đưa thông tin bí mật vào code, ảnh chụp hoặc log.
- Chỉnh sửa Admin vì cho rằng giao diện Admin cần đồng bộ.
- Dùng ảnh Production thay cho ảnh Preview để báo cáo kết quả thử nghiệm.

Sau mỗi nhóm sửa đổi, kiểm tra git diff, trạng thái Git và phạm vi file đã thay đổi.

Nếu phát hiện thay đổi ngoài phạm vi hoặc có nguy cơ ảnh hưởng dữ liệu, hãy dừng chính thao tác rủi ro đó để điều tra; tiếp tục các công việc độc lập có thể thực hiện an toàn.


---

XVII. TIÊU CHÍ NGHIỆM THU

A. Bảo toàn nội dung bất biến

- Logo giữ nguyên.
- Thương hiệu giữ nguyên.
- Danh tính và dữ liệu sản phẩm giữ nguyên.
- Nguồn ảnh thật không bị thay bằng ảnh giả.
- Không có dữ liệu sản phẩm giả được thêm chỉ để phục vụ ảnh chụp.

B. Giao diện

- Có đối chiếu trực quan với ảnh mẫu thật.
- Không còn bị giới hạn bởi CSS/layout cũ ở những khu vực cần tái thiết kế.
- Font chữ có thể thay đổi để phù hợp thiết kế.
- Bố cục và các section chính được kiểm tra thực tế.
- Khu vực “Phong cách đẳng cấp từ da cá sấu” có bằng chứng sau sửa.
- Khu vực “6 ô” được kiểm tra riêng.
- Light/Dark/System hoạt động theo chức năng hiện có.
- Giao diện không vỡ tại những viewport đã chọn.
- Các chức năng giao diện không bị phá vỡ.

C. Chức năng và URL

- Điều hướng công khai hoạt động.
- Gallery sản phẩm hoạt động.
- Link và CTA quan trọng hoạt động.
- URL sản phẩm mở đúng dữ liệu.
- Mở trực tiếp và tải lại trang sản phẩm thành công.
- Không nhầm URL trang sản phẩm với URL ảnh.
- Những chức năng hiện có trong phạm vi kiểm tra vẫn hoạt động.

D. Ảnh và kiểm thử

- Có ảnh gốc trong start-of-work.
- Có ảnh kết thúc trong end-of-work.
- Hai bộ ảnh dùng tên file tương ứng.
- Manifest phản ánh đúng branch, commit, Preview và trạng thái kiểm thử.
- Playwright đã chạy thực tế.
- Ảnh sau sửa đã được mở và xem.
- Đã đối chiếu trực quan, không chỉ chạy so sánh pixel.
- Các mục FAIL, chưa kiểm thử và bị chặn được ghi rõ.

E. An toàn và bàn giao

- Công việc nằm trong nhánh fix.
- Không thay đổi Admin.
- Không merge hoặc deploy Production.
- Có commit trên nhánh fix nếu quyền và môi trường cho phép.
- Có liên kết GitHub commit, workflow run và Preview đã xác minh.
- Có danh sách file đã sửa, lý do, bằng chứng và kết quả.

Nếu còn hạng mục bắt buộc chưa có bằng chứng, không được tuyên bố hoàn thành 100%.


---

XVIII. BÁO CÁO TIẾN ĐỘ THEO THANG 100%

Báo cáo tiến độ dựa trên kết quả thực tế, không dựa trên số lượng file đã sửa.

Phải phân biệt:

- Đã kiểm tra.
- Đã sửa.
- Đã chạy kiểm thử thành công.
- Đã xác minh bằng ảnh.
- Chưa kiểm thử.
- Bị chặn.

Các hạng mục giao diện chỉ được tính hoàn thành khi có ảnh chụp và kiểm tra trực quan phù hợp.

Các hạng mục URL chỉ được tính hoàn thành khi đã kiểm tra điều hướng, mở trực tiếp hoặc tải lại trang.

Các workflow chỉ được tính hoàn thành khi có kết quả chạy thực tế.

Nếu chưa đạt 100%, tiếp tục xử lý các vấn đề có thể giải quyết an toàn. Không dừng ở việc báo cáo kế hoạch hoặc yêu cầu người dùng làm những việc mà hệ thống có thể tự thực hiện.

Không yêu cầu người dùng kiểm tra lại một chức năng đã có bằng chứng thành công, trừ khi có thay đổi mới, xuất hiện hồi quy hoặc cần xác nhận cấu hình của một môi trường khác.


---

XIX. LỆNH BẮT ĐẦU THỰC THI

Bắt đầu ngay bằng các việc sau:

1. Kiểm tra repository, branch, commit và working tree.
2. Xác minh URL Preview đang chạy commit nào.
3. Kiểm tra các ảnh tham chiếu thật và mở chúng để xem trực tiếp.
4. Đọc code frontend, xác định những quy tắc cũ đang cản trở thiết kế mới.
5. Chụp ảnh hiện trạng Preview bằng Playwright.
6. So sánh giao diện hiện tại với ảnh mẫu.
7. Lập danh sách khác biệt theo mức độ ưu tiên.
8. Bắt đầu sửa trực tiếp những vấn đề đã xác định được.
9. Tái cấu trúc hoặc viết lại phần frontend cần thiết nếu các bản vá nhỏ không thể đạt thiết kế mục tiêu.
10. Chạy lại kiểm thử, chụp ảnh sau sửa và đối chiếu trực quan.
11. Lặp lại cho đến khi đạt tiêu chí nghiệm thu hoặc gặp trở ngại thực sự.
12. Cập nhật manifest, bằng chứng, commit và báo cáo tiến độ thực tế.

Mệnh lệnh cuối cùng

Không làm website mới theo tư duy bảo toàn giao diện cũ. Hãy làm website mới theo ảnh mẫu, đồng thời bảo toàn logo, thương hiệu, sản phẩm thật và các hợp đồng chức năng cần thiết.

Nếu một thành phần giao diện cũ không giúp đạt mục tiêu thiết kế và cũng không phải hợp đồng chức năng cần bảo toàn, được phép sửa, thay thế hoặc loại bỏ sau khi đánh giá tác động.

Không để các giới hạn CSS, font chữ, cấu trúc HTML hoặc cách bố trí cũ cản trở kết quả thiết kế.

Không chỉ viết hướng dẫn để người dùng tự làm. Hãy chủ động thực hiện những gì có thể thực hiện bằng quyền truy cập hiện có.

Không giả vờ đã chạy test, không làm giả ảnh chụp, không tuyên bố đạt 100% khi chưa đủ bằng chứng.

Ưu tiên cao nhất: ĐẠT ĐÚNG THIẾT KẾ MẪU — GIỮ NGUYÊN LOGO, THƯƠNG HIỆU, SẢN PHẨM — KIỂM THỬ BẰNG CHỨNG THẬT — CHỈ LÀM VIỆC TRONG PREVIEW VÀ NHÁNH FIX — KHÔNG ĐỘNG ĐẾN PRODUCTION.


---

XX. QUY TRÌNH QUẢN LÝ NGỮ CẢNH — GIÚP AI HIỂU ĐÚNG, KHÔNG NHIỄU THÔNG TIN

Mục tiêu của phần này là để AI ở bất kỳ cuộc chat nào cũng tiếp quản đúng nhiệm vụ, không bị lẫn giữa prompt cũ, báo cáo cũ, nhánh khác hoặc suy đoán của AI. Phần này được tích hợp trực tiếp vào prompt handoff; không tạo thêm một file bổ sung chỉ để lặp lại các quy tắc dưới đây.

1. NGUYÊN TẮC ĐỌC TÀI LIỆU THEO TỪNG LỚP

Không đọc tràn lan tất cả file cùng lúc. Đọc theo thứ tự:

Lớp 1 — Prompt này:
- Đọc prompt handoff này để hiểu mục tiêu, quyền được phép, điều cấm và tiêu chí nghiệm thu.
- Prompt này quy định nhiệm vụ website công khai; không tự áp dụng nó cho công việc Admin hoặc dự án khác.
- Không tự rút gọn, viết lại hoặc thay thế các yêu cầu bắt buộc bằng bản tóm tắt của AI.

Lớp 2 — Trạng thái hiện tại:
- Xác minh branch, commit mới nhất, working tree, các thay đổi chưa commit, Preview URL và trạng thái workflow.
- Đọc báo cáo trạng thái mới nhất nếu có, nhưng xem đó là thông tin định hướng cần đối chiếu, không phải bằng chứng tự xác thực.
- Nếu không có file trạng thái chuyên biệt, tự tổng hợp trạng thái từ GitHub, CI, Preview và các bằng chứng hiện có; không tạo file trạng thái mới nếu chưa cần thiết.

Lớp 3 — Tài liệu đúng với việc sắp làm:
- Chỉ đọc những file mã nguồn, ảnh tham chiếu, test, log hoặc tài liệu có liên quan trực tiếp đến hạng mục hiện tại.
- Mở rộng việc đọc khi phát hiện dependency hoặc hợp đồng chức năng liên quan.
- Không nạp toàn bộ lịch sử, mọi báo cáo và mọi file trong repository vào ngữ cảnh nếu chúng không giúp giải quyết nhiệm vụ hiện tại.
- Không bỏ qua tài liệu bắt buộc chỉ vì muốn làm nhanh.

2. PHÂN LOẠI THÔNG TIN — KHÔNG ĐƯỢC COI MỌI FILE LÀ NGANG QUYỀN

Trước khi sử dụng thông tin, xác định nó thuộc loại nào:

A. Quy tắc, giới hạn và tiêu chí nghiệm thu còn hiệu lực.
B. Yêu cầu bổ sung đã được người dùng xác nhận.
C. Trạng thái kỹ thuật cần kiểm tra lại (branch, commit, Preview, workflow, test).
D. Báo cáo hoặc nhận định cũ.
E. Giả thuyết, đề xuất hoặc suy luận của AI.

Không trình bày loại D hoặc E như sự thật đã được xác minh. Không để một báo cáo cũ ghi đè trạng thái GitHub/Preview mới hơn. Không để bản tóm tắt của AI thay thế prompt nguồn.

Nếu hai nguồn mâu thuẫn:
1. Xác định chính xác hai nội dung mâu thuẫn và nguồn của chúng.
2. Kiểm tra ngày, commit, nhánh và bằng chứng liên quan.
3. Áp dụng yêu cầu mới của người dùng chỉ cho phạm vi mà người dùng thực sự thay đổi; các giới hạn khác vẫn giữ nguyên.
4. Không tự suy ra quyền sửa Production, dữ liệu thật, secrets, binding hoặc phạm vi Admin từ một yêu cầu thiết kế giao diện.
5. Nếu mâu thuẫn ảnh hưởng đáng kể đến tính đúng đắn hoặc an toàn và không thể giải quyết bằng bằng chứng, ghi rõ điểm chưa chắc chắn và chỉ hỏi người dùng về quyết định thực sự cần thiết. Trong lúc đó, tiếp tục các phần độc lập an toàn.

3. KIỂM TRA HIỂU ĐÚNG TRƯỚC KHI SỬA

Trước khi thực hiện thay đổi lớn hoặc thay đổi cấu trúc, tự lập bản tóm tắt nội bộ ngắn gồm:
- Nhiệm vụ hiện tại và phạm vi được phép.
- Branch, commit và Preview đã xác minh.
- Những điều bắt buộc bảo toàn.
- Những file hoặc thành phần dự kiến thay đổi và lý do.
- Các tiêu chí nghiệm thu, test cần chạy và bằng chứng cần thu thập.
- Những điều chưa xác minh hoặc có rủi ro.

Đối chiếu bản tóm tắt này với prompt và repository. Đây là bước tự kiểm tra của AI, không phải lý do bắt người dùng xác nhận lại những thông tin đã rõ.

Không bắt đầu thay đổi lớn nếu bản tóm tắt đang nhầm nhiệm vụ, nhánh, môi trường hoặc ranh giới an toàn.

4. LÀM VIỆC THEO CÁC HẠNG MỤC NHỎ CÓ THỂ KIỂM CHỨNG

Mỗi hạng mục phải có:
- Mục tiêu cụ thể.
- Phạm vi file/thành phần liên quan.
- Điều kiện hoàn thành có thể quan sát.
- Test hoặc cách xác minh tương ứng.
- Kết quả thực tế và đường dẫn bằng chứng.

Ưu tiên vòng lặp: kiểm tra → thay đổi có mục tiêu → chạy test phù hợp → xem kết quả thật → cập nhật trạng thái. Không sửa nhiều khu vực không liên quan trong một lần chỉ để giảm số lượt thao tác.

Nếu một test thất bại, đọc lỗi và xác định nguyên nhân trước khi sửa. Không tự hạ tiêu chuẩn, xóa test hoặc dùng mock để tuyên bố nghiệm thu thực tế.

5. QUẢN LÝ NGUỒN SỰ THẬT VÀ BẰNG CHỨNG

- GitHub commit xác nhận nội dung đã commit; không tự chứng minh website Preview đang phục vụ commit đó.
- Workflow PASS chỉ chứng minh những bước thực sự được workflow chạy; không tự chứng minh giao diện giống ảnh mẫu.
- HTTP 200 chỉ chứng minh phản hồi HTTP; không chứng minh chức năng và hình ảnh đúng.
- Ảnh chụp chỉ là bằng chứng cho đúng URL, commit/triển khai, route, viewport, theme và thời điểm đã ghi nhận.
- Kết quả từ Preview khác không được dùng thay bằng chứng của Preview đang nghiệm thu.
- Kết quả của nhánh Admin không được gán cho nhánh website công khai, và ngược lại.
- Khi chưa chạy được test, ghi rõ “chưa kiểm thử” hoặc “bị chặn”, nêu nguyên nhân; không ghi PASS.
- Chỉ báo phần trăm tiến độ dựa trên tiêu chí đã hoàn thành và bằng chứng, không dựa trên cảm giác hoặc số lượng file đã sửa.

6. CHUYỂN TIẾP GIỮA CÁC CUỘC CHAT

Khi chuẩn bị bàn giao:
- Cập nhật tài liệu trạng thái hiện có nếu có và thuộc phạm vi được phép.
- Ghi branch, commit mới nhất, Preview đã xác minh, workflow/test gần nhất và kết quả.
- Ghi việc đã hoàn thành kèm bằng chứng.
- Ghi việc chưa xong, lỗi hiện tại, nguyên nhân đã biết và bước tiếp theo cụ thể.
- Ghi những quyết định người dùng đã xác nhận và giới hạn vẫn còn hiệu lực.
- Không sao chép toàn bộ prompt này sang một file mới.
- Không tạo nhiều bản handoff trùng nhau hoặc để các bản tóm tắt trở thành nguồn chỉ dẫn cạnh tranh.
- Nếu cần file hướng dẫn chat tiếp theo, file đó chỉ nên trỏ về prompt này và trạng thái hiện hành, đồng thời nêu đúng nhánh/nhiệm vụ; không tự viết lại các quy tắc gốc theo cách có thể làm mất nghĩa.

Khi bắt đầu chat mới, không tin mù quáng vào phần bàn giao. Đọc prompt nguồn này, xác minh trạng thái GitHub mới nhất, rồi chỉ truy xuất các bằng chứng cần cho bước tiếp theo.

7. KHÔNG LÀM LẪN CÁC NHIỆM VỤ ĐỘC LẬP

Prompt này chỉ điều khiển nhiệm vụ website công khai trong phạm vi đã nêu. Nếu repository đồng thời có công việc Admin, AI phân loại ảnh, import ZIP hoặc dự án khác:
- Không tự đưa các nhiệm vụ đó vào phạm vi hiện tại.
- Không trộn trạng thái, test, ảnh chụp, commit hoặc kết quả giữa các nhiệm vụ.
- Có thể ghi nhận một dependency hoặc phát hiện liên quan, nhưng chỉ sửa khi thuộc phạm vi cho phép.
- Không chờ công việc độc lập khác hoàn thành nếu hạng mục hiện tại có thể tiếp tục an toàn.
- Không sao chép, merge hoặc cherry-pick code giữa các nhánh khi chưa được người dùng cho phép.

8. CẬP NHẬT PROMPT MÀ KHÔNG LÀM MẤT NGUỒN CHUẨN

Khi người dùng đưa ra yêu cầu bổ sung:
- Thêm trực tiếp vào phần phù hợp của prompt handoff này nếu đó là quy tắc lâu dài hoặc tiêu chí của nhiệm vụ.
- Nếu yêu cầu thay đổi một quy tắc cũ, ghi rõ phần nào được thay thế và phạm vi thay thế; không âm thầm xóa các giới hạn không liên quan.
- Không tạo file bổ sung riêng chỉ để lặp lại phần thay đổi.
- Không xóa hoặc ghi đè prompt nguồn nếu người dùng chưa yêu cầu.
- Sau khi cập nhật, đọc lại nội dung đã lưu trên đúng branch để xác minh thay đổi thực sự tồn tại.
- Nếu cập nhật bị lỗi hoặc không có quyền ghi, báo rõ là chưa cập nhật; tuyệt đối không tuyên bố đã hoàn thành khi chưa xác minh.

Mệnh lệnh cuối của phần quản lý ngữ cảnh:
HÃY ĐỌC ĐÚNG NGUỒN, XÁC MINH TRẠNG THÁI, CHỈ NẠP THÔNG TIN CẦN THIẾT, PHÂN BIỆT BẰNG CHỨNG VỚI SUY ĐOÁN, VÀ CẬP NHẬT BÀN GIAO TẠI NGUỒN CHUẨN. MỤC TIÊU LÀ GIÚP AI HIỂU ĐÚNG VÀ TIẾP TỤC ĐƯỢC CÔNG VIỆC, KHÔNG PHẢI TẠO THÊM NHIỀU FILE PROMPT TRÙNG LẶP.


XXI. BÀN GIAO TRẠNG THÁI THỰC TẾ CHO CHAT MỚI — CẬP NHẬT 2026-10-20

Đây là phần bàn giao trạng thái mới nhất của nhiệm vụ WEBSITE TĨNH. Khi có khác biệt giữa ghi chú cũ và bằng chứng mới bên dưới, hãy xác minh manifest/workflow mới nhất và ưu tiên bằng chứng có thời gian mới hơn. Không xóa lịch sử cũ.

### A. Phạm vi và ranh giới
- Repository: `chichute5500/Sindarealest-admin`.
- Nhánh làm việc được phép: `fix/liquid-glass-audit-2026-10-19`.
- Preview cần kiểm tra: `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/`.
- Production: `https://sindarealest2.pages.dev` — TUYỆT ĐỐI không merge/deploy, không đổi cấu hình Production, DNS, secrets, bindings, D1/R2 hoặc dữ liệu thật.
- Chỉ xử lý website công khai/static storefront. Không sửa giao diện Admin trong nhiệm vụ này; không trộn với AI grouping, ZIP import hoặc công việc độc lập khác.
- Người dùng yêu cầu: tiếp tục chạy và chỉ báo cáo tiến độ; không tự dừng giữa chừng. Chỉ dừng để hỏi khi thực sự cần người dùng thao tác hoặc cần quyết định thay đổi ngoài phạm vi đã duyệt. Báo cáo ngắn, có bằng chứng, rồi tiếp tục bước kế tiếp.

### B. Bằng chứng đã xác minh gần nhất
- Workflow live Preview + screenshot comparison: [GitHub Actions run 39425677039](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39425677039) — SUCCESS.
- Preview deployment được xác minh: `1ab8617f-aac1-42f2-9112-4acc6b0d007a`, branch `fix/liquid-glass-audit-2026-10-19`, source commit `37163dc3c17af332f948311bc395c9839a10e345`.
- Ảnh live baseline: `docs/website-screenshots/start-of-work/` — 66 ảnh.
- Ảnh live sau công việc: `docs/website-screenshots/end-of-work/` — 66 ảnh.
- Pixel comparison: 66 cặp; 57 cặp giống hệt, 9 cặp khác biệt, 0 mismatch kích thước, 0 cặp thiếu hoặc PNG không hợp lệ.
- Live Playwright audit: 8/8 cặp viewport/theme PASS; kiểm tra mở chi tiết từ thẻ sản phẩm, mở trực tiếp canonical URL và reload PASS; không ghi nhận horizontal overflow, page/console errors hoặc hành động ghi dữ liệu ngoài ý muốn.
- Manifest nguồn sự thật: `docs/website-screenshots/manifest.json`. Báo cáo audit: `docs/visual-audit-progress-2026-10-19.md`.

### C. Hai ảnh mẫu gốc phải được đối chiếu
- Mobile Light: `docs/static-web-reference/file_0000000017088207af45f5e6dd90cfa4.png`.
- Mobile Dark: `docs/static-web-reference/file_00000000fcb48207a23aeda23caa5eeb.png`.
- Hướng dẫn tham chiếu: `docs/static-web-reference/README.md`.
- Không tráo vai trò Light/Dark. Ảnh trước/sau chỉ xác định phần nào đã thay đổi; nó KHÔNG chứng minh giao diện đã giống mẫu.

### D. Việc chưa hoàn thành — bắt đầu tại đây
1. Mở và kiểm tra trực tiếp hai ảnh mẫu gốc và ảnh cuối tương ứng ở cả Light/Dark trên mobile. Không chỉ đọc pixel-diff summary.
2. Đánh giá khác biệt bố cục, tỷ lệ, khoảng cách, font, màu, nền/ảnh, các thẻ/ô nội dung và thứ tự thị giác. Tách biệt lỗi layout thực sự với thay đổi ảnh sản phẩm do carousel autoplay.
3. Đặc biệt kiểm tra khác biệt nhỏ ở product-detail desktop-Light; xác định xem đó là khác biệt thiết kế hay trạng thái/ảnh động trước khi sửa.
4. Nếu cần chỉnh giao diện, thực hiện thay đổi nhỏ nhất nhưng đủ để hướng đến ảnh mẫu; được phép tái thiết kế frontend theo các nguyên tắc của prompt này. Không thay đổi business logic/API, dữ liệu sản phẩm, URL/SKU/ảnh nguồn, backend hoặc Admin ngoài phạm vi.
5. Chạy kiểm tra source/tests và workflow Playwright Preview sau mỗi nhóm thay đổi. Chụp lại đúng viewport/theme/route, so sánh với ảnh mẫu và baseline, xem kết quả mới nhất. Giữ lại bằng chứng và cập nhật manifest + báo cáo + prompt này.
6. Lặp lại cho đến khi không còn khác biệt thiết kế trọng yếu đã xác minh và các test liên quan PASS. Không tuyên bố 100% nếu chưa có đánh giá trực quan có căn cứ.

### E. Cách tiếp tục trong chat mới
- Trước hết đọc prompt này, `docs/visual-audit-progress-2026-10-19.md`, `docs/website-screenshots/manifest.json`, hai README tham chiếu và PR/workflow hiện tại.
- Xác minh branch HEAD, PR #108, Preview deployment identity và workflow run mới nhất trước khi sửa; đừng dựa mù quáng vào SHA cũ.
- Dùng GitHub Actions/Cloudflare Pages Preview và Playwright; người dùng làm việc trên Android nên không yêu cầu họ chạy Wrangler cục bộ.
- Tiến độ phần kiểm thử kỹ thuật: capture/so sánh tự động đã hoàn tất. Nghiệm thu thiết kế cuối cùng vẫn PENDING human visual review. Không dùng lại con số tiến độ cũ nếu chưa tính lại theo các hạng mục hiện tại.
- Sau mỗi lượt: ghi rõ đã làm gì, test nào PASS/FAIL, link run/commit, phần còn thiếu và tiến độ ước tính có căn cứ; sau đó tiếp tục bước tiếp theo nếu không cần người dùng quyết định.

MỆNH LỆNH TIẾP QUẢN: KHÔNG LẶP LẠI CÁC BƯỚC ĐÃ PASS NẾU KHÔNG CÓ REGRESSION. ĐI THẲNG VÀO VIỆC CÒN THIẾU LÀ ĐỐI CHIẾU THỊ GIÁC VỚI ẢNH MẪU, SỬA ĐÚNG KHÁC BIỆT ĐÃ XÁC MINH, CHẠY LẠI PLAYWRIGHT, VÀ CẬP NHẬT BÀN GIAO.


## CẬP NHẬT BÀN GIAO MỚI NHẤT CHO CHAT TIẾP THEO — 2026-10-21

Đây là trạng thái mới hơn các ghi chú cũ ở phía trên. Khi có mâu thuẫn, ưu tiên xác minh live từ GitHub Actions, manifest và branch HEAD hiện tại; không dùng trạng thái lịch sử như thể còn là hiện trạng.

### 1. Phạm vi và giới hạn bắt buộc
- Chỉ tiếp tục **website tĩnh công khai SinDarealest2** trên nhánh `fix/liquid-glass-audit-2026-10-19` trong repo `chichute5500/Sindarealest-admin`.
- Không làm phần Admin trong nhiệm vụ này. Không merge PR, không đẩy thay đổi sang `main`, không deploy/đụng Production, không sửa Cloudflare Access policy, bindings, secrets, D1/R2 hoặc dữ liệu thật nếu người dùng chưa cho phép rõ ràng.
- Không tự ý sửa giao diện chỉ vì có pixel difference. Trước hết phân biệt thay đổi do carousel tự chạy với khác biệt layout/typography/spacing thực sự. Bảo toàn logo, thương hiệu, danh tính sản phẩm, SKU, dữ liệu và URL ảnh hiện hữu. Người dùng đã cho phép thay đổi font chữ và tái thiết kế UI để bám ảnh mẫu; không được viện cớ giao diện cũ để từ chối cải tiến, nhưng vẫn giữ nguyên chức năng và hợp đồng nghiệp vụ/API.
- Người dùng làm việc chủ yếu trên Android; dùng GitHub Actions + Cloudflare Pages Preview + Playwright, không yêu cầu chạy Wrangler cục bộ.

### 2. Bằng chứng mới nhất đã xác minh
- Branch: `fix/liquid-glass-audit-2026-10-19`.
- PR #108: https://github.com/chichute5500/Sindarealest-admin/pull/108 — chưa được merge theo trạng thái được kiểm tra gần nhất; xác minh lại trước mọi hành động.
- Live Preview: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/ .
- Workflow live capture/comparison: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39425677039 — SUCCESS.
- Preview deployment đã xác minh cho ảnh end-of-work: `1ab8617f-aac1-42f2-9112-4acc6b0d007a`, branch đúng là nhánh fix, source commit `37163dc3c17af332f948311bc395c9839a10e345`.
- Ảnh chuẩn: `docs/website-screenshots/start-of-work/` = 66 ảnh; `docs/website-screenshots/end-of-work/` = 66 ảnh. Cả hai là ảnh live Preview read-only đã xác minh, không phải local fixture.
- Pixel comparison: 66 cặp; 57 cặp pixel-identical, 9 cặp có khác biệt, 0 sai kích thước, 0 cặp thiếu/không hợp lệ.
- Live Playwright audit: 8/8 cặp viewport/theme PASS; product-card navigation, direct-open canonical product route và reload PASS; không ghi nhận horizontal overflow, page error, console error hoặc read-only violation.
- Manifest: `docs/website-screenshots/manifest.json`, status hiện tại `AWAITING_HUMAN_VISUAL_REVIEW`. Đây là trạng thái đúng: CI/capture/diff thành công không đồng nghĩa giao diện đã giống ảnh mẫu 100%.

### 3. Những khác biệt cần đánh giá trước khi sửa
- Bốn ảnh full-page trang chủ và bốn ảnh collection khác nhau vì carousel tự chạy sang ảnh sản phẩm khác. Trước khi gọi là lỗi, kiểm tra xem cấu trúc, kích thước, vị trí và kiểu hiển thị có ổn định không. Nếu cần so sánh pixel chính xác, thiết lập trạng thái carousel ổn định trong test/capture mà không thay đổi trải nghiệm người dùng một cách không cần thiết.
- Một ảnh product-detail desktop-Light có khác biệt nhỏ; cần mở ảnh và xác định khác biệt thực sự trước khi sửa.
- Đối chiếu trực tiếp giao diện cuối với hai ảnh mẫu gốc:
  - `docs/static-web-reference/file_0000000017088207af45f5e6dd90cfa4.png`
  - `docs/static-web-reference/file_00000000fcb48207a23aeda23caa5eeb.png`
- Pixel diff start/end chỉ xác định nội dung thay đổi, không đo mức độ giống ảnh mẫu. Không tuyên bố đạt 100% nếu chưa có visual review có căn cứ.

### 4. Tài liệu và hồ sơ tiến độ
- Hướng dẫn archive: `docs/website-screenshots/README.md`.
- Manifest nguồn sự thật: `docs/website-screenshots/manifest.json`.
- Báo cáo tiến độ đã được cập nhật bổ sung kết quả workflow mới: `docs/visual-audit-progress-2026-10-19.md`.
- Commit cập nhật báo cáo: https://github.com/chichute5500/Sindarealest-admin/commit/d57d8882cfaafa12e7c7242a6a8228df1d5df7d4 .
- Hai ảnh mẫu: `docs/static-web-reference/`; không sao chép ảnh mẫu vào thư mục start/end.

### 5. Việc tiếp theo — bắt đầu ngay, không lặp test đã PASS
1. Xác minh branch HEAD, trạng thái PR #108, manifest và workflow mới nhất; kiểm tra xem có commit mới hơn mốc nêu trên không.
2. Mở và kiểm tra trực quan ảnh tham chiếu và ảnh end-of-work (ưu tiên mobile Light, mobile Dark, desktop Light/Dark, hero, sáu ô, product card/detail, order section và footer). Dùng artifact/ảnh đã lưu hoặc chạy workflow capture nếu ảnh không truy cập được; không giả vờ đã nhìn ảnh nếu chỉ đọc metadata.
3. Ghi danh sách sai khác cụ thể theo mức độ: blocking, lớn, nhỏ, không phải lỗi (carousel). Chỉ sửa những khác biệt được chứng minh; không thay đổi phạm vi Admin/backend.
4. Sau sửa, chạy validate source/tests và live Preview Playwright trên đúng branch. Capture ảnh end-of-work mới, cập nhật manifest/report để khớp commit/deployment mới nhất, rồi xem lại ảnh sau sửa.
5. Tiếp tục vòng lặp sửa → test → capture → đối chiếu cho đến khi không còn sai khác thiết kế đã xác minh hoặc gặp blocker cần người dùng thao tác/ra quyết định. Nếu gặp blocker cần token/secret hoặc cần quyết định đổi hướng thiết kế, dừng đúng chỗ đó và hỏi người dùng; không yêu cầu họ lặp lại thao tác đã hoàn tất.

### 6. Báo cáo và phần trăm
- Mỗi lần báo cáo phải nêu: phần trăm ước tính kèm tiêu chí, việc đã làm, link commit/run, kết quả PASS/FAIL, phần còn thiếu và bước kế tiếp.
- Tỷ lệ kỹ thuật capture/Playwright/diff đã hoàn thành; phần còn lại chủ yếu là visual review theo ảnh mẫu, xử lý khác biệt đã xác minh và xác nhận hồi quy sau sửa. Không dùng số 62% cũ nếu chưa tính lại theo checklist hiện tại. Không tuyên bố 100% chỉ vì workflow SUCCESS.
- Người dùng đã yêu cầu: tiếp tục làm và chỉ báo cáo tiến độ, không dừng giữa chừng; chỉ dừng để hỏi khi cần người dùng thao tác hoặc cần ý kiến về thay đổi thiết kế/phạm vi. Khi gửi báo cáo, nếu vẫn còn bước tự thực hiện được thì tiếp tục ngay sau đó.

**MỆNH LỆNH TIẾP QUẢN:** Bắt đầu từ mục 5. Không quay lại kiểm tra CRUD Admin, không sửa Admin, không merge PR và không đụng Production. Chỉ tiếp tục frontend website tĩnh, bằng chứng live Preview và đối chiếu ảnh mẫu.


---

## XXII. YÊU CẦU BỔ SUNG — ICON ĐỘNG VÀ HIỆU ỨNG GIỎ HÀNG LIQUID GLASS (2026-10-22)

Phần này bổ sung yêu cầu tương tác mới cho WEBSITE TĨNH. Không thay thế các ranh giới an toàn, tiêu chí ảnh mẫu, quy trình Preview/Playwright hay nhiệm vụ còn dang dở ở các phần trước. Khi có mâu thuẫn, giữ nguyên giới hạn bảo vệ dữ liệu/Production và xác minh trạng thái thực tế trước khi sửa.

### 1. Quy chuẩn hình ảnh
- Ngôn ngữ thiết kế: Luxury Minimalism + Apple Liquid Glass; icon nét mảnh, nhất quán; bề mặt kính trong/mờ vừa phải, viền sáng và chiều sâu/khúc xạ tiết chế.
- Màu đã chốt: nền kính sáng `#eaf3fb`, icon/chữ chính `#142a3c`, màu nhấn `#5c91b9`; trái tim màu đỏ khi sản phẩm đã được yêu thích.
- Không dùng ripple. Phản hồi nhấn ưu tiên kính lún nhẹ + chuyển màu; khi thả, hiệu ứng nhấn trở về trạng thái bình thường.
- Không để icon chạy liên tục nếu không có lý do chức năng. Ưu tiên animation ngắn, mượt, hiệu năng tốt và tôn trọng `prefers-reduced-motion`.

### 2. Quy tắc trạng thái
- Icon điều hướng trái/phải: nhấn thì đổi sắc/lún nhẹ, thả thì hiệu ứng trở về; ảnh/nội dung đã chuyển không được tự quay lại.
- Yêu thích: trái tim màu mặc định khi chưa thích; chuyển đỏ khi đã thích; trở về mặc định khi bỏ thích. Trạng thái phải khớp chức năng/dữ liệu thực tế.
- Giỏ hàng: huy hiệu số lượng phải phản ánh giỏ hàng thật và cập nhật khi thêm/xóa/thay đổi số lượng. Chỉ báo thêm thành công khi thao tác thực sự thành công; thất bại phải có phản hồi phù hợp.
- Các icon khác (tìm kiếm, menu, tài khoản, lọc, đóng, xem ảnh, tăng/giảm số lượng...) dùng animation tương ứng chức năng; không tạo hành động giả hoặc trạng thái chỉ tồn tại ở lớp hình ảnh.

### 3. Hiệu ứng dùng chung “sản phẩm bay vào giỏ hàng”
- Mọi điểm vào thao tác thêm giỏ hàng trên website (thẻ sản phẩm/listing, trang chi tiết, gallery hoặc khu vực khác có chức năng thêm) phải dùng chung một cơ chế animation, hướng đến icon giỏ hàng trên header.
- Điểm xuất phát là vị trí sản phẩm/ảnh mà người dùng vừa thao tác; điểm đích là vị trí thực tế của icon giỏ hàng trên header ở viewport hiện hành.
- Tạo bản sao trực quan (clone/overlay) để animation; không thu nhỏ, di chuyển hoặc làm nhảy bố cục của thẻ/trang chi tiết gốc.
- Bản sao bắt buộc dùng ĐÚNG ảnh đang hiển thị tại thời điểm nhấn, kể cả ảnh thứ hai/mặt sau trong gallery; phải gắn với đúng product ID/SKU và đúng biến thể đã chọn nếu hệ thống hỗ trợ. Không dùng ảnh mặc định hoặc ảnh của sản phẩm khác.
- Chuyển động theo đường cong mượt, thu nhỏ dần; thời lượng mục tiêu ban đầu 0,6–0,9 giây, chỉ tinh chỉnh sau khi đo trên Preview. Khi đến nơi, icon giỏ hàng nảy nhẹ, huy hiệu cập nhật và thông báo xác nhận chỉ hiện sau khi add thành công.
- Animation không được tự gọi thao tác thêm lần thứ hai, làm nhân đôi sản phẩm, tạo sai quantity hoặc phụ thuộc vào animation để hoàn tất nghiệp vụ. Nếu animation bị lỗi/không thể chạy, thao tác giỏ hàng vẫn phải đúng.
- Xử lý nhiều lần nhấn nhanh, ảnh chưa tải xong, ảnh lỗi, scroll, resize, mobile/desktop, header sticky/di động và reduced-motion một cách an toàn. Với reduced-motion, dùng phản hồi tĩnh/nhẹ thay vì bắt buộc chuyển động bay.
- Phân biệt rõ thao tác “thêm vào giỏ” với thao tác “mở giỏ”: chỉ hành động thêm hàng mới chạy hiệu ứng bay vào; nhấn icon giỏ hàng chỉ mở giỏ, không được tự thêm hàng.

### 4. Trình tự khoa học bắt buộc — không phá vỡ công việc hiện tại
Không sửa ngay chỉ vì đã có đặc tả. Thực hiện tuần tự, mỗi giai đoạn có bằng chứng và điểm kiểm tra:
1. **Xác minh phạm vi:** kiểm tra repository, branch HEAD, PR, source commit/working tree, Preview URL/deployment identity, workflow mới nhất và thay đổi đang dang dở. Chỉ làm trên `fix/liquid-glass-audit-2026-10-19`; nếu trạng thái không khớp, điều tra trước, không chuyển nhánh/đè thay đổi.
2. **Đọc và bảo toàn baseline:** đọc prompt này, `docs/icon-system-inventory.md`, handoff và manifest; kiểm tra `public/index.html` cùng CSS/JS liên quan. Chụp/đọc giao diện Preview hiện tại trước khi sửa. Không coi inventory cũ là danh mục runtime hoàn chỉnh nếu chưa xác minh.
3. **Lập bản đồ tương tác:** liệt kê mọi điểm thêm giỏ hàng, cách xác định product/image/variant, header cart target, trạng thái yêu thích, badge, toast và các test hiện có. Xác định logic hiện tại để tái sử dụng; không tạo cơ chế thứ hai nếu đã có.
4. **Chia nhỏ và đánh giá rủi ro:** đề xuất diff tối thiểu theo nhóm độc lập; xác định hồi quy có thể xảy ra. Không thay đổi business logic/API, schema, backend, dữ liệu sản phẩm, URL/SKU/ảnh nguồn, cấu hình hạ tầng hoặc Admin.
5. **Kiểm thử trước/đặt tiêu chí:** bổ sung hoặc cập nhật test cho trạng thái icon, mọi điểm thêm hàng, ảnh gallery đang chọn, đúng biến thể, quantity không nhân đôi, add lỗi, click liên tiếp, responsive và reduced-motion. Không bỏ qua test sẵn có.
6. **Triển khai từng lát nhỏ:** trước hết trạng thái icon cơ bản; tiếp theo heart/cart badge/toast; sau đó cơ chế fly-to-cart dùng chung. Chỉ bắt đầu lát tiếp theo khi lát trước không gây regression. Giữ diff hẹp, không viết lại toàn bộ file, không xóa code/feature không liên quan.
7. **Xác minh mỗi lát:** chạy source validation/tests và Playwright trên Preview đúng branch; kiểm tra console/page errors, layout overflow, chức năng giỏ hàng và ảnh chụp trước/sau. Đối chiếu mobile/desktop và Light/Dark nếu giao diện hỗ trợ. Nếu test fail, sửa nguyên nhân và chạy lại.
8. **Nghiệm thu hình ảnh:** chứng minh clone dùng đúng ảnh đang hiển thị và bay tới đúng header cart; xác minh trang gốc không di chuyển, quantity chỉ đổi đúng một lần, thông báo đúng kết quả. Ghi link workflow/artifact và SHA thực tế.
9. **Cập nhật bàn giao:** cập nhật prompt này, `docs/icon-system-inventory.md`, `START-HERE.md`, `LATEST-STATUS.md` và kết quả test/manifest liên quan theo mức cần thiết; ghi rõ đã làm/chưa làm, PASS/FAIL/BLOCKED, commit SHA, run/artifact và việc tiếp theo. Đọc lại các file sau khi ghi để xác minh.
10. **Không tự tuyên bố hoàn thành:** nếu thiếu quyền Preview, ảnh/artifact, test hoặc cần thao tác người dùng, ghi BLOCKED/NOT VERIFIED kèm bằng chứng cụ thể. Không merge PR, không đẩy sang main, không deploy Production.

### 5. Điều kiện nghiệm thu
- [ ] Không mất hoặc phá vỡ chức năng đang tồn tại; thay đổi nhỏ, có lý do và có thể kiểm tra.
- [ ] Icon nhấn có phản hồi kính lún/đổi màu, không ripple; trạng thái chức năng được giữ chính xác.
- [ ] Heart đỏ khi yêu thích và trở về màu mặc định khi bỏ thích.
- [ ] Badge và toast khớp kết quả giỏ hàng thực tế.
- [ ] Tất cả điểm thêm hàng dùng chung hiệu ứng và bay đến đúng icon header.
- [ ] Clone dùng đúng ảnh đang hiển thị, đúng sản phẩm và biến thể được chọn.
- [ ] Trang gốc không dịch chuyển; không add trùng; animation fail không làm fail thao tác mua hàng.
- [ ] Nhiều thao tác nhanh, mobile/desktop, ảnh lỗi/chưa tải và reduced-motion được xử lý.
- [ ] Có bằng chứng Playwright/Preview và ảnh chụp phù hợp; không chỉ dựa vào source review.
- [ ] Mọi giới hạn branch/Production/backend/data vẫn được giữ nguyên.

**Trạng thái lúc ghi yêu cầu:** đây là đặc tả/hướng dẫn triển khai; KHÔNG phải bằng chứng tính năng đã được code hoặc kiểm thử. AI tiếp quản phải xác minh source hiện hành trước khi thay đổi.
