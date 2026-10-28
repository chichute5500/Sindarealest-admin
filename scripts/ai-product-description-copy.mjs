// SinDarealest editorial copy authored in Vietnamese with AI assistance.
// Grounding: product title and public category only. Does not claim image inspection.
const PROFILES = Object.freeze({
  sneakers: {
    kind:'giày thể thao', place:'phong cách năng động có điểm nhấn riêng',
    open:[
      'Một đôi giày thể thao có cá tính riêng có thể thay đổi cảm nhận về cả bộ trang phục.',
      'Không cần quá nhiều chi tiết phô trương, điểm nhấn đúng chỗ vẫn đủ tạo nên phong thái khác biệt.',
      'Trong tủ đồ thường ngày, một đôi giày có dấu ấn riêng luôn tạo ra nhiều lựa chọn phối hợp.',
      'Tinh thần năng động và gu thẩm mỹ cá nhân là hai yếu tố đáng cân nhắc khi chọn giày.',
      'Lựa chọn giày thể thao không chỉ nằm ở kiểu dáng mà còn ở cách sản phẩm đồng hành với phong cách của người mang.'
    ],
    style:[
      'Bạn có thể cân nhắc mẫu này khi kết hợp cùng quần jeans, quần kaki hoặc trang phục tối giản để phần giày trở thành điểm nhấn.',
      'Phong cách phù hợp để tham khảo là những bộ đồ gọn gàng, màu sắc tiết chế, tạo không gian cho điểm nhấn từ đôi giày.',
      'Khi phối cùng áo sơ mi giản dị hoặc áo thun và quần dài, một đôi giày có cá tính giúp tổng thể bớt đơn điệu.',
      'Với những buổi gặp gỡ không quá nghi thức, cách phối giày thể thao cùng trang phục chỉn chu thường đem lại cảm giác thoải mái về thị giác.',
      'Các món đồ cơ bản trong tủ quần áo là nền tốt để làm nổi bật lựa chọn giày mang dấu ấn cá nhân.'
    ],
    detail:[
      'Điểm đáng chú ý nằm ở tinh thần VIP da cá sấu được nêu rõ trong tên mẫu, hướng đến người muốn thể hiện gu riêng.',
      'Tên gọi nhấn vào dòng da cá sấu VIP, phù hợp với người tìm một sắc thái khác biệt cho phong cách thường ngày.',
      'Chi tiết da cá sấu trong tên sản phẩm gợi hướng lựa chọn thiên về dấu ấn chất liệu và vẻ ngoài nổi bật.',
      'Mẫu giày đặt trọng tâm vào hình ảnh một phụ kiện có cá tính, thay vì chỉ làm chi tiết phụ cho trang phục.'
    ],
    check:'Trước khi đặt, hãy đối chiếu cỡ giày và xem kỹ ảnh sản phẩm để chọn phương án phù hợp.'
  },
  loafers: {
    kind:'giày lười',place:'phong thái lịch lãm nhưng linh hoạt',
    open:['Giày lười có thể là điểm giao thoa giữa sự gọn gàng và phong cách thường ngày.',
      'Một thiết kế giày mang dấu ấn chất liệu giúp cách ăn mặc đơn giản trở nên có chủ đích hơn.',
      'Với người yêu trang phục thanh lịch, đôi giày thường là chi tiết hoàn thiện tổng thể.'],
    style:['Bạn có thể tham khảo cách phối cùng quần âu dáng gọn, quần kaki hoặc trang phục đi gặp gỡ.',
      'Khi kết hợp cùng quần dài tối màu và áo sơ mi, điểm nhấn từ giày có cơ hội thể hiện rõ hơn.',
      'Những bộ đồ đơn sắc hoặc ít họa tiết thường là nền phối phù hợp để tôn lên dấu ấn của giày.'],
    detail:['Mẫu giày gợi sự kết hợp giữa cá tính và nét chỉn chu trong lựa chọn phụ kiện.',
      'Tên sản phẩm là thông tin đầu tiên để xác định phong cách, chất liệu và điểm nhấn của mẫu.',
      'Sức hút của giày nằm ở cách nó hoàn thiện trang phục mà không cần nhiều phụ kiện đi kèm.'],
    check:'Bạn nên xem ảnh từng góc và xác nhận cỡ giày trước khi chốt lựa chọn.'
  },
  'dress-shoes': {
    kind:'giày tây',place:'trang phục chỉn chu',
    open:['Giày tây luôn có vai trò rõ rệt trong cách xây dựng hình ảnh lịch lãm.',
      'Phong cách trang trọng thường được tạo nên từ những lựa chọn nhỏ nhưng nhất quán.',
      'Một đôi giày tây có dấu ấn riêng là gợi ý đáng chú ý cho người yêu vẻ ngoài chỉn chu.'],
    style:['Kết hợp cùng quần âu và áo sơ mi là hướng phối dễ hình dung khi chọn giày tây.',
      'Những bộ trang phục trung tính có thể giúp đôi giày trở thành điểm nhấn có chủ đích.',
      'Khi diện blazer hoặc trang phục dự gặp gỡ, bạn có thể cân nhắc mẫu giày này như một lựa chọn tạo dấu ấn.'],
    detail:['Tinh thần của mẫu hướng đến vẻ thanh lịch có cá tính, không phụ thuộc vào sự cầu kỳ của trang phục.',
      'Nét riêng trong tên sản phẩm giúp định hình hướng phối đồ và cách sử dụng trong nhiều dịp.',
      'Chọn giày theo tổng thể trang phục giúp điểm nhấn cá nhân trông hài hòa hơn.'],
    check:'Hãy kiểm tra ảnh chi tiết và cỡ phù hợp để có lựa chọn chính xác.'
  },
  belts: {
    kind:'thắt lưng',place:'trang phục gọn gàng có điểm nhấn',
    open:['Thắt lưng là phụ kiện nhỏ nhưng dễ tạo khác biệt cho tổng thể trang phục.',
      'Một chiếc thắt lưng có dấu ấn chất liệu giúp cách phối đồ đơn giản trở nên chỉn chu hơn.',
      'Khi chọn phụ kiện cho trang phục hằng ngày, thắt lưng thường là chi tiết đáng đầu tư sự chú ý.'],
    style:['Bạn có thể phối cùng quần âu, jeans hoặc kaki theo hướng tối giản để làm rõ điểm nhấn tại phần eo.',
      'Trang phục có tông màu đồng nhất thường giúp chi tiết thắt lưng được chú ý vừa đủ.',
      'Kết hợp cùng giày và đồng hồ theo cùng tinh thần phong cách có thể tạo sự liền mạch cho tổng thể.'],
    detail:['Mẫu hướng đến người yêu chi tiết và muốn tạo nét riêng trong cách chọn phụ kiện.',
      'Điểm nhấn được diễn đạt qua tên sản phẩm, nên đối chiếu ảnh để nhìn rõ từng đặc điểm.',
      'Một lựa chọn thắt lưng phù hợp không chỉ để hoàn thiện trang phục mà còn thể hiện gu thẩm mỹ.'],
    check:'Hãy xác nhận chiều rộng dây, chiều dài và kiểu khóa theo nhu cầu trước khi đặt.'
  },
  sandals: {
    kind:'dép và giày',place:'trang phục thường ngày',
    open:['Một lựa chọn giày dép có cá tính giúp phong cách thường ngày bớt đơn điệu.',
      'Những món đồ sử dụng trong sinh hoạt thường ngày vẫn có thể mang dấu ấn riêng.',
      'Khi muốn phối trang phục nhẹ nhàng mà có điểm nhấn, giày dép là nơi đáng cân nhắc.'],
    style:['Bạn có thể chọn trang phục tối giản để sản phẩm trở thành chi tiết nổi bật.',
      'Các bộ đồ đơn sắc hoặc ít họa tiết là hướng phối phù hợp để tham khảo.',
      'Phong cách giản dị và những phụ kiện được chọn kỹ có thể tạo nên một tổng thể hài hòa.'],
    detail:['Tên mẫu cung cấp manh mối về chất liệu hoặc kiểu dáng để bạn định hướng lựa chọn.',
      'Sự khác biệt đáng quan tâm thường nằm ở phần tạo hình và chất liệu thể hiện trong ảnh thực tế.',
      'Mẫu phù hợp với người muốn thể hiện gu riêng qua những phụ kiện gần gũi.'],
    check:'Vui lòng xem hình từng góc và đối chiếu kích cỡ trước khi đặt.'
  },
  'watch-straps': {
    kind:'dây đồng hồ',place:'phụ kiện cổ tay chỉn chu',
    open:['Thay đổi dây đồng hồ là một cách đơn giản để làm mới cảm nhận về phụ kiện cổ tay.',
      'Một chiếc dây đồng hồ có điểm nhấn riêng có thể nâng tầm tính cá nhân của cách phối phụ kiện.',
      'Phụ kiện cổ tay thường bộc lộ gu thẩm mỹ qua những chi tiết rất nhỏ.'],
    style:['Bạn có thể cân nhắc màu sắc trang phục và thiết kế mặt đồng hồ để tạo sự đồng nhất.',
      'Khi kết hợp cùng áo sơ mi hoặc trang phục tối giản, dây đồng hồ dễ được chú ý hơn.',
      'Những món phụ kiện có tinh thần tương đồng thường tạo nên tổng thể gọn gàng, hài hòa.'],
    detail:['Tên gọi cho thấy hướng thiết kế của dây; hình ảnh thực tế giúp đối chiếu kỹ hơn.',
      'Điểm đáng quan tâm là sự phù hợp giữa chất liệu được mô tả và phong cách mặt đồng hồ.',
      'Mẫu dây dành cho người muốn tạo sự khác biệt tinh tế trên cổ tay.'],
    check:'Cần xác nhận kích thước chốt dây, chiều rộng và khả năng tương thích với đồng hồ trước khi chọn.'
  },
  'phone-cases': {
    kind:'ốp điện thoại',place:'phụ kiện cá nhân',
    open:['Điện thoại là vật dụng gắn với đời sống hằng ngày, nên chiếc ốp cũng có thể thể hiện gu riêng.',
      'Một chiếc ốp có dấu ấn chất liệu giúp phụ kiện công nghệ bớt đơn điệu.',
      'Ngay cả những vật dụng quen thuộc cũng có thể trở thành một phần của phong cách cá nhân.'],
    style:['Bạn có thể phối chiếc ốp cùng túi, ví hoặc những phụ kiện thường mang theo.',
      'Sự đồng nhất giữa ốp điện thoại và những món đồ cá nhân có thể tạo cảm giác chỉn chu.',
      'Một cách chọn phụ kiện có chủ đích giúp đồ dùng hằng ngày mang màu sắc riêng.'],
    detail:['Từ tên sản phẩm, bạn có thể nhận diện định hướng kiểu dáng và điểm nhấn chất liệu.',
      'Mẫu ốp hướng đến trải nghiệm thị giác và lựa chọn phong cách cá nhân.',
      'Các chi tiết trong ảnh nên được đối chiếu với nhu cầu thực tế trước khi đặt.'],
    check:'Hãy cung cấp đúng tên dòng máy và xem rõ ảnh mẫu; không nên suy đoán tính tương thích chỉ từ tên sản phẩm.'
  },
  'vi-nam': {
    kind:'ví nam',place:'phụ kiện mang theo hằng ngày',
    open:['Một chiếc ví nam được chọn kỹ giúp những vật dụng thường ngày mang dấu ấn cá nhân.',
      'Ví nam là phụ kiện nhỏ nhưng thường đồng hành trong nhiều hoàn cảnh.',
      'Gu thẩm mỹ đôi khi được thể hiện qua những vật dụng ít phô trương nhất.'],
    style:['Bạn có thể cân nhắc chiếc ví cùng thắt lưng, giày và các phụ kiện có tinh thần tương đồng.',
      'Phong cách tối giản là cách phù hợp để để chất liệu và hình ảnh của ví được chú ý.',
      'Một chiếc ví có điểm nhấn riêng sẽ dễ trở thành nét nhận diện kín đáo của người dùng.'],
    detail:['Thông tin trong tên mẫu giúp nhận biết cách nhấn chất liệu và cấu trúc được giới thiệu.',
      'Sản phẩm tập trung vào dấu ấn của phụ kiện cá nhân hơn là sự trang trí cầu kỳ.',
      'Chi tiết chất liệu trong tên gọi là điểm để bắt đầu khi so sánh các lựa chọn.'],
    check:'Bạn nên xem ảnh mặt trong và xác nhận số ngăn, kích thước thực tế trước khi lựa chọn.'
  },
  'vi-cam-tay': {
    kind:'ví cầm tay',place:'sự chỉn chu khi mang theo đồ cá nhân',
    open:['Ví cầm tay có thể vừa là vật dụng cá nhân vừa là điểm nhấn trong cách phối đồ.',
      'Một chiếc ví cầm tay có cá tính tạo cảm giác hoàn thiện hơn cho bộ trang phục.',
      'Phụ kiện cầm tay thường được chú ý bởi vẻ ngoài và cách nó xuất hiện cùng trang phục.'],
    style:['Bạn có thể kết hợp với trang phục lịch sự, gọn gàng hoặc những buổi gặp gỡ cần sự chỉn chu.',
      'Khi chọn đồ đơn sắc, một chiếc ví cầm tay có điểm nhấn riêng thường phù hợp để tham khảo.',
      'Màu sắc và phong cách đồng bộ với giày hay thắt lưng giúp tổng thể hài hòa hơn.'],
    detail:['Tên sản phẩm gợi những đặc điểm cần đối chiếu kỹ trong ảnh chi tiết.',
      'Mẫu ví hướng đến người yêu phụ kiện có nét nhận diện rõ ràng.',
      'Việc chọn một chiếc ví phù hợp nên dựa vào cả hình ảnh và nhu cầu mang theo thực tế.'],
    check:'Trước khi đặt, hãy kiểm tra kích thước, các ngăn và kiểu đóng mở trong hình ảnh.'
  },
  clutch: {
    kind:'clutch',place:'các dịp cần sự gọn gàng, lịch lãm',
    open:['Clutch thường là điểm nhấn đáng chú ý khi hoàn thiện một bộ trang phục chỉn chu.',
      'Một mẫu clutch có cá tính có thể tạo sự cân bằng giữa tính gọn gàng và gu thẩm mỹ.',
      'Phụ kiện cầm tay là lựa chọn thú vị cho người muốn thể hiện phong cách qua chi tiết.'],
    style:['Khi kết hợp cùng quần âu và áo sơ mi, clutch có thể là điểm nhấn của tổng thể.',
      'Những bộ đồ có bảng màu tiết chế giúp phụ kiện cầm tay nổi bật đúng mức.',
      'Một hướng phối đáng cân nhắc là để clutch đồng điệu về tinh thần với giày và đồng hồ.'],
    detail:['Tên sản phẩm nêu ra những đặc trưng giúp nhận biết mẫu giữa các lựa chọn khác.',
      'Một chiếc clutch phù hợp có thể góp phần xây dựng hình ảnh gọn gàng, tự tin.',
      'Chi tiết đặc biệt trong tên gọi là cơ sở để xem kỹ ảnh trước khi chọn mua.'],
    check:'Hãy xác nhận kích thước, cách đóng mở và số ngăn thực tế qua ảnh hoặc trao đổi với Shop.'
  },
  'cap-tab-laptop': {
    kind:'cặp và túi công việc',place:'phong cách làm việc chỉn chu',
    open:['Một chiếc cặp có dấu ấn riêng giúp cách mang theo vật dụng công việc trông có chủ đích.',
      'Phụ kiện công việc không chỉ phục vụ nhu cầu mang theo mà còn góp phần tạo phong thái.',
      'Sự gọn gàng và điểm nhấn chất liệu là hai yếu tố đáng cân nhắc khi tìm cặp hoặc túi.'],
    style:['Bạn có thể cân nhắc phối túi cùng trang phục công sở hoặc những bộ đồ lịch sự hằng ngày.',
      'Trang phục đơn giản thường phù hợp để tạo điểm nhấn với phụ kiện có cá tính.',
      'Khi đồng bộ với giày và thắt lưng, chiếc cặp có thể góp phần tạo tổng thể hài hòa.'],
    detail:['Tên mẫu mang thông tin về hướng tạo hình và chất liệu mà người dùng nên tham khảo.',
      'Sản phẩm hướng đến người chú trọng hình ảnh gọn gàng trong những tình huống công việc.',
      'Điểm khác biệt về hình thức nên được xem trực tiếp trong bộ ảnh sản phẩm.'],
    check:'Vui lòng đối chiếu kích thước thực tế và kích cỡ thiết bị cần mang trước khi đặt.'
  },
  mu: {
    kind:'mũ',place:'phong cách nổi bật có tiết chế',
    open:['Mũ có thể thay đổi tinh thần của trang phục chỉ bằng một điểm nhấn nhỏ.',
      'Một chiếc mũ có cá tính riêng là phụ kiện đáng chú ý trong nhiều cách phối đồ.',
      'Phụ kiện đội đầu giúp phong cách thường ngày mang thêm nét nhận diện.'],
    style:['Bạn có thể kết hợp mũ cùng áo thun, áo khoác hoặc trang phục tối giản.',
      'Cách phối ít họa tiết thường giúp điểm nhấn từ chiếc mũ rõ ràng hơn.',
      'Màu sắc trung tính và phụ kiện có dấu ấn chất liệu là hướng phối đáng tham khảo.'],
    detail:['Mẫu mũ hướng đến người yêu nét cá tính qua chi tiết phụ kiện.',
      'Tên sản phẩm là điểm bắt đầu để khám phá đặc điểm của mẫu qua hình ảnh.',
      'Một lựa chọn có điểm nhấn riêng có thể làm phong cách giản dị trở nên thú vị.'],
    check:'Hãy kiểm tra chu vi, kiểu dáng và hình ảnh thực tế trước khi chọn.'
  },
  'tui-deo-cheo': {
    kind:'túi đeo chéo',place:'những bộ trang phục linh hoạt',
    open:['Túi đeo chéo là phụ kiện dễ tạo điểm nhấn cho phong cách thường ngày.',
      'Một chiếc túi có cá tính riêng giúp vẻ ngoài trở nên có chủ đích hơn.',
      'Phụ kiện đeo chéo mang đến một lựa chọn phối đồ giàu dấu ấn cá nhân.'],
    style:['Khi kết hợp cùng trang phục đơn sắc, chiếc túi có thể tạo điểm nhấn rõ nét.',
      'Phong cách thường ngày với áo thun, áo khoác và quần dài là hướng phối đáng tham khảo.',
      'Bạn có thể cân nhắc kết hợp với ví hoặc giày có tinh thần thẩm mỹ tương đồng.'],
    detail:['Mẫu túi gợi cá tính qua tên gọi và các chi tiết trong bộ ảnh sản phẩm.',
      'Lựa chọn túi phù hợp phụ thuộc cả vào hình ảnh và nhu cầu mang theo hằng ngày.',
      'Dấu ấn riêng của mẫu đáng được đối chiếu trong ảnh cận cảnh trước khi quyết định.'],
    check:'Hãy hỏi Shop về kích thước thực tế, dây đeo và không gian bên trong nếu cần.'
  },
  'tui-golf': {
    kind:'túi golf',place:'phụ kiện mang theo có điểm nhấn',
    open:['Túi golf có dấu ấn chất liệu riêng là lựa chọn cho người chú trọng phong cách cá nhân.',
      'Một chiếc túi golf có cá tính giúp hoàn thiện hình ảnh chỉn chu khi mang theo phụ kiện.',
      'Người yêu phong cách khác biệt có thể quan tâm đến những mẫu túi golf mang tên gọi giàu chi tiết.'],
    style:['Khi lựa chọn phụ kiện, bạn có thể ưu tiên sự đồng điệu với trang phục và vật dụng mang theo.',
      'Phong cách gọn gàng với bảng màu tiết chế giúp chiếc túi trở thành điểm nhấn.',
      'Một mẫu túi có nét riêng có thể được kết hợp với những phụ kiện đơn giản để tạo sự cân bằng.'],
    detail:['Thông tin trong tên sản phẩm giúp xác định những chi tiết đáng quan tâm khi xem ảnh.',
      'Sự hiện diện của chiếc túi góp phần thể hiện phong cách trong những lần gặp gỡ.',
      'Bạn nên dựa vào hình ảnh và nhu cầu thật để so sánh giữa các kiểu túi khác nhau.'],
    check:'Hãy kiểm tra kích thước, ngăn chứa và chi tiết khóa trước khi đặt; không suy đoán khả năng chứa bộ gậy.'
  },
  'tui-nu': {
    kind:'túi nữ',place:'phong cách thanh lịch có cá tính',
    open:['Túi xách nữ là một điểm nhấn có thể làm thay đổi cảm nhận về toàn bộ trang phục.',
      'Một chiếc túi có nét riêng giúp việc phối đồ hằng ngày trở nên thú vị hơn.',
      'Phụ kiện cầm tay được chọn kỹ thường phản ánh gu thẩm mỹ của người sử dụng.'],
    style:['Bạn có thể phối cùng váy, áo sơ mi hoặc những bộ đồ tối giản.',
      'Trang phục có bảng màu nền nhẹ nhàng giúp chiếc túi trở thành điểm nhấn.',
      'Sự đồng điệu về tông màu hoặc phong cách với các phụ kiện khác giúp tổng thể hài hòa.'],
    detail:['Tên gọi gợi hướng lựa chọn chất liệu và kiểu dáng, còn ảnh giúp quan sát rõ từng góc.',
      'Một chiếc túi có nét nhận diện giúp phong cách cá nhân trở nên rõ ràng hơn.',
      'Khi chọn phụ kiện nổi bật, sự tiết chế trong những món đồ còn lại thường tạo cân bằng.'],
    check:'Hãy xác nhận kích thước, không gian sử dụng và chi tiết khóa qua ảnh trước khi chọn.'
  }
});
const TRAITS=[
  [/bạch tạng/i,'Tên mẫu nhấn đến phiên bản bạch tạng; bạn nên đối chiếu ảnh để nhận biết sắc độ cụ thể.'],
  [/gù\s*6\s*đỉnh/i,'Chi tiết gù 6 đỉnh được nêu rõ trong tên gọi, tạo một dấu ấn nhận diện đáng chú ý.'],
  [/gai\s*lưng/i,'Điểm nhấn gai lưng cá sấu xuất hiện ngay trong tên sản phẩm, phù hợp với người thích nét cá tính rõ rệt.'],
  [/vảy\s*rồng/i,'Đặc điểm vảy rồng được nhắc đến trong tên sản phẩm, gợi một hướng thẩm mỹ có nét mạnh mẽ.'],
  [/da\s* bụng/i,'Tên gọi đề cập đến phần da bụng cá sấu; bạn có thể xem ảnh cận cảnh để cảm nhận rõ hơn.'],
  [/vây\s*đuôi|đuôi\s*cá\s*sấu/i,'Chi tiết vây hoặc đuôi cá sấu được nhắc đến như điểm đặc trưng của mẫu.'],
  [/liền\s*nguyên\s*tấm/i,'Cụm từ liền nguyên tấm là đặc điểm được giới thiệu trong tên mẫu, nên được đối chiếu ảnh thực tế.'],
  [/khóa\s*số/i,'Tên sản phẩm có nhắc đến khóa số, một chi tiết nên xem rõ hình dáng và cách sử dụng trước khi đặt.'],
  [/khóa\s*độc/i,'Điểm nhấn khóa độc được nêu trong tên, phù hợp để bạn xem kỹ ảnh phụ kiện.'],
  [/(?:2|hai)\s*ngăn/i,'Tên mẫu giới thiệu cấu trúc hai ngăn; hãy xem phần ảnh chi tiết để xác nhận cách bố trí.'],
  [/(?:2|hai)\s*khóa/i,'Tên mẫu đề cập đến hai khóa, là chi tiết đáng chú ý khi đối chiếu ảnh.'],
  [/full\s*viền/i,'Cụm từ full viền trong tên gọi giúp bạn phân biệt mẫu này với các biến thể mặt lưng.'],
  [/mặt\s*lưng/i,'Tên sản phẩm nhấn vào phần mặt lưng, nên đối chiếu ảnh với phiên bản điện thoại đang dùng.'],
  [/may\s*viền/i,'Chi tiết may viền được nhắc đến trong tên gọi, giúp phân biệt cách hoàn thiện giữa các mẫu.'],
  [/2\s*mặt|hai\s*mặt/i,'Tên gọi nêu rõ phiên bản hai mặt, bạn có thể xem ảnh để nhận biết cách thể hiện.'],
  [/màu\s*đen/i,'Tên sản phẩm ghi màu đen, gợi hướng phối trang phục có sắc thái trầm và gọn gàng.'],
  [/màu\s*nâu/i,'Tên sản phẩm ghi màu nâu, phù hợp để cân nhắc với những phụ kiện có tông màu tương đồng.']
];
const LINKS=[
 'Sự khác biệt nên được cảm nhận qua ảnh chụp thực tế và cách mẫu xuất hiện trong tổng thể trang phục.',
 'Thay vì chỉ nhìn tên gọi, việc tham khảo kỹ hình ảnh sẽ giúp bạn xác định lựa chọn có hợp gu hay không.',
 'Một món phụ kiện phù hợp là món đồ có thể kết nối với những trang phục bạn đã yêu thích.',
 'Giá trị thẩm mỹ nằm ở cảm nhận của người dùng và sự nhất quán trong cách chọn đồ.',
 'Khi lựa chọn một sản phẩm có điểm nhấn riêng, hãy cân nhắc cả bối cảnh sử dụng và phong cách cá nhân.',
 'Chọn theo sở thích và hoàn cảnh sử dụng sẽ giúp điểm nhấn của sản phẩm trở nên tự nhiên hơn.',
 'Điều quan trọng là sự hài hòa giữa món đồ, thói quen sử dụng và cách bạn muốn thể hiện bản thân.'
];
const CLOSERS=[
 'SinDarealest sẵn sàng trao đổi thêm khi bạn cần làm rõ thông tin trước khi đưa ra quyết định.',
 'Hãy tham khảo ảnh của chính mẫu này và liên hệ SinDarealest nếu muốn xác nhận chi tiết còn thiếu.',
 'Nếu còn phân vân giữa các mẫu, bạn có thể gửi mã sản phẩm để Shop hỗ trợ đối chiếu.',
 'Bạn có thể dùng tên hoặc mã sản phẩm để trao đổi cùng Shop về lựa chọn phù hợp nhất.',
 'Hãy kiểm tra các thông tin cần thiết cùng SinDarealest để lựa chọn đúng sản phẩm mình mong muốn.'
];
const pick=(list,index)=>list[((index%list.length)+list.length)%list.length];
function identity(row){
 const category=String(row?.category||'');
 const sku=String(row?.sku||'');
 const match=/([0-9]{3,})$/.exec(sku);
 if(!match||!Number.isSafeInteger(Number(match[1]))||!PROFILES[category])throw Error('UNSUPPORTED_PRODUCT_IDENTITY');
 return {category,sku,index:Number(match[1])-1};
}
export function generateProductDescription(row) {
 const {category,sku,index}=identity(row);
 const title=String(row.title||'').trim();
 if(!title||title.length>180)throw Error('INVALID_PRODUCT_TITLE');
 const p=PROFILES[category];
 const byTitle=TRAITS.filter(([pattern])=>pattern.test(title)).map(([,sentence])=>sentence);
 const focus=byTitle.length?byTitle.slice(0,3).join(' '):
   (category==='sneakers'
     ? 'Mã '+sku+' tương ứng với đúng mẫu trong bộ sưu tập, giúp bạn dễ tra cứu và trao đổi về lựa chọn của mình.'
     : 'Điểm nhấn từ chất liệu và kiểu dáng trong tên gọi là cơ sở để bạn khám phá mẫu này kỹ hơn.');
 const intro=pick(p.open,index+category.length);
 const style=pick(p.style,index*3+category.length);
 const detail=pick(p.detail,index*5+1);
 const bridge=pick(LINKS,index*7+category.length);
 const closer=pick(CLOSERS,index*11+category.length);
 const description=[
   intro+' '+title+' là lựa chọn thuộc nhóm '+p.kind+' của SinDarealest, hướng tới '+p.place+'. '+focus,
   detail+' '+style+' '+bridge,
   p.check+' '+closer
 ].join('\n\n');
 if(description.length<420||description.length>1800)throw Error('DESCRIPTION_LENGTH_OUT_OF_RANGE_'+sku);
 return description;
}
export function generateDescriptionPlan(rows) {
 if(!Array.isArray(rows)||rows.length<1||rows.length>2000)throw Error('CATALOG_SIZE_INVALID');
 const ids=new Set(),skus=new Set();
 const plan=rows.map(r=>{
   if(!r.id||ids.has(r.id)||skus.has(r.sku)||Number(r.published)!==1)throw Error('DUPLICATE_OR_UNPUBLISHED');
   ids.add(r.id);skus.add(r.sku);
   return {id:r.id,sku:r.sku,title:r.title,category:r.category,before:String(r.description??''),
     after:generateProductDescription(r)};
 });
 if(new Set(plan.map(p=>p.after)).size!==plan.length)throw Error('DUPLICATE_DESCRIPTIONS');
 return plan;
}
