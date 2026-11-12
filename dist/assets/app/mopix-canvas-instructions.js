const guides={
 'tpl-big-antlers':['Thêm ảnh nhân vật và đạo cụ trong nhóm Tham chiếu.','Mở nhóm Khung cảnh, tạo và duyệt 12 ảnh cho các cảnh.','Chạy các node Video hoặc Chạy toàn bộ Canvas khi đã sẵn sàng.','Duyệt 12 clip theo thứ tự. Thêm nhạc ở bước biên tập sau.'],
 'tpl-parkour-inline':['Có sẵn 4 ảnh demo. Thêm ảnh của bạn vào 6 node Ảnh còn trống trước khi chạy toàn bộ.','Chạy toàn bộ Canvas để tạo 6 chương theo đầu vào của từng nhánh.','Duyệt kết quả từng chương.'],
 'tpl-rin-jin':['Thêm đủ 8 ảnh tham chiếu: nhân vật, trang phục, đạo cụ và bối cảnh.','Chạy toàn bộ Canvas; các node sẽ đợi đủ kết quả đầu vào.','Duyệt từng clip. Upscale 4K hiện chỉ hỗ trợ ảnh.'],
 'tpl-snapback-mv':['Có sẵn 6 ảnh demo: nhân vật, khuôn mặt và 4 bối cảnh V8.1. Chọn node để thay ảnh.','Chạy 12 đoạn video, kiểm tra tính nhất quán của nhân vật.','Duyệt 12 đoạn video. Thêm nhạc và chỉnh nhịp trong bước biên tập sau.'],
 'tpl-wanyang-selfie':['Có sẵn 3 ảnh demo: mèo Wanyang, người mặc hanbok và ba lô mèo. Chọn node để thay ảnh.','Chạy toàn bộ Canvas để tạo 3 phần liên tiếp, mỗi phần 10 giây.','Xem từng kết quả (mỗi phần 10 giây).']
};
export function canvasInstructions(template){return guides[template?.id]||['Thêm ảnh tham chiếu cho các node Ảnh.','Chọn một node để chỉnh prompt và kiểm tra các đầu vào.','Chạy toàn bộ Canvas rồi duyệt kết quả.']}
