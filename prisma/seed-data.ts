export interface SeedQuestion {
  stem: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty?: number;
}

export const SEED_CATEGORIES: { name: string; questions: SeedQuestion[] }[] = [
  {
    name: "Kiến thức sản phẩm nệm cao su",
    questions: [
      { stem: "Ưu điểm nổi bật của nệm cao su thiên nhiên là gì?", options: ["Độ đàn hồi cao và bền bỉ", "Trọng lượng nhẹ, dễ gấp gọn", "Giá thành thấp nhất thị trường", "Chỉ phù hợp với khí hậu lạnh"], correct: 0, explanation: "Cao su thiên nhiên có độ đàn hồi cao, nâng đỡ tốt và giữ form lâu." },
      { stem: "Các lỗ thông hơi trên nệm cao su có tác dụng chính là gì?", options: ["Giảm trọng lượng vận chuyển", "Giúp nệm thông thoáng, hạn chế ẩm", "Để trang trí", "Giúp nệm mềm hơn theo thời gian"], correct: 1, explanation: "Lỗ thông hơi giúp không khí lưu thông, hạn chế hầm nóng và ẩm mốc." },
      { stem: "Nên tư vấn độ dày nệm dựa trên yếu tố nào trước tiên?", options: ["Màu vải bọc", "Thói quen nằm và chiều cao giường của khách", "Mẫu đang khuyến mãi", "Số lượng tồn kho"], correct: 1, explanation: "Độ dày phù hợp phụ thuộc thói quen nằm, cân nặng và chiều cao giường." },
      { stem: "Khi khách hỏi về mùi của nệm cao su mới, cách giải thích phù hợp là?", options: ["Nệm bị lỗi, cần đổi ngay", "Mùi nhẹ đặc trưng của cao su, giảm dần khi để thông thoáng", "Do hóa chất độc hại", "Không bao giờ có mùi"], correct: 1, explanation: "Mùi nhẹ đặc trưng của cao su sẽ giảm khi để nơi thoáng khí vài ngày." },
      { stem: "Người hay đau lưng thường được khuyên chọn nệm như thế nào?", options: ["Thật mềm, lún sâu", "Thật cứng như sàn gỗ", "Đàn hồi vừa phải, nâng đỡ cột sống thẳng", "Bất kỳ loại nào"], correct: 2, explanation: "Nệm có độ đàn hồi vừa phải giúp giữ cột sống ở tư thế tự nhiên." },
      { stem: "Vì sao nệm cao su ít bị xẹp lún cục bộ hơn nệm bông ép?", options: ["Do có lò xo bên trong", "Do cấu trúc đàn hồi tự phục hồi hình dạng", "Do vỏ nệm dày hơn", "Do được hút chân không"], correct: 1, explanation: "Cấu trúc cao su đàn hồi giúp nệm trở lại hình dạng ban đầu sau khi chịu lực." },
      { stem: "Kích thước nệm phổ biến cho giường đôi tiêu chuẩn là?", options: ["0,8 × 1,9 m", "1,0 × 2,0 m", "1,6 × 2,0 m", "2,2 × 2,4 m"], correct: 2, explanation: "1,6 × 2,0 m là kích thước phổ biến cho giường đôi." },
      { stem: "Khi khách muốn nệm cho trẻ nhỏ, điểm cần nhấn mạnh là?", options: ["Nệm càng mềm càng tốt", "Độ nâng đỡ, thông thoáng và an toàn chất liệu", "Màu sắc sặc sỡ", "Chỉ cần giá rẻ"], correct: 1, explanation: "Trẻ nhỏ cần nệm nâng đỡ tốt, thoáng khí và chất liệu an toàn." },
      { stem: "Gối cao su thường được giới thiệu với lợi ích nào?", options: ["Giữ form, nâng đỡ cổ ổn định", "Có thể giặt máy hàng tuần", "Luôn mát lạnh như đá", "Không cần vỏ gối"], correct: 0, explanation: "Gối cao su giữ form và nâng đỡ vùng cổ ổn định." },
      { stem: "Nên khuyên khách đặt nệm cao su trên bề mặt nào?", options: ["Sàn ẩm không lót", "Phản hoặc khung giường thông thoáng, bằng phẳng", "Trực tiếp lên lò xo cũ bị lún", "Bề mặt nghiêng"], correct: 1, explanation: "Mặt phẳng, thông thoáng giúp nệm phát huy độ nâng đỡ và tránh ẩm." },
    ],
  },
  {
    name: "Bảo quản & bảo hành",
    questions: [
      { stem: "Cách vệ sinh nệm cao su được khuyến nghị là?", options: ["Ngâm nước xà phòng", "Phơi nắng gắt nhiều giờ", "Hút bụi, lau nhẹ và để nơi thoáng mát", "Giặt bằng máy"], correct: 2, explanation: "Nắng gắt và ngâm nước làm giảm tuổi thọ cao su." },
      { stem: "Vì sao nên dùng tấm bảo vệ (ga chống thấm) cho nệm?", options: ["Để nệm cứng hơn", "Hạn chế bẩn, ẩm và kéo dài tuổi thọ nệm", "Để thay vỏ nệm", "Không có tác dụng"], correct: 1, explanation: "Tấm bảo vệ giúp giữ nệm sạch và khô ráo." },
      { stem: "Khi tiếp nhận yêu cầu bảo hành, việc đầu tiên đại lý cần làm là?", options: ["Từ chối nếu khách không có hóa đơn", "Ghi nhận thông tin, kiểm tra tình trạng và chứng từ mua hàng", "Đổi ngay sản phẩm mới", "Hẹn khách quay lại sau 1 tháng"], correct: 1, explanation: "Cần ghi nhận đủ thông tin và chứng từ để xử lý đúng quy trình." },
      { stem: "Lỗi nào thường KHÔNG thuộc phạm vi bảo hành?", options: ["Lỗi kỹ thuật từ nhà sản xuất", "Hư hỏng do sử dụng sai cách như ngâm nước, cắt rách", "Xẹp lún bất thường do lỗi vật liệu", "Đường may bung do lỗi gia công"], correct: 1, explanation: "Hư hỏng do sử dụng sai thường không thuộc phạm vi bảo hành." },
      { stem: "Để nệm không bị lún lệch theo một vị trí nằm, nên khuyên khách?", options: ["Không bao giờ di chuyển nệm", "Định kỳ xoay đầu nệm", "Đặt vật nặng ở giữa nệm", "Phơi nệm dưới mưa"], correct: 1, explanation: "Xoay đầu nệm định kỳ giúp phân bố lực đều." },
      { stem: "Khi vận chuyển nệm cao su, lưu ý nào đúng?", options: ["Gấp đôi và buộc chặt thật lâu", "Giữ nệm phẳng hoặc cuộn theo hướng dẫn, tránh vật sắc", "Kéo lê trên mặt đường", "Đặt dưới đáy xe chất hàng nặng lên trên"], correct: 1, explanation: "Gấp/đè lâu và vật sắc có thể làm biến dạng hoặc rách nệm." },
      { stem: "Thông tin nào cần có trên phiếu bảo hành giao cho khách?", options: ["Chỉ tên đại lý", "Thông tin sản phẩm, ngày mua, thông tin khách và điều kiện bảo hành", "Chỉ số điện thoại khách", "Không cần phiếu"], correct: 1, explanation: "Phiếu bảo hành cần đủ thông tin để đối chiếu khi phát sinh." },
      { stem: "Nệm bị ẩm nhẹ do đổ nước, khuyên khách xử lý thế nào?", options: ["Dùng máy sấy nhiệt độ cao áp sát", "Thấm khô, để nơi thoáng gió, tránh nắng gắt", "Phủ ni lông kín lại", "Không cần làm gì"], correct: 1, explanation: "Thấm khô và để thoáng giúp nệm khô tự nhiên, không hỏng cấu trúc." },
      { stem: "Khi khách phàn nàn về sản phẩm, thái độ đúng của nhân viên đại lý là?", options: ["Tranh luận để bảo vệ sản phẩm", "Lắng nghe, ghi nhận và hướng dẫn quy trình xử lý", "Hứa đổi trả không điều kiện", "Chuyển khách sang cửa hàng khác"], correct: 1, explanation: "Lắng nghe và hướng dẫn đúng quy trình giúp giữ uy tín." },
      { stem: "Mục đích của việc lưu hồ sơ bán hàng theo từng khách là?", options: ["Để gửi quảng cáo liên tục", "Hỗ trợ bảo hành, chăm sóc và tư vấn lần sau", "Để chia sẻ cho bên thứ ba", "Không có mục đích"], correct: 1, explanation: "Hồ sơ giúp xử lý bảo hành và chăm sóc khách tốt hơn." },
    ],
  },
  {
    name: "Kỹ năng tư vấn bán hàng",
    questions: [
      { stem: "Bước đầu tiên trong quy trình tư vấn khách hàng là?", options: ["Báo giá ngay", "Chào hỏi và tìm hiểu nhu cầu", "Giới thiệu sản phẩm đắt nhất", "Đề nghị khách thanh toán"], correct: 1, explanation: "Hiểu nhu cầu trước giúp tư vấn đúng sản phẩm." },
      { stem: "Câu hỏi mở nào giúp hiểu nhu cầu khách tốt nhất?", options: ["Anh/chị mua không?", "Anh/chị thường ngủ ở tư thế nào và gặp khó chịu gì khi ngủ?", "Anh/chị có tiền không?", "Anh/chị thích màu đỏ không?"], correct: 1, explanation: "Câu hỏi mở về thói quen ngủ giúp xác định sản phẩm phù hợp." },
      { stem: "Khi khách chê giá cao, cách phản hồi phù hợp là?", options: ["Giảm giá ngay lập tức", "Giải thích giá trị sử dụng lâu dài và lợi ích sức khỏe", "Nói khách không hiểu sản phẩm", "Bỏ qua khách"], correct: 1, explanation: "Nhấn mạnh giá trị và chi phí theo năm sử dụng giúp khách thấy hợp lý." },
      { stem: "Mời khách nằm thử nệm tại cửa hàng nhằm mục đích gì?", options: ["Kéo dài thời gian", "Giúp khách tự cảm nhận độ êm và nâng đỡ", "Để khách nghỉ ngơi", "Không cần thiết"], correct: 1, explanation: "Trải nghiệm thực tế giúp khách ra quyết định tự tin hơn." },
      { stem: "Kỹ thuật bán thêm (upsell) phù hợp khi khách mua nệm là?", options: ["Ép khách mua thêm nhiều món", "Gợi ý gối, ga bảo vệ phù hợp với nhu cầu đã tìm hiểu", "Không bao giờ gợi ý thêm", "Tăng giá nệm"], correct: 1, explanation: "Gợi ý sản phẩm liên quan đúng nhu cầu mang lại giá trị cho khách." },
      { stem: "Khi chưa chắc chắn về thông tin khách hỏi, nhân viên nên?", options: ["Trả lời đại để không mất khách", "Thừa nhận, kiểm tra lại và phản hồi chính xác", "Chuyển sang chủ đề khác", "Nói thông tin đó không quan trọng"], correct: 1, explanation: "Cung cấp thông tin chính xác giúp giữ niềm tin." },
      { stem: "Ngôn ngữ cơ thể nào tạo thiện cảm khi tư vấn?", options: ["Khoanh tay, nhìn điện thoại", "Giao tiếp bằng mắt, mỉm cười, tư thế cởi mở", "Đứng quay lưng", "Nói rất nhanh"], correct: 1, explanation: "Tư thế cởi mở và giao tiếp bằng mắt thể hiện sự quan tâm." },
      { stem: "Sau khi bán hàng, hoạt động chăm sóc nào nên thực hiện?", options: ["Không liên lạc nữa", "Hỏi thăm trải nghiệm sử dụng sau một thời gian", "Gọi điện hằng ngày", "Chỉ liên hệ khi có khuyến mãi"], correct: 1, explanation: "Hỏi thăm sau bán giúp tăng hài lòng và giới thiệu khách mới." },
      { stem: "Khi khách so sánh với sản phẩm của thương hiệu khác, nhân viên nên?", options: ["Nói xấu đối thủ", "Tập trung vào điểm mạnh sản phẩm của mình và nhu cầu của khách", "Đồng ý khách nên mua bên kia", "Im lặng"], correct: 1, explanation: "So sánh chuyên nghiệp dựa trên lợi ích phù hợp với khách." },
      { stem: "Thông tin nào KHÔNG nên hứa với khách nếu chưa được xác nhận?", options: ["Thời gian giao hàng chưa kiểm tra với kho", "Tên sản phẩm", "Kích thước tiêu chuẩn đã niêm yết", "Giá niêm yết"], correct: 0, explanation: "Chỉ cam kết những gì đã được xác nhận để tránh mất uy tín." },
    ],
  },
  {
    name: "Chính sách bán hàng & trưng bày",
    questions: [
      { stem: "Mục tiêu của việc trưng bày sản phẩm theo khu vực trải nghiệm là?", options: ["Lấp đầy cửa hàng", "Giúp khách dễ so sánh và trải nghiệm", "Giảm số lượng nhân viên", "Không có mục tiêu"], correct: 1, explanation: "Khu trải nghiệm giúp khách so sánh và chọn sản phẩm phù hợp." },
      { stem: "Bảng giá tại cửa hàng cần đảm bảo điều gì?", options: ["Thay đổi tùy khách", "Rõ ràng, đúng giá niêm yết hiện hành", "Không cần niêm yết", "Chỉ ghi giá cao nhất"], correct: 1, explanation: "Niêm yết rõ ràng, đúng giá giúp minh bạch với khách hàng." },
      { stem: "Khi có chương trình khuyến mãi mới, đại lý cần?", options: ["Tự đặt điều kiện riêng", "Nắm rõ điều kiện, thời gian áp dụng và truyền đạt chính xác", "Không thông báo cho khách", "Áp dụng cho mọi sản phẩm"], correct: 1, explanation: "Truyền đạt đúng điều kiện tránh tranh chấp sau bán." },
      { stem: "Hóa đơn, chứng từ bán hàng cần được xử lý thế nào?", options: ["Không cần lưu", "Xuất đầy đủ và lưu trữ theo quy định", "Chỉ lưu khi khách yêu cầu", "Lưu trên giấy nháp"], correct: 1, explanation: "Chứng từ đầy đủ là cơ sở cho bảo hành và đối soát." },
      { stem: "Sản phẩm trưng bày bị bẩn hoặc hư hỏng nên được xử lý?", options: ["Để nguyên", "Vệ sinh hoặc thay thế kịp thời", "Giảm giá bán ngay cho khách không báo trước", "Che lại bằng vải"], correct: 1, explanation: "Sản phẩm trưng bày phản ánh hình ảnh thương hiệu." },
      { stem: "Thông tin khách hàng thu thập khi bán hàng phải được?", options: ["Chia sẻ công khai", "Bảo mật và chỉ dùng cho mục đích phục vụ khách", "Bán cho đơn vị khác", "Đăng lên mạng xã hội"], correct: 1, explanation: "Bảo mật dữ liệu khách hàng là trách nhiệm của đại lý." },
      { stem: "Khi tồn kho một mẫu sắp hết, đại lý nên?", options: ["Ngừng bán mẫu đó ngay", "Chủ động đặt bổ sung theo quy trình và thông báo thời gian cho khách", "Bán hàng trưng bày mà không báo", "Không làm gì"], correct: 1, explanation: "Chủ động bổ sung giúp không gián đoạn bán hàng." },
      { stem: "Tài liệu đào tạo sản phẩm mới nên được sử dụng như thế nào?", options: ["Chỉ chủ đại lý đọc", "Phổ biến cho toàn bộ nhân viên bán hàng", "Cất kho", "Không cần thiết"], correct: 1, explanation: "Mọi nhân viên tư vấn cần nắm thông tin sản phẩm mới." },
      { stem: "Mục đích của các buổi training trực tuyến cho đại lý là?", options: ["Thay thế bán hàng", "Cập nhật kiến thức sản phẩm, chính sách và kỹ năng", "Kiểm tra doanh số", "Giải trí"], correct: 1, explanation: "Training giúp đại lý cập nhật kiến thức thống nhất." },
      { stem: "Khi phát hiện thông tin sai lệch về sản phẩm trên kênh bán hàng của đại lý, cần?", options: ["Để nguyên", "Chỉnh sửa ngay và báo cho đầu mối phụ trách", "Xóa toàn bộ kênh", "Đổ lỗi cho nhân viên"], correct: 1, explanation: "Thông tin chính xác bảo vệ khách hàng và thương hiệu." },
    ],
  },
];

export const SEED_DEALERS = [
  { code: "HCM001", name: "Đại lý Demo Quận 1", region: "TP. Hồ Chí Minh", user: "Nguyễn Văn An", email: "dealer01@kymdan.local", phone: "0901000001" },
  { code: "HCM002", name: "Đại lý Demo Thủ Đức", region: "TP. Hồ Chí Minh", user: "Trần Thị Bình", email: "dealer02@kymdan.local", phone: "0901000002" },
  { code: "HN001", name: "Đại lý Demo Cầu Giấy", region: "Hà Nội", user: "Lê Văn Cường", email: "dealer03@kymdan.local", phone: "0901000003" },
  { code: "DN001", name: "Đại lý Demo Hải Châu", region: "Đà Nẵng", user: "Phạm Thị Dung", email: "dealer04@kymdan.local", phone: "0901000004" },
  { code: "CT001", name: "Đại lý Demo Ninh Kiều", region: "Cần Thơ", user: "Võ Minh Em", email: "dealer05@kymdan.local", phone: "0901000005" },
];
