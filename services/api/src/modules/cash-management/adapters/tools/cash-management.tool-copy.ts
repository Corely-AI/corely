import type { LocalizedToolText } from "../../../ai-copilot/application/ports/domain-tool.port";

export const cashManagementToolDescriptions = {
  create_cash_entry: {
    en: "Create a cash entry for the current register and optionally attach uploaded receipts.",
    de: "Erstellt einen Kassenbucheintrag fuer die aktuelle Kasse und haengt optional hochgeladene Belege an.",
    vi: "Tạo một giao dịch sổ quỹ cho két sắt hiện tại và có thể đính kèm hóa đơn đã tải lên.",
  },
  update_cash_entry: {
    en: "Update an open cash entry by reversing the old entry and creating a corrected replacement entry.",
    de: "Aktualisiert einen offenen Kassenbucheintrag, indem der alte Eintrag storniert und ein korrigierter Ersatzeintrag erstellt wird.",
    vi: "Cập nhật một giao dịch sổ quỹ đang mở bằng cách đảo giao dịch cũ và tạo giao dịch thay thế đã chỉnh sửa.",
  },
  list_cash_entries: {
    en: "List cash entries for a register with optional date and search filters.",
    de: "Listet Kassenbucheintraege fuer eine Kasse mit optionalen Datums- und Suchfiltern auf.",
    vi: "Liệt kê các giao dịch sổ quỹ của một két sắt với bộ lọc ngày và tìm kiếm tùy chọn.",
  },
  upload_receipt: {
    en: "Upload one or more receipt files from the latest user attachment or explicit base64 input.",
    de: "Laedt eine oder mehrere Belegdateien aus dem neuesten Nutzeranhang oder aus expliziter Base64-Eingabe hoch.",
    vi: "Tải lên một hoặc nhiều tệp hóa đơn từ tệp đính kèm mới nhất của người dùng hoặc từ dữ liệu base64 được cung cấp.",
  },
  attach_receipt_to_entry: {
    en: "Attach one or more uploaded receipt documents to a cash entry.",
    de: "Haengt einen oder mehrere hochgeladene Belege an einen Kassenbucheintrag an.",
    vi: "Gắn một hoặc nhiều chứng từ hóa đơn đã tải lên vào một giao dịch sổ quỹ.",
  },
  get_today_cash_status: {
    en: "Return today's cash status, expected balance, receipt gaps, and close readiness.",
    de: "Gibt den heutigen Kassenstatus, den erwarteten Bestand, fehlende Belege und die Abschlussbereitschaft zurueck.",
    vi: "Trả về trạng thái tiền mặt hôm nay, số dư dự kiến, các hóa đơn còn thiếu và mức độ sẵn sàng đóng ngày.",
  },
  submit_counted_cash: {
    en: "Save the counted cash for a day before final closing.",
    de: "Speichert den gezaehlten Kassenbestand eines Tages vor dem endgueltigen Tagesabschluss.",
    vi: "Lưu số tiền mặt đã kiểm đếm trong ngày trước khi đóng ngày chính thức.",
  },
  close_cash_day: {
    en: "Close a cash day after counted cash and required notes are provided.",
    de: "Schliesst einen Kassentag, nachdem gezaehlter Bestand und erforderliche Hinweise vorliegen.",
    vi: "Đóng ngày sổ quỹ sau khi đã cung cấp tiền mặt kiểm đếm và các ghi chú bắt buộc.",
  },
  list_unclosed_days: {
    en: "List days that are still open and block monthly export readiness.",
    de: "Listet Tage auf, die noch offen sind und den Monats-export blockieren.",
    vi: "Liệt kê những ngày vẫn chưa đóng và đang chặn việc sẵn sàng xuất báo cáo tháng.",
  },
  find_missing_receipts: {
    en: "Find entries that still require receipts before review or export.",
    de: "Findet Eintraege, fuer die vor Pruefung oder Export noch Belege fehlen.",
    vi: "Tìm các giao dịch vẫn cần hóa đơn trước khi kiểm tra hoặc xuất dữ liệu.",
  },
  generate_monthly_export: {
    en: "Generate the monthly cash export package for the tax advisor.",
    de: "Erzeugt das monatliche Kassenexport-Paket fuer den Steuerberater.",
    vi: "Tạo gói xuất dữ liệu sổ quỹ hằng tháng cho kế toán hoặc tư vấn thuế.",
  },
  get_dashboard_summary: {
    en: "Return the operational dashboard summary for cash, receipts, close status, and export readiness.",
    de: "Gibt eine operative Uebersicht zu Kasse, Belegen, Abschlussstatus und Exportbereitschaft zurueck.",
    vi: "Trả về tổng quan điều hành về tiền mặt, hóa đơn, trạng thái đóng ngày và mức độ sẵn sàng xuất dữ liệu.",
  },
  get_action_required: {
    en: "Return the next operational actions the owner should take.",
    de: "Gibt die naechsten operativen Schritte zurueck, die der Inhaber ausfuehren sollte.",
    vi: "Trả về các hành động vận hành tiếp theo mà chủ cửa hàng nên thực hiện.",
  },
  explain_cashbook_term: {
    en: "Explain common cash-book terms in plain language for salon owners.",
    de: "Erklaert uebliche Kassenbuch-Begriffe in einfacher Sprache fuer Saloninhaber.",
    vi: "Giải thích các thuật ngữ sổ quỹ phổ biến bằng ngôn ngữ dễ hiểu cho chủ salon.",
  },
  get_workflow_help: {
    en: "Explain the next steps for closing the day, fixing receipts, or preparing monthly export.",
    de: "Erklaert die naechsten Schritte fuer Tagesabschluss, Belegkorrekturen oder die Vorbereitung des Monats-exports.",
    vi: "Giải thích các bước tiếp theo để đóng ngày, xử lý hóa đơn hoặc chuẩn bị xuất dữ liệu tháng.",
  },
} satisfies Record<string, LocalizedToolText>;
